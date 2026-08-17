# syntax=docker/dockerfile:1
#
# Build context is the MONOREPO ROOT (not server/), since the server workspace depends on the
# @grooming-kit/shared workspace package. Build with:
#   docker build -f server/Dockerfile -t grooming-kit-backend .
# (this is what .github/workflows/deploy-backend.yml does).

FROM node:22-alpine AS builder
WORKDIR /app

# Manifests only first, for better layer caching — every workspace's package.json must be
# present for `npm ci` to resolve the workspaces tree, even though client/src is never copied
# into this image.
COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json shared/tsconfig.json shared/tsconfig.esm.json ./shared/
COPY server/package.json server/tsconfig.json ./server/
COPY client/package.json ./client/

RUN npm ci

COPY shared/src ./shared/src
COPY server/src ./server/src

RUN npm run build --workspace=shared \
 && npm run build --workspace=server \
 && npm prune --omit=dev

# ---- Runtime image: only the pruned node_modules + compiled dist output, no source/devDeps ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/shared/package.json ./shared/package.json
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/server/package.json ./server/package.json
COPY --from=builder /app/server/dist ./server/dist

# Cloud Run injects PORT (defaults to 8080); see server/src/index.ts.
EXPOSE 8080
CMD ["node", "server/dist/index.js"]
