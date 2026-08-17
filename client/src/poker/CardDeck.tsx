import type { PokerCard } from '@grooming-kit/shared';
import { POKER_DECK } from '@grooming-kit/shared';

interface CardDeckProps {
  selectedCard: PokerCard | null;
  disabled: boolean;
  onSelect: (card: PokerCard) => void;
}

export function CardDeck({ selectedCard, disabled, onSelect }: CardDeckProps) {
  return (
    <div className="deck">
      {POKER_DECK.map((card) => (
        <button
          key={card}
          type="button"
          className={`card ${selectedCard === card ? 'selected' : ''}`}
          onClick={() => onSelect(card)}
          disabled={disabled}
        >
          {card}
        </button>
      ))}
    </div>
  );
}
