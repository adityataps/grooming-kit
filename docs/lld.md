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
- **Theme tokens**: `client/src/index.css` defines three CSS custom-property sets (`midnight` / `warm` / `mono`) scoped via a `data-theme` attribute on `<html>`. `client/src/theme.ts` reads/writes the active theme to `localStorage` (`gk-theme`) and applies it on boot for both the main app and the sandbox — so a theme picked in `/sandbox` immediately carries over to real usage.
- **Animations** (dependency-free, pure CSS + small React timers): card selection pop (`CardDeck`), a 3D flip-card reveal per vote (`VoteBoard`, staggered per participant), a confetti burst (`poker/ConfettiBurst.tsx`) triggered in `PokerRoomView` when all revealed votes match, and a vote-pop pulse on retro card votes (`RetroCard`).
- **`/sandbox`** (`client/src/sandbox/`): a client-only route (checked in `main.tsx` via `location.pathname`, no router dependency added) that renders the *real* `Lobby`, `PokerRoomView`, and `RetroRoomView` components against mock data through a hand-rolled `RoomContext.Provider` (see `mockRoomContext.ts`, `PokerSandbox.tsx`, `RetroSandbox.tsx`, `LobbySandbox.tsx`) instead of a live socket connection — fully interactive (voting/revealing/adding cards actually mutates local mock state) with zero server dependency. Also includes a small `ComponentGallery` for standalone pieces (`ParticipantList`, `RoomHeader`) and the theme switcher. Linked from the Lobby only in dev builds (`import.meta.env.DEV`); not intended to be exposed in production hosting.

