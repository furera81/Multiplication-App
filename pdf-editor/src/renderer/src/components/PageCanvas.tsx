import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy, PageViewport } from 'pdfjs-dist'
import { extractTextRuns, renderPageToCanvas } from '../lib/pdfjs'
import { pdfRectToScreen, sampleBackgroundColor, type ScreenRect } from '../lib/geometry'
import type { EditableRegion, EditorMode, RgbColor } from '../lib/types'
import EditPopover from './EditPopover'

interface Props {
  pdfDoc: PDFDocumentProxy
  pageNumber: number
  zoom: number
  mode: EditorMode
  ocrRegions: EditableRegion[] | undefined
  ocrRunning: boolean
  onRunOcr: () => void
  onCommitEdit: (
    region: EditableRegion,
    values: { text: string; fontSize: number; bold: boolean; textColor: RgbColor; coverColor: RgbColor }
  ) => Promise<void>
  editBusy: boolean
}

export default function PageCanvas({
  pdfDoc,
  pageNumber,
  zoom,
  mode,
  ocrRegions,
  ocrRunning,
  onRunOcr,
  onCommitEdit,
  editBusy
}: Props): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [viewport, setViewport] = useState<PageViewport | null>(null)
  const [nativeRegions, setNativeRegions] = useState<EditableRegion[]>([])
  const [selected, setSelected] = useState<EditableRegion | null>(null)
  const [selectedScreenRect, setSelectedScreenRect] = useState<ScreenRect | null>(null)
  const [sampledColor, setSampledColor] = useState<RgbColor>({ r: 255, g: 255, b: 255 })

  useEffect(() => {
    let cancelled = false
    setSelected(null)

    async function render(): Promise<void> {
      const page = await pdfDoc.getPage(pageNumber)
      if (cancelled || !canvasRef.current) return
      const { viewport: vp } = await renderPageToCanvas(page, canvasRef.current, zoom)
      if (cancelled) return
      setViewport(vp)

      if (mode === 'edit-native') {
        const runs = await extractTextRuns(page)
        if (!cancelled) {
          setNativeRegions(
            runs.map((r) => ({
              id: r.id,
              text: r.text,
              fontSize: r.pdf.fontSize,
              pdf: r.pdf,
              source: 'native' as const
            }))
          )
        }
      } else {
        setNativeRegions([])
      }
    }

    void render()
    return () => {
      cancelled = true
    }
  }, [pdfDoc, pageNumber, zoom, mode])

  const regions = mode === 'edit-native' ? nativeRegions : mode === 'edit-ocr' ? ocrRegions ?? [] : []

  function handleSelect(region: EditableRegion): void {
    if (!viewport || !canvasRef.current) return
    const rect = pdfRectToScreen(viewport, region.pdf)
    setSelected(region)
    setSelectedScreenRect(rect)
    setSampledColor(sampleBackgroundColor(canvasRef.current, rect))
  }

  return (
    <div className="page-canvas-wrap" onClick={() => setSelected(null)}>
      <canvas ref={canvasRef} />

      {viewport &&
        regions.map((region) => {
          const rect = pdfRectToScreen(viewport, region.pdf)
          return (
            <div
              key={region.id}
              className="hit-region"
              style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
              title={region.text}
              onClick={(e) => {
                e.stopPropagation()
                handleSelect(region)
              }}
            />
          )
        })}

      {mode === 'edit-ocr' && !ocrRegions && (
        <div className="ocr-page-prompt">
          <button type="button" onClick={onRunOcr} disabled={ocrRunning}>
            {ocrRunning ? 'Running OCR…' : 'Run OCR on this page'}
          </button>
        </div>
      )}

      {selected && selectedScreenRect && (
        <EditPopover
          region={selected}
          screenRect={selectedScreenRect}
          sampledCoverColor={sampledColor}
          busy={editBusy}
          onCancel={() => setSelected(null)}
          onCommit={(values) => {
            void onCommitEdit(selected, values).then(() => setSelected(null))
          }}
        />
      )}
    </div>
  )
}
