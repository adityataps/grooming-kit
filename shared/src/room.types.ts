export type RoomType = 'poker' | 'retro';
// 'standup-picker' is a planned post-MVP addition (see docs/requirements.md → Future Features);
// adding it here plus a StandupPickerRoomState + standup:* events is the only shared-contract
// change needed — no infra/backend architecture change required.

export interface Participant {
  id: string; // UUID, stable across reconnects
  displayName: string;
  isModerator: boolean;
  connected: boolean;
}

export interface BaseRoomState {
  code: string; // 6-char room code
  type: RoomType;
  createdAt: number;
  participants: Participant[];
}

export const ROOM_CODE_LENGTH = 6;

// Excludes visually-ambiguous characters: I, L, O, 0, 1 (see docs/lld.md §6).
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Format-only check (does not confirm the room actually exists on the server). */
export function isValidRoomCode(code: string): boolean {
  if (code.length !== ROOM_CODE_LENGTH) return false;
  return [...code].every((ch) => ROOM_CODE_ALPHABET.includes(ch));
}
