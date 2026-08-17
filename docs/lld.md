# Low-Level Design (LLD) — Scrum Poker & Sprint Retro SPA

## 1. Repository Layout

```
grooming-kit/
├── client/                # React + Vite SPA
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx                # Router: Lobby | PokerRoom | RetroRoom
│   │   ├── lobby/
│   │   │   ├── CreateRoomForm.tsx
│   │   │   └── JoinRoomForm.tsx
│   │   ├── poker/
│   │   │   ├── PokerRoom.tsx
│   │   │   ├── CardDeck.tsx
│   │   │   └── VoteBoard.tsx
│   │   ├── retro/
│   │   │   ├── RetroRoom.tsx
│   │   │   ├── RetroColumn.tsx
│   │   │   └── RetroCard.tsx
│   │   ├── shared-ui/             # Button, Modal, Badge, ParticipantList
│   │   ├── socket/
│   │   │   └── useRoomSocket.ts   # connection, reconnect, event wiring
│   │   └── state/
│   │       └── roomStore.ts       # client-side state derived from server broadcasts
│   ├── index.html
│   └── vite.config.ts
├── server/                # Node + Express + Socket.IO
│   ├── src/
│   │   ├── index.ts               # HTTP + Socket.IO bootstrap
│   │   ├── rooms/
│   │   │   ├── RoomManager.ts     # create/find/expire rooms
│   │   │   ├── PokerRoom.ts       # poker state machine + handlers
│   │   │   └── RetroRoom.ts       # retro state machine + handlers
│   │   ├── socketHandlers.ts      # binds shared events → room manager calls
│   │   └── roomCode.ts            # 6-char code generator
│   └── package.json
├── shared/                # Types + event contracts, imported by client & server
│   └── src/
│       ├── events.ts               # event name constants + payload types
│       ├── poker.types.ts
│       ├── retro.types.ts
│       └── room.types.ts
├── infra/                 # Terraform (see infra.md)
└── docs/
    ├── requirements.md
    ├── hld.md
    ├── lld.md
    └── infra.md
```

## 2. Shared Types (`shared/src/room.types.ts`)

```ts
// 'standup-picker' is a planned post-MVP addition (see requirements.md → Future Features);
// adding it here plus a StandupPickerRoomState + standup:* events is the only shared-contract
// change needed — no infra/backend architecture change required.
export type RoomType = 'poker' | 'retro';

export interface Participant {
  id: string;           // UUID, stable across reconnects
  displayName: string;
  isModerator: boolean;
  connected: boolean;
}

export interface BaseRoomState {
  code: string;          // 6-char room code
  type: RoomType;
  createdAt: number;
  participants: Participant[];
}
```

## 3. Poker Types & State (`shared/src/poker.types.ts`)

```ts
export const POKER_DECK = ['0', '1', '2', '3', '5', '8', '13', '21', '?', '☕'] as const;
export type PokerCard = typeof POKER_DECK[number];

export interface PokerVote {
  participantId: string;
  card: PokerCard | null;   // null = not yet voted
}

export interface PokerRoomState extends BaseRoomState {
  type: 'poker';
  revealed: boolean;
  votes: PokerVote[];       // card is always null to non-moderator clients pre-reveal (server redacts)
}
```

**Redaction rule**: server sends different payloads pre- vs post-reveal. Pre-reveal, `votes[].card` is nulled out for everyone except "hasVoted" boolean per participant, computed server-side — this guarantees NFR7 (clients cannot peek).

## 4. Retro Types & State (`shared/src/retro.types.ts`)

```ts
export type RetroColumnId = 'start' | 'stop' | 'continue';

export interface RetroCard {
  id: string;
  columnId: RetroColumnId;
  text: string;
  authorId: string;
  votes: string[];       // participantIds who voted for this card
}

export interface RetroRoomState extends BaseRoomState {
  type: 'retro';
  columns: RetroColumnId[];   // fixed: ['start', 'stop', 'continue']
  cards: RetroCard[];
  closed: boolean;
  actionItems: string[];
}
```

## 5. Socket Event Contract (`shared/src/events.ts`)

Naming convention: `<domain>:<action>`. Client→server events are imperative ("do X"); server→client events are state/facts.

