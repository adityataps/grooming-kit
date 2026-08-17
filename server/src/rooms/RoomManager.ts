import { randomUUID } from 'node:crypto';
import type { RoomType } from '@grooming-kit/shared';
import { generateRoomCode } from '../roomCode';
import { PokerRoom } from './PokerRoom';
import { RetroRoom } from './RetroRoom';

export type AnyRoom = PokerRoom | RetroRoom;

export class RoomManager {
  private rooms = new Map<string, AnyRoom>();

  createRoom(
    type: RoomType,
    displayName: string,
    socketId: string
  ): { room: AnyRoom; participantId: string } {
    let code = generateRoomCode();
    while (this.rooms.has(code)) {
      code = generateRoomCode();
    }

    const room: AnyRoom = type === 'poker' ? new PokerRoom(code) : new RetroRoom(code);
    const participantId = randomUUID();
    room.addParticipant(participantId, displayName, socketId, /* isModerator */ true);
    this.rooms.set(code, room);
    return { room, participantId };
  }

  getRoom(code: string): AnyRoom | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  removeRoom(code: string): void {
    this.rooms.delete(code);
  }
}
