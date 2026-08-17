import type { RoomContextValue } from '../state/RoomContext';

/**
 * Base no-op RoomContextValue fields shared by every preview demo. Callers
 * spread this and override the specific action handlers (pokerVote, etc.)
 * they actually want to simulate.
 */
export function mockRoomContextBase(participantId: string): Omit<
  RoomContextValue,
  'pokerVote' | 'pokerReveal' | 'pokerReset' | 'retroAddCard' | 'retroVote' | 'retroClose'
> {
  return {
    connected: true,
    roomState: null,
    participantId,
    lastError: null,
    closedReason: null,
    createRoom: async () => ({ ok: true, roomCode: 'PREVW', participantId }),
    joinRoom: async () => ({ ok: true, roomCode: 'PREVW', participantId }),
    leaveRoom: () => {
      // eslint-disable-next-line no-console
      console.info('[preview] leaveRoom (no-op)');
    },
    dismissError: () => {},
    dismissClosed: () => {},
  };
}
