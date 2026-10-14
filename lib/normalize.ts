/**
 * Normalize comment/keyword text for Persian and Arabic matching.
 *
 * - Arabic Yeh/Kaf → Persian Yeh/Kaf
 * - Strip Arabic/Persian diacritics, ZWNJ, and tatweel (kashida)
 * - Persian and Arabic-Indic digits → ASCII
 * - Collapse whitespace, lowercase for Latin
 */
const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const PERSIAN_DIGIT_OFFSET = 0x06f0 - 48;
const ARABIC_DIGIT_OFFSET = 0x0660 - 48;

export function normalizeText(input: string | null | undefined): string {
  if (!input) return "";

  return input
    .normalize("NFC")
    .replaceAll("ي", "ی")
    .replaceAll("ك", "ک")
    .replace(ARABIC_DIACRITICS, "")
    .replaceAll("\u200C", "")
    .replaceAll("\u0640", "")
    .replace(/[\u06F0-\u06F9]/g, (digit) =>
      String.fromCharCode(digit.charCodeAt(0) - PERSIAN_DIGIT_OFFSET),
    )
    .replace(/[\u0660-\u0669]/g, (digit) =>
      String.fromCharCode(digit.charCodeAt(0) - ARABIC_DIGIT_OFFSET),
    )
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
