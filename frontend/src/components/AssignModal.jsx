// ============================================================
// src/components/AssignModal.jsx
// Modal dialog for assigning a volunteer to a need.
// ============================================================

import { useState } from 'react';
import VolunteerBadge from './VolunteerBadge';
import { useAssignVolunteer } from '../hooks/useVolunteers';

export default function AssignModal({ isOpen, onClose, need, suggestions = [] }) {
  const [selectedId, setSelectedId] = useState(null);
  const assign = useAssignVolunteer();

  if (!isOpen) return null;

  const handleAssign = () => {
    if (!need?.id) return;
    assign.mutate(
      { needId: need.id, volunteerId: selectedId },
      { onSuccess: () => { setSelectedId(null); onClose(); } }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg glass-card p-6 shadow-2xl animate-in fade-in zoom-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Assign Volunteer</h2>
          <button onClick={onClose} className="text-surface-400 hover:text-white text-xl leading-none">&times;</button>
        </div>

        {/* Need summary */}
        <div className="bg-surface-900/50 rounded-xl p-3 mb-4">
          <p className="text-sm text-surface-300">
            <span className="text-surface-100 font-medium capitalize">{need?.category}</span>
            {' — '}{need?.description?.slice(0, 80) || 'No description'}
          </p>
        </div>

        {/* Volunteer suggestions */}
        <p className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2">
          Top Matches
        </p>

        {suggestions.length === 0 ? (
          <p className="text-sm text-surface-400 italic py-4 text-center">
            No matching volunteers available right now.
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {suggestions.map((s) => (
              <div
                key={s.volunteer_id}
                className={`rounded-xl transition-all ${
                  selectedId === s.volunteer_id
                    ? 'ring-2 ring-brand-500'
                    : ''
                }`}
              >
                <VolunteerBadge
                  volunteer={{ id: s.volunteer_id, name: s.name, phone: s.phone, skills: [], reliability_score: 0.75 }}
                  matchScore={s.match_score}
                  distanceKm={s.distance_km}
                  breakdown={s.breakdown}
                  onClick={() => setSelectedId(s.volunteer_id)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 mt-5 pt-4 border-t border-white/5">
          <button
            onClick={handleAssign}
            disabled={assign.isPending}
            className="btn-primary flex-1"
          >
            {assign.isPending ? 'Assigning…' : selectedId ? 'Assign Selected' : 'Auto-Assign Best Match'}
          </button>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
        </div>
      </div>
    </div>
  );
}
