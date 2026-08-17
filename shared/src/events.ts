import type { RoomType } from './room.types';
import type { PokerCard, PokerRoomState } from './poker.types';
import type { RetroColumnId, RetroRoomState } from './retro.types';

export type RoomState = PokerRoomState | RetroRoomState;

export type ErrorCode =
  | 'NOT_MODERATOR'
  | 'ROOM_NOT_FOUND'
  | 'INVALID_ACTION'
  | 'VOTE_CAP_REACHED';

export interface ErrorPayload {
  code: ErrorCode;
  message: string;
}

export interface CreateRoomPayload {
  type: RoomType;
  displayName: string;
}

export interface CreateRoomAck {
  ok: true;
  roomCode: string;
  participantId: string;
}

export interface JoinRoomPayload {
  roomCode: string;
  displayName: string;
  /** Present when attempting to reconnect as a previously-known participant. */
  participantId?: string;
}

export interface JoinRoomAck {
  ok: true;
  roomCode: string;
  participantId: string;
}

export type ErrorAck = { ok: false } & ErrorPayload;

export interface RenameAck {
  ok: true;
  /** The name actually applied — may differ from what was requested if de-duplicated. */
  displayName: string;
}

export interface MakeModeratorAck {
  ok: true;
}

/** Server → client events: state/facts broadcast by the authoritative server. */
export interface ServerToClientEvents {
  'room:state': (state: RoomState) => void;
  'room:closed': (payload: { reason: string }) => void;
  error: (payload: ErrorPayload) => void;
}

/** Client → server events: imperative intents, validated + applied server-side. */
export interface ClientToServerEvents {
  'room:create': (
    payload: CreateRoomPayload,
    callback: (ack: CreateRoomAck | ErrorAck) => void
  ) => void;
  'room:join': (
    payload: JoinRoomPayload,
    callback: (ack: JoinRoomAck | ErrorAck) => void
  ) => void;
  'room:leave': () => void;
  /** Moderator-only: closes the room for everyone (see `room:closed`). */
  'room:end': () => void;
  'participant:rename': (
    payload: { displayName: string },
    callback: (ack: RenameAck | ErrorAck) => void
  ) => void;
  /** Moderator-only: transfers the moderator role to another participant. */
  'participant:makeModerator': (
    payload: { participantId: string },
    callback: (ack: MakeModeratorAck | ErrorAck) => void
  ) => void;
  'poker:vote': (payload: { card: PokerCard }) => void;
  'poker:reveal': () => void;
  'poker:reset': () => void;
  'retro:addCard': (payload: { columnId: RetroColumnId; text: string }) => void;
  'retro:vote': (payload: { cardId: string }) => void;
  'retro:close': (payload: { actionItems: string[] }) => void;
}

/** No inter-server events needed for the single-instance MVP (see docs/hld.md §5). */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type InterServerEvents = Record<string, never>;

/** Per-socket data the server attaches once a socket has joined a room. Unset until then. */
export interface SocketData {
  roomCode?: string;
  participantId?: string;
}