| Event | Direction | Payload | Notes |
|---|---|---|---|
| `room:create` | C→S | `{ type: RoomType, displayName: string }` | ack returns `{ roomCode, participantId }` |
| `room:join` | C→S | `{ roomCode: string, displayName: string, participantId?: string }` | `participantId` present = reconnect attempt |
| `room:leave` | C→S | `{}` | explicit leave |
| `participant:rename` | C→S | `{ displayName: string }` | ack returns `{ displayName }` (may be de-duplicated); any participant, any time |
| `room:state` | S→C | `PokerRoomState \| RetroRoomState` | full state broadcast after any mutation (MVP: full-state, not diffs) |
| `room:closed` | S→C | `{ reason: string }` | room no longer exists; client returns to lobby |
| `poker:vote` | C→S | `{ card: PokerCard }` | rejected if `revealed === true` |
| `poker:reveal` | C→S | `{}` | moderator-only, validated server-side |
| `poker:reset` | C→S | `{}` | moderator-only |
| `retro:addCard` | C→S | `{ columnId, text }` | any participant |
| `retro:vote` | C→S | `{ cardId }` | toggles vote; server enforces per-participant vote cap (default 3) |
| `retro:close` | C→S | `{ actionItems: string[] }` | moderator-only |

All server-side handlers validate: (a) socket belongs to the room, (b) moderator-only actions check `participant.isModerator`, (c) room type matches the event's domain. Invalid actions emit an `error` event with a short code, no server mutation occurs.

## 6. Room Code Generation (`server/src/roomCode.ts`)
- 6 uppercase alphanumeric characters, excluding visually-ambiguous characters (`0/O`, `1/I/L`).
- Collision check against `RoomManager`'s live room map; regenerate on collision (extremely unlikely at expected scale).

## 7. RoomManager Responsibilities
- `createRoom(type, creatorSocket, displayName): RoomState`
- `joinRoom(code, socket, displayName, participantId?)`
- `getRoom(code): RoomState | undefined`
- `removeParticipant(code, participantId)` — on `disconnect`, mark `connected: false` immediately; after a grace period (e.g. 30s) with no reconnect, remove participant entirely; if the room has zero participants (including grace-period ghosts expired), delete the room from memory.
- Moderator disconnect: room stays alive during grace period; if moderator doesn't return, room remains moderator-less until closed by expiry (MVP: no reassignment, per FR5).

## 8. Client State Management
- `useRoomSocket` hook owns the Socket.IO client instance, exposes `emit` helpers and subscribes to `room:state`/`room:closed`.
- `roomStore` is a simple reducer-like store (React context + `useReducer`, no external state library needed) fed entirely by server broadcasts — client never computes derived "source of truth" state locally beyond ephemeral UI state (e.g., which card is hovered).

## 9. Error Handling
- Socket-level `error` event: `{ code: 'NOT_MODERATOR' | 'ROOM_NOT_FOUND' | 'INVALID_ACTION' | 'VOTE_CAP_REACHED', message: string }`.
- Client shows a toast and does not alter local state on error (server is authoritative; no optimistic updates for actions that require validation like reveal/reset).
- Optimistic UI is acceptable only for own-vote selection highlight (cosmetic), reconciled on next `room:state`.

## 10. Theming & UI Sandbox
- **Theme tokens**: `client/src/index.css` defines three CSS custom-property sets (`midnight` / `warm` / `mono`) scoped via a `data-theme` attribute on `<html>`. `client/src/theme.ts` reads/writes the active theme to `localStorage` (`gk-theme`) and applies it on boot for both the main app and the sandbox — so a theme picked in `/sandbox` immediately carries over to real usage. `useTheme()` (also in `theme.ts`) is a small hook shared by every picker so they all read/write the same persisted state.
- **Theme pickers in the real app**: `client/src/shared-ui/ThemeToggle.tsx` is a compact icon-only picker (just the three emoji, with a tooltip for the full name/blurb) rendered in the `Lobby` (before starting/joining a room) and in `RoomHeader` (visible for the whole session) — so users can switch themes both before and during an active poker/retro session, not just from the sandbox. `sandbox/ThemeSwitcher.tsx` is the larger, fully-labeled variant used only in the sandbox.
- **Animations** (dependency-free, pure CSS + small React timers): card selection pop (`CardDeck`), a 3D flip-card reveal per vote (`VoteBoard`, staggered per participant), a confetti burst (`poker/ConfettiBurst.tsx`) triggered in `PokerRoomView` when all revealed votes match, and a vote-pop pulse on retro card votes (`RetroCard`).
- **`/sandbox`** (`client/src/sandbox/`): a client-only route (checked in `main.tsx` via `location.pathname`, no router dependency added) that renders the *real* `Lobby`, `PokerRoomView`, and `RetroRoomView` components against mock data through a hand-rolled `RoomContext.Provider` (see `mockRoomContext.ts`, `PokerSandbox.tsx`, `RetroSandbox.tsx`, `LobbySandbox.tsx`) instead of a live socket connection — fully interactive (voting/revealing/adding cards actually mutates local mock state) with zero server dependency. Also includes a small `ComponentGallery` for standalone pieces (`ParticipantList`, `RoomHeader`) and the full theme switcher. Linked from the Lobby only in dev builds (`import.meta.env.DEV`); not intended to be exposed in production hosting.

