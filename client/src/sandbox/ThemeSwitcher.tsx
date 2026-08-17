import { THEMES, useTheme } from '../theme';

export function ThemeSwitcher() {
  const [active, select] = useTheme();

  return (
    <div className="theme-switcher">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          className={active === t.id ? 'active' : ''}
          onClick={() => select(t.id)}
        >
          <span>{t.label}</span>
          <span className="theme-blurb">{t.blurb}</span>
        </button>
      ))}
    </div>
  );
}
