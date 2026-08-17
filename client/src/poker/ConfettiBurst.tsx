import { useMemo } from 'react';

const COLORS = ['#6366f1', '#4ade80', '#f87171', '#fbbf24', '#38bdf8', '#e8734a'];

interface ConfettiBurstProps {
  pieceCount?: number;
}

/**
 * Lightweight, dependency-free confetti burst rendered as absolutely-positioned
 * divs that fall via a CSS keyframe animation (see .confetti-piece in index.css).
 * Intended to be conditionally mounted for a few seconds (e.g. on poker consensus).
 */
export function ConfettiBurst({ pieceCount = 40 }: ConfettiBurstProps) {
  const pieces = useMemo(
    () =>
      Array.from({ length: pieceCount }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        duration: 1.6 + Math.random() * 1.2,
        color: COLORS[i % COLORS.length],
        rotate: Math.random() * 360,
      })),
    [pieceCount]
  );

  return (
    <div className="confetti-burst" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
