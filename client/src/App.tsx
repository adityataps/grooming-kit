import { RoomProvider, useRoom } from './state/RoomContext';
import { Lobby } from './lobby/Lobby';
import { PokerRoomView } from './poker/PokerRoomView';
import { RetroRoomView } from './retro/RetroRoomView';

function AppContent() {
  const { connected, roomState, closedReason, dismissClosed } = useRoom();

  if (closedReason) {
    return (
      <div className="room-closed">
        <div className="room-closed-card" role="dialog" aria-modal="true" aria-labelledby="room-closed-title">
          <span className="room-closed-icon" aria-hidden="true">
            ✂️
          </span>
          <h2 id="room-closed-title">Session ended</h2>
          <p>{closedReason}</p>
          <button type="button" onClick={dismissClosed}>
            Back to homepage
          </button>
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="connecting">
        <span className="spinner-emoji" aria-hidden="true">
          ✂️
        </span>
        <p>Connecting…</p>
      </div>
    );
  }

  if (!roomState) {
    return <Lobby />;
  }

  return roomState.type === 'poker' ? (
    <PokerRoomView state={roomState} />
  ) : (
    <RetroRoomView state={roomState} />
  );
}

export function App() {
  return (
    <RoomProvider>
      <AppContent />
    </RoomProvider>
  );
}

export default App;
