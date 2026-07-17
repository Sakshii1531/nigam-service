# Deployment (Phase 12)

This document is the buildable half of Phase 12. The other half — actually
connecting a Render account and clicking "deploy" — needs the user; nobody
else has the credentials or the authority to create billing-linked
infrastructure on someone else's behalf. Everything below is either already
done (CI) or a ready-to-run set of steps once the account exists.

## What's already built

- **`.github/workflows/backend-ci.yml`** — runs on every PR and push to `main`
  touching `backend/`, `e2e/`, or the workflow file itself. Two jobs: lint +
  full Jest suite (against a `mongo:6` service container), then Playwright E2E
  (API-only — no browser binaries installed, since every spec uses Playwright's
  `request` fixture, not a real browser). This is CI's job — it does **not**
  deploy anything; deployment is Render's job below, triggered separately by
  Render watching the same GitHub repo.
- **`render.yaml`** — a Render Blueprint at the repo root. Defines one web
  service (`nigam-care-backend`), rooted at `backend/`, `npm ci` build, `npm
  start` run, health check wired to the existing `GET /api/v1/health` route
  (already returns `{ data: { status: 'ok', db: 'connected' } }` — see
  `src/modules/health/health.routes.js`, built in Phase 0). Every secret
  (`MONGODB_URI`, JWT secrets, S3, Razorpay) is marked `sync: false` — the
  blueprint deliberately does not and cannot supply real values; Render will
  prompt for them once when the blueprint is applied.

## What the user needs to do (cannot be done from this session)

1. **Create/log into a Render account** at render.com, connect the GitHub
   account that owns this repo (or the org it lives in).
2. **New + → Blueprint**, point it at this repo. Render will read
   `render.yaml` and propose the `nigam-care-backend` web service.
3. **Fill in the `sync: false` secrets** when prompted (or afterward in the
   service's Environment tab):
   - `MONGODB_URI` — the existing Atlas connection string already in local
     `backend/.env` (gitignored, never committed) works as-is; Atlas is
     already decoupled from app hosting (see Phase 0/the dev-DB-migration note
     in `project_backend_build_progress` memory), so no new database needs
     provisioning for this step. **Confirm Atlas's Network Access list allows
     Render's egress IPs** (or `0.0.0.0/0` if the plan doesn't offer static
     IPs — acceptable short-term since the connection string itself is the
     real secret, not the IP allowlist, but tighten this once Render's static
     outbound IP feature is available on the plan in use).
   - `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — generate fresh, random,
     production-only values (e.g. `openssl rand -hex 32`), **do not reuse**
     the dev defaults from `.env.example` or any value that has ever been
     committed to git. `config/env.js`'s Phase 11 fix will refuse to boot in
     production if either is left empty, so this step is enforced, not just
     documented.
   - `CORS_ORIGINS` — the real deployed frontend origin(s), comma-separated,
     once Phase 13 gives it one.
   - `S3_*` / `RAZORPAY_*` — leave blank for now if those integrations are
     still stubbed (file upload falls back to local disk if `S3_ENDPOINT` is
     unset per `shared/fileUpload.js`; payments use the stub gateway per
     `payments-wallet/paymentGateway.js`) — both are open questions already
     tracked, see the Phase 15 addendum.
4. **Deploy.** Render builds and boots the service; watch the deploy log for
   the `[env] FATAL: ...` startup check — if a required secret was missed,
   the service will exit immediately with a clear message rather than boot
   insecurely (Phase 11 fix).
5. **Verify**: `curl https://<the-render-url>/api/v1/health` returns 200 with
   `db: 'connected'`. This is the phase's actual exit criterion; nothing else
   in this checklist substitutes for actually seeing it return 200 from the
   public internet.
6. **Confirm auto-deploy**: merge any small PR to `main` and watch Render pick
   it up automatically (`autoDeploy: true` in `render.yaml`) — this is the
   second half of the exit criterion ("a PR merge to main auto-deploys").

## Not needed right now

- No changes to `backend/src/` were required for this phase — the app was
  already 12-factor-clean (config from env vars, `PORT` respected, stateless
  except for the already-decoupled Atlas DB, structured logs to stdout via
  `pino`), so there was nothing to retrofit before it could run on Render.
