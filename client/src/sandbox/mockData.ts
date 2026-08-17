import type { Participant, PokerRoomState, RetroRoomState } from '@grooming-kit/shared';

export const MOCK_PARTICIPANT_ID = 'sandbox-me';

export const MOCK_PARTICIPANTS: Participant[] = [
  { id: MOCK_PARTICIPANT_ID, displayName: 'You', isModerator: true, connected: true },
  { id: 'sandbox-alice', displayName: 'Alice', isModerator: false, connected: true },
  { id: 'sandbox-bob', displayName: 'Bob', isModerator: false, connected: true },
  { id: 'sandbox-cleo', displayName: 'Cleo', isModerator: false, connected: false },
];

export function makePokerState(): PokerRoomState {
  return {
    code: 'SNDBX1',
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
    code: 'SNDBX2',
    type: 'retro',
    createdAt: Date.now(),
    participants: MOCK_PARTICIPANTS,
    columns: ['start', 'stop', 'continue'],
    cards: [
      {
        id: 'card-1',
        columnId: 'start',
        text: 'Rotating standup lead so everyone gets a turn',
        authorId: 'sandbox-alice',
        votes: ['sandbox-alice', 'sandbox-bob'],
      },
      {
        id: 'card-2',
        columnId: 'stop',
        text: 'Scheduling meetings during lunch',
        authorId: 'sandbox-bob',
        votes: [],
      },
      {
        id: 'card-3',
        columnId: 'continue',
        text: 'Weekly demo Fridays \u2014 keep it up!',
        authorId: MOCK_PARTICIPANT_ID,
        votes: ['sandbox-alice'],
      },
    ],
    closed: false,
    actionItems: [],
  };
}
