# PDF Editor (desktop)

A cross-platform desktop app (Electron + React + TypeScript) for editing PDF
text in place and OCR'ing scanned documents so their text becomes editable
and searchable — not just annotation overlays.

## Features

- **Open/View** — renders PDFs with [pdf.js](https://mozilla.github.io/pdf.js/), page navigation and zoom.
- **Edit Text** mode — click any run of real text in the PDF and change it. The app covers the original glyphs with the sampled background color and draws the replacement text in the same position/size. It re-embeds the *original run's own font* (extracted client-side from pdf.js) whenever possible, so edited text matches the surrounding document instead of visibly switching to a generic substitute; size and both colors are adjustable in the popover, and Bold/Italic are available as a manual fallback when the original font can't be reused.
- **OCR & Fix Text** mode — for scanned/image-only pages, run OCR ([Tesseract.js](https://github.com/naptha/tesseract.js), 16 bundled languages) to recognize text line-by-line. Click any recognized line to correct it and "burn" it into the page as real vector text, using the same redact-and-redraw mechanism as native editing.
- **Make Document Searchable** — batch OCRs every image-only page and embeds an invisible text layer over the original scan (the same "sandwich PDF" technique tools like OCRmypdf use), so the whole document becomes selectable/searchable/copyable without changing how it looks.
- **Undo / Redo** — full-document snapshot history (toolbar buttons + Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z), spanning edits, OCR corrections, and Make Searchable.
- **Save / Save As** with unsaved-changes tracking.

## Why redact-and-redraw instead of "real" text editing?

PDFs don't store text the way a word processor does. Glyphs are positioned
drawing instructions in a content stream, frequently referencing **subsetted**
embedded fonts that literally don't contain the glyphs for characters you
might want to type in. There is no general, reliable way to "reflow" or
mutate an arbitrary PDF's existing text runs in place. Every mainstream
lightweight PDF editor (and this app) works around this the same way:

1. Paint over the original text's bounding box with the surrounding
   background color (sampled automatically from the page, adjustable).
2. Draw the replacement text on top, in the same position, using a standard
   font.

This is visually indistinguishable from a real edit for typical documents.
Font/size/color are heuristically estimated from the PDF's text metrics (or
the OCR bounding box for scanned pages) and are always editable before you
apply the change.

### Font matching

The step that used to look worst — the replacement text rendering in a
generic Helvetica no matter what the document actually used — now reuses the
document's own font. pdf.js already parses and transcodes every embedded
font it needs to render a page; loading the PDF with `fontExtraProperties:
true` (see `renderer/src/lib/pdfjs.ts` → `loadPdf`) keeps those raw font
program bytes around instead of discarding them after use, and
`getEmbeddedFontBytes()` pulls them out via `page.commonObjs`. When you
apply an edit, the main process (`main/pdf/textEdit.ts`) re-embeds that exact
font with `@pdf-lib/fontkit` and checks `font.getCharacterSet()` to confirm
it actually contains every character you typed (subsetted fonts often only
include the glyphs the original document used). If the font is missing,
unparseable, or doesn't cover the new text, it falls back to the closest of
the 14 PDF standard fonts, picked from pdf.js's family hint (serif →
Times, monospace → Courier, else Helvetica) plus the Bold/Italic checkboxes
— and the UI shows a small notice so you know a substitute was used.

One more wrinkle worth knowing about: many subsetted fonts have *no space
glyph at all* — PDF generators often position words with raw offsets instead
of an actual space character. Drawing a literal space through such a font
renders a visible `.notdef` box, so replacement text is laid out word-by-word
with a measured/estimated gap instead of drawn as one string.

## Architecture

- **Main process** (`src/main`) owns all PDF mutation (via
  [`pdf-lib`](https://pdf-lib.js.org/)) and OCR (via `tesseract.js` running in
  Node, with trained-language data cached under the app's `userData`
  directory so it only downloads once). IPC handlers are stateless
  request/response: the renderer always sends the current document bytes and
  gets back new bytes, so there's a single source of truth for document
  state living in the renderer.
- **Preload** (`src/preload`) exposes a narrow, typed `window.pdfEditor` API
  via `contextBridge` — no direct Node/IPC access from the renderer.
- **Renderer** (`src/renderer`) is a React app that renders pages with
  pdf.js, extracts text-run geometry for the click-to-edit overlay, converts
  between PDF user space and screen pixels, and drives OCR/edit requests.

## Limitations (be aware of these before relying on it for production use)

- Editing works best on single lines of text; multi-line paragraph reflow
  isn't supported (each pdf.js "text run" is edited independently).
- Font matching only applies to native text edits (the original run has an
  associated PDF font). OCR corrections and text on non-embedded/system
  fonts always use the standard-font fallback, which only covers WinAnsi
  encoding — non-Latin scripts there would need an embedded Unicode font.
- The estimated space width used for manual word-spacing (see "Font
  matching" above) is a fixed heuristic (27% of the font size), not measured
  from the specific font, so very wide/narrow fonts may look very slightly
  off in word spacing.
- OCR accuracy depends on scan quality; always review recognized text before
  applying a correction.
- The invisible OCR text layer used for "Make Searchable" approximates true
  PDF invisible-text render mode using 0% opacity — supported by all major
  PDF viewers for selection/search/copy, but some PDF tooling that inspects
  render mode explicitly may treat it differently.

## Development

```bash
npm install
npm run dev        # launches the Electron app with hot reload
npm run typecheck
```

## Building installers

```bash
npm run dist:mac     # .dmg
npm run dist:win     # NSIS installer
npm run dist:linux   # AppImage
```

## Adding OCR languages

The language picker in the OCR bar includes 16 common languages
(`src/shared/ipc.ts` → `OCR_LANGUAGES`). Tesseract.js downloads and caches
the `.traineddata` file for a language the first time it's used; add more
entries to that list (any [tessdata](https://github.com/tesseract-ocr/tessdata) language code) to support them.
