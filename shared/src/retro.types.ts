import type { BaseRoomState } from './room.types';

export type RetroColumnId = 'start' | 'stop' | 'continue';

export const RETRO_COLUMNS: RetroColumnId[] = ['start', 'stop', 'continue'];

/** Default per-participant vote cap for retro card voting. */
export const RETRO_VOTE_CAP = 3;

export interface RetroCard {
  id: string;
  columnId: RetroColumnId;
  text: string;
  authorId: string;
  votes: string[]; // participantIds who voted for this card
}

export interface RetroRoomState extends BaseRoomState {
  type: 'retro';
  columns: RetroColumnId[];
  cards: RetroCard[];
  closed: boolean;
  actionItems: string[];
}
