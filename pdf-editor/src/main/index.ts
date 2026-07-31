import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { join } from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import { is } from './utils/env'
import { toArrayBuffer } from './utils/buffer'
import { IPC } from '../shared/ipc'
import type {
  ApplyTextEditRequest,
  ApplyTextEditResult,
  MakeSearchableRequest,
  MakeSearchableResult,
  OcrRecognizeRequest,
  OcrRecognizeResult,
  OpenedDocument,
  SaveRequest,
  SaveResult
} from '../shared/ipc'
import { applyTextEdit } from './pdf/textEdit'
import { makeSearchable } from './pdf/searchable'
import { recognizeImage, terminateAllWorkers } from './ocr/tesseractPool'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerIpcHandlers(): void {
  ipcMain.handle(IPC.openFile, async (): Promise<OpenedDocument | null> => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Open PDF',
      properties: ['openFile'],
      filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return null

    const filePath = result.filePaths[0]
    const buffer = await readFile(filePath)
    return {
      filePath,
      fileName: filePath.split(/[/\\]/).pop() ?? 'document.pdf',
      bytes: toArrayBuffer(buffer)
    }
  })

  ipcMain.handle(IPC.save, async (_event, req: SaveRequest): Promise<SaveResult> => {
    let targetPath = req.targetPath ?? null

    if (!targetPath) {
      if (!mainWindow) return { canceled: true, filePath: null }
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Save PDF',
        defaultPath: req.suggestedName,
        filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
      })
      if (result.canceled || !result.filePath) return { canceled: true, filePath: null }
      targetPath = result.filePath
    }

    await writeFile(targetPath, Buffer.from(req.bytes))
    return { canceled: false, filePath: targetPath }
  })

  ipcMain.handle(
    IPC.applyTextEdit,
    async (_event, req: ApplyTextEditRequest): Promise<ApplyTextEditResult> => {
      const { bytes, usedFallbackFont } = await applyTextEdit(req)
      return { bytes: toArrayBuffer(bytes), usedFallbackFont }
    }
  )

  ipcMain.handle(
    IPC.ocrRecognize,
    async (event, req: OcrRecognizeRequest): Promise<OcrRecognizeResult> => {
      const result = await recognizeImage(
        new Uint8Array(req.imageBytes),
        req.languages,
        (status, progress) => {
          event.sender.send(IPC.ocrProgress, { requestId: req.requestId, status, progress })
        }
      )
      // Interactive correction UX groups by line (one popover per line reads
      // naturally); the batch make-searchable pass uses word-level boxes
      // instead for tighter alignment with the scanned glyphs.
      return {
        words: result.data.lines.map((l) => ({
          text: l.text,
          confidence: l.confidence,
          bbox: l.bbox
        }))
      }
    }
  )

  ipcMain.handle(
    IPC.makeSearchable,
    async (event, req: MakeSearchableRequest): Promise<MakeSearchableResult> => {
      const bytes = await makeSearchable(
        req,
        (pageIndex, pagesDone, pagesTotal) => {
          event.sender.send(IPC.makeSearchableProgress, { pageIndex, pagesDone, pagesTotal })
        },
        (status, progress) => {
          event.sender.send(IPC.ocrProgress, { requestId: req.requestId, status, progress })
        }
      )
      return {
        bytes: toArrayBuffer(bytes),
        pagesProcessed: req.pages.length
      }
    }
  )
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  void terminateAllWorkers()
})
