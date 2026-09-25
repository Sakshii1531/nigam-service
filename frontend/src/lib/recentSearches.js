// The customer's own recent searches, kept on this device only (a
// convenience, not data anyone else needs). Storage can be unavailable —
// private windows, blocked site data — so every access is guarded.
const KEY = 'ncc_recent_searches';
const MAX = 5;

export function readRecentSearches() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list.filter((x) => x && x.label && x.deepLink).slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function rememberSearch(entry) {
  try {
    const next = [entry, ...readRecentSearches().filter((x) => x.deepLink !== entry.deepLink)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage unavailable — nothing to remember
  }
}
