// Text-area ↔ string-array helpers for the Master Catalogue forms.

/** One-per-line text ↔ string array (included / excluded lists). `commas` also splits on commas (keywords). */
export const listToText = (list, separator = '\n') => (list || []).join(separator);
export const textToList = (text, { commas = false } = {}) =>
  String(text || '')
    .split(commas ? /\n|,/ : /\n/)
    .map((item) => item.trim())
    .filter(Boolean);
