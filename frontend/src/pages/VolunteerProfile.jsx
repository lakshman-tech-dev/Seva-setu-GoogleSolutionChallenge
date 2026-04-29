// ============================================================
// src/pages/VolunteerProfile.jsx
// Volunteer profile: skills, weekly hours, reliability,
// availability toggle, burnout warning.
// ============================================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  User, Mail, Phone, Star, Activity, 
  Home, ClipboardList, PlusCircle, 
  AlertTriangle, Wrench, CheckCircle2,
  Heart, ChevronLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ALL_SKILLS = [
  'food_distribution', 'cooking', 'driving', 'medical', 'first_aid', 'nursing', 'doctor',
  'construction', 'logistics', 'teaching', 'tutoring', 'counseling', 'psychology',
  'social_work', 'plumbing', 'security', 'cleaning', 'sorting', 'legal', 'advocacy',
];

export default function VolunteerProfile() {
  const { user } = useAuth();
  
  const [volunteer, setVolunteer] = useState({
    name: user?.user_metadata?.full_name || 'Volunteer',
    phone: user?.user_metadata?.phone || '+91 00000 00000',
    email: user?.email || '',
    skills: user?.user_metadata?.skills || [],
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
  };

  const pctUsed = Math.min((volunteer.hours_this_week / volunteer.weekly_hour_limit) * 100, 100);
  const hoursRemaining = Math.max(volunteer.weekly_hour_limit - volunteer.hours_this_week, 0);
  const isBurnout = pctUsed >= 80;
  const stars = Math.round(volunteer.reliability_score * 5);
  const barColor = pctUsed >= 80 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : pctUsed >= 50 ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]';

  return (
    <div className="min-h-screen bg-[#020617] pb-28">
      <div className="max-w-7xl mx-auto relative min-h-screen">
        {/* Desktop Top Nav */}
        <nav className="hidden md:flex items-center justify-between px-6 py-4 border-b border-white/5 bg-surface-950/50 backdrop-blur-xl sticky top-0 z-50">
          <Link to="/volunteer" className="flex items-center gap-2 group">
            <ChevronLeft className="w-5 h-5 text-surface-500 group-hover:text-white transition-colors" />
            <span className="font-black text-white tracking-tight uppercase text-sm">Return to Dashboard</span>
          </Link>
          <div className="flex items-center gap-8">
            <Link to="/volunteer" className="text-[10px] font-black uppercase tracking-widest text-surface-500 hover:text-white">Dashboard</Link>
            <Link to="/volunteer/tasks" className="text-[10px] font-black uppercase tracking-widest text-surface-500 hover:text-white">Active Duties</Link>
            <Link to="/volunteer/profile" className="text-[10px] font-black uppercase tracking-widest text-brand-400">My Profile</Link>
          </div>
        </nav>

        <div className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Profile Card */}
          <div className="lg:col-span-4">
            <header className="bg-gradient-to-br from-brand-700 to-brand-900 px-6 py-12 rounded-[2.5rem] text-center shadow-2xl relative overflow-hidden h-full flex flex-col justify-center">
              <div className="absolute top-0 left-0 w-full h-full opacity-10">
                <Activity className="absolute -top-10 -right-10 w-40 h-40" />
                <Heart className="absolute -bottom-10 -left-10 w-40 h-40" />
              </div>
              <div className="w-24 h-24 rounded-[2.5rem] bg-white/10 backdrop-blur-md flex items-center justify-center text-4xl font-black text-white mx-auto mb-5 shadow-2xl border border-white/20">
                {volunteer.name.charAt(0)}
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">{volunteer.name}</h1>
              <p className="text-brand-200 text-sm font-bold uppercase tracking-widest mt-1 flex items-center justify-center gap-2">
                <Phone className="w-3.5 h-3.5" /> {volunteer.phone}
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-4 bg-white/10 w-fit mx-auto px-4 py-1.5 rounded-full backdrop-blur-sm">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i < stars ? 'fill-yellow-400 text-yellow-400' : 'text-white/20'}`} />
                  ))}
                </div>
                <span className="text-[10px] font-black text-white ml-2 uppercase tracking-widest">{volunteer.reliability_score.toFixed(2)}</span>
              </div>
            </header>
          </div>

          {/* Right Column: Stats & Settings */}
          <div className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Availability toggle */}
              <div className="glass-card p-6 flex items-center justify-between border-white/5 h-full">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${volunteer.is_available ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white uppercase tracking-wider">Mission Ready</p>
                    <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest mt-0.5">
                      {volunteer.is_available ? 'Visible to Coordinators' : 'Currently Offline'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleAvailability}
                  className={`w-14 h-8 rounded-full flex items-center px-1 transition-all duration-300 ${
                    volunteer.is_available ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-slate-700'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full bg-white shadow-lg transition-transform duration-300 ${
                    volunteer.is_available ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Impact stats mini */}
              <div className="glass-card p-6 border-white/5 flex items-center justify-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-black text-white mb-0.5">{volunteer.total_tasks_completed}</p>
                  <p className="text-[9px] font-bold text-surface-500 uppercase tracking-widest">Tasks Done</p>
                </div>
                <div className="w-px h-8 bg-white/5" />
                <div className="text-center">
                  <p className="text-2xl font-black text-white mb-0.5">{volunteer.reliability_score.toFixed(2)}</p>
                  <p className="text-[9px] font-bold text-surface-500 uppercase tracking-widest">Trust Index</p>
                </div>
              </div>
            </div>

            {/* Weekly hours */}
            <div className="glass-card p-6 border-white/5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <ClipboardList className="w-5 h-5 text-brand-400" />
                  <p className="text-sm font-bold text-white uppercase tracking-wider">Workload Monitor</p>
                </div>
                <span className="text-[10px] font-black text-surface-400 uppercase tracking-widest">{volunteer.hours_this_week}H / {volunteer.weekly_hour_limit}H LIMIT</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
                <div
                  className={`h-full ${barColor} rounded-full transition-all duration-700`}
                  style={{ width: `${pctUsed}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">{hoursRemaining}H Capacity remaining</span>
                <span className="text-[10px] font-black text-white uppercase tracking-widest">{Math.round(pctUsed)}% Utilization</span>
              </div>
            </div>

            {/* Skills */}
            <div className="glass-card p-6 border-white/5">
              <div className="flex items-center gap-3 mb-6">
                <Wrench className="w-5 h-5 text-brand-400" />
                <p className="text-sm font-bold text-white uppercase tracking-wider">Field Specializations</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {ALL_SKILLS.map((skill) => {
                  const active = selectedSkills.has(skill);
                  return (
                    <button
                      key={skill}
                      onClick={() => toggleSkill(skill)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer border ${
                        active
                          ? 'bg-brand-600/20 text-brand-400 border-brand-500/30 shadow-[0_0_10px_rgba(20,112,245,0.1)]'
                          : 'bg-white/5 text-surface-500 border-transparent hover:bg-white/10'
                      }`}
                    >
                      {active && <CheckCircle2 className="w-3 h-3 inline mr-1.5 -mt-0.5" />}
                      {skill.replace('_', ' ')}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-950/80 backdrop-blur-2xl border-t border-white/5 z-50">
          <div className="flex items-center justify-around py-4">
            <Link to="/volunteer" className="flex flex-col items-center gap-1.5 px-4 text-surface-500 transition-colors">
              <Home className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Home</span>
            </Link>
            <Link to="/volunteer/tasks" className="flex flex-col items-center gap-1.5 px-4 text-surface-500 transition-colors">
              <ClipboardList className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Tasks</span>
            </Link>
            <Link to="/report" className="flex flex-col items-center gap-1.5 px-4 text-surface-500 transition-colors">
              <PlusCircle className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Report</span>
            </Link>
            <Link to="/volunteer/profile" className="flex flex-col items-center gap-1.5 px-4 text-brand-400">
              <User className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Profile</span>
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
}
