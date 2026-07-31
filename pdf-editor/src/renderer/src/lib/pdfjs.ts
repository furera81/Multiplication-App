import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
// eslint-disable-next-line import/no-unresolved
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export interface TextRun {
  id: string
  text: string
  /** PDF user-space coordinates (origin bottom-left) */
  pdf: { x: number; y: number; width: number; height: number; fontSize: number }
  /** pdf.js's internal alias for the font that drew this run; key into page.commonObjs */
  fontName: string
  /** CSS-ish family hint from pdf.js (e.g. "serif", "monospace") for standard-font fallback matching */
  fontFamilyHint?: string
}

export async function loadPdf(bytes: ArrayBuffer): Promise<PDFDocumentProxy> {
  // pdf.js detaches/transfers the buffer it's given; hand it a copy so the
  // caller can keep using the original bytes (e.g. to reload after an edit).
  const copy = bytes.slice(0)
  return pdfjsLib.getDocument({
    data: copy,
    // By default pdf.js discards each font's raw program bytes right after
    // handing them to the browser's FontFace API, to save memory. We need
    // them to stick around so getEmbeddedFontBytes() can re-embed the same
    // font when redrawing edited text (see lib/pdfjs.ts).
    fontExtraProperties: true
  }).promise
}

export async function renderPageToCanvas(
  page: PDFPageProxy,
  canvas: HTMLCanvasElement,
  scale: number
): Promise<{ viewport: ReturnType<PDFPageProxy['getViewport']> }> {
  const viewport = page.getViewport({ scale })
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D context unavailable')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  await page.render({ canvasContext: context, viewport }).promise
  return { viewport }
}

export async function extractTextRuns(page: PDFPageProxy): Promise<TextRun[]> {
  const content = await page.getTextContent()
  const runs: TextRun[] = []
  let i = 0
  for (const item of content.items) {
    if (!('str' in item) || !item.str.trim()) continue
    const transform = item.transform as number[]
    const fontSize = Math.hypot(transform[2], transform[3]) || item.height || 10
    runs.push({
      id: `run-${i++}`,
      text: item.str,
      fontName: item.fontName,
      fontFamilyHint: content.styles[item.fontName]?.fontFamily,
      pdf: {
        x: transform[4],
        y: transform[5] - fontSize * 0.2,
        width: item.width || fontSize * item.str.length * 0.5,
        height: item.height || fontSize * 1.15,
        fontSize
      }
    })
  }
  return runs
}

/**
 * Pull the raw font program bytes pdf.js already parsed out of the PDF for a
 * given font alias, so we can re-embed the document's own font instead of a
 * generic substitute when redrawing edited text. pdf.js transcodes whatever
 * it embedded (TrueType/CFF/Type1) into an OpenType-compatible byte stream
 * so the browser's FontFace API can use it — which conveniently also means
 * fontkit (TrueType/OpenType only) can usually parse it directly. Returns
 * undefined for non-embedded fonts (pdf.js substitutes a system font and
 * never resolves font "data" in that case) or if it isn't loaded yet.
 */
export function getEmbeddedFontBytes(page: PDFPageProxy, fontName: string): ArrayBuffer | undefined {
  try {
    if (!page.commonObjs.has(fontName)) return undefined
    const fontObj = page.commonObjs.get(fontName) as { data?: Uint8Array } | undefined
    const data = fontObj?.data
    if (!data || data.byteLength === 0) return undefined
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
  } catch {
    return undefined
  }
}

/** Render a page to an offscreen canvas at a given DPI scale and return PNG bytes, for OCR. */
export async function renderPageToPng(
  page: PDFPageProxy,
  scale: number
): Promise<{ bytes: ArrayBuffer; width: number; height: number }> {
  const canvas = document.createElement('canvas')
  await renderPageToCanvas(page, canvas, scale)
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
  })
  const bytes = await blob.arrayBuffer()
  return { bytes, width: canvas.width, height: canvas.height }
}
