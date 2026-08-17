import { ParticipantList } from '../shared-ui/ParticipantList';
import { RoomHeader } from '../shared-ui/RoomHeader';
import { MOCK_PARTICIPANT_ID, MOCK_PARTICIPANTS } from './mockData';

export function ComponentGallery() {
  return (
    <div className="preview-gallery">
      <div>
        <h3>ParticipantList</h3>
        <ParticipantList participants={MOCK_PARTICIPANTS} currentParticipantId={MOCK_PARTICIPANT_ID} />
      </div>
      <div>
        <h3>RoomHeader</h3>
        <RoomHeader code="ABC123" typeLabel="Scrum Poker" onLeave={() => {}} />
      </div>
    </div>
  );
}
