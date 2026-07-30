import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc'
import type {
  ApplyTextEditRequest,
  ApplyTextEditResult,
  MakeSearchableRequest,
  MakeSearchableProgress,
  MakeSearchableResult,
  OcrProgressEvent,
  OcrRecognizeRequest,
  OcrRecognizeResult,
  OpenedDocument,
  SaveRequest,
  SaveResult
} from '../shared/ipc'

const api = {
  openFile: (): Promise<OpenedDocument | null> => ipcRenderer.invoke(IPC.openFile),

  save: (req: SaveRequest): Promise<SaveResult> => ipcRenderer.invoke(IPC.save, req),

  applyTextEdit: (req: ApplyTextEditRequest): Promise<ApplyTextEditResult> =>
    ipcRenderer.invoke(IPC.applyTextEdit, req),

  ocrRecognize: (req: OcrRecognizeRequest): Promise<OcrRecognizeResult> =>
    ipcRenderer.invoke(IPC.ocrRecognize, req),

  onOcrProgress: (cb: (e: OcrProgressEvent) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: OcrProgressEvent): void =>
      cb(payload)
    ipcRenderer.on(IPC.ocrProgress, listener)
    return () => ipcRenderer.removeListener(IPC.ocrProgress, listener)
  },

  makeSearchable: (req: MakeSearchableRequest): Promise<MakeSearchableResult> =>
    ipcRenderer.invoke(IPC.makeSearchable, req),

  onMakeSearchableProgress: (cb: (e: MakeSearchableProgress) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: MakeSearchableProgress): void =>
      cb(payload)
    ipcRenderer.on(IPC.makeSearchableProgress, listener)
    return () => ipcRenderer.removeListener(IPC.makeSearchableProgress, listener)
  }
}

export type PdfEditorApi = typeof api

contextBridge.exposeInMainWorld('pdfEditor', api)
