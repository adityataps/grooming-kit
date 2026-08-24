# High-Level Design (HLD) — Scrum Poker & Sprint Retro SPA

## 1. System Context

```
 ┌─────────────┐        HTTPS (static assets)        ┌──────────────────┐
 │   Browser    │ ───────────────────────────────────▶│  GCS bucket       │
 │  (React SPA) │                                      │  (static hosting) │
 └──────┬───────┘                                      └──────────────────┘
        │
        │ WebSocket (Socket.IO), wss://poker.<yourdomain>
        ▼
 ┌─────────────────────┐
 │   Cloud Run service   │  (min=0, max=1 instance)
 │  Node + Express +     │
 │  Socket.IO server     │
 │  (in-memory room store)│
 └─────────────────────┘

        DNS/TLS/CDN edge: Cloudflare (subdomain routing to both above)
```

## 2. Components

### 2.1 Client (React + Vite SPA)
- **Lobby view**: create room (choose type) or join room (code entry / URL param).
- **Poker room view**: deck of cards, participant list, reveal/reset controls (moderator-gated).
- **Retro room view**: columns of cards, add/vote UI, close-room control (moderator-gated).
- **Socket.IO client**: single connection per session, reconnect with backoff, resumes room membership via a client-held session token (see §4).
- Static build output deployed to GCS; no server-side rendering.

### 2.2 Server (Node + Express + Socket.IO)
- Serves only the Socket.IO endpoint (no static assets — those come from GCS/Cloudflare).
- **RoomManager**: in-memory map of `roomCode -> RoomState`. Creates, looks up, expires rooms.
- **Room state machines**: one per room type (Poker, Retro), each owning its own event handlers and state shape.
- Broadcasts state deltas to all sockets joined to a room (Socket.IO "room" = native grouping feature, conveniently matching our domain concept of a room).
- Stateless *between* rooms — a single Cloud Run instance holds all active rooms in memory (see §5 constraint).

### 2.3 Shared package (`shared/`)
- TypeScript types/interfaces for: room state shapes, Socket.IO event names + payloads (client→server and server→client), room code format.
- Imported by both `client/` and `server/` to guarantee the wire contract never drifts between them.

## 3. Realtime Event Flow (example: Poker reveal)

1. Moderator's client emits `poker:reveal` with `{ roomCode }`.
2. Server validates: socket is in `roomCode`, socket is the moderator, room type is Poker.
3. Server flips `room.revealed = true`, computes summary.
4. Server emits `room:state` (full or delta state) to all sockets in `roomCode`.
5. Every client re-renders board with visible votes.

All actions follow this pattern: **client emits intent → server validates + mutates authoritative state → server broadcasts resulting state**. Clients never mutate shared state locally without server confirmation (NFR7).

### 3.1 Server-initiated broadcast (example: Poker auto-reveal timer)

The timer is the one flow where the server itself — not a client — is what triggers the next broadcast:

1. Moderator's client emits `poker:startTimer` with `{ durationSec }` (30/60/90/120).
2. Server validates (moderator, round not already revealed, allowed duration), records `timerEndsAt = Date.now() + durationSec * 1000`, and starts a `setTimeout` for `durationSec`.
3. Server broadcasts `room:state` immediately so every client can render a synchronized countdown from the same absolute `timerEndsAt`.
4. When the `setTimeout` fires server-side, the server flips `revealed = true` itself (identical effect to a manual `poker:reveal`) and broadcasts `room:state` again — no client round-trip involved.
5. A moderator's `poker:cancelTimer` (or a manual `poker:reveal`/`poker:reset`) clears the pending `setTimeout` and nulls `timerEndsAt` before it fires.

The countdown is intentionally *not* re-broadcast every second — clients derive the displayed remaining time locally from the single absolute `timerEndsAt` epoch, avoiding a chatty per-second broadcast.

## 4. Identity & Reconnection
- On join, server assigns a `participantId` (UUID) and returns it to the client, which stores it in `sessionStorage` (tab-scoped, so multiple tabs = multiple participants, which is fine).
- On reconnect (page refresh, network blip), client sends its stored `participantId` + `roomCode`; server re-attaches the socket to the existing participant record instead of creating a new one, preserving prior vote/cards.
- If the room no longer exists (server restarted, or room expired), client is routed back to the lobby with a "room no longer available" message.

## 5. Key Architectural Constraint: Single-Instance Backend
Because room state is in-memory and there is no shared store between instances, **Cloud Run must be pinned to `max-instances=1`** (with `min-instances=0` for scale-to-zero cost savings). This is enforced in Terraform (see `infra.md`).

**Future scaling path (post-MVP, not built now):** if usage later requires horizontal scaling, adopt the official `@socket.io/gcp-pubsub-adapter` rather than a Redis adapter. Each Cloud Run instance publishes room broadcasts to a shared Pub/Sub topic and maintains its own subscription to receive events from other instances (node liveness via heartbeat, default 5s interval / 10s timeout). This is preferred over Cloud Memorystore (Redis) specifically because Pub/Sub is pay-per-message with no idle cost, preserving the scale-to-zero cost model — Memorystore bills a flat hourly rate 24/7 regardless of traffic, which would undercut the reason for scaling to zero in the first place. Tradeoffs to revisit at that time: Pub/Sub broadcast latency (tens of ms, cross-zone, at-least-once delivery) is higher than in-VPC Redis pub/sub, and the adapter does not support Socket.IO's "connection state recovery" feature — acceptable for us since our reconnect design (§4, LLD §7) already re-fetches full authoritative state rather than replaying missed events. Requires a Terraform-provisioned Pub/Sub topic and IAM publish/subscribe bindings for the Cloud Run service account.

## 6. Deployment Topology
- **Frontend**: Vite build → static files → GCS bucket (static website hosting) → **directly** fronted by Cloudflare (CNAME to the bucket, DNS + TLS/CDN, no load balancer) at `grooming-kit.tapshalkar.com`.
- **Backend**: Docker image → Artifact Registry → Cloud Run service, exposed at `api.grooming-kit.tapshalkar.com` via Cloud Run's native (free) domain mapping — no external HTTPS Load Balancer. See `infra.md` §1 for why the LB was dropped (its flat hourly forwarding-rule cost undercuts the scale-to-zero model) and the resulting two-subdomain, cross-origin tradeoff (Socket.IO CORS config, see LLD).
- **CI/CD**: GitHub Actions, OIDC/Workload Identity Federation to GCP, no stored service-account keys.

## 7. Out of Scope (MVP)
- Persistence layer / database
- Authentication
- Multi-instance horizontal scaling
- Ticket-system integrations
