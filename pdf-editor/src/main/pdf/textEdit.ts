import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { ApplyTextEditRequest, RgbColor } from '../../shared/ipc'

const toRgb = (c: RgbColor) => rgb(c.r / 255, c.g / 255, c.b / 255)

/**
 * PDFs don't have "editable text" the way a word processor does — glyphs are
 * positioned drawing instructions, often referencing subsetted embedded
 * fonts that don't contain arbitrary new characters. Rewriting a PDF's
 * content stream in place to reflow text is impractical for arbitrary
 * documents. Instead we use the same technique most lightweight PDF editors
 * use: paint over the original glyphs with the sampled background color
 * (redact), then draw the new text on top at the same position (redraw).
 * This is visually indistinguishable from a real edit for the common case
 * of single-line text replacement.
 */
export async function applyTextEdit(req: ApplyTextEditRequest): Promise<Uint8Array> {
  const doc = await PDFDocument.load(req.bytes)
  const page = doc.getPage(req.pageIndex)

  const font = await doc.embedFont(
    req.bold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica
  )

  // Redact: cover the original run with the sampled background color, with a
  // small margin so antialiased glyph edges don't peek out.
  const margin = 1
  page.drawRectangle({
    x: req.eraseBox.x - margin,
    y: req.eraseBox.y - margin,
    width: req.eraseBox.width + margin * 2,
    height: req.eraseBox.height + margin * 2,
    color: toRgb(req.coverColor)
  })

  // Redraw: pdf-lib positions text by its baseline, but eraseBox.y is the
  // bottom of the original glyph bounding box. Standard Latin fonts have a
  // descender of roughly 20% of the em size, so nudge the baseline up by
  // that much to land the new text where the old glyphs sat.
  page.drawText(req.newText, {
    x: req.eraseBox.x,
    y: req.eraseBox.y + req.fontSize * 0.2,
    size: req.fontSize,
    font,
    color: toRgb(req.textColor)
  })

  return doc.save()
}
