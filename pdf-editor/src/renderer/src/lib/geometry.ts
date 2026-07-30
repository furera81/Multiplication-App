import type { PageViewport } from 'pdfjs-dist'

export interface ScreenRect {
  left: number
  top: number
  width: number
  height: number
}

export interface PdfRect {
  x: number
  y: number
  width: number
  height: number
}

/** Convert a PDF user-space rect (origin bottom-left) to canvas/screen pixels (origin top-left). */
export function pdfRectToScreen(viewport: PageViewport, rect: PdfRect): ScreenRect {
  const [x1, y1, x2, y2] = viewport.convertToViewportRectangle([
    rect.x,
    rect.y,
    rect.x + rect.width,
    rect.y + rect.height
  ])
  return {
    left: Math.min(x1, x2),
    top: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1)
  }
}

/** Convert an image-pixel rect (origin top-left, from OCR on a rendered page) to PDF user space. */
export function imageRectToPdf(
  rect: { x0: number; y0: number; x1: number; y1: number },
  renderScale: number,
  pageHeightPt: number
): PdfRect {
  const x = rect.x0 / renderScale
  const width = (rect.x1 - rect.x0) / renderScale
  const height = (rect.y1 - rect.y0) / renderScale
  const y = pageHeightPt - rect.y1 / renderScale
  return { x, y, width, height }
}

/** Sample an approximate background color from the ring of pixels just outside a screen rect. */
export function sampleBackgroundColor(
  canvas: HTMLCanvasElement,
  rect: ScreenRect
): { r: number; g: number; b: number } {
  const ctx = canvas.getContext('2d')
  if (!ctx) return { r: 255, g: 255, b: 255 }

  const pad = 2
  const samplePoints: Array<[number, number]> = [
    [rect.left - pad, rect.top + rect.height / 2],
    [rect.left + rect.width + pad, rect.top + rect.height / 2],
    [rect.left + rect.width / 2, rect.top - pad],
    [rect.left + rect.width / 2, rect.top + rect.height + pad]
  ]

  let r = 0
  let g = 0
  let b = 0
  let count = 0
  for (const [px, py] of samplePoints) {
    const x = Math.round(Math.min(Math.max(px, 0), canvas.width - 1))
    const y = Math.round(Math.min(Math.max(py, 0), canvas.height - 1))
    try {
      const data = ctx.getImageData(x, y, 1, 1).data
      r += data[0]
      g += data[1]
      b += data[2]
      count++
    } catch {
      // getImageData can throw on a tainted canvas; fall back to white below
    }
  }

  if (count === 0) return { r: 255, g: 255, b: 255 }
  return { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) }
}
