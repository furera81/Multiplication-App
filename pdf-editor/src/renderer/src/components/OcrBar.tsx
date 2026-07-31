import { OCR_LANGUAGES } from '@shared/ipc'

interface Props {
  selectedLanguages: string[]
  onChangeLanguages: (languages: string[]) => void
  onMakeSearchable: () => void
  makeSearchableBusy: boolean
  progressLabel: string | null
}

export default function OcrBar({
  selectedLanguages,
  onChangeLanguages,
  onMakeSearchable,
  makeSearchableBusy,
  progressLabel
}: Props): React.JSX.Element {
  function toggleLanguage(code: string): void {
    if (selectedLanguages.includes(code)) {
      if (selectedLanguages.length === 1) return
      onChangeLanguages(selectedLanguages.filter((c) => c !== code))
    } else {
      onChangeLanguages([...selectedLanguages, code])
    }
  }

  return (
    <div className="ocr-bar">
      <div className="ocr-bar-languages">
        <span className="muted">OCR languages:</span>
        {OCR_LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            type="button"
            className={`chip ${selectedLanguages.includes(lang.code) ? 'active' : ''}`}
            onClick={() => toggleLanguage(lang.code)}
          >
            {lang.label}
          </button>
        ))}
      </div>
      <div className="ocr-bar-actions">
        {progressLabel && <span className="muted progress-label">{progressLabel}</span>}
        <button type="button" className="primary" onClick={onMakeSearchable} disabled={makeSearchableBusy}>
          {makeSearchableBusy ? 'Processing…' : 'Make Whole Document Searchable'}
        </button>
      </div>
    </div>
  )
}
