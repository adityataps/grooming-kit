import type { Participant, PokerVote } from '@grooming-kit/shared';
import { Avatar } from '../shared-ui/Avatar';

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
        {votes.map((v, i) => {
          const participant = participants.find((p) => p.id === v.participantId);
          return (
            <li key={v.participantId}>
              <span className="vote-board-name">
                <Avatar name={participant?.displayName ?? '?'} seed={v.participantId} size="sm" />
                {participant?.displayName ?? 'Unknown'}
              </span>
              <span
                className={`vote-face ${revealed ? 'is-revealed' : ''} ${v.hasVoted ? 'has-voted' : ''}`}
                style={{ transitionDelay: revealed ? `${i * 70}ms` : '0ms' }}
              >
                <span className="vote-face-inner">
                  <span className="vote-face-back">{v.hasVoted ? '✓' : '…'}</span>
                  <span className="vote-face-front">{v.card ?? '—'}</span>
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
