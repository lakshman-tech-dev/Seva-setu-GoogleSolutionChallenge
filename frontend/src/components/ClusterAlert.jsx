// ============================================================
// src/components/ClusterAlert.jsx
// Active hotspot cluster alert card.
// ============================================================

const SEVERITY = [
  { min: 10, label: 'Critical Hotspot', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  { min: 5,  label: 'Active Hotspot',   color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  { min: 2,  label: 'Emerging Cluster',  color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  { min: 0,  label: 'Watch Zone',        color: 'text-surface-400', bg: 'bg-surface-700/50', border: 'border-white/5' },
];

export default function ClusterAlert({ cluster }) {
  const count = cluster?.report_count || 0;
  const sev = SEVERITY.find((s) => count >= s.min) || SEVERITY[3];

  return (
    <div className={`${sev.bg} ${sev.border} border rounded-xl p-3`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-bold uppercase tracking-wide ${sev.color}`}>
          {sev.label}
        </span>
        <span className="badge bg-white/10 text-surface-200">{count} reports</span>
      </div>
      <p className="text-sm text-surface-300 capitalize">
        📍 {cluster?.category?.replace('_', ' ')} — {count} need{count !== 1 ? 's' : ''} in area
      </p>
    </div>
  );
}
