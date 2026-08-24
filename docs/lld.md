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
│   │   │   ├── VoteBoard.tsx
│   │   │   ├── TimerControl.tsx   # moderator-set countdown, auto-reveals on expiry
│   │   │   └── DistributionChart.tsx # interactive bar chart of the revealed vote spread
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

export const POKER_TIMER_DURATIONS = [30, 60, 90, 120] as const;
export type PokerTimerDuration = typeof POKER_TIMER_DURATIONS[number];

export interface PokerVote {
  participantId: string;
  card: PokerCard | null;   // null = not yet voted
}

export interface PokerRoomState extends BaseRoomState {
  type: 'poker';
  revealed: boolean;
  votes: PokerVote[];       // card is always null to non-moderator clients pre-reveal (server redacts)
  timerEndsAt: number | null; // server epoch ms; auto-reveals the round when it elapses
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
| `room:end` | C→S | `{}` | moderator-only; closes the room for everyone (see `room:closed`) |
| `participant:rename` | C→S | `{ displayName: string }` | ack returns `{ displayName }` (may be de-duplicated); any participant, any time |
| `participant:makeModerator` | C→S | `{ participantId: string }` | moderator-only; transfers the moderator role to the target participant |
| `room:state` | S→C | `PokerRoomState \| RetroRoomState` | full state broadcast after any mutation (MVP: full-state, not diffs) |
| `room:closed` | S→C | `{ reason: string }` | room no longer exists; client shows a "session ended" modal and returns to the lobby |
| `poker:vote` | C→S | `{ card: PokerCard }` | rejected if `revealed === true` |
| `poker:reveal` | C→S | `{}` | moderator-only, validated server-side |
| `poker:reset` | C→S | `{}` | moderator-only |
| `poker:startTimer` | C→S | `{ durationSec: PokerTimerDuration }` | moderator-only; `durationSec` must be one of `POKER_TIMER_DURATIONS` (30/60/90/120); (re)starts a countdown owned by the server that auto-reveals the round on expiry |
| `poker:cancelTimer` | C→S | `{}` | moderator-only; stops a running countdown without revealing |
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
- Moderator disconnect: room stays alive during grace period (moderator keeps their role if they reconnect in time); if the moderator doesn't return before the grace period expires, the next-longest-standing remaining participant is automatically promoted (see §14).

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
- **Moderator timer** (`poker/TimerControl.tsx`): the moderator picks a countdown (30/60/90/120s); the server owns the countdown (`PokerRoom.startTimer`, keyed off `setTimeout`) and broadcasts `timerEndsAt` (an absolute epoch ms) so every client's countdown stays in sync regardless of when it joined. On expiry the server auto-reveals the round (equivalent to the moderator clicking Reveal) and broadcasts the update; the moderator can cancel early via `poker:cancelTimer`.
- **Distribution chart** (`poker/DistributionChart.tsx`): once revealed, renders a pure-CSS bar per `POKER_DECK` value showing how many participants landed on it; hovering/focusing a bar reveals a tooltip listing which participants voted that value. Hidden entirely pre-reveal (no data to redact — same as `VoteBoard`, it only ever renders whatever `room:state` already sent).
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

## 13. Room UI Polish (Panels & Avatars)
- **Card panels**: the participant sidebar (`<aside>`) and the poker `VoteBoard`/retro `action-items` summary are now styled as proper cards (`background: var(--surface)`, border, radius, shadow) matching the Lobby's card language, instead of a bare divider/list. `.room-body` gained `max-width` + `align-items: start` so the sidebar no longer stretches to match the main column's height and the layout stays centered on wide viewports.
- **`Avatar` component** (`client/src/shared-ui/Avatar.tsx`): a colored initials bubble, seeded by participant **id** (not display name) via `hashHue()` so a participant's color stays stable across a rename. Used by both `ParticipantList` and `VoteBoard` for consistent per-person visual identity; connection status is shown as a colored ring (box-shadow) around the avatar rather than a separate presence dot.
- **Two-row participant rows**: each `<li>` in `ParticipantList` splits into a `.participant-name-row` (avatar + name + rename pencil, name truncates with ellipsis if very long) and a `.participant-meta` row below it (`moderator` badge, `you` tag) — separating the name from the badges prevents the pencil icon from wrapping or the name from over-truncating in the 240px-wide sidebar when a participant has a long name plus multiple badges.




## 14. End Session vs. Leave Room
- **Two distinct moderator actions**: `RoomHeader.tsx` renders "Leave room" (any participant, unchanged behavior — only that participant departs, room continues) and, for the moderator only, a second destructive-styled "End session" button. Clicking it shows a native `window.confirm()` guard ("End this session for everyone? …") before doing anything, since it affects every participant.
- **New `room:end` socket event** (`shared/src/events.ts`, C→S, no payload/ack): handled in `server/src/socketHandlers.ts` — validated moderator-only (reuses `requireModerator`), then:
  1. `socket.broadcast.to(room.code).emit('room:closed', { reason })` — notifies every *other* connected socket in the room (the moderator's own socket is deliberately excluded from the broadcast).
  2. `io.in(room.code).socketsLeave(room.code)` — forces every socket (including the moderator's) to leave the underlying Socket.IO room, so a future room reusing the same code can never leak broadcasts to stale sockets.
  3. `roomManager.removeRoom(room.code)` — deletes the room from the live map (same cleanup path as the last-participant-leaves case).
- **Client-side asymmetry by design**: the moderator's own `endSession()` (`RoomContext.tsx`) clears local state and returns to the lobby immediately, mirroring `leaveRoom()` — it does not wait for/rely on a `room:closed` echo, since they already confirmed the action. Every *other* participant receives `room:closed` and goes through the existing generic `handleRoomClosed` handler (clears session storage, strips `?room=` from the URL, sets `closedReason`), which now renders as a proper modal.
- **"Session ended" modal** (`App.tsx`, `.room-closed`/`.room-closed-card` in `index.css`): upgraded from a plain full-page message to a dimmed-backdrop + centered card dialog (`role="dialog"`, `aria-modal="true"`) consistent with the app's card visual language, with a "Back to homepage" button that dismisses (`dismissClosed`) and returns to the Lobby.
- **Reused existing infrastructure**: the `room:closed` event and `closedReason`/`dismissClosed` plumbing in `RoomContext`/`App.tsx` already existed (scaffolded early on) but were never actually emitted by the server before this change — `room:end` is the first (and so far only) trigger for it.

## 15. Moderator Hand-off & Roster-Driven Promotion
- **Manual transfer**: the moderator can designate any other participant as moderator via a 👑 button that appears on hover next to every other participant's row in `ParticipantList` (gated behind `viewerIsModerator` — only rendered for the viewer currently holding the role, and never on their own row). Clicking it shows a `window.confirm()` guard ("Make X the moderator? You will no longer have moderator controls.") before emitting the new `participant:makeModerator` socket event. `RoomBase.setModerator(participantId)` enforces a single moderator by unsetting everyone else's flag before setting the target's.
- **Auto-promotion on departure**: `RoomBase.promoteModeratorIfNeeded()` runs after every permanent participant removal (`removeParticipant` — explicit leave/kick, and the `markDisconnected` grace-period-expiry path) and promotes the longest-standing remaining participant (`Map` iteration order = insertion/join order) if the room no longer has a moderator. A temporary disconnect (within the 30s grace period) does **not** trigger promotion — the moderator keeps their role if they reconnect in time, since `markDisconnected` only flags `connected: false` without touching `isModerator` or removing the record.
- **Broadcast fix required for this**: the `disconnect` handler in `socketHandlers.ts` previously only broadcast state once, immediately (reflecting the `connected: false` flip) — the grace-period-expiry callback (`onExpire`) didn't broadcast again, so a promotion that happened 30s later after permanent removal was invisible to other clients. Fixed by adding a second `broadcastState(io, room)` call inside the expiry callback whenever the room isn't now empty.
- **Room termination when empty**: already covered by pre-existing logic — both `room:leave` and the disconnect-grace-expiry path check `room.isEmpty()` and call `roomManager.removeRoom(code)` once the last participant is gone, regardless of whether that participant held the moderator role.
- **UI**: both `ParticipantList`'s pencil (rename) and 👑 (make moderator) buttons are now hover-revealed (`opacity: 0` by default, `opacity: 0.85+` on `li:hover`/`li:focus-within`) rather than always faintly visible, to keep the sidebar visually calm at rest while remaining keyboard-accessible.
- **Sandbox**: `PokerSandbox`/`RetroSandbox`/`ComponentGallery` all implement an interactive `makeModerator` override that reassigns `isModerator` across the local mock participant list, so transferring the role in `/sandbox` also flips which controls (Reveal/Reset, Close retro, End session) are visible — same as the real app.
