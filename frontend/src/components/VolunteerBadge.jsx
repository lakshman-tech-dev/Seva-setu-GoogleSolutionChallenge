// ============================================================
// src/components/VolunteerBadge.jsx
// Compact volunteer chip with name, reliability stars, distance.
// ============================================================

export default function VolunteerBadge({ volunteer, matchScore, distanceKm, breakdown, onClick }) {
  const reliability = volunteer?.reliability_score ?? 0.75;
  const stars = Math.round(reliability * 5);
  const tasksDone = volunteer?.total_tasks_completed || 0;
  const sevaPoints = tasksDone * 50;
  
  let tierBadge = "🥉 Bronze";
  let tierColor = "text-orange-400 bg-orange-400/10";
  if (tasksDone >= 30) { tierBadge = "💎 Platinum"; tierColor = "text-cyan-400 bg-cyan-400/10"; }
  else if (tasksDone >= 15) { tierBadge = "🥇 Gold"; tierColor = "text-yellow-400 bg-yellow-400/10"; }
  else if (tasksDone >= 5) { tierBadge = "🥈 Silver"; tierColor = "text-gray-300 bg-gray-300/10"; }

  return (
    <button
      onClick={onClick}
      className="glass-card-hover p-3 w-full text-left flex items-center gap-3"
    >
      {/* Avatar circle */}
      <div className="w-10 h-10 rounded-full bg-brand-600/20 text-brand-400 flex items-center justify-center text-sm font-bold flex-shrink-0">
        {volunteer?.name?.charAt(0)?.toUpperCase() || '?'}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-surface-100 truncate">{volunteer?.name}</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tierColor}`}>{tierBadge}</span>
          <span className="text-xs text-yellow-400">{'★'.repeat(stars)}{'☆'.repeat(5 - stars)}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-surface-400 mt-0.5">
          <span className="font-bold text-emerald-400">{sevaPoints} Seva Points</span>
          {distanceKm != null && <span>📍 {distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`}</span>}
          {matchScore != null && <span>🎯 {Math.round(matchScore)} pts</span>}
        </div>
        {/* Skill tags */}
        {volunteer?.skills?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {volunteer.skills.slice(0, 4).map((s) => (
              <span key={s} className="badge bg-brand-600/15 text-brand-300 text-[10px]">{s.replace('_', ' ')}</span>
            ))}
          </div>
        )}
      </div>

      {/* Match score ring */}
      {matchScore != null && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full border-2 border-brand-500/50 flex items-center justify-center">
          <span className="text-xs font-bold text-brand-400">{Math.round(matchScore)}</span>
        </div>
      )}
    </button>
  );
}
