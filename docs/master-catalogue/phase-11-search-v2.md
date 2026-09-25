# Phase 11 — Search v2

| | |
|---|---|
| **Status** | ✅ Done (2026-09-25) |
| **Depends on** | Phase 6 |

## Goal

Search that forgives how people type: spelling mistakes, short forms, synonyms. It suggests while typing and says what it corrected.

---

## Tasks

- [x] Typo tolerance: a query word matches a catalogue word within edit distance 1 (words of 4–7 letters) or 2 (8+). "instalation" → installation, "refrigrator" → refrigerator
- [x] Synonyms / short forms: fridge ↔ refrigerator, ac ↔ air conditioner, tv ↔ television, wm ↔ washing machine, ro ↔ water purifier, geyser ↔ water heater, cctv ↔ camera, … (one editable list)
- [x] Ranking: exact > synonym > prefix > fuzzy, plus a bonus for words that match the *service* name; ties by price
- [x] Response adds `didYouMean` when fuzzy matching was used; the UI shows "Showing results for installation"
- [x] Popular searches (top categories) shown when the box is focused but empty; recent searches kept per device
- [x] Tests: the client's 6 queries still pass; typo and synonym cases; nonsense still finds nothing

---

## Example

"fridge gas refil" → Refrigerator Gas Refilling (from ₹…), with "Showing results for fridge gas refill".

---

## Implementation Log

| Date | Commit | Notes |
|---|---|---|
| 2026-09-25 | see git log | Matcher rewritten; synonyms module; popular-searches endpoint; typo notice, suggestions and recent searches in the app. `catalogSearch.test.js` 17 tests (5 new); browser check ✓ |

**How a query word matches** (`offeringSearch.service.js`, `searchSynonyms.js`)

| Match | Score | Example |
|---|---|---|
| exact word | 4 | *installation* |
| synonym | 3 | *fridge* → refrigerator, *television* → tv, *plumbing* → plumber |
| prefix (still typing) | 2 | *instal* → installation |
| typo (1 edit; 2 for 9+ letters; same first letter; also against the start of a longer word) | 1 | *instalation*, *refrigrator*, *instalat* |

Every query word must match. Results are then boosted:
- when the offering's own name carries the words (as in Phase 6);
- by +3 for each query word found in the **service** name, so *chimney clean* lists the Deep Cleaning services first rather than every service of the "Auto-Clean" chimney type.

**Search pool.** Search no longer narrows the database query by the longest word, which made typos impossible to find. All bookable offerings (211) are matched in memory. The pre-split word lists are cached per location for 60 s and dropped on any catalogue write (`cachedValue` in `catalogCache.js`).

**API**
- `GET /catalog/search` now returns `didYouMean`, e.g. "ac installation" for "ac instalation", or `null`.
- `GET /catalog/search/popular` returns up to 8 `{ label, deepLink }`: the most-booked services of the last 90 days, topped up with the categories that have the most offerings. It uses real data only.

**Result titles** now name the appliance when the type name doesn't: "Side By Side **Refrigerator** Repair", "Top Load **Washing Machine** Repair". "Split AC Installation" and "LED TV Installation" are unchanged.

**App** (Dashboard search)
- **Focus on an empty box:** shows *Recent* searches (this device, last 5, `lib/recentSearches.js`) and *Popular* searches (`1-suggestions.png`).
- **Corrected query:** "refrigrator repair" shows "Showing results for **refrigerator repair**" (`2-typo.png`).
- **Synonym:** "fridge gas" returns Double Door Refrigerator Gas Refilling … (`3-synonym.png`).

**Examples (live, seeded catalogue)**

| Query | Top results |
|---|---|
| ac instalation | Split AC Installation, Window AC Installation (did you mean: ac installation) |
| fridge gas refill | Refrigerator … Gas Refilling (all types) |
| chimney clean | Auto-Clean / Baffle Filter / Cassette Filter / Filterless Chimney Deep Cleaning |
| tv instal | LED TV Installation |
| zebra grooming | nothing |

**Deviations from plan:** ties are broken by price rather than by "category popularity". Popularity is used for the empty-box suggestions instead.

**Known gaps:** the synonym list is code (`searchSynonyms.js`), not an admin screen.
