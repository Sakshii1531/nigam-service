// Colour themes an admin can pick for a Brands & Offers card. The gradient is a
// set of Tailwind classes, so each one is written out in full here (Tailwind
// only generates classes it can find in the source) and the card component
// applies whatever string the CMS stored. `textColor` is the brand name / badge
// colour that reads well on that gradient.
export const BRAND_CARD_THEMES = [
  { id: 'blue', label: 'Blue', gradient: 'from-[#E3F2FD] via-[#F4F9FF] to-[#D5E6FF]', textColor: '#014694' },
  { id: 'green', label: 'Green', gradient: 'from-[#E8F5E9] via-[#F6FAF6] to-[#D2E8D4]', textColor: '#1B5E20' },
  { id: 'indigo', label: 'Indigo', gradient: 'from-[#F0F4FF] via-[#F7F9FF] to-[#E1E8FF]', textColor: '#00529C' },
  { id: 'pink', label: 'Pink', gradient: 'from-[#FCE4EC] via-[#FFF1F3] to-[#F8BBD0]', textColor: '#C30F42' },
  { id: 'orange', label: 'Orange', gradient: 'from-[#FFF3E0] via-[#FFF8EF] to-[#FFE0B2]', textColor: '#E65100' },
  { id: 'purple', label: 'Purple', gradient: 'from-[#F3E5F5] via-[#FAF3FB] to-[#E1BEE7]', textColor: '#6A1B9A' },
  { id: 'teal', label: 'Teal', gradient: 'from-[#E0F2F1] via-[#F1FAF9] to-[#B2DFDB]', textColor: '#00695C' },
  { id: 'slate', label: 'Slate', gradient: 'from-[#ECEFF1] via-[#F6F8F9] to-[#CFD8DC]', textColor: '#37474F' },
];

export const DEFAULT_BRAND_CARD_THEME = BRAND_CARD_THEMES[0];

/** The theme a stored card uses (falls back to the first one for older cards). */
export const themeOf = (card) =>
  BRAND_CARD_THEMES.find((t) => t.gradient === card?.gradient) || { ...DEFAULT_BRAND_CARD_THEME, gradient: card?.gradient || DEFAULT_BRAND_CARD_THEME.gradient, textColor: card?.textColor || DEFAULT_BRAND_CARD_THEME.textColor };
