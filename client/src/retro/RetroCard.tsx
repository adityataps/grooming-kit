import type { RetroCard as RetroCardType } from '@grooming-kit/shared';

interface RetroCardProps {
  card: RetroCardType;
  currentParticipantId: string | null;
  disabled: boolean;
  onVote: (cardId: string) => void;
}

export function RetroCard({ card, currentParticipantId, disabled, onVote }: RetroCardProps) {
  const hasVoted = currentParticipantId ? card.votes.includes(currentParticipantId) : false;

  return (
    <li className="retro-card">
      <p>{card.text}</p>
      <button
        type="button"
        className={hasVoted ? 'voted' : ''}
        disabled={disabled}
        onClick={() => onVote(card.id)}
      >
        ▲ {card.votes.length}
      </button>
    </li>
  );
}
