import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { RoomType } from '@grooming-kit/shared';
import { isValidRoomCode } from '@grooming-kit/shared';
import { useRoom } from '../state/RoomContext';
import { ThemeToggle } from '../shared-ui/ThemeToggle';
import { generateRandomName } from '../randomName';
import { getSavedDisplayName, saveDisplayName } from '../displayName';

export function Lobby() {
  const { createRoom, joinRoom, participantId, lastError, dismissError } = useRoom();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [displayName, setDisplayName] = useState(() => getSavedDisplayName() ?? generateRandomName());
  const hasCustomName = useRef(getSavedDisplayName() !== null);
  const [roomType, setRoomType] = useState<RoomType>('poker');
  const [roomCode, setRoomCode] = useState(
    () => (new URLSearchParams(window.location.search).get('room') ?? '').toUpperCase()
  );
  const [submitting, setSubmitting] = useState(false);
  const [autoJoining, setAutoJoining] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const autoJoinAttempted = useRef(false);

  // Auto-join once, on mount, when the URL already has a well-formed room code
  // and there isn't an existing session to reconnect to instead (RoomContext
  // seeds `participantId` from sessionStorage synchronously if one exists).
  useEffect(() => {
    if (autoJoinAttempted.current) return;
    if (participantId || !isValidRoomCode(roomCode)) return;
    autoJoinAttempted.current = true;
    setMode('join');
    setAutoJoining(true);
    setFormError(null);

    void joinRoom(roomCode, displayName).then((ack) => {
      setAutoJoining(false);
      if (ack.ok) {
        if (hasCustomName.current) saveDisplayName(displayName);
        const url = new URL(window.location.href);
        url.searchParams.set('room', ack.roomCode);
        window.history.replaceState(null, '', url.toString());
      } else {
        setFormError(ack.message);
        const url = new URL(window.location.href);
        url.searchParams.delete('room');
        window.history.replaceState(null, '', url.toString());
      }
    });
    // Intentionally run only once on mount — see autoJoinAttempted guard above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!displayName.trim()) return;

    setSubmitting(true);
    setFormError(null);
    const ack =
      mode === 'create'
        ? await createRoom(roomType, displayName)
        : await joinRoom(roomCode.trim().toUpperCase(), displayName);
    setSubmitting(false);

    if (ack.ok) {
      if (hasCustomName.current) saveDisplayName(displayName);
      const url = new URL(window.location.href);
      url.searchParams.set('room', ack.roomCode);
      window.history.replaceState(null, '', url.toString());
    } else {
      setFormError(ack.message);
    }
  }

  return (
    <div className="lobby">
      <h1>✂️ Grooming Kit 🪮</h1>
      <p className="subtitle">Realtime scrum poker &amp; sprint retros</p>

      <ThemeToggle />

      <div className="tabs">
        <button
          type="button"
          className={mode === 'create' ? 'active' : ''}
          onClick={() => setMode('create')}
        >
          Create a room
        </button>
        <button
          type="button"
          className={mode === 'join' ? 'active' : ''}
          onClick={() => setMode('join')}
        >
          Join a room
        </button>
      </div>

      {lastError && (
        <div className="error-banner" role="alert">
          {lastError.message}
          <button type="button" onClick={dismissError} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      {formError && (
        <div className="error-banner" role="alert">
          {formError}
          <button type="button" onClick={() => setFormError(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      {autoJoining && <p className="auto-join-status">Joining room {roomCode}…</p>}

      <form onSubmit={(e) => void handleSubmit(e)} className="lobby-form">
        <label>
          Display name
          <input
            value={displayName}
            onChange={(e) => {
              hasCustomName.current = true;
              setDisplayName(e.target.value);
            }}
            maxLength={40}
            disabled={autoJoining}
            required
          />
        </label>

        {mode === 'create' ? (
          <fieldset>
            <legend>Room type</legend>
            <label>
              <input
                type="radio"
                name="roomType"
                checked={roomType === 'poker'}
                onChange={() => setRoomType('poker')}
              />
              Scrum Poker
            </label>
            <label>
              <input
                type="radio"
                name="roomType"
                checked={roomType === 'retro'}
                onChange={() => setRoomType('retro')}
              />
              Sprint Retro
            </label>
          </fieldset>
        ) : (
          <label>
            Room code
            <input
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
              disabled={autoJoining}
              required
            />
          </label>
        )}

        <button type="submit" disabled={submitting || autoJoining}>
          {mode === 'create' ? 'Create room' : 'Join room'}
        </button>
      </form>

      {import.meta.env.DEV && (
        <a className="sandbox-link" href="/sandbox">
          🎨 UI sandbox
        </a>
      )}

      <a
        className="github-link"
        href="https://github.com/adityataps/grooming-kit"
        target="_blank"
        rel="noreferrer"
      >
        View on GitHub
      </a>
    </div>
  );
}
