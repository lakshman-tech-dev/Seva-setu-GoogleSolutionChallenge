// ============================================================
// src/pages/VolunteerProfile.jsx
// Volunteer profile: skills, weekly hours, reliability,
// availability toggle, burnout warning.
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';

const ALL_SKILLS = [
  'food_distribution', 'cooking', 'driving', 'medical', 'first_aid', 'nursing', 'doctor',
  'construction', 'logistics', 'teaching', 'tutoring', 'counseling', 'psychology',
  'social_work', 'plumbing', 'security', 'cleaning', 'sorting', 'legal', 'advocacy',
];

export default function VolunteerProfile() {
  // TODO: In production, load from auth context + API
  const [volunteer, setVolunteer] = useState({
    name: 'Priya Sharma',
    phone: '+919876543210',
    email: 'priya@example.com',
    skills: ['medical', 'first_aid', 'counseling'],
    is_available: true,
    hours_this_week: 6,
    weekly_hour_limit: 10,
    total_tasks_completed: 28,
    reliability_score: 0.92,
  });

  const [selectedSkills, setSelectedSkills] = useState(new Set(volunteer.skills));

  const toggleSkill = (skill) => {
    setSelectedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(skill)) next.delete(skill);
      else next.add(skill);
      return next;
    });
  };

  const toggleAvailability = () => {
    setVolunteer((prev) => ({ ...prev, is_available: !prev.is_available }));
    // TODO: call updateVolunteer API
  };

  const pctUsed = Math.min((volunteer.hours_this_week / volunteer.weekly_hour_limit) * 100, 100);
  const hoursRemaining = Math.max(volunteer.weekly_hour_limit - volunteer.hours_this_week, 0);
  const isBurnout = pctUsed >= 80;
  const stars = Math.round(volunteer.reliability_score * 5);
  const barColor = pctUsed >= 80 ? 'bg-red-500' : pctUsed >= 50 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="min-h-screen bg-surface-950 pb-24">
      {/* Header */}
      <header className="bg-gradient-to-br from-brand-700 to-brand-900 px-4 py-8 rounded-b-3xl text-center">
        <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold text-white mx-auto mb-3">
          {volunteer.name.charAt(0)}
        </div>
        <h1 className="text-xl font-bold text-white">{volunteer.name}</h1>
        <p className="text-brand-200 text-sm">{volunteer.phone}</p>
        <div className="flex items-center justify-center gap-1 mt-2">
          <span className="text-yellow-400">{'★'.repeat(stars)}{'☆'.repeat(5 - stars)}</span>
          <span className="text-xs text-brand-200">({volunteer.reliability_score.toFixed(2)})</span>
        </div>
      </header>

      <div className="px-4 mt-4 space-y-4">
        {/* Availability toggle */}
        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-surface-100">Availability</p>
            <p className="text-xs text-surface-400">
              {volunteer.is_available ? 'You\'re visible to coordinators' : 'You\'re hidden from new assignments'}
            </p>
          </div>
          <button
            onClick={toggleAvailability}
            className={`w-14 h-8 rounded-full flex items-center px-1 transition-all duration-300 ${
              volunteer.is_available ? 'bg-emerald-500' : 'bg-surface-600'
            }`}
          >
            <div className={`w-6 h-6 rounded-full bg-white shadow-lg transition-transform duration-300 ${
              volunteer.is_available ? 'translate-x-6' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* Weekly hours */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-surface-100">Weekly Hours</p>
            <span className="text-xs text-surface-400">{volunteer.hours_this_week}h / {volunteer.weekly_hour_limit}h</span>
          </div>
          <div className="w-full h-3 bg-surface-700 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full ${barColor} rounded-full transition-all duration-700`}
              style={{ width: `${pctUsed}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-surface-400">{hoursRemaining}h remaining</span>
            <span className="text-surface-400">{Math.round(pctUsed)}% used</span>
          </div>

          {/* Burnout warning */}
          {isBurnout && (
            <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
              <p className="text-sm text-amber-400 font-semibold">⚠️ Take it easy this week</p>
              <p className="text-xs text-amber-300/70 mt-0.5">
                You've taken on a lot this week — consider resting. Your wellbeing matters!
              </p>
            </div>
          )}
        </div>

        {/* Impact stats */}
        <div className="glass-card p-4">
          <p className="text-sm font-semibold text-surface-100 mb-3">📊 Your Impact</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-900/50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{volunteer.total_tasks_completed}</p>
              <p className="text-xs text-surface-400">Tasks Completed</p>
            </div>
            <div className="bg-surface-900/50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{volunteer.reliability_score.toFixed(2)}</p>
              <p className="text-xs text-surface-400">Reliability</p>
            </div>
          </div>
          <div className="mt-3 bg-brand-600/10 rounded-xl p-3 text-center">
            <p className="text-sm text-brand-300">
              💙 You've helped <span className="font-bold text-brand-200">{volunteer.total_tasks_completed}</span> families this month
            </p>
          </div>
        </div>

        {/* Skills (editable) */}
        <div className="glass-card p-4">
          <p className="text-sm font-semibold text-surface-100 mb-3">🛠️ Your Skills</p>
          <div className="flex flex-wrap gap-2">
            {ALL_SKILLS.map((skill) => {
              const active = selectedSkills.has(skill);
              return (
                <button
                  key={skill}
                  onClick={() => toggleSkill(skill)}
                  className={`badge transition-all cursor-pointer ${
                    active
                      ? 'bg-brand-600/20 text-brand-300 ring-1 ring-brand-500/30'
                      : 'bg-surface-700/50 text-surface-400 hover:bg-surface-700'
                  }`}
                >
                  {active && '✓ '}{skill.replace('_', ' ')}
                </button>
              );
            })}
          </div>
          <button className="btn-primary w-full mt-4 text-sm">Save Skills</button>
        </div>
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-surface-900/95 backdrop-blur-xl border-t border-white/5 z-50">
        <div className="flex items-center justify-around py-2">
          <Link to="/volunteer" className="flex flex-col items-center gap-0.5 px-4 py-1.5 text-surface-400 hover:text-surface-200">
            <span className="text-lg">🏠</span>
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link to="/volunteer/tasks" className="flex flex-col items-center gap-0.5 px-4 py-1.5 text-surface-400 hover:text-surface-200">
            <span className="text-lg">📋</span>
            <span className="text-[10px] font-medium">My Tasks</span>
          </Link>
          <Link to="/report" className="flex flex-col items-center gap-0.5 px-4 py-1.5 text-surface-400 hover:text-surface-200">
            <span className="text-lg">➕</span>
            <span className="text-[10px] font-medium">Report</span>
          </Link>
          <Link to="/volunteer/profile" className="flex flex-col items-center gap-0.5 px-4 py-1.5 text-brand-400">
            <span className="text-lg">👤</span>
            <span className="text-[10px] font-semibold">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
