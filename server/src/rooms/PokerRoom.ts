import {
  POKER_DECK,
  POKER_TIMER_DURATIONS,
  type PokerCard,
  type PokerRoomState,
  type PokerTimerDuration,
} from '@grooming-kit/shared';
import { RoomBase } from './RoomBase';

export class PokerRoom extends RoomBase {
  readonly type = 'poker' as const;

  private revealed = false;
  /** Only holds entries for participants who have voted this round. */
  private votes = new Map<string, PokerCard>();
  private timerEndsAt: number | null = null;
  private timerHandle: ReturnType<typeof setTimeout> | null = null;

  /** Returns false (rejected) if the round is already revealed or the card is invalid. */
  vote(participantId: string, card: PokerCard): boolean {
    if (this.revealed) return false;
    if (!POKER_DECK.includes(card)) return false;
    this.votes.set(participantId, card);
    return true;
  }

  reveal(): void {
    this.revealed = true;
    this.clearTimer();
  }

  reset(): void {
    this.revealed = false;
    this.votes.clear();
    this.clearTimer();
  }

  /**
   * (Re)starts a countdown that auto-reveals the round once it elapses. Returns false
   * (rejected) if the round is already revealed or the duration isn't one of the allowed
   * increments. `onAutoReveal` fires after the round is auto-revealed so the caller
   * (socketHandlers) can broadcast the updated state — the room has no access to `io`.
   */
  startTimer(durationSec: PokerTimerDuration, onAutoReveal: () => void): boolean {
    if (this.revealed) return false;
    if (!POKER_TIMER_DURATIONS.includes(durationSec)) return false;
    this.clearTimer();
    this.timerEndsAt = Date.now() + durationSec * 1000;
    this.timerHandle = setTimeout(() => {
      this.timerHandle = null;
      this.reveal();
      onAutoReveal();
    }, durationSec * 1000);
    return true;
  }

  /** Stops a running countdown without revealing. No-op if no timer is running. */
  cancelTimer(): void {
    this.clearTimer();
  }

  private clearTimer(): void {
    if (this.timerHandle) {
      clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }
    this.timerEndsAt = null;
  }

  /** Releases the pending timer, if any, so it can't fire after the room is removed. */
  override cleanup(): void {
    this.clearTimer();
  }

  toState(): PokerRoomState {
    const participants = this.listParticipants();
    return {
      code: this.code,
      type: this.type,
      createdAt: this.createdAt,
      participants,
      revealed: this.revealed,
      timerEndsAt: this.timerEndsAt,
      votes: participants.map((p) => {
        const hasVoted = this.votes.has(p.id);
        return {
          participantId: p.id,
          hasVoted,
          // Redacted until reveal (NFR7) — server never leaks the card value pre-reveal.
          card: this.revealed && hasVoted ? (this.votes.get(p.id) ?? null) : null,
        };
      }),
    };
  }
}
