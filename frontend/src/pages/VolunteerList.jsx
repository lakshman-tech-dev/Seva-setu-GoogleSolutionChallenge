// ============================================================
// src/pages/VolunteerList.jsx
// Coordinator view: all volunteers with stats and actions.
// ============================================================

import { Link } from 'react-router-dom';
import { useVolunteers } from '../hooks/useVolunteers';

function BurnoutBar({ hoursUsed = 0, limit = 10 }) {
  const pct = Math.min((hoursUsed / limit) * 100, 100);
  const color = pct >= 80 ? 'bg-red-500' : pct >= 50 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="w-full">
      <div className="flex justify-between text-[10px] text-surface-400 mb-0.5">
        <span>{hoursUsed}h / {limit}h</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="w-full h-1.5 bg-surface-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function VolunteerList() {
  const { data, isLoading } = useVolunteers();
  const volunteers = data?.data || [];

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="btn-ghost text-sm">← Dashboard</Link>
            <h1 className="text-lg font-bold text-white">👥 Volunteers</h1>
          </div>
          <span className="badge bg-brand-600/20 text-brand-400">
            {volunteers.length} registered
          </span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : volunteers.length === 0 ? (
          <div className="text-center py-20 text-surface-400">
            <p className="text-4xl mb-3">👥</p>
            <p>No volunteers registered yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {volunteers.map((vol) => {
              const reliability = vol.reliability_score ?? 0.75;
              const stars = Math.round(reliability * 5);
              const isAvailable = vol.is_available;

              return (
                <div key={vol.id} className="glass-card-hover p-5">
                  <div className="flex items-center gap-3 mb-3">
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                      isAvailable ? 'bg-brand-600/20 text-brand-400' : 'bg-surface-700 text-surface-400'
                    }`}>
                      {vol.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-surface-100 truncate">{vol.name}</p>
                      <p className="text-xs text-surface-400">{vol.phone}</p>
                    </div>
                    <span className={`badge ${isAvailable ? 'bg-emerald-500/15 text-emerald-400' : 'bg-surface-700 text-surface-400'}`}>
                      {isAvailable ? 'Available' : 'Offline'}
                    </span>
                  </div>

                  {/* Reliability stars */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-surface-400">Reliability:</span>
                    <span className="text-yellow-400 text-sm">{'★'.repeat(stars)}{'☆'.repeat(5 - stars)}</span>
                    <span className="text-xs text-surface-400">({reliability.toFixed(2)})</span>
                  </div>

                  {/* Skills */}
                  {vol.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {vol.skills.map((s) => (
                        <span key={s} className="badge bg-brand-600/15 text-brand-300 text-[10px]">
                          {s.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Weekly hours burnout bar */}
                  <BurnoutBar hoursUsed={vol.hours_this_week || 0} limit={vol.weekly_hour_limit || 10} />

                  {/* Stats footer */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5 text-xs text-surface-400">
                    <span>✅ {vol.total_tasks_completed || 0} completed</span>
                    {vol.hours_this_week >= (vol.weekly_hour_limit || 10) * 0.8 && (
                      <span className="text-amber-400 font-semibold">⚠️ Burnout risk</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
