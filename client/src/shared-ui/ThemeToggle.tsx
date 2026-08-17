import { THEMES, useTheme } from '../theme';

/**
 * Compact icon-only theme picker for the real app (lobby + active room
 * header) — a smaller counterpart to the sandbox's full ThemeSwitcher.
 * Shares the same persisted state via useTheme, so switching here also
 * updates whatever the sandbox shows next time it's opened.
 */
export function ThemeToggle() {
  const [active, select] = useTheme();

  return (
    <div className="theme-toggle" role="group" aria-label="Theme">
      {THEMES.map((t) => {
        const [emoji, ...rest] = t.label.split(' ');
        const name = rest.join(' ');
        return (
          <button
            key={t.id}
            type="button"
            className={active === t.id ? 'active' : ''}
            title={`${name} — ${t.blurb}`}
            aria-label={name}
            aria-pressed={active === t.id}
            onClick={() => select(t.id)}
          >
            {emoji}
          </button>
        );
      })}
    </div>
  );
}
