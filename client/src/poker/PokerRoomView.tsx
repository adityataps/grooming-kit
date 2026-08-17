import { useState } from 'react';
import type { PokerCard, PokerRoomState } from '@grooming-kit/shared';
import { useRoom } from '../state/RoomContext';
import { ParticipantList } from '../shared-ui/ParticipantList';
import { RoomHeader } from '../shared-ui/RoomHeader';
import { CardDeck } from './CardDeck';
import { VoteBoard } from './VoteBoard';

interface PokerRoomViewProps {
  state: PokerRoomState;
}

export function PokerRoomView({ state }: PokerRoomViewProps) {
  const { participantId, pokerVote, pokerReveal, pokerReset, leaveRoom } = useRoom();
  const [selected, setSelected] = useState<PokerCard | null>(null);

  const me = state.participants.find((p) => p.id === participantId);
  const isModerator = me?.isModerator ?? false;
  const votedCount = state.votes.filter((v) => v.hasVoted).length;

  function handleVote(card: PokerCard): void {
    setSelected(card);
    pokerVote(card);
  }

  function handleReset(): void {
    pokerReset();
    setSelected(null);
  }

  return (
    <div className="room poker-room">
      <RoomHeader code={state.code} typeLabel="Scrum Poker" onLeave={leaveRoom} />

      <div className="room-body">
        <aside>
          <h2>Participants</h2>
          <ParticipantList participants={state.participants} currentParticipantId={participantId} />
          <p className="vote-progress">
            {votedCount} / {state.participants.length} voted
          </p>
        </aside>

        <main>
          <CardDeck selectedCard={selected} disabled={state.revealed} onSelect={handleVote} />

          {isModerator && (
            <div className="moderator-controls">
              <button type="button" onClick={pokerReveal} disabled={state.revealed}>
                Reveal
              </button>
              <button type="button" onClick={handleReset}>
                Reset round
              </button>
            </div>
          )}

          <VoteBoard votes={state.votes} participants={state.participants} revealed={state.revealed} />
        </main>
      </div>
    </div>
  );
}
