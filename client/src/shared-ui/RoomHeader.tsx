import { ThemeToggle } from './ThemeToggle';

interface RoomHeaderProps {
  code: string;
  typeLabel: string;
  isModerator: boolean;
  onLeave: () => void;
  onEndSession: () => void;
}

export function RoomHeader({ code, typeLabel, isModerator, onLeave, onEndSession }: RoomHeaderProps) {
  function copyLink() {
    const url = new URL(window.location.href);
    url.searchParams.set('room', code);
    void navigator.clipboard.writeText(url.toString());
  }

  function handleEndSession() {
    const confirmed = window.confirm(
      'End this session for everyone? All participants will be returned to the homepage.'
    );
    if (confirmed) onEndSession();
  }

  return (
    <header className="room-header">
      <div className="room-header-title">
        <span className="room-type">{typeLabel}</span>
        <span className="room-code">{code}</span>
      </div>
      <div className="room-actions">
        <ThemeToggle />
        <button type="button" onClick={copyLink}>
          Copy invite link
        </button>
        <button type="button" onClick={onLeave}>
          Leave room
        </button>
        {isModerator && (
          <button type="button" className="end-session-button" onClick={handleEndSession}>
            End session
          </button>
        )}
      </div>
    </header>
  );
}
