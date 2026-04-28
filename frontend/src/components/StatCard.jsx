// ============================================================
// src/components/StatCard.jsx
// Dashboard stat card with icon, value, label, and trend.
// ============================================================

export default function StatCard({ icon, label, value, sublabel, color = 'brand' }) {
  const colorMap = {
    brand:  'from-brand-600/20 to-brand-600/5 text-brand-400',
    red:    'from-red-600/20 to-red-600/5 text-red-400',
    green:  'from-emerald-600/20 to-emerald-600/5 text-emerald-400',
    orange: 'from-orange-600/20 to-orange-600/5 text-orange-400',
    purple: 'from-purple-600/20 to-purple-600/5 text-purple-400',
  };

  const gradient = colorMap[color] || colorMap.brand;

  return (
    <div className={`glass-card p-4 bg-gradient-to-br ${gradient}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
          <p className="text-xs text-surface-300 font-medium">{label}</p>
          {sublabel && (
            <p className="text-[10px] text-surface-400 mt-0.5">{sublabel}</p>
          )}
        </div>
      </div>
    </div>
  );
}
