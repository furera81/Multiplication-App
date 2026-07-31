import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import type { ApplyTextEditRequest, RgbColor } from '../../shared/ipc'
import { pickStandardFont } from './fontMatch'

const toRgb = (c: RgbColor) => rgb(c.r / 255, c.g / 255, c.b / 255)

const isWhitespace = (ch: string): boolean => /\s/.test(ch)

/**
 * Try to embed the exact font that drew the original text run (extracted
 * client-side from pdf.js's parsed font objects — see
 * renderer/src/lib/pdfjs.ts) and confirm it actually has every glyph the
 * replacement text needs. Falls back to null if the bytes are missing,
 * unparseable, or don't cover the new text.
 *
 * Whitespace is exempted from the coverage check: many subsetted embedded
 * fonts have no space glyph at all (PDF generators often position words with
 * TJ offsets instead of an actual space character), which would otherwise
 * make almost every multi-word edit fall back unnecessarily. We never ask
 * the font to encode whitespace anyway — see drawLineWithManualSpacing.
 */
async function tryEmbedOriginalFont(
  doc: PDFDocument,
  fontBytes: ArrayBuffer | undefined,
  newText: string
): Promise<PDFFont | null> {
  if (!fontBytes) return null
  try {
    doc.registerFontkit(fontkit)
    const font = await doc.embedFont(new Uint8Array(fontBytes), { subset: false })
    const supported = new Set(font.getCharacterSet())
    const covered = [...newText].every(
      (ch) => isWhitespace(ch) || supported.has(ch.codePointAt(0) ?? -1)
    )
    return covered ? font : null
  } catch {
    return null
  }
}

/**
 * Draws text word-by-word instead of as one string, advancing the cursor by
 * measured word widths plus an estimated space width. This sidesteps fonts
 * (common in subsetted embeds) that have no actual space glyph, which
 * otherwise renders as a visible .notdef box for every space.
 */
function drawLineWithManualSpacing(
  page: PDFPage,
  text: string,
  opts: { x: number; y: number; size: number; font: PDFFont; color: ReturnType<typeof rgb> }
): void {
  const spaceWidth = opts.size * 0.27
  const tokens = text.split(/(\s+)/)
  let cursorX = opts.x
  for (const token of tokens) {
    if (token === '') continue
    if (isWhitespace(token[0])) {
      cursorX += spaceWidth * token.length
      continue
    }
    page.drawText(token, { x: cursorX, y: opts.y, size: opts.size, font: opts.font, color: opts.color })
    cursorX += opts.font.widthOfTextAtSize(token, opts.size)
  }
}

/**
 * PDFs don't have "editable text" the way a word processor does — glyphs are
 * positioned drawing instructions, often referencing subsetted embedded
 * fonts that don't contain arbitrary new characters. Rewriting a PDF's
 * content stream in place to reflow text is impractical for arbitrary
 * documents. Instead we use the same technique most lightweight PDF editors
 * use: paint over the original glyphs with the sampled background color
 * (redact), then draw the new text on top at the same position (redraw).
 * This is visually indistinguishable from a real edit for the common case
 * of single-line text replacement — and looks especially convincing when we
 * can reuse the document's own embedded font instead of a generic standard
 * one.
 */
export async function applyTextEdit(
  req: ApplyTextEditRequest
): Promise<{ bytes: Uint8Array; usedFallbackFont: boolean }> {
  const doc = await PDFDocument.load(req.bytes)
  const page = doc.getPage(req.pageIndex)

  const originalFont = await tryEmbedOriginalFont(doc, req.fontBytes, req.newText)
  const usedFallbackFont = !!req.fontBytes && !originalFont
  const font =
    originalFont ??
    (await doc.embedFont(pickStandardFont(req.fontFamilyHint, req.bold, req.italic)))

  // Redact: cover the original run with the sampled background color, with a
  // small margin so antialiased glyph edges don't peek out.
  const margin = 1
  page.drawRectangle({
    x: req.eraseBox.x - margin,
    y: req.eraseBox.y - margin,
    width: req.eraseBox.width + margin * 2,
    height: req.eraseBox.height + margin * 2,
    color: toRgb(req.coverColor)
  })

  // Redraw: pdf-lib positions text by its baseline, but eraseBox.y is the
  // bottom of the original glyph bounding box. Standard Latin fonts have a
  // descender of roughly 20% of the em size, so nudge the baseline up by
  // that much to land the new text where the old glyphs sat.
  drawLineWithManualSpacing(page, req.newText, {
    x: req.eraseBox.x,
    y: req.eraseBox.y + req.fontSize * 0.2,
    size: req.fontSize,
    font,
    color: toRgb(req.textColor)
  })

  return { bytes: await doc.save(), usedFallbackFont }
}
