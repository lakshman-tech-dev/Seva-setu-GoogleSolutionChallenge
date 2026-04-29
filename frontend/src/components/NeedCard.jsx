// ============================================================
// src/components/NeedCard.jsx
// Compact community need card for the priority feed.
// ============================================================

import { useNavigate } from 'react-router-dom';
import { 
  Package, Stethoscope, Home, GraduationCap, 
  Droplets, Shield, Brain, ClipboardList, 
  Clock, User, ChevronRight, AlertCircle
} from 'lucide-react';
import PriorityBadge from './PriorityBadge';

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

  const IconComp = CATEGORY_ICON[need.category] || ClipboardList;
  const statusStyle = STATUS_STYLES[need.status] || STATUS_STYLES.open;
  const description = need.description || need.raw_input || '';
  const truncated = description.length > 100 ? description.slice(0, 100) + '…' : description;
  const flags = need.vulnerability_flags || [];

  return (
    <button
      onClick={() => navigate(`/needs/${need.id}`)}
      className="glass-card-hover w-full text-left p-4 block border-white/5"
    >
      {/* Header: category + priority + status */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
            <IconComp className="w-5 h-5 text-brand-400" />
          </div>
          <span className="text-sm font-bold text-surface-100 capitalize truncate">
            {need.category?.replace('_', ' ')}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <PriorityBadge score={need.priority_score} />
          <span className={`badge ${statusStyle} capitalize text-[10px] font-black tracking-widest`}>
            {need.status?.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-surface-400 leading-relaxed mb-4 line-clamp-2">
        {truncated}
      </p>

      {/* Footer: flags + time */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {flags.map((flag) => (
            <span
              key={flag}
              className="text-[10px] font-bold uppercase tracking-widest bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-md border border-purple-500/10"
            >
              {flag}
            </span>
          ))}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-surface-500 flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          {timeAgo(need.created_at || need.reported_at)}
        </span>
      </div>

      {/* Assigned volunteer */}
      {need.assigned_volunteer_name && (
        <div className="mt-3 pt-3 border-t border-white/5 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 text-surface-500">
          <User className="w-3 h-3 text-brand-400" />
          Assigned to <span className="text-brand-400">{need.assigned_volunteer_name}</span>
        </div>
      )}
    </button>
  );
}
