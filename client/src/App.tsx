import { RoomProvider, useRoom } from './state/RoomContext';
import { Lobby } from './lobby/Lobby';
import { PokerRoomView } from './poker/PokerRoomView';
import { RetroRoomView } from './retro/RetroRoomView';

function AppContent() {
  const { connected, roomState, closedReason, dismissClosed } = useRoom();

  if (closedReason) {
    return (
      <div className="room-closed">
        <p>{closedReason}</p>
        <button type="button" onClick={dismissClosed}>
          Back to lobby
        </button>
      </div>
    );
  }

  if (!connected) {
    return <div className="connecting">Connecting…</div>;
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
