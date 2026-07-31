import { useCallback, useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import Toolbar from './components/Toolbar'
import OcrBar from './components/OcrBar'
import PageCanvas from './components/PageCanvas'
import { extractTextRuns, loadPdf, renderPageToPng } from './lib/pdfjs'
import { imageRectToPdf } from './lib/geometry'
import { useDocHistory } from './lib/history'
import type { EditableRegion, EditorMode, RgbColor } from './lib/types'

const OCR_RENDER_SCALE = 3

interface DocMeta {
  filePath: string | null
  fileName: string
}

export default function App(): React.JSX.Element {
  const [docMeta, setDocMeta] = useState<DocMeta | null>(null)
  const history = useDocHistory()
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [page, setPage] = useState(1)
  const [zoom, setZoom] = useState(1.2)
  const [mode, setMode] = useState<EditorMode>('view')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [languages, setLanguages] = useState<string[]>(['eng'])
  const [ocrRunning, setOcrRunning] = useState(false)
  const [ocrByPage, setOcrByPage] = useState<Map<number, EditableRegion[]>>(new Map())
  const [editBusy, setEditBusy] = useState(false)
  const [progressLabel, setProgressLabel] = useState<string | null>(null)
  const [makeSearchableBusy, setMakeSearchableBusy] = useState(false)

  const requestIdRef = useRef(0)
  const docBytes = history.bytes

  useEffect(() => {
    let cancelled = false
    if (!docBytes) {
      setPdfDoc(null)
      setNumPages(0)
      return
    }
    loadPdf(docBytes).then((loaded) => {
      if (cancelled) return
      setPdfDoc(loaded)
      setNumPages(loaded.numPages)
      setPage((p) => Math.min(Math.max(p, 1), loaded.numPages))
    })
    return () => {
      cancelled = true
    }
  }, [docBytes])

  useEffect(() => {
    const off = window.pdfEditor.onOcrProgress(({ status, progress }) => {
      setProgressLabel(`${status} ${Math.round(progress * 100)}%`)
    })
    return off
  }, [])

  useEffect(() => {
    const off = window.pdfEditor.onMakeSearchableProgress(({ pagesDone, pagesTotal }) => {
      setProgressLabel(`Scanning page ${pagesDone} of ${pagesTotal}`)
    })
    return off
  }, [])

  const handleOpen = useCallback(async () => {
    setError(null)
    try {
      const opened = await window.pdfEditor.openFile()
      if (!opened) return
      setDocMeta({ filePath: opened.filePath, fileName: opened.fileName })
      history.reset(opened.bytes)
      setOcrByPage(new Map())
      setMode('view')
      setPage(1)
    } catch (e) {
      setError(String(e))
    }
  }, [history])

  const handleSave = useCallback(
    async (saveAs: boolean) => {
      if (!docBytes || !docMeta) return
      setBusy(saveAs ? 'Saving as…' : 'Saving…')
      setError(null)
      try {
        const result = await window.pdfEditor.save({
          bytes: docBytes,
          suggestedName: docMeta.fileName,
          targetPath: saveAs ? null : docMeta.filePath
        })
        if (!result.canceled && result.filePath) {
          setDocMeta((d) => (d ? { ...d, filePath: result.filePath } : d))
          history.markSaved()
        }
      } catch (e) {
        setError(String(e))
      } finally {
        setBusy(null)
      }
    },
    [docBytes, docMeta, history]
  )

  const handleUndo = useCallback(() => {
    setOcrByPage(new Map())
    history.undo()
  }, [history])

  const handleRedo = useCallback(() => {
    setOcrByPage(new Map())
    history.redo()
  }, [history])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      const target = e.target as HTMLElement | null
      const typing = target?.tagName === 'TEXTAREA' || target?.tagName === 'INPUT'
      if (typing) return
      const mod = e.metaKey || e.ctrlKey
      if (!mod || e.key.toLowerCase() !== 'z') return
      e.preventDefault()
      if (e.shiftKey) handleRedo()
      else handleUndo()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleUndo, handleRedo])

  const handleCommitEdit = useCallback(
    async (
      region: EditableRegion,
      values: {
        text: string
        fontSize: number
        bold: boolean
        italic: boolean
        textColor: RgbColor
        coverColor: RgbColor
      }
    ) => {
      if (!docBytes) return
      setEditBusy(true)
      setError(null)
      try {
        const result = await window.pdfEditor.applyTextEdit({
          bytes: docBytes,
          pageIndex: page - 1,
          eraseBox: region.pdf,
          coverColor: values.coverColor,
          newText: values.text,
          fontSize: values.fontSize,
          bold: values.bold,
          italic: values.italic,
          textColor: values.textColor,
          fontBytes: region.fontBytes,
          fontFamilyHint: region.fontFamilyHint
        })
        history.push(result.bytes)
        if (result.usedFallbackFont) {
          setNotice(
            "Used a similar system font — the original font didn't include all the characters you typed."
          )
        }

        if (region.source === 'ocr') {
          setOcrByPage((prev) => {
            const next = new Map(prev)
            const list = next.get(page)
            if (list) next.set(page, list.filter((r) => r.id !== region.id))
            return next
          })
        }
      } catch (e) {
        setError(String(e))
      } finally {
        setEditBusy(false)
      }
    },
    [docBytes, page, history]
  )

  const handleRunOcr = useCallback(async () => {
    if (!pdfDoc) return
    setOcrRunning(true)
    setError(null)
    setProgressLabel('Starting OCR…')
    try {
      const pdfPage = await pdfDoc.getPage(page)
      const pageHeightPt = pdfPage.getViewport({ scale: 1 }).height
      const { bytes } = await renderPageToPng(pdfPage, OCR_RENDER_SCALE)
      const requestId = String(++requestIdRef.current)
      const result = await window.pdfEditor.ocrRecognize({ requestId, imageBytes: bytes, languages })

      const regions: EditableRegion[] = result.words
        .filter((w) => w.text.trim())
        .map((w, i) => {
          const pdfRect = imageRectToPdf(w.bbox, OCR_RENDER_SCALE, pageHeightPt)
          return {
            id: `ocr-${page}-${i}`,
            text: w.text.trim(),
            fontSize: Math.max(4, pdfRect.height * 0.8),
            pdf: pdfRect,
            source: 'ocr' as const
          }
        })

      setOcrByPage((prev) => new Map(prev).set(page, regions))
    } catch (e) {
      setError(String(e))
    } finally {
      setOcrRunning(false)
      setProgressLabel(null)
    }
  }, [pdfDoc, page, languages])

  const handleMakeSearchable = useCallback(async () => {
    if (!pdfDoc || !docBytes) return
    setMakeSearchableBusy(true)
    setError(null)
    setProgressLabel('Finding scanned pages…')
    try {
      const imageOnlyPages: Array<{ pageIndex: number; imageBytes: ArrayBuffer; scale: number }> = []
      for (let p = 1; p <= numPages; p++) {
        const pdfPage = await pdfDoc.getPage(p)
        const runs = await extractTextRuns(pdfPage)
        if (runs.length > 0) continue
        const { bytes } = await renderPageToPng(pdfPage, OCR_RENDER_SCALE)
        imageOnlyPages.push({ pageIndex: p - 1, imageBytes: bytes, scale: OCR_RENDER_SCALE })
      }

      if (imageOnlyPages.length === 0) {
        setError('No scanned/image-only pages found — every page already has selectable text.')
        return
      }

      const requestId = String(++requestIdRef.current)
      const result = await window.pdfEditor.makeSearchable({
        requestId,
        bytes: docBytes,
        pages: imageOnlyPages,
        languages
      })
      history.push(result.bytes)
    } catch (e) {
      setError(String(e))
    } finally {
      setMakeSearchableBusy(false)
      setProgressLabel(null)
    }
  }, [pdfDoc, docBytes, numPages, languages, history])

  return (
    <div className="app">
      <Toolbar
        fileName={docMeta?.fileName ?? null}
        dirty={history.dirty}
        page={page}
        numPages={numPages}
        zoom={zoom}
        mode={mode}
        busy={!!busy}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onOpen={handleOpen}
        onSave={() => handleSave(false)}
        onSaveAs={() => handleSave(true)}
        onPageChange={(p) => setPage(Math.min(Math.max(p, 1), numPages || 1))}
        onZoomChange={(z) => setZoom(Math.min(Math.max(z, 0.3), 4))}
        onModeChange={setMode}
      />

      {mode === 'edit-ocr' && docMeta && (
        <OcrBar
          selectedLanguages={languages}
          onChangeLanguages={setLanguages}
          onMakeSearchable={handleMakeSearchable}
          makeSearchableBusy={makeSearchableBusy}
          progressLabel={progressLabel}
        />
      )}

      {error && (
        <div className="banner error" onClick={() => setError(null)}>
          {error}
        </div>
      )}
      {notice && (
        <div className="banner info" onClick={() => setNotice(null)}>
          {notice}
        </div>
      )}
      {busy && <div className="banner info">{busy}</div>}

      <div className="viewer">
        {!docMeta && (
          <div className="empty-state">
            <p>No PDF open</p>
            <button type="button" onClick={handleOpen}>
              Open a PDF
            </button>
          </div>
        )}
        {docMeta && pdfDoc && (
          <PageCanvas
            pdfDoc={pdfDoc}
            pageNumber={page}
            zoom={zoom}
            mode={mode}
            ocrRegions={ocrByPage.get(page)}
            ocrRunning={ocrRunning}
            onRunOcr={handleRunOcr}
            onCommitEdit={handleCommitEdit}
            editBusy={editBusy}
          />
        )}
      </div>
    </div>
  )
}
