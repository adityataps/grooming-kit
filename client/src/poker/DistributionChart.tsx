import { useMemo, useState } from 'react';
import { POKER_DECK, type Participant, type PokerCard, type PokerVote } from '@grooming-kit/shared';

interface DistributionChartProps {
  votes: PokerVote[];
  participants: Participant[];
}

/** Interactive bar chart of how many participants landed on each card once revealed —
 * hover/focus a bar to see who voted it. Renders nothing pre-reveal or with no votes. */
export function DistributionChart({ votes, participants }: DistributionChartProps) {
  const [activeCard, setActiveCard] = useState<PokerCard | null>(null);

  const votersByCard = useMemo(() => {
    const map = new Map<PokerCard, string[]>();
    for (const card of POKER_DECK) map.set(card, []);
    for (const vote of votes) {
      if (vote.card === null) continue;
      const name = participants.find((p) => p.id === vote.participantId)?.displayName ?? 'Unknown';
      map.get(vote.card)?.push(name);
    }
    return map;
  }, [votes, participants]);

  const maxCount = Math.max(1, ...Array.from(votersByCard.values(), (names) => names.length));
  const totalVotes = Array.from(votersByCard.values()).reduce((sum, names) => sum + names.length, 0);

  if (totalVotes === 0) return null;

  return (
    <div className="distribution-chart">
      <h2>Distribution</h2>
      <div className="distribution-bars">
        {POKER_DECK.map((card) => {
          const voters = votersByCard.get(card) ?? [];
          const heightPct = voters.length === 0 ? 0 : (voters.length / maxCount) * 100;
          return (
            <div
              key={card}
              className={`distribution-bar-col ${activeCard === card ? 'is-active' : ''}`}
              onMouseEnter={() => setActiveCard(card)}
              onMouseLeave={() => setActiveCard((c) => (c === card ? null : c))}
              onFocus={() => setActiveCard(card)}
              onBlur={() => setActiveCard((c) => (c === card ? null : c))}
              tabIndex={voters.length > 0 ? 0 : -1}
            >
              {voters.length > 0 && activeCard === card && (
                <div className="distribution-tooltip" role="tooltip">
                  {voters.join(', ')}
                </div>
              )}
              <span className="distribution-count">{voters.length > 0 ? voters.length : ''}</span>
              <div className="distribution-bar-track">
                <div className="distribution-bar" style={{ height: `${heightPct}%` }} />
              </div>
              <span className="distribution-label">{card}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
