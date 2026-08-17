import { useState } from 'react';
import { THEMES, applyTheme, getStoredTheme } from '../theme';
import type { ThemeName } from '../theme';

export function ThemeSwitcher() {
  const [active, setActive] = useState<ThemeName>(getStoredTheme);

  function handleSelect(theme: ThemeName): void {
    applyTheme(theme);
    setActive(theme);
  }

  return (
    <div className="theme-switcher">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          className={active === t.id ? 'active' : ''}
          onClick={() => handleSelect(t.id)}
        >
          <span>{t.label}</span>
          <span className="theme-blurb">{t.blurb}</span>
        </button>
      ))}
    </div>
  );
}
