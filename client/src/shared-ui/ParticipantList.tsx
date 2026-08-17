import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { Participant } from '@grooming-kit/shared';
import { Avatar } from './Avatar';

interface RenameResult {
  ok: boolean;
  message?: string;
}

interface ParticipantListProps {
  participants: Participant[];
  currentParticipantId: string | null;
  /** Enables the rename pencil on the current participant's own entry. */
  onRename?: (displayName: string) => Promise<RenameResult>;
}

export function ParticipantList({ participants, currentParticipantId, onRename }: ParticipantListProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function startEditing(currentName: string): void {
    setValue(currentName);
    setError(null);
    setEditing(true);
  }

  function cancelEditing(): void {
    setEditing(false);
    setError(null);
  }

  async function commitEditing(): Promise<void> {
    const trimmed = value.trim();
    if (!trimmed || !onRename) {
      cancelEditing();
      return;
    }
    setSaving(true);
    setError(null);
    const result = await onRename(trimmed);
    setSaving(false);
    if (result.ok) {
      setEditing(false);
    } else {
      setError(result.message ?? 'Could not rename.');
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      void commitEditing();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing();
    }
  }

  return (
    <ul className="participant-list">
      {participants.map((p) => {
        const isSelf = p.id === currentParticipantId;
        const isEditingSelf = isSelf && editing;

        return (
          <li key={p.id} className={p.connected ? 'connected' : 'disconnected'}>
            <Avatar name={p.displayName} seed={p.id} size="sm" />
            <span className="participant-info">
              <span className="participant-name-row">
                {isEditingSelf ? (
                  <span className="rename-form">
                    <input
                      ref={inputRef}
                      className="rename-input"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={() => void commitEditing()}
                      maxLength={40}
                      disabled={saving}
                      aria-label="Edit your display name"
                    />
                  </span>
                ) : (
                  <span className="participant-name">{p.displayName}</span>
                )}
                {isSelf && !editing && onRename && (
                  <button
                    type="button"
                    className="rename-button"
                    onClick={() => startEditing(p.displayName)}
                    aria-label="Change your display name"
                    title="Change your display name"
                  >
                    ✏️
                  </button>
                )}
              </span>
              {(p.isModerator || (isSelf && !editing)) && (
                <span className="participant-meta">
                  {p.isModerator && <span className="badge">moderator</span>}
                  {isSelf && !editing && <span className="you">you</span>}
                </span>
              )}
              {isEditingSelf && error && <span className="rename-error">{error}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
