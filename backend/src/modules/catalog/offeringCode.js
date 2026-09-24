import { ServiceOffering } from './serviceOffering.model.js';

// Readable offering codes in the client's style — AC-SPLIT-15T-INSTALL,
// TV-LED-55-65-INSTALL, ELEC-FAN-INSTALL — suggested from the names so admins
// don't invent a new convention per offering. Editable before first save,
// immutable after (ServiceOffering pre-save guard).

const WORD_CODES = {
  installation: 'INSTALL',
  install: 'INSTALL',
  uninstallation: 'UNINSTALL',
  uninstall: 'UNINSTALL',
  electrical: 'ELEC',
  electrician: 'ELEC',
  cleaning: 'CLEAN',
  consultation: 'CONSULT',
  consultancy: 'CONSULT',
  inspection: 'INSPECT',
  maintenance: 'MAINT',
  replacement: 'REPLACE',
  refilling: 'REFILL',
  washing: 'WASH',
  machine: '',
  and: '',
  the: '',
  service: '',
};

function tokens(text) {
  return String(text || '')
    .replace(/(\d+(?:\.\d+)?)\s*ton\b/gi, (_, n) => `${n.replace('.', '')}T`)
    .replace(/(\d+)\s*(?:inch|in|")/gi, '$1')
    .replace(/(\d+)\s*l\b/gi, '$1L')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => {
      const mapped = WORD_CODES[word.toLowerCase()];
      return mapped === undefined ? word.toUpperCase() : mapped;
    })
    .filter(Boolean);
}

/** Drops words already said by an earlier part — "AC" + "Split AC" → AC-SPLIT, not AC-SPLIT-AC. */
function dedupe(parts) {
  const seen = new Set();
  return parts.filter((part) => (seen.has(part) ? false : (seen.add(part), true)));
}

/**
 * Pure: builds a code from names. `category` is the category's short key or
 * name ("AC", "TV", "Electrician"); the others are display names/labels.
 */
export function buildOfferingCode({ category, productType, variant, service }) {
  const parts = dedupe([
    ...tokens(category),
    ...tokens(productType),
    ...tokens(variant),
    ...tokens(service),
  ]);
  return parts.join('-');
}

/** buildOfferingCode, suffixed -2, -3 … until it doesn't collide with an existing offering. */
export async function suggestOfferingCode(names) {
  const base = buildOfferingCode(names);
  let candidate = base;
  for (let n = 2; await ServiceOffering.exists({ code: candidate }); n += 1) {
    candidate = `${base}-${n}`;
  }
  return candidate;
}
