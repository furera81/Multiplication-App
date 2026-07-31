import { useState } from 'react'
import type { ScreenRect } from '../lib/geometry'
import { hexToRgb, rgbToHex, type EditableRegion, type RgbColor } from '../lib/types'

interface Props {
  region: EditableRegion
  screenRect: ScreenRect
  sampledCoverColor: RgbColor
  onCancel: () => void
  onCommit: (values: {
    text: string
    fontSize: number
    bold: boolean
    italic: boolean
    textColor: RgbColor
    coverColor: RgbColor
  }) => void
  busy: boolean
}

export default function EditPopover({
  region,
  screenRect,
  sampledCoverColor,
  onCancel,
  onCommit,
  busy
}: Props): React.JSX.Element {
  const [text, setText] = useState(region.text)
  const [fontSize, setFontSize] = useState(Math.round(region.fontSize))
  const [bold, setBold] = useState(false)
  const [italic, setItalic] = useState(false)
  const [textColor, setTextColor] = useState('#000000')
  const [coverColor, setCoverColor] = useState(rgbToHex(sampledCoverColor))

  const top = screenRect.top + screenRect.height + 8
  const left = Math.max(8, screenRect.left)
  const hasOriginalFont = !!region.fontBytes

  return (
    <div className="edit-popover" style={{ top, left }} onClick={(e) => e.stopPropagation()}>
      <textarea
        autoFocus
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Replacement text"
      />
      {hasOriginalFont && (
        <div className="font-badge" title="Reusing the document's own embedded font for this run">
          ✓ Matches original font
        </div>
      )}
      <div className="edit-popover-row">
        <label>
          Size
          <input
            type="number"
            min={1}
            max={200}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value) || 1)}
          />
        </label>
        <label className={`checkbox ${hasOriginalFont ? 'disabled' : ''}`}>
          <input
            type="checkbox"
            checked={bold}
            disabled={hasOriginalFont}
            onChange={(e) => setBold(e.target.checked)}
          />
          Bold
        </label>
        <label className={`checkbox ${hasOriginalFont ? 'disabled' : ''}`}>
          <input
            type="checkbox"
            checked={italic}
            disabled={hasOriginalFont}
            onChange={(e) => setItalic(e.target.checked)}
          />
          Italic
        </label>
        <label>
          Text
          <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
        </label>
        <label>
          Cover
          <input
            type="color"
            value={coverColor}
            onChange={(e) => setCoverColor(e.target.value)}
          />
        </label>
      </div>
      <div className="edit-popover-actions">
        <button type="button" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button
          type="button"
          className="primary"
          disabled={busy}
          onClick={() =>
            onCommit({
              text,
              fontSize,
              bold,
              italic,
              textColor: hexToRgb(textColor),
              coverColor: hexToRgb(coverColor)
            })
          }
        >
          {busy ? 'Applying…' : 'Apply'}
        </button>
      </div>
    </div>
  )
}
