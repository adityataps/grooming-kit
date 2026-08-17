/** Backend Socket.IO/Express origin. See docs/infra.md §1 — separate subdomain, no load balancer. */
export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8090';

export const SESSION_STORAGE_KEYS = {
  roomCode: 'gk:roomCode',
  participantId: 'gk:participantId',
  displayName: 'gk:displayName',
} as const;

/** Persists across sessions/tabs (unlike SESSION_STORAGE_KEYS, which is per-tab). */
export const LOCAL_STORAGE_KEYS = {
  displayName: 'gk:savedDisplayName',
} as const;
