import { LOCAL_STORAGE_KEYS } from './config';

/**
 * A display name the user has explicitly chosen persists across sessions/tabs
 * (unlike the auto-generated random placeholder, which is intentionally NOT
 * saved — see randomName.ts and Lobby.tsx).
 */
export function getSavedDisplayName(): string | null {
  return localStorage.getItem(LOCAL_STORAGE_KEYS.displayName);
}

export function saveDisplayName(name: string): void {
  const trimmed = name.trim();
  if (trimmed) localStorage.setItem(LOCAL_STORAGE_KEYS.displayName, trimmed);
}
