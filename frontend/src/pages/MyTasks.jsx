// ============================================================
// src/pages/MyTasks.jsx
// Volunteer view: currently assigned tasks with status actions.
// ============================================================

import { Link } from 'react-router-dom';
import { useNeeds } from '../hooks/useNeeds';
import { useUpdateTask } from '../hooks/useVolunteers';
import PriorityBadge from '../components/PriorityBadge';

const CATEGORY_EMOJI = {
  food: '🍚', medical: '🏥', shelter: '🏠', education: '📚',
  water: '💧', safety: '🛡️', mental_health: '🧠', other: '📋',
};

export default function MyTasks() {
  // Fetch assigned and in-progress needs
  const { data: assignedData, isLoading: l1 } = useNeeds({ status: 'assigned', limit: 50 });
  const { data: progressData, isLoading: l2 } = useNeeds({ status: 'in_progress', limit: 50 });
  const updateTask = useUpdateTask();

  const tasks = [
    ...(assignedData?.data || []),
    ...(progressData?.data || []),
  ];

  const isLoading = l1 || l2;

  // Build Google Maps link for directions
  const mapsLink = (need) => {
    if (need.latitude && need.longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${need.latitude},${need.longitude}`;
    }
    if (need.location_text) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(need.location_text)}`;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-surface-950 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link to="/volunteer" className="text-sm text-surface-400">← Back</Link>
          <h1 className="text-lg font-bold text-white">📋 My Tasks</h1>
          <span className="badge bg-brand-600/20 text-brand-400 ml-auto">{tasks.length} active</span>
        </div>
      </header>

      <div className="px-4 mt-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16 glass-card">
            <p className="text-4xl mb-3">🎯</p>
            <p className="text-surface-300">No active tasks</p>
            <p className="text-sm text-surface-400 mt-1">Accept a task from the Home screen to get started.</p>
            <Link to="/volunteer" className="btn-primary mt-4 inline-block">Browse Tasks</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((need) => {
              const link = mapsLink(need);
              return (
                <div key={need.id} className="glass-card p-5">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{CATEGORY_EMOJI[need.category] || '📋'}</span>
                      <span className="font-semibold text-surface-100 capitalize">
                        {need.category?.replace('_', ' ')}
                      </span>
                    </div>
                    <PriorityBadge score={need.priority_score} />
                  </div>

                  {/* Description */}
                  <p className="text-sm text-surface-300 mb-3 leading-relaxed">
                    {need.description || need.raw_input}
                  </p>

                  {/* Location + directions */}
                  {(need.location_text || need.latitude) && (
                    <div className="bg-surface-900/50 rounded-xl p-3 mb-3">
                      <p className="text-xs text-surface-400 mb-1">📍 Location</p>
                      <p className="text-sm text-surface-200">{need.location_text || `${need.latitude?.toFixed(4)}, ${need.longitude?.toFixed(4)}`}</p>
                      {link && (
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand-400 hover:underline mt-1 inline-block"
                        >
                          🗺️ Open in Google Maps →
                        </a>
                      )}
                    </div>
                  )}

                  {/* Status */}
                  <div className="flex items-center gap-2 mb-4 text-xs text-surface-400">
                    <span className="capitalize">Status: <span className="text-surface-200 font-medium">{need.status?.replace('_', ' ')}</span></span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        // In production: use the actual task ID from the tasks table
                        // For now, use updateNeedStatus as a proxy
                        updateTask.mutate({ taskId: need.id, status: 'completed' });
                      }}
                      disabled={updateTask.isPending}
                      className="btn-primary flex-1 text-sm py-3"
                    >
                      ✅ Mark Complete
                    </button>
                    <button
                      onClick={() => {
                        updateTask.mutate({ taskId: need.id, status: 'failed' });
                      }}
                      disabled={updateTask.isPending}
                      className="btn-ghost flex-1 text-sm py-3 bg-red-600/10 text-red-400 hover:bg-red-600/20"
                    >
                      ❌ Can't Do This
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-surface-900/95 backdrop-blur-xl border-t border-white/5 z-50">
        <div className="flex items-center justify-around py-2">
          <Link to="/volunteer" className="flex flex-col items-center gap-0.5 px-4 py-1.5 text-surface-400 hover:text-surface-200">
            <span className="text-lg">🏠</span>
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link to="/volunteer/tasks" className="flex flex-col items-center gap-0.5 px-4 py-1.5 text-brand-400">
            <span className="text-lg">📋</span>
            <span className="text-[10px] font-semibold">My Tasks</span>
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
