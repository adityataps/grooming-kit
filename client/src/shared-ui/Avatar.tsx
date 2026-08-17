/**
 * Small colored initials bubble used to give each participant a consistent,
 * at-a-glance visual identity in the sidebar and vote board — the color is
 * derived from a stable seed (participant id) so it doesn't shift on rename.
 */
interface AvatarProps {
  name: string;
  seed: string;
  size?: 'sm' | 'md';
}

function hashHue(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, seed, size = 'md' }: AvatarProps) {
  const hue = hashHue(seed);
  return (
    <span
      className={`avatar avatar-${size}`}
      style={{ background: `hsl(${hue}, 55%, 42%)` }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
