# VPS Migration (Phase 14)

Buildable artifacts only — actually provisioning a VPS, pointing real DNS at
it, and doing the live cutover all need the user (billing, domain ownership,
and a production traffic cutover are not things to automate unattended). This
is the runbook for when that's ready, plus what's already built.

## What's already built

- **`backend/Dockerfile`** — multi-stage build (deps stage with `npm ci
  --omit=dev`, runner stage `COPY --from=deps`), Node 22 Alpine, runs as the
  non-root `node` user, `HEALTHCHECK` wired to the same `GET /api/v1/health`
  Render's blueprint uses (Phase 12) so both hosting paths share one source
  of truth for "is this instance actually up."
- **`deploy/docker-compose.yml`** — one `api` service, `restart:
  unless-stopped` (Docker's own restart policy stands in for a separate PM2
  process manager — one less moving part to operate), bound to
  `127.0.0.1:4000` only (not `0.0.0.0`) so nginx is the sole public entry
  point. No MongoDB service — Atlas stays the database, unchanged from every
  earlier phase; this migration moves compute only.
- **`deploy/nginx.conf`** — reverse proxy + TLS termination, `Upgrade`/
  `Connection` headers wired for Socket.IO's WebSocket upgrade (a plain proxy
  config without these silently downgrades Phase 9's real-time layer to
  long-polling instead of erroring — worth getting right the first time
  rather than debugging it live). Cert paths match Certbot's default
  `--nginx` layout as the pre-certbot starting point.

## Runbook — what the user does when a real VPS exists

1. **Provision a VPS** (any Ubuntu 22.04+ box works; sizing isn't
   dictated by anything backend-specific yet — start small, this is a Node
   API + nginx, not a database). Point DNS's `A` record at it once the IP is
   known, but don't cut traffic over yet.
2. **Install Docker + Docker Compose plugin, nginx, certbot** on the VPS
   (`apt install docker.io docker-compose-plugin nginx certbot
   python3-certbot-nginx` on Ubuntu).
3. **Clone this repo** onto the VPS (or set up a deploy pipeline later —
   manual clone is fine for the first cutover).
4. **Create `backend/.env` on the VPS** with real production values — same
   secrets as the Render deployment (Phase 12's `DEPLOYMENT.md`), the Atlas
   connection string is already shared infrastructure so no new database
   step is needed here.
5. **Bring the API container up**: `docker compose -f deploy/docker-compose.yml
   up -d --build` from the repo root. Confirm `curl http://127.0.0.1:4000/api/v1/health`
   returns 200 from the VPS itself before touching nginx.
6. **Install `deploy/nginx.conf`** to `/etc/nginx/sites-available/`, symlink
   into `sites-enabled/`, replace `api.example.com` with the real domain,
   `nginx -t && systemctl reload nginx`.
7. **Get the TLS cert**: `certbot --nginx -d <real-domain>` — this rewrites
   the `server { listen 443 }` block in place with the real cert paths (which
   is why the checked-in `nginx.conf` has placeholder paths — certbot is
   expected to overwrite them, not be pre-empted).
8. **Verify**: `curl https://<real-domain>/api/v1/health` returns 200 from
   the public internet, exactly like the Render verification step, before
   calling this done.
9. **DNS cutover**: once the VPS is verified serving real traffic correctly,
   switch the frontend's `VITE_API_BASE_URL` (Phase 13) and any other
   DNS-dependent config to the VPS domain.
10. **Keep the Render instance warm for 48h post-cutover** as the roadmap's
    own rollback plan specifies — if anything regresses on the VPS, point DNS
    back at Render immediately rather than debugging under live traffic.

## Not done in this phase, flagged not skipped

- **Backups**: Atlas's own automated backups already cover the database
  (unchanged by this migration); a *documented restore drill* — actually
  restoring a backup once to confirm the process works — needs a real Atlas
  environment to run against, not something to fake here.
- **Uptime monitoring/alerting** (e.g. UptimeRobot + a status page) needs a
  real public URL to monitor, which doesn't exist until step 8 above happens.
- **Centralized log shipping** — `pino`'s structured JSON logs to stdout
  already make this straightforward to wire into whatever log aggregator the
  user picks (Docker's own `json-file` driver captures them as-is in the
  meantime), but which aggregator is a product/cost decision, not a technical
  one this session can make unilaterally.
