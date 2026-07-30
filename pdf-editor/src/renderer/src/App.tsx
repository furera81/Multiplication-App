import { useCallback, useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import Toolbar from './components/Toolbar'
import OcrBar from './components/OcrBar'
import PageCanvas from './components/PageCanvas'
import { extractTextRuns, loadPdf, renderPageToPng } from './lib/pdfjs'
import { imageRectToPdf } from './lib/geometry'
import type { EditableRegion, EditorMode, RgbColor } from './lib/types'

const OCR_RENDER_SCALE = 3

interface OpenDoc {
  bytes: ArrayBuffer
  filePath: string | null
  fileName: string
}

export default function App(): React.JSX.Element {
  const [doc, setDoc] = useState<OpenDoc | null>(null)
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [page, setPage] = useState(1)
  const [zoom, setZoom] = useState(1.2)
  const [mode, setMode] = useState<EditorMode>('view')
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [languages, setLanguages] = useState<string[]>(['eng'])
  const [ocrRunning, setOcrRunning] = useState(false)
  const [ocrByPage, setOcrByPage] = useState<Map<number, EditableRegion[]>>(new Map())
  const [editBusy, setEditBusy] = useState(false)
  const [progressLabel, setProgressLabel] = useState<string | null>(null)
  const [makeSearchableBusy, setMakeSearchableBusy] = useState(false)

  const requestIdRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    if (!doc) {
      setPdfDoc(null)
      setNumPages(0)
      return
    }
    loadPdf(doc.bytes).then((loaded) => {
      if (cancelled) return
      setPdfDoc(loaded)
      setNumPages(loaded.numPages)
      setPage((p) => Math.min(Math.max(p, 1), loaded.numPages))
    })
    return () => {
      cancelled = true
    }
  }, [doc])

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
      setDoc({ bytes: opened.bytes, filePath: opened.filePath, fileName: opened.fileName })
      setDirty(false)
      setOcrByPage(new Map())
      setMode('view')
      setPage(1)
    } catch (e) {
      setError(String(e))
    }
  }, [])

  const handleSave = useCallback(
    async (saveAs: boolean) => {
      if (!doc) return
      setBusy(saveAs ? 'Saving as…' : 'Saving…')
      setError(null)
      try {
        const result = await window.pdfEditor.save({
          bytes: doc.bytes,
          suggestedName: doc.fileName,
          targetPath: saveAs ? null : doc.filePath
        })
        if (!result.canceled && result.filePath) {
          setDoc((d) => (d ? { ...d, filePath: result.filePath } : d))
          setDirty(false)
        }
      } catch (e) {
        setError(String(e))
      } finally {
        setBusy(null)
      }
    },
    [doc]
  )

  const handleCommitEdit = useCallback(
    async (
      region: EditableRegion,
      values: { text: string; fontSize: number; bold: boolean; textColor: RgbColor; coverColor: RgbColor }
    ) => {
      if (!doc) return
      setEditBusy(true)
      setError(null)
      try {
        const result = await window.pdfEditor.applyTextEdit({
          bytes: doc.bytes,
          pageIndex: page - 1,
          eraseBox: region.pdf,
          coverColor: values.coverColor,
          newText: values.text,
          fontSize: values.fontSize,
          bold: values.bold,
          textColor: values.textColor
        })
        setDoc((d) => (d ? { ...d, bytes: result.bytes } : d))
        setDirty(true)

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
    [doc, page]
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
    if (!pdfDoc || !doc) return
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
        bytes: doc.bytes,
        pages: imageOnlyPages,
        languages
      })
      setDoc((d) => (d ? { ...d, bytes: result.bytes } : d))
      setDirty(true)
    } catch (e) {
      setError(String(e))
    } finally {
      setMakeSearchableBusy(false)
      setProgressLabel(null)
    }
  }, [pdfDoc, doc, numPages, languages])

  return (
    <div className="app">
      <Toolbar
        fileName={doc?.fileName ?? null}
        dirty={dirty}
        page={page}
        numPages={numPages}
        zoom={zoom}
        mode={mode}
        busy={!!busy}
        onOpen={handleOpen}
        onSave={() => handleSave(false)}
        onSaveAs={() => handleSave(true)}
        onPageChange={(p) => setPage(Math.min(Math.max(p, 1), numPages || 1))}
        onZoomChange={(z) => setZoom(Math.min(Math.max(z, 0.3), 4))}
        onModeChange={setMode}
      />

      {mode === 'edit-ocr' && doc && (
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
      {busy && <div className="banner info">{busy}</div>}

      <div className="viewer">
        {!doc && (
          <div className="empty-state">
            <p>No PDF open</p>
            <button type="button" onClick={handleOpen}>
              Open a PDF
            </button>
          </div>
        )}
        {doc && pdfDoc && (
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
