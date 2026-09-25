# Phase 15 — Remove the Finance Page; Review Search Synonyms

| | |
|---|---|
| **Status** | ✅ Done (2026-09-25) |
| **Depends on** | Phase 14 |

## Goal

The finance offer page is removed from the app. The search synonym list is kept only if it helps and causes no wrong results; anything in it that causes wrong matches is fixed.

---

## Tasks

- [x] Delete `pages/FinanceDetails.jsx` and its `/finance/:type` route (no other screen links to it; the "Easy EMI" labels elsewhere are payment-method options, not this page)
- [x] Review `searchSynonyms.js` for logic problems: words in two groups (they chain unrelated meanings), and groups containing a stop word (they can never match); fix them or remove them
- [x] Decide keep / remove from measured behaviour (the client's search examples + typo / synonym tests)
- [x] Re-confirm the two bugs fixed earlier (declined offer coming back — Phase 14; unreachable Buy pages — Phase 13) with their tests

---

## Implementation Log

| Date | Commit | Notes |
|---|---|---|
| 2026-09-25 | see Phase 18 | Finance page deleted; 3 synonym problems fixed; `catalogSearch.test.js` 19 tests (2 new) |

**Finance page.** `pages/FinanceDetails.jsx` and its `/finance/:type` route are deleted. No screen linked to them. The "Easy EMI" labels on the AMC, Buy and Exchange pages are payment-method choices and stay.

**Synonyms: kept, with 3 fixes.** The list is what makes everyday words work ("fridge" finds Refrigerator, "television" finds TV, "plumbing" finds Plumber), and the client's search examples depend on it, so it stays. Tracing every group through the matcher found three real problems, now fixed:

| Problem | Effect | Fix |
|---|---|---|
| "washing" was in both the washing-machine group and the cleaning group | Groups chain together, so a search for **clean** also matched every Washing Machine service | "washing" removed from the cleaning group |
| "wiring" was a synonym of "electrician" | A search for **wiring** returned all 7 electrician services instead of Wiring Repair | removed: a specific job is not a synonym of a trade |
| "service" was in a group but is a stop word | That entry could never match | removed |

Two new tests keep the list safe:
- no word may appear in two groups, and no stop word may appear at all;
- "clean" doesn't match washing-machine repairs, and "wiring" returns only Wiring Repair.

The rules are also written at the top of `searchSynonyms.js`.

**The two bugs from the previous round** were already fixed and are covered by tests:
- a declined offer coming back to the same partner: backend test in `serviceProviderJob.test.js`, plus the UI decline spec;
- the unreachable Buy pages: fixed in Phase 13, and a browser test is added in Phase 18.
