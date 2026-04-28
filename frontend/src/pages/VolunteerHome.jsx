// ============================================================
// src/pages/VolunteerHome.jsx
// Mobile-first volunteer home: nearby tasks, accept tasks.
// ============================================================

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useNeeds } from '../hooks/useNeeds';
import { useGeolocation } from '../hooks/useGeolocation';
import { useRealtimeTasks } from '../hooks/useRealtime';
import PriorityBadge from '../components/PriorityBadge';

// TODO: in production, get volunteer ID from auth context
const MOCK_VOLUNTEER_ID = null;

const CATEGORY_EMOJI = {
  food: '🍚', medical: '🏥', shelter: '🏠', education: '📚',
  water: '💧', safety: '🛡️', mental_health: '🧠', other: '📋',
};

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function VolunteerHome() {
  const { coords, error: geoError, loading: geoLoading } = useGeolocation(MOCK_VOLUNTEER_ID);
  const { data: needsData, isLoading } = useNeeds({ status: 'open', limit: 50 });
  useRealtimeTasks(MOCK_VOLUNTEER_ID);

  // Sort needs by distance from volunteer's location
  const sortedNeeds = useMemo(() => {
    const list = needsData?.data || [];
    if (!coords) return list;

    return list
      .map((n) => ({
        ...n,
        distance: n.latitude && n.longitude
          ? haversine(coords.lat, coords.lng, n.latitude, n.longitude)
          : 999,
      }))
      .sort((a, b) => a.distance - b.distance);
  }, [needsData, coords]);

  return (
    <div className="min-h-screen bg-surface-950 pb-20">
      {/* Header */}
      <header className="bg-gradient-to-br from-brand-700 to-brand-900 p-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">👋 Welcome back!</h1>
            <p className="text-brand-200 text-sm">Volunteer Dashboard</p>
          </div>
          <Link to="/volunteer/profile" className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white">
            👤
          </Link>
        </div>
        {geoLoading ? (
          <p className="text-xs text-brand-200">📍 Getting your location…</p>
        ) : geoError ? (
          <p className="text-xs text-amber-300">⚠️ {geoError}</p>
        ) : coords ? (
          <p className="text-xs text-emerald-300">📍 Location active: {coords.lat.toFixed(3)}, {coords.lng.toFixed(3)}</p>
        ) : null}
      </header>

      {/* Tasks */}
      <div className="px-4 mt-4">
        <h2 className="text-sm font-semibold text-surface-400 uppercase tracking-wide mb-3">
          📋 Nearby Tasks ({sortedNeeds.length})
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sortedNeeds.length === 0 ? (
          <div className="text-center py-12 glass-card">
            <p className="text-3xl mb-2">🎉</p>
            <p className="text-surface-300 text-sm">No open needs nearby right now.</p>
            <p className="text-surface-400 text-xs mt-1">Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedNeeds.map((need) => (
              <div key={need.id} className="glass-card-hover p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">{CATEGORY_EMOJI[need.category] || '📋'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-semibold text-surface-100 capitalize truncate">
                        {need.category?.replace('_', ' ')}
                      </span>
                      <PriorityBadge score={need.priority_score} />
                    </div>
                    <p className="text-sm text-surface-300 line-clamp-2 mb-2">
                      {need.description || need.raw_input?.slice(0, 100)}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-surface-400">
                      {need.distance != null && need.distance < 999 && (
                        <span>📍 {need.distance < 1 ? `${Math.round(need.distance * 1000)}m` : `${need.distance.toFixed(1)}km`}</span>
                      )}
                      {need.location_text && (
                        <span className="truncate">{need.location_text}</span>
                      )}
                    </div>
                    {/* Skills needed */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(need.vulnerability_flags || []).map((f) => (
                        <span key={f} className="badge bg-purple-500/15 text-purple-400 text-[10px]">{f}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <Link
                  to={`/needs/${need.id}`}
                  className="btn-primary w-full mt-3 text-center text-sm block"
                >
                  View & Accept Task
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-surface-900/95 backdrop-blur-xl border-t border-white/5 z-50">
        <div className="flex items-center justify-around py-2">
          <Link to="/volunteer" className="flex flex-col items-center gap-0.5 px-4 py-1.5 text-brand-400">
            <span className="text-lg">🏠</span>
            <span className="text-[10px] font-semibold">Home</span>
          </Link>
          <Link to="/volunteer/tasks" className="flex flex-col items-center gap-0.5 px-4 py-1.5 text-surface-400 hover:text-surface-200">
            <span className="text-lg">📋</span>
            <span className="text-[10px] font-medium">My Tasks</span>
          </Link>
          <Link to="/report" className="flex flex-col items-center gap-0.5 px-4 py-1.5 text-surface-400 hover:text-surface-200">
            <span className="text-lg">➕</span>
            <span className="text-[10px] font-medium">Report</span>
          </Link>
          <Link to="/volunteer/profile" className="flex flex-col items-center gap-0.5 px-4 py-1.5 text-surface-400 hover:text-surface-200">
            <span className="text-lg">👤</span>
            <span className="text-[10px] font-medium">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
