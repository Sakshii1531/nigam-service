// The product shows pictures (uploaded images) and line icons — never emoji
// characters. These helpers keep emoji out of data an admin can type or paste,
// and strip them from text the server composes itself.

// Colour-picture emoji, ZWJ / variation-selector sequences and flag pairs.
// Typographic symbols (— – … ₹ ✓ × → •) are deliberately not matched.
const EMOJI_SEQUENCE =
  /(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F|[\u{1F1E6}-\u{1F1FF}])(?:\u200D(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F?))*\uFE0F?/gu;

export const hasEmoji = (value) => typeof value === 'string' && new RegExp(EMOJI_SEQUENCE.source, 'u').test(value);

/** Removes emoji and the single space that followed each one. */
export const stripEmoji = (value) =>
  typeof value === 'string' ? value.replace(new RegExp(`${EMOJI_SEQUENCE.source}[ \t]?`, 'gu'), '') : value;

export const NO_EMOJI_MESSAGE = 'Emoji are not allowed — upload a picture instead';
