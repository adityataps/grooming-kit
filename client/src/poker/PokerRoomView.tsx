import { useEffect, useMemo, useState } from 'react';
import type { PokerCard, PokerRoomState } from '@grooming-kit/shared';
import { useRoom } from '../state/RoomContext';
import { useRenameParticipant } from '../state/useRenameParticipant';
import { ParticipantList } from '../shared-ui/ParticipantList';
import { RoomHeader } from '../shared-ui/RoomHeader';
import { CardDeck } from './CardDeck';
import { VoteBoard } from './VoteBoard';
import { ConfettiBurst } from './ConfettiBurst';

interface PokerRoomViewProps {
  state: PokerRoomState;
}

export function PokerRoomView({ state }: PokerRoomViewProps) {
  const { participantId, pokerVote, pokerReveal, pokerReset, leaveRoom, endSession, makeModerator } =
    useRoom();
  const onRename = useRenameParticipant();
  const [selected, setSelected] = useState<PokerCard | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const me = state.participants.find((p) => p.id === participantId);
  const isModerator = me?.isModerator ?? false;
  const votedCount = state.votes.filter((v) => v.hasVoted).length;

  const isConsensus = useMemo(() => {
    if (!state.revealed) return false;
    const cards = state.votes.map((v) => v.card).filter((c): c is PokerCard => c !== null);
    if (cards.length < 2) return false;
    return cards.every((c) => c === cards[0]);
  }, [state.revealed, state.votes]);

  useEffect(() => {
    if (!isConsensus) return;
    setShowConfetti(true);
    const timer = setTimeout(() => setShowConfetti(false), 2500);
    return () => clearTimeout(timer);
  }, [isConsensus]);

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
      {showConfetti && <ConfettiBurst />}
      <RoomHeader
        code={state.code}
        typeLabel="Scrum Poker"
        isModerator={isModerator}
        onLeave={leaveRoom}
        onEndSession={endSession}
      />

      <div className="room-body">
        <aside>
          <h2>Participants</h2>
          <ParticipantList
            participants={state.participants}
            currentParticipantId={participantId}
            onRename={onRename}
            viewerIsModerator={isModerator}
            onMakeModerator={makeModerator}
          />
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

          {isConsensus && <p className="consensus-banner">🎉 Consensus!</p>}

          <VoteBoard votes={state.votes} participants={state.participants} revealed={state.revealed} />
        </main>
      </div>
    </div>
  );
}
