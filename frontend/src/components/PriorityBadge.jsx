// ============================================================
// src/components/PriorityBadge.jsx
// Color-coded priority score pill.
// ============================================================

const LEVELS = [
  { min: 80, label: 'CRITICAL', bg: 'bg-red-500/20', text: 'text-red-400', ring: 'ring-red-500/30' },
  { min: 60, label: 'HIGH',     bg: 'bg-orange-500/20', text: 'text-orange-400', ring: 'ring-orange-500/30' },
  { min: 40, label: 'MEDIUM',   bg: 'bg-yellow-500/20', text: 'text-yellow-400', ring: 'ring-yellow-500/30' },
  { min: 0,  label: 'LOW',      bg: 'bg-emerald-500/20', text: 'text-emerald-400', ring: 'ring-emerald-500/30' },
];

export default function PriorityBadge({ score = 0, showScore = true }) {
  const level = LEVELS.find((l) => score >= l.min) || LEVELS[3];

  return (
    <span
      className={`badge ring-1 ${level.bg} ${level.text} ${level.ring} gap-1`}
      title={`Priority: ${score}`}
    >
      {showScore && <span className="font-mono text-[10px]">{Math.round(score)}</span>}
      <span>{level.label}</span>
    </span>
  );
}
