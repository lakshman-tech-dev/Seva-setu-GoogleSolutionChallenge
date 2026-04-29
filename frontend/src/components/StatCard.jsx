// ============================================================
// src/components/StatCard.jsx
// Dashboard stat card with icon, value, label, and trend.
// ============================================================

export default function StatCard({ icon, label, value, sublabel, color = 'brand' }) {
  const colorMap = {
    brand:  'border-brand-500/20 text-brand-400',
    red:    'border-red-500/20 text-red-400',
    green:  'border-emerald-500/20 text-emerald-400',
    orange: 'border-orange-500/20 text-orange-400',
    purple: 'border-purple-500/20 text-purple-400',
  };

  const style = colorMap[color] || colorMap.brand;

  return (
    <div className={`glass-card p-5 border ${style} flex flex-col gap-4 relative overflow-hidden group`}>
      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
        {icon}
      </div>
      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-black text-white tracking-tight">{value ?? '—'}</p>
        <p className="text-[10px] text-surface-500 font-bold uppercase tracking-widest mt-1">{label}</p>
        {sublabel && (
          <p className="text-[10px] text-surface-400 mt-2 font-medium">{sublabel}</p>
        )}
      </div>
    </div>
  );
}
