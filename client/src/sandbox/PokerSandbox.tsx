import { useState } from 'react';
import type { PokerCard } from '@grooming-kit/shared';
import { RoomContext } from '../state/RoomContext';
import type { RoomContextValue } from '../state/RoomContext';
import { PokerRoomView } from '../poker/PokerRoomView';
import { MOCK_PARTICIPANT_ID, makePokerState } from './mockData';
import { mockRoomContextBase } from './mockRoomContext';

export function PokerSandbox() {
  const [pokerState, setPokerState] = useState(makePokerState);

  const value: RoomContextValue = {
    ...mockRoomContextBase(MOCK_PARTICIPANT_ID),
    pokerVote: (card: PokerCard) => {
      setPokerState((prev) => ({
        ...prev,
        votes: prev.votes.map((v) =>
          v.participantId === MOCK_PARTICIPANT_ID ? { ...v, card, hasVoted: true } : v
        ),
      }));
    },
    pokerReveal: () => setPokerState((prev) => ({ ...prev, revealed: true })),
    pokerReset: () =>
      setPokerState((prev) => ({
        ...prev,
        revealed: false,
        votes: prev.votes.map((v) => ({ ...v, card: null, hasVoted: false })),
      })),
    renameParticipant: async (displayName: string) => {
      setPokerState((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.id === MOCK_PARTICIPANT_ID ? { ...p, displayName } : p
        ),
      }));
      return { ok: true, displayName };
    },
    retroAddCard: () => {},
    retroVote: () => {},
    retroClose: () => {},
  };

  function simulateConsensus(): void {
    setPokerState((prev) => ({
      ...prev,
      revealed: true,
      votes: prev.votes.map((v) => ({ ...v, card: '5', hasVoted: true })),
    }));
  }

  function simulateSplit(): void {
    const options: PokerCard[] = ['1', '5', '8', '13'];
    setPokerState((prev) => ({
      ...prev,
      revealed: true,
      votes: prev.votes.map((v, i) => ({ ...v, card: options[i % options.length], hasVoted: true })),
    }));
  }

  return (
    <RoomContext.Provider value={value}>
      <div className="sandbox-section-controls">
        <button type="button" onClick={simulateConsensus}>
          🎉 Simulate consensus (confetti)
        </button>
        <button type="button" onClick={simulateSplit}>
          Simulate split votes
        </button>
      </div>
      <div className="sandbox-frame">
        <PokerRoomView state={pokerState} />
      </div>
    </RoomContext.Provider>
  );
}