## 11. Auto-Join & Random Display Names
- **Room code format shared client/server**: `ROOM_CODE_ALPHABET` and `isValidRoomCode(code)` now live in `shared/src/room.types.ts` (single source of truth); `server/src/roomCode.ts` imports the alphabet instead of duplicating it. This gives the client a network-free, purely-formatual validity check so it can distinguish "malformed URL, don't even try" from "well-formed but possibly nonexistent room, attempt and surface the server's error."
- **Auto-join from URL**: `Lobby.tsx` reads `?room=` on mount; if `isValidRoomCode()` passes and there's no pending session to reconnect to (`participantId === null`, seeded synchronously from `sessionStorage` by `RoomProvider`), it auto-switches to "Join a room" mode and submits immediately, showing a "Joining room XXXX…" status while the form is disabled. Runs at most once per mount (`autoJoinAttempted` ref). On failure (bad/expired code), the `?room=` param is stripped from the URL and the error is surfaced via a `formError` banner — this also fixed a pre-existing gap where manual join/create ack failures were silently swallowed with no user feedback.
- **URL cleanup on leave**: `RoomContext.tsx`'s `leaveRoom`, `handleRoomClosed`, and the failed-reconnect path all strip `?room=` from the URL (`history.replaceState`). This matters because `App.tsx` unmounts/remounts `Lobby` (a different component in the same JSX slot) whenever the user returns to it — without this cleanup, the fresh `Lobby` mount would re-read the stale room code and spuriously auto-(re)join the room just left.
- **Random display names**: `client/src/randomName.ts` generates an adjective+noun name (e.g. "Clever Otter"). `client/src/displayName.ts` wraps `localStorage` (`LOCAL_STORAGE_KEYS.displayName`) for a saved name. `Lobby.tsx` initializes `displayName` from `getSavedDisplayName() ?? generateRandomName()` — a fresh random name is generated on every mount until a name is actually persisted. A `hasCustomName` ref (seeded `true` if a saved name already exists) flips `true` on the first manual edit of the field; the name is only written to `localStorage` on a successful create/join **if** `hasCustomName.current` is true, so an unedited generated name is never persisted (keeping it random across sessions/reloads until the user deliberately picks one).
- **Server-side name de-duplication**: `RoomBase.listDisplayNames()` (public) exposes current participant display names; `server/src/socketHandlers.ts`'s `dedupeDisplayName()` appends " (2)", " (3)", etc. to a new joiner's name if it collides with an existing participant's in `room:join` (not needed on `room:create`, since the room is empty). This covers both auto-generated random names and manually-typed collisions, satisfying the requirement that participants in a session must be distinguishable by display name — the client's originally-typed/generated name is what still gets persisted to `localStorage` on edit (not the server-deduped variant), since the user's chosen name may not collide in a different room.

## 12. Mid-Session Rename
- **New socket event**: `participant:rename` (`shared/src/events.ts`) — a client-to-server event with an ack (`RenameAck { ok: true, displayName }` or `ErrorAck`). The server (`socketHandlers.ts`) sanitizes the name, de-duplicates it against every *other* participant in the room via `RoomBase.listDisplayNames(excludeParticipantId)` (self excluded, so re-submitting your own unchanged name never appends a suffix), applies it via the new `RoomBase.renameParticipant()`, and broadcasts `room:state` like any other mutation.
- **UI**: `ParticipantList.tsx` shows a ✏️ pencil next to the current user's own entry only (gated by an optional `onRename` prop — kept out of the component's own required props so it stays presentational/testable standalone, e.g. in the sandbox `ComponentGallery` without a `RoomContext.Provider`). Clicking it swaps the name for an inline `<input>`; Enter or blur commits, Escape cancels. A rename error (e.g. empty name) shows inline next to the input.
- **Persistence**: `client/src/state/useRenameParticipant.ts` wraps `RoomContext`'s `renameParticipant` and calls `saveDisplayName()` on success — an explicit mid-session rename is always treated as a deliberate customization (same as editing the name in the Lobby), so it persists to `localStorage` and pre-fills future sessions.
- **Sandbox**: `mockRoomContextBase` provides a default no-op `renameParticipant`; `PokerSandbox`/`RetroSandbox` override it to mutate their local mock participant list so the pencil is fully interactive in `/sandbox` too.


