import { StandardFonts } from 'pdf-lib'

/**
 * Best-effort mapping from a CSS-ish font family hint (pdf.js's
 * `TextStyle.fontFamily`, e.g. "serif", "monospace", `"${name},sans-serif"`)
 * to the closest of the 14 PDF standard fonts. Used when we don't have the
 * original embedded font bytes to work with (or they turned out unusable).
 */
export function pickStandardFont(
  fontFamilyHint: string | undefined,
  bold: boolean,
  italic: boolean
): StandardFonts {
  const hint = (fontFamilyHint ?? '').toLowerCase()

  if (hint.includes('monospace') || hint.includes('courier') || hint.includes('mono')) {
    if (bold && italic) return StandardFonts.CourierBoldOblique
    if (bold) return StandardFonts.CourierBold
    if (italic) return StandardFonts.CourierOblique
    return StandardFonts.Courier
  }

  if (
    hint.includes('serif') &&
    !hint.includes('sans-serif') &&
    !hint.includes('sans serif')
  ) {
    if (bold && italic) return StandardFonts.TimesRomanBoldItalic
    if (bold) return StandardFonts.TimesRomanBold
    if (italic) return StandardFonts.TimesRomanItalic
    return StandardFonts.TimesRoman
  }

  if (bold && italic) return StandardFonts.HelveticaBoldOblique
  if (bold) return StandardFonts.HelveticaBold
  if (italic) return StandardFonts.HelveticaOblique
  return StandardFonts.Helvetica
}
