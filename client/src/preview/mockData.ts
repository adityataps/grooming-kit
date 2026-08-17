import type { Participant, PokerRoomState, RetroRoomState } from '@grooming-kit/shared';

export const MOCK_PARTICIPANT_ID = 'preview-me';

export const MOCK_PARTICIPANTS: Participant[] = [
  { id: MOCK_PARTICIPANT_ID, displayName: 'You', isModerator: true, connected: true },
  { id: 'preview-alice', displayName: 'Alice', isModerator: false, connected: true },
  { id: 'preview-bob', displayName: 'Bob', isModerator: false, connected: true },
  { id: 'preview-cleo', displayName: 'Cleo', isModerator: false, connected: false },
];

export function makePokerState(): PokerRoomState {
  return {
    code: 'PREVW1',
    type: 'poker',
    createdAt: Date.now(),
    participants: MOCK_PARTICIPANTS,
    revealed: false,
    votes: MOCK_PARTICIPANTS.map((p, i) => ({
      participantId: p.id,
      hasVoted: i !== 3,
      card: null,
    })),
  };
}

export function makeRetroState(): RetroRoomState {
  return {
    code: 'PREVW2',
    type: 'retro',
    createdAt: Date.now(),
    participants: MOCK_PARTICIPANTS,
    columns: ['start', 'stop', 'continue'],
    cards: [
      {
        id: 'card-1',
        columnId: 'start',
        text: 'Rotating standup lead so everyone gets a turn',
        authorId: 'preview-alice',
        votes: ['preview-alice', 'preview-bob'],
      },
      {
        id: 'card-2',
        columnId: 'stop',
        text: 'Scheduling meetings during lunch',
        authorId: 'preview-bob',
        votes: [],
      },
      {
        id: 'card-3',
        columnId: 'continue',
        text: 'Weekly demo Fridays \u2014 keep it up!',
        authorId: MOCK_PARTICIPANT_ID,
        votes: ['preview-alice'],
      },
    ],
    closed: false,
    actionItems: [],
  };
}
