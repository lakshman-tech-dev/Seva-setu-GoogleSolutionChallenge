// ============================================================
// src/pages/NeedDetail.jsx
// Full detail view of a single community need with
// volunteer match suggestions, assignment, and status controls.
// ============================================================

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { useNeed, useUpdateNeedStatus } from '../hooks/useNeeds';
import PriorityBadge from '../components/PriorityBadge';
import VolunteerBadge from '../components/VolunteerBadge';
import AssignModal from '../components/AssignModal';

const CATEGORY_EMOJI = {
  food: '🍚', medical: '🏥', shelter: '🏠', education: '📚',
  water: '💧', safety: '🛡️', mental_health: '🧠', other: '📋',
};

const STATUS_FLOW = ['open', 'assigned', 'in_progress', 'completed', 'cancelled'];

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function NeedDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error } = useNeed(id);
  const updateStatus = useUpdateNeedStatus();
  const [showAssign, setShowAssign] = useState(false);
  const [notes, setNotes] = useState('');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-3">😟</p>
          <p className="text-surface-300">Need not found</p>
          <Link to="/" className="btn-primary mt-4 inline-block">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const need = data.data;
  const suggestions = data.volunteer_suggestions || [];
  const emoji = CATEGORY_EMOJI[need.category] || '📋';
  const flags = need.vulnerability_flags || [];
  const hasCoords = need.latitude != null && need.longitude != null;

  const handleStatusUpdate = (status) => {
    updateStatus.mutate({ id: need.id, status, notes: notes || undefined });
  };

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-ghost text-sm">← Back</button>
          <span className="text-xl">{emoji}</span>
          <h1 className="text-lg font-bold text-white capitalize">{need.category?.replace('_', ' ')} Need</h1>
          <PriorityBadge score={need.priority_score} />
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main Content (2/3) ────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description card */}
          <div className="glass-card p-6">
            <h2 className="text-sm font-semibold text-surface-400 uppercase tracking-wide mb-2">Description</h2>
            <p className="text-surface-100 leading-relaxed">{need.description}</p>
            {need.raw_input && need.raw_input !== need.description && (
              <details className="mt-3">
                <summary className="text-xs text-surface-400 cursor-pointer hover:text-surface-200">
                  View original message
                </summary>
                <p className="mt-2 text-sm text-surface-300 bg-surface-900/50 rounded-lg p-3 font-mono">
                  {need.raw_input}
                </p>
              </details>
            )}
          </div>

          {/* Meta info grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card p-4">
              <p className="text-xs text-surface-400 mb-1">Status</p>
              <p className="text-surface-100 font-semibold capitalize">{need.status?.replace('_', ' ')}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-surface-400 mb-1">Urgency Score</p>
              <p className="text-surface-100 font-semibold">{need.urgency_score}/100</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-surface-400 mb-1">Source Channel</p>
              <p className="text-surface-100 font-semibold capitalize">{need.source_channel?.replace('_', ' ')}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-surface-400 mb-1">Reported</p>
              <p className="text-surface-100 font-semibold text-sm">{formatDate(need.created_at)}</p>
            </div>
          </div>

          {/* Location & vulnerability */}
          <div className="glass-card p-4">
            <p className="text-xs text-surface-400 mb-2">Location</p>
            <p className="text-surface-100">{need.location_text || 'Not specified'}</p>
            {hasCoords && <p className="text-xs text-surface-400 mt-1">{need.latitude?.toFixed(5)}, {need.longitude?.toFixed(5)}</p>}
          </div>

          {flags.length > 0 && (
            <div className="glass-card p-4">
              <p className="text-xs text-surface-400 mb-2">Vulnerability Flags</p>
              <div className="flex flex-wrap gap-2">
                {flags.map((f) => (
                  <span key={f} className="badge bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/20 capitalize">{f}</span>
                ))}
              </div>
            </div>
          )}

          {/* Map */}
          {hasCoords && (
            <div className="glass-card overflow-hidden h-64">
              <MapContainer center={[need.latitude, need.longitude]} zoom={14} scrollWheelZoom={false} className="w-full h-full rounded-2xl">
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                <CircleMarker center={[need.latitude, need.longitude]} radius={12} pathOptions={{ fillColor: '#ef4444', fillOpacity: 0.8, color: '#ef4444', weight: 2 }}>
                  <Popup>{emoji} {need.category}</Popup>
                </CircleMarker>
              </MapContainer>
            </div>
          )}

          {/* Status actions */}
          <div className="glass-card p-4">
            <p className="text-xs text-surface-400 font-semibold uppercase mb-3">Update Status</p>
            <textarea
              placeholder="Coordinator notes (optional)…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="input-dark text-sm mb-3"
            />
            <div className="flex flex-wrap gap-2">
              {STATUS_FLOW.filter((s) => s !== need.status).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusUpdate(s)}
                  disabled={updateStatus.isPending}
                  className={`btn-ghost text-sm capitalize ${
                    s === 'completed' ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30' :
                    s === 'cancelled' ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30' : ''
                  }`}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Sidebar: Volunteer Matches (1/3) ─────────────── */}
        <aside className="space-y-4">
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-surface-400 uppercase tracking-wide">
                Top Volunteer Matches
              </p>
              <button onClick={() => setShowAssign(true)} className="btn-primary text-xs py-1">
                Assign
              </button>
            </div>

            {suggestions.length === 0 ? (
              <p className="text-sm text-surface-400 italic py-4 text-center">
                No matching volunteers available
              </p>
            ) : (
              <div className="space-y-2">
                {suggestions.map((s, i) => (
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

          {/* Resolution info */}
          {need.status === 'completed' && (
            <div className="glass-card p-4 bg-gradient-to-br from-emerald-600/10 to-transparent">
              <p className="text-xs text-emerald-400 font-semibold uppercase mb-2">✅ Resolved</p>
              <p className="text-sm text-surface-300">Resolved at: {formatDate(need.resolved_at)}</p>
              {need.beneficiary_feedback && (
                <p className="text-sm text-surface-300 mt-1">
                  Feedback: <span className="font-semibold text-surface-100">{need.beneficiary_feedback}</span>
                </p>
              )}
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
