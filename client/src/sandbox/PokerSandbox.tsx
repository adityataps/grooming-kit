import { useEffect, useRef, useState } from 'react';
import type { PokerCard, PokerTimerDuration } from '@grooming-kit/shared';
import { RoomContext } from '../state/RoomContext';
import type { RoomContextValue } from '../state/RoomContext';
import { PokerRoomView } from '../poker/PokerRoomView';
import { MOCK_PARTICIPANT_ID, makePokerState } from './mockData';
import { mockRoomContextBase } from './mockRoomContext';

export function PokerSandbox() {
  const [pokerState, setPokerState] = useState(makePokerState);
  const timerHandle = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerHandle.current) clearTimeout(timerHandle.current);
  }, []);

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
    pokerReveal: () => {
      if (timerHandle.current) clearTimeout(timerHandle.current);
      setPokerState((prev) => ({ ...prev, revealed: true, timerEndsAt: null }));
    },
    pokerReset: () => {
      if (timerHandle.current) clearTimeout(timerHandle.current);
      setPokerState((prev) => ({
        ...prev,
        revealed: false,
        timerEndsAt: null,
        votes: prev.votes.map((v) => ({ ...v, card: null, hasVoted: false })),
      }));
    },
    pokerStartTimer: (durationSec: PokerTimerDuration) => {
      if (timerHandle.current) clearTimeout(timerHandle.current);
      setPokerState((prev) => ({ ...prev, timerEndsAt: Date.now() + durationSec * 1000 }));
      timerHandle.current = setTimeout(() => {
        setPokerState((prev) => ({ ...prev, revealed: true, timerEndsAt: null }));
      }, durationSec * 1000);
    },
    pokerCancelTimer: () => {
      if (timerHandle.current) clearTimeout(timerHandle.current);
      setPokerState((prev) => ({ ...prev, timerEndsAt: null }));
    },
    renameParticipant: async (displayName: string) => {
      setPokerState((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.id === MOCK_PARTICIPANT_ID ? { ...p, displayName } : p
        ),
      }));
      return { ok: true, displayName };
    },
    makeModerator: async (participantId: string) => {
      setPokerState((prev) => ({
        ...prev,
        participants: prev.participants.map((p) => ({ ...p, isModerator: p.id === participantId })),
      }));
      return { ok: true };
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
