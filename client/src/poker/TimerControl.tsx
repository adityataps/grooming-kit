import { useEffect, useState } from 'react';
import { POKER_TIMER_DURATIONS, type PokerTimerDuration } from '@grooming-kit/shared';

interface TimerControlProps {
  /** Server epoch ms at which the round auto-reveals, or `null` if no timer is running. */
  timerEndsAt: number | null;
  isModerator: boolean;
  /** True once the round is revealed — hides the "start" controls entirely. */
  revealed: boolean;
  onStart: (durationSec: PokerTimerDuration) => void;
  onCancel: () => void;
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function TimerControl({
  timerEndsAt,
  isModerator,
  revealed,
  onStart,
  onCancel,
}: TimerControlProps) {
  const [now, setNow] = useState(() => Date.now());

  // Re-render every quarter second while a timer is running so the countdown ticks down for
  // everyone in the room, not just the moderator who started it.
  useEffect(() => {
    if (timerEndsAt === null) return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [timerEndsAt]);

  if (revealed) return null;

  const remainingMs = timerEndsAt !== null ? timerEndsAt - now : 0;
  const isRunning = timerEndsAt !== null && remainingMs > 0;

  if (!isRunning && !isModerator) return null;

  return (
    <div className="timer-control">
      {isRunning && (
        <span className="timer-countdown" role="timer" aria-live="polite">
          ⏱ {formatRemaining(remainingMs)}
        </span>
      )}
      {isModerator && (
        <div className="timer-buttons">
          {isRunning ? (
            <button type="button" onClick={onCancel}>
              Cancel timer
            </button>
          ) : (
            POKER_TIMER_DURATIONS.map((duration) => (
              <button key={duration} type="button" onClick={() => onStart(duration)}>
                {duration}s
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
