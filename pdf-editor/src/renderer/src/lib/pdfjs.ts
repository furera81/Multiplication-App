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
}

export async function loadPdf(bytes: ArrayBuffer): Promise<PDFDocumentProxy> {
  // pdf.js detaches/transfers the buffer it's given; hand it a copy so the
  // caller can keep using the original bytes (e.g. to reload after an edit).
  const copy = bytes.slice(0)
  return pdfjsLib.getDocument({ data: copy }).promise
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
