import { useEffect, useState } from 'react';
import type { RetroCard as RetroCardType } from '@grooming-kit/shared';

interface RetroCardProps {
  card: RetroCardType;
  currentParticipantId: string | null;
  disabled: boolean;
  onVote: (cardId: string) => void;
}

export function RetroCard({ card, currentParticipantId, disabled, onVote }: RetroCardProps) {
  const hasVoted = currentParticipantId ? card.votes.includes(currentParticipantId) : false;
  const [justVoted, setJustVoted] = useState(false);

  // Replays the pop animation briefly whenever the vote count changes for this card.
  useEffect(() => {
    if (card.votes.length === 0) return;
    setJustVoted(true);
    const timer = setTimeout(() => setJustVoted(false), 350);
    return () => clearTimeout(timer);
  }, [card.votes.length]);

  function handleClick(): void {
    onVote(card.id);
  }

  return (
    <li className="retro-card">
      <p>{card.text}</p>
      <button
        type="button"
        className={`${hasVoted ? 'voted' : ''} ${justVoted ? 'just-voted' : ''}`}
        disabled={disabled}
        onClick={handleClick}
      >
        ▲ {card.votes.length}
      </button>
    </li>
  );
}
