# Phase 14 — VPS migration artifact. Multi-stage build so the final image
# carries only production dependencies, not devDependencies (eslint, jest,
# playwright's transitive deps, etc.) or the git history npm ci also avoids.
# Node 22 to match .nvmrc / engines in package.json (Node 26 has a known
# npm-install issue in this project — see the Node 22 pin reasoning already
# established for local dev and CI).

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Runs as the non-root user Alpine's node image already provides — nothing in
# this app needs root (no privileged ports, no filesystem writes outside
# /app/uploads, which is itself only a dev-mode fallback for S3).
USER node

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||4000)+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
