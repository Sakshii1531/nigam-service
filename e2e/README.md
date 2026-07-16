# Nigam Care — E2E (Playwright)

End-to-end tests against the **real, running** backend HTTP API (and, from roadmap
Phase 13 onward, the real frontend UI once it's wired to real APIs — not mocks).

## Why this exists

Standing project rule: **every roadmap phase ends with a full green run of this suite**
before it's committed as a checkpoint. `api/` must cover every route currently mounted
in `backend/src/app.js` — no route ships without a spec here. If anything is red, the
phase is not done: no commit, no moving on.

## Running

```bash
cd e2e
npm install
npx playwright install --with-deps chromium   # first time only
npm test
```

`playwright.config.js` boots the backend itself (`webServer`) against a dedicated
`nigam_care_e2e` Mongo database on port 4100, so this never collides with a `npm run dev`
instance you might have running on the default port/database. `global-setup.js` runs the
real `backend/scripts/seed.js` (idempotent) against that same database first, so
catalog/booking specs have real categories, services, and a technician to work with —
one seed source of truth, not a duplicated fixture.

## Structure

- `api/` — HTTP-level specs, one file per backend module (grows alongside `backend/src/modules/`).
- `ui/` — added once the frontend is wired to real APIs (Phase 13); browser-driven specs.
- `global-setup.js` — seeds the e2e database once before the suite runs.
