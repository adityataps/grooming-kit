# Copilot Instructions for grooming-kit

## Overview

A realtime, multi-user SPA for scrum poker and sprint retros. npm workspaces
monorepo with three packages: `shared`, `server`, `client`.

## Build, Test & Lint

### Install
```bash
npm install
```
Installs dependencies for all workspaces.

### Build
```bash
npm run build
```
Builds `shared`, then `server`, then `client` in order (client/server both
depend on `@grooming-kit/shared`).

### Dev
```bash
npm run dev
```
Runs the server (tsx watch, default port 8090) and the Vite client dev
server (default port 5173) concurrently.

### Run (production)
```bash
node server/dist/index.js
```
Runs the compiled server. Serve `client/dist/` as a static site separately
(see `docs/infra.md`).

There are currently no test or lint scripts configured in this project.

## Repository Structure

- **`shared/`** - `@grooming-kit/shared`: TypeScript types + constants shared
  between client and server (room/poker/retro state shapes, Socket.IO event
  contract in `src/events.ts`).
- **`server/`** - `@grooming-kit/server`: Express + Socket.IO backend.
  In-memory room state only (no database). Entry point `src/index.ts`.
- **`client/`** - `@grooming-kit/client`: React + Vite SPA. Entry point
  `src/main.tsx` / `src/App.tsx`.
- **`docs/`** - requirements, HLD, LLD, and infra design docs. Keep these in
  sync with implementation changes.

## Key Configuration Details

### TypeScript Settings
- `shared`/`server` share `tsconfig.base.json` (ES2020, CommonJS, strict,
  composite project references via `tsc -b`).
- `client` uses its own Vite-generated tsconfig chain (`moduleResolution:
  "bundler"`, `verbatimModuleSyntax: true` — always use `import type` for
  type-only imports, ESM output).
- Strict mode is enabled across all packages - no `any` types or unchecked
  null values.

### Environment Variables
- **Server** (`server/.env`, see `server/.env.example`): `PORT` (default
  8090), `CORS_ORIGIN` (comma-separated allowed origins, default
  `http://localhost:5173`).
- **Client** (`client/.env`, see `client/.env.example`): `VITE_API_URL`
  (Socket.IO server URL, default `http://localhost:8090`).

### Wire Contract
- `shared/src/events.ts` is the single source of truth for client↔server
  Socket.IO events. Any change here must be reflected in
  `server/src/socketHandlers.ts` and `client/src/state/RoomContext.tsx`.

## Development Notes

- The project uses `npm` workspaces for package management.
- Room state is in-memory only; the server must run with a single instance
  (`max-instances=1` in production) until a Pub/Sub adapter is introduced
  (see `docs/hld.md` §5).
