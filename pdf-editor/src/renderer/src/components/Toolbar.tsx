import type { EditorMode } from '../lib/types'

interface Props {
  fileName: string | null
  dirty: boolean
  page: number
  numPages: number
  zoom: number
  mode: EditorMode
  busy: boolean
  onOpen: () => void
  onSave: () => void
  onSaveAs: () => void
  onPageChange: (page: number) => void
  onZoomChange: (zoom: number) => void
  onModeChange: (mode: EditorMode) => void
}

export default function Toolbar({
  fileName,
  dirty,
  page,
  numPages,
  zoom,
  mode,
  busy,
  onOpen,
  onSave,
  onSaveAs,
  onPageChange,
  onZoomChange,
  onModeChange
}: Props): React.JSX.Element {
  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button type="button" onClick={onOpen}>
          Open
        </button>
        <button type="button" onClick={onSave} disabled={!fileName || busy}>
          Save
        </button>
        <button type="button" onClick={onSaveAs} disabled={!fileName || busy}>
          Save As
        </button>
      </div>

      <div className="toolbar-group filename">
        {fileName ? (
          <span>
            {fileName}
            {dirty && <span className="dirty-dot" title="Unsaved changes" />}
          </span>
        ) : (
          <span className="muted">No document open</span>
        )}
      </div>

      {fileName && (
        <>
          <div className="toolbar-group">
            <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
              ‹
            </button>
            <span>
              Page{' '}
              <input
                type="number"
                min={1}
                max={numPages}
                value={page}
                onChange={(e) => onPageChange(Number(e.target.value) || 1)}
              />{' '}
              / {numPages}
            </span>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= numPages}
            >
              ›
            </button>
          </div>

          <div className="toolbar-group">
            <button type="button" onClick={() => onZoomChange(zoom - 0.15)}>
              −
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => onZoomChange(zoom + 0.15)}>
              +
            </button>
          </div>

          <div className="toolbar-group mode-switch">
            {(
              [
                ['view', 'View'],
                ['edit-native', 'Edit Text'],
                ['edit-ocr', 'OCR & Fix Text']
              ] as [EditorMode, string][]
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                className={mode === m ? 'active' : ''}
                onClick={() => onModeChange(m)}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
