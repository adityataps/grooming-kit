import { randomUUID } from 'node:crypto';
import {
  RETRO_COLUMNS,
  RETRO_VOTE_CAP,
  type RetroCard,
  type RetroColumnId,
  type RetroRoomState,
} from '@grooming-kit/shared';
import { RoomBase } from './RoomBase';

const MAX_CARD_TEXT_LENGTH = 280;
const MAX_ACTION_ITEMS = 50;

export class RetroRoom extends RoomBase {
  readonly type = 'retro' as const;

  private cards: RetroCard[] = [];
  private closed = false;
  private actionItems: string[] = [];

  addCard(authorId: string, columnId: RetroColumnId, text: string): boolean {
    if (this.closed) return false;
    if (!RETRO_COLUMNS.includes(columnId)) return false;
    const trimmed = text.trim();
    if (!trimmed) return false;
    this.cards.push({
      id: randomUUID(),
      columnId,
      text: trimmed.slice(0, MAX_CARD_TEXT_LENGTH),
      authorId,
      votes: [],
    });
    return true;
  }

  /** Toggles the participant's vote on a card. Returns false if the card is missing or the
   * participant is already at their vote cap and trying to add a new vote. */
  toggleVote(participantId: string, cardId: string): boolean {
    if (this.closed) return false;
    const card = this.cards.find((c) => c.id === cardId);
    if (!card) return false;

    const existingIndex = card.votes.indexOf(participantId);
    if (existingIndex >= 0) {
      card.votes.splice(existingIndex, 1);
      return true;
    }

    const votesUsed = this.cards.reduce(
      (sum, c) => sum + (c.votes.includes(participantId) ? 1 : 0),
      0
    );
    if (votesUsed >= RETRO_VOTE_CAP) return false;

    card.votes.push(participantId);
    return true;
  }

  close(actionItems: string[]): void {
    this.closed = true;
    this.actionItems = actionItems
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, MAX_ACTION_ITEMS);
  }

  toState(): RetroRoomState {
    return {
      code: this.code,
      type: this.type,
      createdAt: this.createdAt,
      participants: this.listParticipants(),
      columns: RETRO_COLUMNS,
      cards: this.cards,
      closed: this.closed,
      actionItems: this.actionItems,
    };
  }
}
