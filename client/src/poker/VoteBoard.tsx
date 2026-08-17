import type { Participant, PokerVote } from '@grooming-kit/shared';

interface VoteBoardProps {
  votes: PokerVote[];
  participants: Participant[];
  revealed: boolean;
}

export function VoteBoard({ votes, participants, revealed }: VoteBoardProps) {
  return (
    <div className="vote-board">
      <h2>{revealed ? 'Results' : 'Votes'}</h2>
      <ul>
        {votes.map((v) => {
          const participant = participants.find((p) => p.id === v.participantId);
          return (
            <li key={v.participantId}>
              <span>{participant?.displayName ?? 'Unknown'}</span>
              <strong>{revealed ? (v.card ?? '—') : v.hasVoted ? '✓' : '…'}</strong>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
