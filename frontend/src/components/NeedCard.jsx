// ============================================================
// src/components/NeedCard.jsx
// Compact community need card for the priority feed.
// ============================================================

import { useNavigate } from 'react-router-dom';
import PriorityBadge from './PriorityBadge';

const CATEGORY_EMOJI = {
  food: '🍚', medical: '🏥', shelter: '🏠', education: '📚',
  water: '💧', safety: '🛡️', mental_health: '🧠', other: '📋',
};

const STATUS_STYLES = {
  open: 'bg-emerald-500/15 text-emerald-400',
  assigned: 'bg-blue-500/15 text-blue-400',
  in_progress: 'bg-amber-500/15 text-amber-400',
  completed: 'bg-surface-700 text-surface-300',
  cancelled: 'bg-surface-700 text-surface-300/50',
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NeedCard({ need }) {
  const navigate = useNavigate();

  const emoji = CATEGORY_EMOJI[need.category] || '📋';
  const statusStyle = STATUS_STYLES[need.status] || STATUS_STYLES.open;
  const description = need.description || need.raw_input || '';
  const truncated = description.length > 100 ? description.slice(0, 100) + '…' : description;
  const flags = need.vulnerability_flags || [];

  return (
    <button
      onClick={() => navigate(`/needs/${need.id}`)}
      className="glass-card-hover w-full text-left p-4 block"
    >
      {/* Header: category + priority + status */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl flex-shrink-0">{emoji}</span>
          <span className="text-sm font-semibold text-surface-100 capitalize truncate">
            {need.category?.replace('_', ' ')}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <PriorityBadge score={need.priority_score} />
          <span className={`badge ${statusStyle} capitalize`}>
            {need.status?.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-surface-300 leading-relaxed mb-3">
        {truncated}
      </p>

      {/* Footer: flags + time */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {flags.map((flag) => (
            <span
              key={flag}
              className="badge bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/20 text-[10px]"
            >
              {flag}
            </span>
          ))}
        </div>
        <span className="text-xs text-surface-400 flex-shrink-0">
          {timeAgo(need.created_at || need.reported_at)}
        </span>
      </div>

      {/* Assigned volunteer */}
      {need.assigned_volunteer_name && (
        <div className="mt-2 pt-2 border-t border-white/5 text-xs text-surface-400">
          👤 Assigned to <span className="text-brand-400 font-medium">{need.assigned_volunteer_name}</span>
        </div>
      )}
    </button>
  );
}
