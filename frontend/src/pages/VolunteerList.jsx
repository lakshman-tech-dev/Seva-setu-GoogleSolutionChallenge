// ============================================================
// src/pages/VolunteerList.jsx
// Coordinator view: all volunteers with stats and actions.
// ============================================================

import { Link } from 'react-router-dom';
import { 
  Users, ArrowLeft, Star, Phone, 
  AlertTriangle, CheckCircle2, User,
  Activity
} from 'lucide-react';
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
          <div className="flex items-center gap-4">
            <Link to="/" className="btn-ghost p-2 hover:bg-white/10 rounded-xl transition-all">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-brand-500" />
              <h1 className="text-lg font-bold text-white tracking-tight">Fleet Overview</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-surface-500">Live Status:</span>
            <span className="badge bg-brand-600/10 text-brand-400 border border-brand-500/10 px-3 font-bold">
              {volunteers.length} Tracking
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : volunteers.length === 0 ? (
          <div className="text-center py-20 text-surface-400">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-10" />
            <p className="text-sm font-bold uppercase tracking-widest">No field agents registered</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {volunteers.map((vol) => {
              const reliability = vol.reliability_score ?? 0.75;
              const stars = Math.round(reliability * 5);
              const isAvailable = vol.is_available;

              return (
                <div key={vol.id} className="glass-card-hover p-6 border-white/5">
                  <div className="flex items-center gap-4 mb-4">
                    {/* Avatar */}
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-inner ${
                      isAvailable ? 'bg-brand-600/20 text-brand-400' : 'bg-surface-800 text-surface-500'
                    }`}>
                      {vol.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white truncate text-base">{vol.name}</p>
                      <div className="flex items-center gap-1.5 text-xs text-surface-500 font-medium mt-0.5">
                        <Phone className="w-3 h-3" />
                        {vol.phone}
                      </div>
                    </div>
                    <div className={`w-2.5 h-2.5 rounded-full ${isAvailable ? 'bg-emerald-500 shadow-lg shadow-emerald-500/40 animate-pulse' : 'bg-surface-600'}`} />
                  </div>

                  {/* Reliability stars */}
                  <div className="flex items-center gap-3 mb-4 bg-white/5 p-2 rounded-xl border border-white/5">
                    <span className="text-[10px] font-bold text-surface-500 uppercase tracking-widest ml-1">Trust Score:</span>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < stars ? 'fill-yellow-400 text-yellow-400' : 'text-surface-700'}`} />
                      ))}
                    </div>
                    <span className="text-[10px] font-black text-white ml-auto mr-1">{reliability.toFixed(2)}</span>
                  </div>

                  {/* Skills */}
                  {vol.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {vol.skills.map((s) => (
                        <span key={s} className="text-[10px] font-bold uppercase tracking-widest bg-brand-500/10 text-brand-400 px-2 py-0.5 rounded-md border border-brand-500/10">
                          {s.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Weekly hours burnout bar */}
                  <div className="mb-4">
                    <BurnoutBar hoursUsed={vol.hours_this_week || 0} limit={vol.weekly_hour_limit || 10} />
                  </div>

                  {/* Stats footer */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-surface-500 uppercase tracking-widest">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      {vol.total_tasks_completed || 0} Successful
                    </div>
                    {vol.hours_this_week >= (vol.weekly_hour_limit || 10) * 0.8 && (
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-500 uppercase tracking-widest">
                        <AlertTriangle className="w-3 h-3" />
                        Burnout
                      </div>
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
