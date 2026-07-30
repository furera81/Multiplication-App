import { PDFDocument, StandardFonts } from 'pdf-lib'
import { recognizeImage, type OcrLogger } from '../ocr/tesseractPool'
import type { MakeSearchableRequest } from '../../shared/ipc'

/**
 * "Sandwich" technique used by tools like ocrmypdf: keep the original page
 * image exactly as-is, and lay an invisible text layer on top so the page
 * becomes selectable/searchable/copyable without changing how it looks.
 * pdf-lib has no first-class "invisible text render mode" helper, so we
 * approximate it with fully transparent fill (opacity: 0) — the text object
 * is present in the content stream and indexed by PDF viewers/search, it
 * just isn't painted.
 */
export async function makeSearchable(
  req: MakeSearchableRequest,
  onProgress?: (pageIndex: number, done: number, total: number) => void,
  onOcrLog?: OcrLogger
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(req.bytes)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const total = req.pages.length

  for (let i = 0; i < req.pages.length; i++) {
    const { pageIndex, imageBytes, scale } = req.pages[i]
    const page = doc.getPage(pageIndex)
    const pageHeightPt = page.getHeight()

    const result = await recognizeImage(new Uint8Array(imageBytes), req.languages, onOcrLog)

    for (const word of result.data.words) {
      const text = word.text.trim()
      if (!text) continue

      // Image pixel space (origin top-left) -> PDF user space (origin
      // bottom-left), undoing the render scale used to rasterize the page.
      const xPt = word.bbox.x0 / scale
      const widthPt = (word.bbox.x1 - word.bbox.x0) / scale
      const heightPt = (word.bbox.y1 - word.bbox.y0) / scale
      const yPt = pageHeightPt - word.bbox.y1 / scale

      // Pick a font size whose natural width roughly matches the recognized
      // word's width, so the invisible text lines up with the glyphs
      // beneath it closely enough for selection/search highlighting.
      const naturalWidthAt1pt = font.widthOfTextAtSize(text, 1)
      const fontSize =
        naturalWidthAt1pt > 0 ? Math.max(1, widthPt / naturalWidthAt1pt) : Math.max(1, heightPt * 0.85)

      page.drawText(text, {
        x: xPt,
        y: yPt,
        size: fontSize,
        font,
        opacity: 0
      })
    }

    onProgress?.(pageIndex, i + 1, total)
  }

  return doc.save()
}
