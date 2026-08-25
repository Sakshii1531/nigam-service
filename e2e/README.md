# Nigam Care — E2E (Playwright)

End-to-end tests against the **real, running** backend HTTP API (and, from roadmap
Phase 13 onward, the real frontend UI once it's wired to real APIs — not mocks).

## Why this exists

Standing project rule: **every roadmap phase ends with a full green run of this suite**
before it's committed as a checkpoint. `api/` must cover every route currently mounted
in `backend/src/app.js` — no route ships without a spec here. If anything is red, the
phase is not done: no commit, no moving on.

## Two suites

- **`npm test`** — `api/`, the per-phase gate described above. Fast, no browser.
- **`npm run test:ui`** — `ui/`, a small browser smoke suite (`playwright.ui.config.js`).
  Deliberately *not* part of the gate: it starts a Vite dev server and is an order of
  magnitude slower, and the API suite is what guards the backend contract.

`ui/` exists because passing API specs and a passing `vite build` together still prove
nothing about whether the app *renders* — a provider that throws, or a socket listener
that was never attached, breaks no build and fails no API test. It currently covers the
notification path end to end: the app booting with `NotificationProvider` mounted, a
signed-in customer opening the feed, and a broadcast sent **while the feed is open**
appearing over the socket. That last one is the direct regression guard for
`notification:new` having shipped with no frontend listener at all.

It runs on its own ports (`4111`/`5199`) against its own database, and passes the API
origin to Vite explicitly rather than reading `frontend/.env` — otherwise a developer
pointing their local `.env` at a deployed backend would silently change what is tested.

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
