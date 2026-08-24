import type { BaseRoomState } from './room.types';

export const POKER_DECK = ['0', '1', '2', '3', '5', '8', '13', '21', '?', '☕'] as const;
export type PokerCard = (typeof POKER_DECK)[number];

/** Selectable countdown durations for the moderator's auto-reveal timer, in seconds. */
export const POKER_TIMER_DURATIONS = [30, 60, 90, 120] as const;
export type PokerTimerDuration = (typeof POKER_TIMER_DURATIONS)[number];

export interface PokerVote {
  participantId: string;
  /**
   * Redacted to `null` for every client (including the voter's own other tabs) until the
   * moderator reveals the round — server never sends real card values pre-reveal (NFR7).
   * Use `hasVoted` to know who has already voted without leaking the value.
   */
  card: PokerCard | null;
  hasVoted: boolean;
}

export interface PokerRoomState extends BaseRoomState {
  type: 'poker';
  revealed: boolean;
  votes: PokerVote[];
  /** Server epoch ms at which the round will auto-reveal, or `null` if no timer is running. */
  timerEndsAt: number | null;
}
