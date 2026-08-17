import { useState } from 'react';
import type { FormEvent } from 'react';
import type { RoomType } from '@grooming-kit/shared';
import { useRoom } from '../state/RoomContext';

export function Lobby() {
  const { createRoom, joinRoom, lastError, dismissError } = useRoom();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [displayName, setDisplayName] = useState('');
  const [roomType, setRoomType] = useState<RoomType>('poker');
  const [roomCode, setRoomCode] = useState(
    () => new URLSearchParams(window.location.search).get('room') ?? ''
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!displayName.trim()) return;

    setSubmitting(true);
    const ack =
      mode === 'create'
        ? await createRoom(roomType, displayName)
        : await joinRoom(roomCode.trim().toUpperCase(), displayName);
    setSubmitting(false);

    if (ack.ok) {
      const url = new URL(window.location.href);
      url.searchParams.set('room', ack.roomCode);
      window.history.replaceState(null, '', url.toString());
    }
  }

  return (
    <div className="lobby">
      <h1>✂️ Grooming Kit 🪮</h1>
      <p className="subtitle">Realtime scrum poker &amp; sprint retros</p>

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

      <form onSubmit={(e) => void handleSubmit(e)} className="lobby-form">
        <label>
          Display name
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={40}
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
              required
            />
          </label>
        )}

        <button type="submit" disabled={submitting}>
          {mode === 'create' ? 'Create room' : 'Join room'}
        </button>
      </form>

      {import.meta.env.DEV && (
        <a className="sandbox-link" href="/sandbox">
          🎨 UI sandbox
        </a>
      )}
    </div>
  );
}
