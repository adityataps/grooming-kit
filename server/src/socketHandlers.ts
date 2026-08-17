import { randomUUID } from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ErrorCode,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '@grooming-kit/shared';
import type { AnyRoom, RoomManager } from './rooms/RoomManager';
import type { PokerRoom } from './rooms/PokerRoom';
import type { RetroRoom } from './rooms/RetroRoom';

type IOServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

const DISPLAY_NAME_MAX_LENGTH = 40;

function errorPayload(code: ErrorCode, message: string) {
  return { code, message };
}

function broadcastState(io: IOServer, room: AnyRoom): void {
  io.to(room.code).emit('room:state', room.toState());
}

function sanitizeDisplayName(raw: string): string {
  return raw.trim().slice(0, DISPLAY_NAME_MAX_LENGTH);
}

/**
 * Appends " (2)", " (3)", etc. until the name no longer collides with an
 * existing participant in the room — covers both auto-generated random
 * names and manually-typed ones that happen to collide (NFR: participants
 * in a session must be distinguishable by display name).
 */
function dedupeDisplayName(base: string, existingNames: string[]): string {
  if (!existingNames.includes(base)) return base;
  let attempt = 2;
  while (existingNames.includes(`${base} (${attempt})`)) {
    attempt += 1;
  }
  return `${base} (${attempt})`;
}

function getRoomOrEmitError(socket: IOSocket, roomManager: RoomManager): AnyRoom | undefined {
  const { roomCode } = socket.data;
  if (!roomCode) {
    socket.emit('error', errorPayload('ROOM_NOT_FOUND', 'You are not currently in a room.'));
    return undefined;
  }
  const room = roomManager.getRoom(roomCode);
  if (!room) {
    socket.emit('error', errorPayload('ROOM_NOT_FOUND', `Room ${roomCode} was not found.`));
    return undefined;
  }
  return room;
}

function getPokerRoom(socket: IOSocket, roomManager: RoomManager): PokerRoom | undefined {
  const room = getRoomOrEmitError(socket, roomManager);
  if (!room) return undefined;
  if (room.type !== 'poker') {
    socket.emit('error', errorPayload('INVALID_ACTION', 'This room is not a poker room.'));
    return undefined;
  }
  return room;
}

function getRetroRoom(socket: IOSocket, roomManager: RoomManager): RetroRoom | undefined {
  const room = getRoomOrEmitError(socket, roomManager);
  if (!room) return undefined;
  if (room.type !== 'retro') {
    socket.emit('error', errorPayload('INVALID_ACTION', 'This room is not a retro room.'));
    return undefined;
  }
  return room;
}

function requireModerator(socket: IOSocket, room: AnyRoom): boolean {
  const { participantId } = socket.data;
  if (!participantId || !room.isModerator(participantId)) {
    socket.emit('error', errorPayload('NOT_MODERATOR', 'Only the moderator can do that.'));
    return false;
  }
  return true;
}

