/// <reference types="vite/client" />

import type { PdfEditorApi } from '../../preload/index'

declare global {
  interface Window {
    pdfEditor: PdfEditorApi
  }
}

declare module '*?url' {
  const url: string
  export default url
}

export {}
