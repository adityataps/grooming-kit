import type { Participant } from '@grooming-kit/shared';

interface ParticipantListProps {
  participants: Participant[];
  currentParticipantId: string | null;
}

export function ParticipantList({ participants, currentParticipantId }: ParticipantListProps) {
  return (
    <ul className="participant-list">
      {participants.map((p) => (
        <li key={p.id} className={p.connected ? 'connected' : 'disconnected'}>
          <span className="presence-dot" aria-hidden="true" />
          {p.displayName}
          {p.isModerator && <span className="badge">moderator</span>}
          {p.id === currentParticipantId && <span className="you">(you)</span>}
        </li>
      ))}
    </ul>
  );
}
