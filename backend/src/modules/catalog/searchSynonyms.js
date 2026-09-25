// Words customers use for the same thing (docs/master-catalogue Phase 11).
// Each group is interchangeable in search: typing any word in a group also
// matches the others. Single words only; keep them lower-case and singular
// (the search stems plurals). Add freely — no other code changes needed.
// Rules (tests/catalogSearch.test.js checks them): a word may be in only one
// group — two groups sharing a word would chain unrelated meanings ("washing"
// in both machine and cleaning made "clean" match washing-machine repairs) —
// and no stop word ("service", "near"…), since those are dropped from queries.
// A specific job ("wiring") is not a synonym of a trade ("electrician").
export const SYNONYM_GROUPS = [
  ['fridge', 'refrigerator', 'freezer'],
  ['tv', 'television', 'led'],
  ['ac', 'aircon', 'airconditioner'],
  ['wm', 'washer', 'washing'],
  ['ro', 'purifier', 'aquaguard'],
  ['geyser', 'geezer', 'heater'],
  ['cctv', 'camera', 'cam'],
  ['microwave', 'oven', 'otg'],
  ['install', 'installation', 'fitting', 'setup', 'mount', 'mounting'],
  ['uninstall', 'uninstallation', 'removal', 'dismantle'],
  ['repair', 'fix', 'repairing', 'broken'],
  ['clean', 'cleaning', 'wash'],
  ['servicing', 'maintenance'],
  ['gas', 'refrigerant'],
  ['refill', 'refilling', 'topup'],
  ['electrician', 'electrical', 'electric'],
  ['plumber', 'plumbing'],
  ['carpenter', 'carpentry'],
  ['painter', 'painting', 'paint'],
  ['pest', 'insect', 'bug'],
  ['shifting', 'moving', 'packer', 'mover', 'relocation'],
  ['sofa', 'couch'],
  ['tank', 'sump'],
];

const index = new Map();
for (const group of SYNONYM_GROUPS) {
  for (const word of group) {
    const others = index.get(word) || new Set();
    for (const other of group) if (other !== word) others.add(other);
    index.set(word, others);
  }
}

/** The other words that mean `word` (empty when it has none). */
export const synonymsOf = (word) => index.get(word) || new Set();
