import { useState } from 'react';
import type { FormEvent } from 'react';
import type { RetroCard as RetroCardType, RetroColumnId } from '@grooming-kit/shared';
import { RetroCard } from './RetroCard';

const COLUMN_LABELS: Record<RetroColumnId, string> = {
  start: 'What went well',
  stop: "What didn't go well",
  continue: 'Things to improve',
};

interface RetroColumnProps {
  columnId: RetroColumnId;
  cards: RetroCardType[];
  currentParticipantId: string | null;
  closed: boolean;
  onAddCard: (columnId: RetroColumnId, text: string) => void;
  onVote: (cardId: string) => void;
}

export function RetroColumn({
  columnId,
  cards,
  currentParticipantId,
  closed,
  onAddCard,
  onVote,
}: RetroColumnProps) {
  const [text, setText] = useState('');

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    if (!text.trim()) return;
    onAddCard(columnId, text);
    setText('');
  }

  return (
    <div className="retro-column">
      <h2>{COLUMN_LABELS[columnId]}</h2>
      <ul>
        {cards.map((card) => (
          <RetroCard
            key={card.id}
            card={card}
            currentParticipantId={currentParticipantId}
            disabled={closed}
            onVote={onVote}
          />
        ))}
      </ul>
      {!closed && (
        <form onSubmit={handleSubmit}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={280}
            placeholder="Add a card…"
          />
          <button type="submit">Add</button>
        </form>
      )}
    </div>
  );
}
