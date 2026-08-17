import { POKER_DECK, type PokerCard, type PokerRoomState } from '@grooming-kit/shared';
import { RoomBase } from './RoomBase';

export class PokerRoom extends RoomBase {
  readonly type = 'poker' as const;

  private revealed = false;
  /** Only holds entries for participants who have voted this round. */
  private votes = new Map<string, PokerCard>();

  /** Returns false (rejected) if the round is already revealed or the card is invalid. */
  vote(participantId: string, card: PokerCard): boolean {
    if (this.revealed) return false;
    if (!POKER_DECK.includes(card)) return false;
    this.votes.set(participantId, card);
    return true;
  }

  reveal(): void {
    this.revealed = true;
  }

  reset(): void {
    this.revealed = false;
    this.votes.clear();
  }

  toState(): PokerRoomState {
    const participants = this.listParticipants();
    return {
      code: this.code,
      type: this.type,
      createdAt: this.createdAt,
      participants,
      revealed: this.revealed,
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
