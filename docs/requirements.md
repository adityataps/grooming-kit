# Requirements — Scrum Poker & Sprint Retro SPA

## Overview
A lightweight, realtime, multi-user single-page app for two independent room types:
- **Poker rooms** — planning poker / story point estimation
- **Retro rooms** — sprint retrospective boards

No accounts, no ticket-system integration (for now). Rooms are anonymous,
ephemeral, and joined via a short room code or a URL with the code as a query param.

## Functional Requirements

### Room lifecycle
- FR1: Any user can create a new room, choosing type (Poker or Retro) at creation time. Room type is fixed for the room's lifetime.
- FR2: Creating a room generates a 6-character room code (human-shareable) and a joinable URL (`?room=ABC123`).
- FR3: Any user can join an existing room via code entry or URL.
- FR4: On join, a user provides a display name (no auth).
- FR5: The room creator is the **moderator** for that room's lifetime (see FR-Moderator below). Moderator role does not transfer (MVP).
- FR6: A room closes (and its state is discarded) when the last participant disconnects, or the moderator explicitly closes it.

### Presence
- FR7: All participants see a live list of who is currently in the room, with connection status.
- FR8: Participants are shown as joined/left in realtime as sockets connect/disconnect.

### Poker room
- FR9: Participants select an estimate card from a fixed deck (default: Fibonacci — 0, 1, 2, 3, 5, 8, 13, 21, ?, ☕).
- FR10: Selections are hidden from other participants until reveal.
- FR11: Moderator triggers **reveal**, showing all votes simultaneously to everyone.
- FR12: Moderator triggers **reset**, clearing all votes for a new round.
- FR13: The board shows a simple result summary on reveal (e.g., votes list; average/consensus is a stretch goal).

### Retro room
- FR14: Board is organized into fixed columns (default template: Start / Stop / Continue).
- FR15: Any participant can add a card (short text note) to any column, in realtime.
- FR16: Any participant can vote on cards (e.g., limited number of votes per person), visible to all in realtime.
- FR17: Any participant can group/drag cards within a column (stretch goal — not MVP-blocking).
- FR18: Moderator can mark the retro as closed / capture a final list of action items.

### Moderator controls
- FR-Moderator: Only the moderator may: reveal votes, reset a round, close the room, remove a participant (stretch).
- All other actions (voting, adding cards) are available to any participant.

## Non-Functional Requirements

- NFR1: **Realtime sync** — state changes propagate to all connected participants within ~200ms under normal network conditions.
- NFR2: **Ephemeral state** — room state lives in server memory only; no database. State is lost on server restart or when a room empties out. This is an accepted tradeoff for simplicity/cost.
- NFR3: **Reconnect resilience** — a participant who refreshes or briefly disconnects rejoins the same room/identity without losing votes already cast, as long as the server process is still alive.
- NFR4: **Mobile-friendly & accessible** — usable on phone/tablet screens, keyboard navigable, sufficient color contrast.
- NFR5: **Low operational cost** — backend scales to zero when idle (Cloud Run), static frontend served from object storage/CDN.
- NFR6: **TypeScript strict** everywhere (client, server, shared types) — no implicit `any`, no unchecked nulls.
- NFR7: **Single source of truth for state** — the server is authoritative; clients never locally fabricate state that other clients must trust (e.g., a hidden vote value).
- NFR8: **Deploy via CI/CD** — every merge to main can deploy the frontend and backend independently via GitHub Actions, with no manual credential handling (OIDC/Workload Identity Federation).
- NFR9: **Fast first load** — Vite-built, code-split SPA; static assets served from CDN-backed storage.

## Explicit Non-Goals (MVP)
- No user accounts/authentication
- No persistence/history of past sessions
- No ticket-system (Jira, etc.) integration
- No horizontal scaling of the realtime backend (single Cloud Run instance; revisit with a Redis adapter if needed)
- No moderator transfer / multi-moderator support
