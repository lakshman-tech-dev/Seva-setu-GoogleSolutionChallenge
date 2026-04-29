// ============================================================
// src/pages/VolunteerHome.jsx
// Mobile-first volunteer home: nearby tasks, accept tasks.
// ============================================================

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Home, ClipboardList, PlusCircle, User, 
  MapPin, AlertTriangle, Package, Stethoscope, 
  GraduationCap, Droplets, Shield, Brain, ChevronRight,
  MapPinned
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNeeds } from '../hooks/useNeeds';
import { useGeolocation } from '../hooks/useGeolocation';
import { useRealtimeTasks } from '../hooks/useRealtime';
import PriorityBadge from '../components/PriorityBadge';

const CATEGORY_ICON = {
  food: Package,
  medical: Stethoscope,
  shelter: Home,
  education: GraduationCap,
  water: Droplets,
  safety: Shield,
  mental_health: Brain,
  other: ClipboardList,
};

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function VolunteerHome() {
  const { user } = useAuth();
  const { coords, error: geoError, loading: geoLoading } = useGeolocation(user?.id);
  const { data: needsData, isLoading } = useNeeds({ status: 'open', limit: 50 });
  useRealtimeTasks(user?.id);

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
      <div className="max-w-7xl mx-auto relative min-h-screen">
        {/* Desktop Top Nav */}
        <nav className="hidden md:flex items-center justify-between px-6 py-4 border-b border-white/5 bg-surface-950/50 backdrop-blur-xl sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="font-black text-white tracking-tight uppercase text-sm">CommunityPulse</span>
          </div>
          <div className="flex items-center gap-8">
            <Link to="/volunteer" className="text-[10px] font-black uppercase tracking-widest text-brand-400">Dashboard</Link>
            <Link to="/volunteer/tasks" className="text-[10px] font-black uppercase tracking-widest text-surface-500 hover:text-white transition-colors">Active Duties</Link>
            <Link to="/report" className="text-[10px] font-black uppercase tracking-widest text-surface-500 hover:text-white transition-colors">Broadcast Need</Link>
            <Link to="/volunteer/profile" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all">
              <User className="w-4 h-4 text-surface-400" />
            </Link>
          </div>
        </nav>

        {/* Header */}
        <header className="bg-gradient-to-br from-brand-700 to-brand-900 p-6 md:p-10 md:rounded-3xl md:mt-6 mx-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Welcome back!</h1>
            <p className="text-brand-200 text-sm font-medium opacity-80 uppercase tracking-widest">Volunteer Dashboard</p>
          </div>
          <Link to="/volunteer/profile" className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all">
            <User className="w-6 h-6" />
          </Link>
        </div>
        {geoLoading ? (
          <p className="text-xs text-brand-100 flex items-center gap-2">
            <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
            Getting your location…
          </p>
        ) : geoError ? (
          <p className="text-xs text-amber-300 flex items-center gap-2 font-bold">
            <AlertTriangle className="w-3 h-3" /> {geoError}
          </p>
        ) : coords ? (
          <p className="text-xs text-emerald-300 flex items-center gap-2 font-bold uppercase tracking-wider">
            <MapPin className="w-3 h-3" /> Location active: {coords.lat.toFixed(3)}, {coords.lng.toFixed(3)}
          </p>
        ) : null}
      </header>

      {/* Tasks */}
      <div className="px-4 mt-6">
        <h2 className="text-xs font-bold text-surface-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
          <ClipboardList className="w-4 h-4" /> Nearby Tasks ({sortedNeeds.length})
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sortedNeeds.length === 0 ? (
          <div className="text-center py-12 glass-card border-white/5">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-surface-300 text-sm font-bold">No open needs nearby right now.</p>
            <p className="text-surface-500 text-xs mt-1 uppercase tracking-widest font-bold">Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedNeeds.map((need) => {
              const IconComp = CATEGORY_ICON[need.category] || ClipboardList;
              return (
                <div key={need.id} className="glass-card-hover p-5 border-white/5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center shrink-0">
                      <IconComp className="w-6 h-6 text-brand-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-sm font-bold text-surface-100 capitalize truncate">
                          {need.category?.replace('_', ' ')}
                        </span>
                        <PriorityBadge score={need.priority_score} />
                      </div>
                      <p className="text-sm text-surface-400 line-clamp-2 mb-3 leading-relaxed">
                        {need.description || need.raw_input?.slice(0, 100)}
                      </p>
                      <div className="flex items-center gap-4 text-[10px] font-bold text-surface-500 uppercase tracking-widest">
                        {need.distance != null && need.distance < 999 && (
                          <span className="flex items-center gap-1">
                            <MapPinned className="w-3 h-3" />
                            {need.distance < 1 ? `${Math.round(need.distance * 1000)}m` : `${need.distance.toFixed(1)}km`}
                          </span>
                        )}
                        {need.location_text && (
                          <span className="truncate flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {need.location_text}
                          </span>
                        )}
                      </div>
                      {/* Skills needed */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {(need.vulnerability_flags || []).map((f) => (
                          <span key={f} className="text-[10px] font-bold uppercase tracking-widest bg-brand-500/10 text-brand-400 px-2.5 py-1 rounded-full border border-brand-500/10">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Link
                    to={`/needs/${need.id}`}
                    className="btn-primary w-full mt-5 text-center text-xs font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2"
                  >
                    View & Accept Task
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom nav — only show on mobile/tablet */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-950/80 backdrop-blur-2xl border-t border-white/5 z-50">
        <div className="flex items-center justify-around py-4">
          <Link to="/volunteer" className="flex flex-col items-center gap-1.5 px-4 text-brand-400">
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Home</span>
          </Link>
          <Link to="/volunteer/tasks" className="flex flex-col items-center gap-1.5 px-4 text-surface-500 hover:text-surface-200 transition-colors">
            <ClipboardList className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">My Tasks</span>
          </Link>
          <Link to="/report" className="flex flex-col items-center gap-1.5 px-4 text-surface-500 hover:text-surface-200 transition-colors">
            <PlusCircle className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Report</span>
          </Link>
          <Link to="/volunteer/profile" className="flex flex-col items-center gap-1.5 px-4 text-surface-500 hover:text-surface-200 transition-colors">
            <User className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Profile</span>
          </Link>
        </div>
      </nav>
      </div>
    </div>
  );
}
