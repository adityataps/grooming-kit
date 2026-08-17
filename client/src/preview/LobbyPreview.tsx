import { RoomContext } from '../state/RoomContext';
import type { RoomContextValue } from '../state/RoomContext';
import { Lobby } from '../lobby/Lobby';
import { MOCK_PARTICIPANT_ID } from './mockData';
import { mockRoomContextBase } from './mockRoomContext';

const value: RoomContextValue = {
  ...mockRoomContextBase(MOCK_PARTICIPANT_ID),
  pokerVote: () => {},
  pokerReveal: () => {},
  pokerReset: () => {},
  retroAddCard: () => {},
  retroVote: () => {},
  retroClose: () => {},
};

export function LobbyPreview() {
  return (
    <RoomContext.Provider value={value}>
      <div className="preview-frame">
        <Lobby />
      </div>
    </RoomContext.Provider>
  );
}
