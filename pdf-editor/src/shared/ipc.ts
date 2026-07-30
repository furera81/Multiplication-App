export interface OpenedDocument {
  /** Absolute path on disk, or null for an unsaved new document */
  filePath: string | null
  fileName: string
  bytes: ArrayBuffer
}

export interface RectPdf {
  /** All coordinates are in PDF user space (points, origin bottom-left) */
  x: number
  y: number
  width: number
  height: number
}

export interface RgbColor {
  r: number
  g: number
  b: number
}

export interface ApplyTextEditRequest {
  /** Current document bytes; all pdf-lib operations are stateless request/response */
  bytes: ArrayBuffer
  pageIndex: number
  /** Bounding box of the original text run(s) being replaced */
  eraseBox: RectPdf
  /** Color to paint over the erased region, sampled from the page background */
  coverColor: RgbColor
  newText: string
  fontSize: number
  /** true = bold-ish standard font */
  bold: boolean
  textColor: RgbColor
}

export interface ApplyTextEditResult {
  bytes: ArrayBuffer
}

/** Despite the name, ocrRecognize returns line-level groupings (better UX for
 * click-to-correct editing); makeSearchable uses word-level boxes internally. */
export interface OcrWord {
  text: string
  confidence: number
  /** bbox in the coordinate space of the bitmap that was OCR'd (pixels, origin top-left) */
  bbox: { x0: number; y0: number; x1: number; y1: number }
}

export interface OcrRecognizeRequest {
  requestId: string
  /** PNG bytes of the rendered page (or region) */
  imageBytes: ArrayBuffer
  languages: string[]
}

export interface OcrRecognizeResult {
  words: OcrWord[]
}

export interface OcrProgressEvent {
  requestId: string
  status: string
  progress: number
}

export interface MakeSearchableRequest {
  requestId: string
  bytes: ArrayBuffer
  /** For each image-only page: index + rendered PNG bytes + the scale used to render it (pixels per PDF point) */
  pages: Array<{ pageIndex: number; imageBytes: ArrayBuffer; scale: number }>
  languages: string[]
}

export interface MakeSearchableProgress {
  pageIndex: number
  pagesDone: number
  pagesTotal: number
}

export interface MakeSearchableResult {
  bytes: ArrayBuffer
  pagesProcessed: number
}

export interface SaveRequest {
  bytes: ArrayBuffer
  suggestedName: string
  /** If provided, save silently to this path (Save) instead of prompting (Save As) */
  targetPath?: string | null
}

export interface SaveResult {
  canceled: boolean
  filePath: string | null
}

export const IPC = {
  openFile: 'file:open',
  save: 'file:save',
  applyTextEdit: 'pdf:apply-text-edit',
  ocrRecognize: 'ocr:recognize',
  ocrProgress: 'ocr:progress',
  makeSearchable: 'pdf:make-searchable',
  makeSearchableProgress: 'pdf:make-searchable-progress'
} as const

export const OCR_LANGUAGES: Array<{ code: string; label: string }> = [
  { code: 'eng', label: 'English' },
  { code: 'spa', label: 'Spanish' },
  { code: 'fra', label: 'French' },
  { code: 'deu', label: 'German' },
  { code: 'ita', label: 'Italian' },
  { code: 'por', label: 'Portuguese' },
  { code: 'nld', label: 'Dutch' },
  { code: 'rus', label: 'Russian' },
  { code: 'ell', label: 'Greek' },
  { code: 'heb', label: 'Hebrew' },
  { code: 'ara', label: 'Arabic' },
  { code: 'hin', label: 'Hindi' },
  { code: 'jpn', label: 'Japanese' },
  { code: 'kor', label: 'Korean' },
  { code: 'chi_sim', label: 'Chinese (Simplified)' },
  { code: 'chi_tra', label: 'Chinese (Traditional)' }
]
