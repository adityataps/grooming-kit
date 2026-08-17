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
