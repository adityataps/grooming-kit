import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { Participant } from '@grooming-kit/shared';
import { Avatar } from './Avatar';

interface ActionResult {
  ok: boolean;
  message?: string;
}

interface ParticipantListProps {
  participants: Participant[];
  currentParticipantId: string | null;
  /** Enables the rename pencil on the current participant's own entry. */
  onRename?: (displayName: string) => Promise<ActionResult>;
  /** True when the viewer is the current moderator — enables the "make moderator" action on other rows. */
  viewerIsModerator?: boolean;
  /** Enables the 👑 "make moderator" action on every other (non-self, non-moderator) entry. */
  onMakeModerator?: (participantId: string) => Promise<ActionResult>;
}

export function ParticipantList({
  participants,
  currentParticipantId,
  onRename,
  viewerIsModerator,
  onMakeModerator,
}: ParticipantListProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [promoteError, setPromoteError] = useState<{ id: string; message: string } | null>(null);
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

  async function handleMakeModerator(target: Participant): Promise<void> {
    if (!onMakeModerator) return;
    const confirmed = window.confirm(
      `Make ${target.displayName} the moderator? You will no longer have moderator controls.`
    );
    if (!confirmed) return;

    setPromotingId(target.id);
    setPromoteError(null);
    const result = await onMakeModerator(target.id);
    setPromotingId(null);
    if (!result.ok) {
      setPromoteError({ id: target.id, message: result.message ?? 'Could not update moderator.' });
    }
  }

  return (
    <ul className="participant-list">
      {participants.map((p) => {
        const isSelf = p.id === currentParticipantId;
        const isEditingSelf = isSelf && editing;
        const canPromote = !isSelf && !p.isModerator && viewerIsModerator && Boolean(onMakeModerator);

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
                {canPromote && (
                  <button
                    type="button"
                    className="make-moderator-button"
                    onClick={() => void handleMakeModerator(p)}
                    disabled={promotingId === p.id}
                    aria-label={`Make ${p.displayName} moderator`}
                    title="Make moderator"
                  >
                    👑
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
              {promoteError?.id === p.id && <span className="rename-error">{promoteError.message}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
