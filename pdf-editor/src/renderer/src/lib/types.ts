export interface PdfRect {
  x: number
  y: number
  width: number
  height: number
}

export interface EditableRegion {
  id: string
  text: string
  fontSize: number
  pdf: PdfRect
  source: 'native' | 'ocr'
  /** Raw font program bytes extracted from the original PDF, when available (native regions only) */
  fontBytes?: ArrayBuffer
  fontFamilyHint?: string
}

export type EditorMode = 'view' | 'edit-native' | 'edit-ocr'

export interface RgbColor {
  r: number
  g: number
  b: number
}

export function rgbToHex(c: RgbColor): string {
  const h = (n: number) => n.toString(16).padStart(2, '0')
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`
}

export function hexToRgb(hex: string): RgbColor {
  const clean = hex.replace('#', '')
  const num = parseInt(clean, 16)
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}