export function registerSocketHandlers(
  io: IOServer,
  socket: IOSocket,
  roomManager: RoomManager
): void {
  socket.on('room:create', (payload, callback) => {
    const displayName = sanitizeDisplayName(payload.displayName);
    if (!displayName) {
      callback({ ok: false, code: 'INVALID_ACTION', message: 'Display name is required.' });
      return;
    }

    const { room, participantId } = roomManager.createRoom(payload.type, displayName, socket.id);
    socket.data.roomCode = room.code;
    socket.data.participantId = participantId;
    void socket.join(room.code);

    callback({ ok: true, roomCode: room.code, participantId });
    broadcastState(io, room);
  });

  socket.on('room:join', (payload, callback) => {
    const room = roomManager.getRoom(payload.roomCode);
    if (!room) {
      callback({
        ok: false,
        code: 'ROOM_NOT_FOUND',
        message: `Room ${payload.roomCode} was not found.`,
      });
      return;
    }

    const displayName = sanitizeDisplayName(payload.displayName);
    if (!displayName) {
      callback({ ok: false, code: 'INVALID_ACTION', message: 'Display name is required.' });
      return;
    }

    const requestedId = payload.participantId;
    const canReconnect = Boolean(requestedId && room.getParticipant(requestedId));
    const participantId: string = canReconnect ? (requestedId as string) : randomUUID();

    if (canReconnect) {
      room.reconnectParticipant(participantId, socket.id);
    } else {
      const uniqueDisplayName = dedupeDisplayName(displayName, room.listDisplayNames());
      room.addParticipant(participantId, uniqueDisplayName, socket.id, /* isModerator */ false);
    }

    socket.data.roomCode = room.code;
    socket.data.participantId = participantId;
    void socket.join(room.code);

    callback({ ok: true, roomCode: room.code, participantId });
    broadcastState(io, room);
  });

  socket.on('room:leave', () => {
    const { roomCode, participantId } = socket.data;
    socket.data.roomCode = undefined;
    socket.data.participantId = undefined;
    if (!roomCode || !participantId) return;

    void socket.leave(roomCode);
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    room.removeParticipant(participantId);
    if (room.isEmpty()) {
      roomManager.removeRoom(roomCode);
    } else {
      broadcastState(io, room);
    }
  });

  socket.on('room:end', () => {
    const room = getRoomOrEmitError(socket, roomManager);
    if (!room || !requireModerator(socket, room)) return;

    // Tell everyone *else* in the room the session is over; the moderator's
    // own client transitions back to the lobby immediately on their side
    // (see `endSession` in RoomContext) without needing this round-trip.
    socket.broadcast.to(room.code).emit('room:closed', {
      reason: 'The moderator ended this session.',
    });
    io.in(room.code).socketsLeave(room.code);
    roomManager.removeRoom(room.code);
    socket.data.roomCode = undefined;
    socket.data.participantId = undefined;
  });

  socket.on('participant:rename', (payload, callback) => {
    const { roomCode, participantId } = socket.data;
    if (!roomCode || !participantId) {
      callback({ ok: false, code: 'ROOM_NOT_FOUND', message: 'You are not currently in a room.' });
      return;
    }

    const room = roomManager.getRoom(roomCode);
    if (!room) {
      callback({ ok: false, code: 'ROOM_NOT_FOUND', message: `Room ${roomCode} was not found.` });
      return;
    }

    const displayName = sanitizeDisplayName(payload.displayName);
    if (!displayName) {
      callback({ ok: false, code: 'INVALID_ACTION', message: 'Display name is required.' });
      return;
    }

    const uniqueDisplayName = dedupeDisplayName(
      displayName,
      room.listDisplayNames(participantId)
    );
    room.renameParticipant(participantId, uniqueDisplayName);

    callback({ ok: true, displayName: uniqueDisplayName });
    broadcastState(io, room);
  });

  socket.on('disconnect', () => {
    const { roomCode, participantId } = socket.data;
    if (!roomCode || !participantId) return;

    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    room.markDisconnected(participantId, () => {
      if (room.isEmpty()) {
        roomManager.removeRoom(roomCode);
      }
    });
    broadcastState(io, room);
  });

  socket.on('poker:vote', (payload) => {
    const room = getPokerRoom(socket, roomManager);
    if (!room || !socket.data.participantId) return;
    const ok = room.vote(socket.data.participantId, payload.card);
    if (!ok) {
      socket.emit(
        'error',
        errorPayload('INVALID_ACTION', 'Vote rejected — the round may already be revealed.')
      );
      return;
    }
    broadcastState(io, room);
  });

  socket.on('poker:reveal', () => {
    const room = getPokerRoom(socket, roomManager);
    if (!room || !requireModerator(socket, room)) return;
    room.reveal();
    broadcastState(io, room);
  });

  socket.on('poker:reset', () => {
    const room = getPokerRoom(socket, roomManager);
    if (!room || !requireModerator(socket, room)) return;
    room.reset();
    broadcastState(io, room);
  });

  socket.on('retro:addCard', (payload) => {
    const room = getRetroRoom(socket, roomManager);
    if (!room || !socket.data.participantId) return;
    const ok = room.addCard(socket.data.participantId, payload.columnId, payload.text);
    if (!ok) {
      socket.emit('error', errorPayload('INVALID_ACTION', 'Could not add that card.'));
      return;
    }
    broadcastState(io, room);
  });

  socket.on('retro:vote', (payload) => {
    const room = getRetroRoom(socket, roomManager);
    if (!room || !socket.data.participantId) return;
    const ok = room.toggleVote(socket.data.participantId, payload.cardId);
    if (!ok) {
      socket.emit(
        'error',
        errorPayload('VOTE_CAP_REACHED', 'Vote cap reached, or the card no longer exists.')
      );
      return;
    }
    broadcastState(io, room);
  });

  socket.on('retro:close', (payload) => {
    const room = getRetroRoom(socket, roomManager);
    if (!room || !requireModerator(socket, room)) return;
    room.close(payload.actionItems);
    broadcastState(io, room);
  });
}
