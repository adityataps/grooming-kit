import { useState } from 'react';
import { ParticipantList } from '../shared-ui/ParticipantList';
import { RoomHeader } from '../shared-ui/RoomHeader';
import { MOCK_PARTICIPANT_ID, MOCK_PARTICIPANTS } from './mockData';

export function ComponentGallery() {
  const [participants, setParticipants] = useState(MOCK_PARTICIPANTS);

  return (
    <div className="sandbox-gallery">
      <div>
        <h3>ParticipantList</h3>
        <ParticipantList
          participants={participants}
          currentParticipantId={MOCK_PARTICIPANT_ID}
          onRename={async (displayName) => {
            setParticipants((prev) =>
              prev.map((p) => (p.id === MOCK_PARTICIPANT_ID ? { ...p, displayName } : p))
            );
            return { ok: true };
          }}
        />
      </div>
      <div>
        <h3>RoomHeader</h3>
        <RoomHeader
          code="ABC123"
          typeLabel="Scrum Poker"
          isModerator
          onLeave={() => {}}
          onEndSession={() => {}}
        />
      </div>
    </div>
  );
}
