export type ThemeName = 'midnight' | 'warm' | 'mono';

export const THEMES: { id: ThemeName; label: string; blurb: string }[] = [
  { id: 'midnight', label: '🌙 Midnight Neon', blurb: 'Dark, high-contrast, indigo glow' },
  { id: 'warm', label: '☕ Warm Standup', blurb: 'Light, cozy, coral accents' },
  { id: 'mono', label: '🖤 Mono Focus', blurb: 'Minimal grayscale, one accent' },
];

const STORAGE_KEY = 'gk-theme';
const DEFAULT_THEME: ThemeName = 'midnight';

export function getStoredTheme(): ThemeName {
  const stored = localStorage.getItem(STORAGE_KEY);
  return THEMES.some((t) => t.id === stored) ? (stored as ThemeName) : DEFAULT_THEME;
}

export function applyTheme(theme: ThemeName): void {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEY, theme);
}

export function initTheme(): void {
  applyTheme(getStoredTheme());
}
