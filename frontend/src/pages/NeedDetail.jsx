// ============================================================
// src/pages/NeedDetail.jsx
// Full detail view of a single community need with
// volunteer match suggestions, assignment, and status controls.
// ============================================================

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { CheckCircle2, AlertCircle, Clock, MapPin as MapPinIcon, Heart, ShieldCheck, ChevronLeft, User } from 'lucide-react';
import { useNeed, useUpdateNeedStatus, useAssignNeed } from '../hooks/useNeeds';
import { useAuth } from '../context/AuthContext';
import PriorityBadge from '../components/PriorityBadge';
import VolunteerBadge from '../components/VolunteerBadge';
import AssignModal from '../components/AssignModal';
import toast from 'react-hot-toast';

const CATEGORY_ICON = {
  food: Heart,
  medical: Heart,
  shelter: ShieldCheck,
  education: Clock,
  water: Clock,
  safety: ShieldCheck,
  mental_health: Heart,
  other: AlertCircle,
};

const STATUS_FLOW = ['open', 'assigned', 'in_progress', 'completed', 'cancelled'];

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function NeedDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { data, isLoading, error } = useNeed(id);
  const updateStatus = useUpdateNeedStatus();
  const assignMutation = useAssignNeed();
  const [showAssign, setShowAssign] = useState(false);
  const [notes, setNotes] = useState('');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-3">😟</p>
          <p className="text-surface-300 font-bold uppercase tracking-widest">Need not found</p>
          <Link to={role === 'coordinator' ? '/' : '/volunteer'} className="btn-primary mt-6 inline-block px-8">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const need = data.data;
  const suggestions = data.volunteer_suggestions || [];
  const IconComp = CATEGORY_ICON[need.category] || AlertCircle;
  const flags = need.vulnerability_flags || [];
  const hasCoords = need.latitude != null && need.longitude != null;

  const handleStatusUpdate = (status) => {
    updateStatus.mutate({ id: need.id, status, notes: notes || undefined });
  };

  const handleSelfAssign = () => {
    if (!user) return;
    assignMutation.mutate({ 
      needId: need.id, 
      volunteerId: user.id 
    }, {
      onSuccess: () => {
        toast.success('Mission accepted! Good luck.');
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to accept task');
      }
    });
  };

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
            <ChevronLeft className="w-5 h-5 text-surface-400" />
          </button>
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
            <IconComp className="w-5 h-5 text-brand-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-sm font-black text-white uppercase tracking-wider leading-none">{need.category?.replace('_', ' ')} Need</h1>
            <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest mt-1">Ref: {need.id?.slice(0, 8)}</p>
          </div>
          <PriorityBadge score={need.priority_score} />
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Main Content (2/3) ────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description card */}
          <div className="glass-card p-6 border-white/5">
            <h2 className="text-[10px] font-black text-brand-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5" /> Intelligence Briefing
            </h2>
            <p className="text-surface-100 leading-relaxed font-medium text-lg">{need.description}</p>
            {need.raw_input && need.raw_input !== need.description && (
              <details className="mt-6 border-t border-white/5 pt-4">
                <summary className="text-[10px] font-black text-surface-500 uppercase tracking-[0.15em] cursor-pointer hover:text-surface-300 transition-colors list-none flex items-center gap-2">
                  <div className="w-1 h-1 bg-surface-500 rounded-full" /> View original encrypted source
                </summary>
                <p className="mt-4 text-xs text-surface-400 bg-black/40 rounded-xl p-4 font-mono leading-relaxed border border-white/5">
                  {need.raw_input}
                </p>
              </details>
            )}
          </div>

          {/* Meta info grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card p-4 border-white/5">
              <p className="text-[9px] font-black text-surface-500 uppercase tracking-widest mb-1">Status</p>
              <p className="text-white font-black uppercase text-xs tracking-wider">{need.status?.replace('_', ' ')}</p>
            </div>
            <div className="glass-card p-4 border-white/5">
              <p className="text-[9px] font-black text-surface-500 uppercase tracking-widest mb-1">Impact</p>
              <p className="text-white font-black text-xs">{need.urgency_score}/100</p>
            </div>
            <div className="glass-card p-4 border-white/5">
              <p className="text-[9px] font-black text-surface-500 uppercase tracking-widest mb-1">Channel</p>
              <p className="text-white font-black uppercase text-xs tracking-wider">{need.source_channel?.replace('_', ' ')}</p>
            </div>
            <div className="glass-card p-4 border-white/5">
              <p className="text-[9px] font-black text-surface-500 uppercase tracking-widest mb-1">Logged</p>
              <p className="text-white font-black text-[10px] uppercase">{formatDate(need.created_at).split(',')[0]}</p>
            </div>
          </div>

          {/* Location & vulnerability */}
          <div className="glass-card p-6 border-white/5">
            <h2 className="text-[10px] font-black text-brand-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <MapPinIcon className="w-3.5 h-3.5" /> Target Location
            </h2>
            <p className="text-white font-bold text-lg">{need.location_text || 'Coordinates available below'}</p>
            {hasCoords && <p className="text-[10px] font-mono text-surface-500 mt-2 uppercase tracking-widest">{need.latitude?.toFixed(5)} N / {need.longitude?.toFixed(5)} E</p>}
          </div>

          {flags.length > 0 && (
            <div className="glass-card p-6 border-white/5">
              <h2 className="text-[10px] font-black text-brand-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5" /> Vulnerability Assessment
              </h2>
              <div className="flex flex-wrap gap-2">
                {flags.map((f) => (
                  <span key={f} className="px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-black uppercase tracking-widest">{f}</span>
                ))}
              </div>
            </div>
          )}

          {/* Map */}
          {hasCoords && (
            <div className="glass-card overflow-hidden h-72 border-white/5 shadow-2xl relative">
              <div className="absolute inset-0 bg-gradient-to-t from-[#020617] to-transparent z-10 pointer-events-none" />
              <MapContainer center={[need.latitude, need.longitude]} zoom={14} scrollWheelZoom={false} className="w-full h-full grayscale opacity-70">
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                <CircleMarker center={[need.latitude, need.longitude]} radius={15} pathOptions={{ fillColor: '#1470f5', fillOpacity: 0.6, color: '#1470f5', weight: 2 }}>
                  <Popup>Mission Objective</Popup>
                </CircleMarker>
              </MapContainer>
            </div>
          )}

          {/* Status actions */}
          <div className="glass-card p-6 border-white/5">
            <h2 className="text-[10px] font-black text-brand-400 uppercase tracking-[0.2em] mb-5 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5" /> Operations Control
            </h2>
            
            {role === 'volunteer' && need.status === 'open' ? (
              <button
                onClick={handleSelfAssign}
                disabled={assignMutation.isPending}
                className="btn-primary w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-brand-500/20 flex items-center justify-center gap-3 transition-all active:scale-95"
              >
                {assignMutation.isPending ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Heart className="w-5 h-5" />
                    Accept Mission
                  </>
                )}
              </button>
            ) : (
              <>
                <textarea
                  placeholder="Operational notes (visible to all agents)…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all mb-4"
                />
                <div className="flex flex-wrap gap-3">
                  {STATUS_FLOW.filter((s) => s !== need.status).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusUpdate(s)}
                      disabled={updateStatus.isPending}
                      className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                        s === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' :
                        s === 'cancelled' ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20' : 
                        'bg-white/5 text-surface-400 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Sidebar: Action/Status (1/3) ─────────────── */}
        <aside className="space-y-6">
          {role === 'coordinator' ? (
            <div className="glass-card p-6 border-white/5">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[10px] font-black text-surface-400 uppercase tracking-[0.2em]">
                  Agent Matching
                </h2>
                <button onClick={() => setShowAssign(true)} className="px-4 py-1.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-brand-500/20 transition-all">
                  Assign
                </button>
              </div>

              {suggestions.length === 0 ? (
                <div className="py-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                  <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest italic">
                    No matching agents available
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {suggestions.map((s) => (
                    <VolunteerBadge
                      key={s.volunteer_id}
                      volunteer={{ id: s.volunteer_id, name: s.name, phone: s.phone, skills: [], reliability_score: 0.75 }}
                      matchScore={s.match_score}
                      distanceKm={s.distance_km}
                      breakdown={s.breakdown}
                      onClick={() => setShowAssign(true)}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card p-6 border-white/5 bg-gradient-to-br from-brand-500/5 to-transparent">
              <h2 className="text-[10px] font-black text-brand-400 uppercase tracking-[0.2em] mb-4">
                Mission Logistics
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <User className="w-4 h-4 text-surface-400" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-surface-500 uppercase tracking-widest leading-none mb-1">Assigned Agent</p>
                    <p className="text-xs font-bold text-white uppercase tracking-wider">{need.assigned_volunteer_name || 'Unassigned'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-surface-400" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-surface-500 uppercase tracking-widest leading-none mb-1">Time to Target</p>
                    <p className="text-xs font-bold text-white uppercase tracking-wider">Estimated 15 mins</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Resolution info */}
          {need.status === 'completed' && (
            <div className="glass-card p-6 border-white/5 bg-emerald-500/10 relative overflow-hidden">
              <CheckCircle2 className="absolute -bottom-4 -right-4 w-24 h-24 text-emerald-500/10" />
              <p className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.2em] mb-3">Mission Success</p>
              <div className="space-y-2">
                <p className="text-xs text-surface-300 font-medium">Completed: {formatDate(need.resolved_at)}</p>
                {need.beneficiary_feedback && (
                  <div className="mt-4 pt-4 border-t border-emerald-500/10">
                    <p className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest mb-1">Beneficiary Impact</p>
                    <p className="text-sm font-bold text-white italic leading-relaxed">
                      "{need.beneficiary_feedback}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Assign modal */}
      <AssignModal
        isOpen={showAssign}
        onClose={() => setShowAssign(false)}
        need={need}
        suggestions={suggestions}
      />
    </div>
  );
}
