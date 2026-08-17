import { ThemeToggle } from './ThemeToggle';

interface RoomHeaderProps {
  code: string;
  typeLabel: string;
  onLeave: () => void;
}

export function RoomHeader({ code, typeLabel, onLeave }: RoomHeaderProps) {
  function copyLink() {
    const url = new URL(window.location.href);
    url.searchParams.set('room', code);
    void navigator.clipboard.writeText(url.toString());
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
      </div>
    </header>
  );
}
