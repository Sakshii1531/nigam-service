# Nigam Care — Backend

Express + MongoDB (Mongoose) API for the Nigam Care platform. Built module-by-module against the phased roadmap in `../BACKEND_CONTEXT.md` (data model) and the plan this repo was scaffolded from (`Phase 0` = this scaffold).

## Stack

- Node.js + Express (JavaScript, ESM — `"type": "module"`)
- MongoDB via Mongoose (local `mongod` for dev, Atlas recommended for staging/prod — see `.env.example`)
- JWT auth, Socket.IO (from Phase 9), Multer + S3-compatible storage (from Phase 2/10)
- Jest + Supertest for tests, run against a local `mongod` on a dedicated `*_test` database (`MONGODB_TEST_URI`, defaults to `mongodb://127.0.0.1:27017/nigam_care_test`)

## Getting started

> **Node version:** use Node 22 LTS (`.nvmrc`), not the system default if it's newer.
> Homebrew's Node 26.x + npm 11.17 was found to silently fail mid-`npm install` on this
> project's dependency tree (no error text, just an aborted resolve) — installing
> `node@22` alongside it (`brew install node@22`) and running `npm install` with that on
> `PATH` fixed it. If you use `nvm`, `nvm use` in this folder picks it up automatically.

```bash
cp .env.example .env     # adjust MONGODB_URI etc. if not using the local default
npm install
npm run dev               # nodemon, watches src/
```

`GET /api/v1/health` should return `{ data: { status: "up", db: "connected", ... } }` once a local `mongod` is reachable (this repo assumes one is already running via `brew services start mongodb-community`).

## Structure

Feature-module layout, not MVC-by-type — each module under `src/modules/<name>/` owns its own routes/controller/service/model/validation/tests as it's built out. See the `README.md` inside each module folder for its scope and which roadmap phase builds it. Shared plumbing lives in `src/config/`, `src/middleware/`, `src/utils/`; cross-cutting domain services (ID generation, warranty computation, pricing, file upload) live in `src/modules/shared/`.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start with nodemon (auto-restart on change) |
| `npm start` | Start once, no watcher (used in deploy) |
| `npm test` | Run the Jest suite (`--experimental-vm-modules` for native ESM) |
| `npm run lint` | ESLint |

## Docs

- `docs/DATA_MODEL.md` — written in Phase 1, the schema-per-collection contract the rest of the build follows.
- `docs/api-collection.json` — Postman/Thunder-Client collection, grows phase by phase.
