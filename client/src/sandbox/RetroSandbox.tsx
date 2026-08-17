import { useState } from 'react';
import type { RetroColumnId } from '@grooming-kit/shared';
import { RoomContext } from '../state/RoomContext';
import type { RoomContextValue } from '../state/RoomContext';
import { RetroRoomView } from '../retro/RetroRoomView';
import { MOCK_PARTICIPANT_ID, makeRetroState } from './mockData';
import { mockRoomContextBase } from './mockRoomContext';

export function RetroSandbox() {
  const [retroState, setRetroState] = useState(makeRetroState);

  const value: RoomContextValue = {
    ...mockRoomContextBase(MOCK_PARTICIPANT_ID),
    pokerVote: () => {},
    pokerReveal: () => {},
    pokerReset: () => {},
    retroAddCard: (columnId: RetroColumnId, text: string) => {
      setRetroState((prev) => ({
        ...prev,
        cards: [
          ...prev.cards,
          {
            id: `card-${Date.now()}`,
            columnId,
            text,
            authorId: MOCK_PARTICIPANT_ID,
            votes: [],
          },
        ],
      }));
    },
    retroVote: (cardId: string) => {
      setRetroState((prev) => ({
        ...prev,
        cards: prev.cards.map((c) => {
          if (c.id !== cardId) return c;
          const alreadyVoted = c.votes.includes(MOCK_PARTICIPANT_ID);
          return {
            ...c,
            votes: alreadyVoted
              ? c.votes.filter((id) => id !== MOCK_PARTICIPANT_ID)
              : [...c.votes, MOCK_PARTICIPANT_ID],
          };
        }),
      }));
    },
    retroClose: (actionItems: string[]) =>
      setRetroState((prev) => ({ ...prev, closed: true, actionItems })),
    renameParticipant: async (displayName: string) => {
      setRetroState((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.id === MOCK_PARTICIPANT_ID ? { ...p, displayName } : p
        ),
      }));
      return { ok: true, displayName };
    },
    makeModerator: async (participantId: string) => {
      setRetroState((prev) => ({
        ...prev,
        participants: prev.participants.map((p) => ({ ...p, isModerator: p.id === participantId })),
      }));
      return { ok: true };
    },
  };

  function resetDemo(): void {
    setRetroState(makeRetroState());
  }

  return (
    <RoomContext.Provider value={value}>
      <div className="sandbox-section-controls">
        <button type="button" onClick={resetDemo}>
          Reset demo data
        </button>
      </div>
      <div className="sandbox-frame">
        <RetroRoomView state={retroState} />
      </div>
    </RoomContext.Provider>
  );
}
