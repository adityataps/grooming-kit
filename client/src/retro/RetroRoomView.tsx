import { useState } from 'react';
import type { RetroRoomState } from '@grooming-kit/shared';
import { useRoom } from '../state/RoomContext';
import { useRenameParticipant } from '../state/useRenameParticipant';
import { ParticipantList } from '../shared-ui/ParticipantList';
import { RoomHeader } from '../shared-ui/RoomHeader';
import { RetroColumn } from './RetroColumn';

interface RetroRoomViewProps {
  state: RetroRoomState;
}

export function RetroRoomView({ state }: RetroRoomViewProps) {
  const { participantId, retroAddCard, retroVote, retroClose, leaveRoom, endSession, makeModerator } =
    useRoom();
  const onRename = useRenameParticipant();
  const [actionItemsText, setActionItemsText] = useState('');

  const me = state.participants.find((p) => p.id === participantId);
  const isModerator = me?.isModerator ?? false;

  function handleClose(): void {
    const items = actionItemsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    retroClose(items);
  }

  return (
    <div className="room retro-room">
      <RoomHeader
        code={state.code}
        typeLabel="Sprint Retro"
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
        </aside>

        <main>
          {state.closed && (
            <div className="action-items">
              <h2>Action items</h2>
              <ul>
                {state.actionItems.map((item, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="retro-columns">
            {state.columns.map((columnId) => (
              <RetroColumn
                key={columnId}
                columnId={columnId}
                cards={state.cards.filter((c) => c.columnId === columnId)}
                currentParticipantId={participantId}
                closed={state.closed}
                onAddCard={retroAddCard}
                onVote={retroVote}
              />
            ))}
          </div>

          {isModerator && !state.closed && (
            <div className="moderator-controls">
              <h3>Close retro</h3>
              <textarea
                value={actionItemsText}
                onChange={(e) => setActionItemsText(e.target.value)}
                placeholder="One action item per line…"
                rows={4}
              />
              <button type="button" onClick={handleClose}>
                Close &amp; save action items
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
