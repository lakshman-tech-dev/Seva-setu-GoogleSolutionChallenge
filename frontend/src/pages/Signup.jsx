// ============================================================
// src/pages/Signup.jsx
// ============================================================

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, Phone, Briefcase, Building2, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const Signup = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [skills, setSkills] = useState('');
  const [organization, setOrganization] = useState('');
  const [role, setRole] = useState(''); // 'coordinator' or 'volunteer'
  const [loading, setLoading] = useState(false);
  
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!role) {
      toast.error('Please select your role.');
      return;
    }
    
    setLoading(true);
    try {
      await signup(fullName, email, password, role, {
        phone,
        skills,
        organization
      });
      toast.success('Account created! Welcome to CommunityPulse.');
      navigate('/login');
    } catch (err) {
      toast.error(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-lg bg-slate-900/40 backdrop-blur-2xl border border-slate-800/50 p-10 rounded-[2.5rem] shadow-2xl relative z-10">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20 -rotate-3">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Create Account 🚀</h1>
          <p className="text-slate-400 mt-3 font-medium">Join our mission-driven network</p>
        </div>

        {/* Role Selection */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <button
            type="button"
            onClick={() => setRole('coordinator')}
            className={`p-4 rounded-[1.5rem] border-2 transition-all flex flex-col items-center gap-2 group ${
              role === 'coordinator'
                ? 'bg-blue-600/20 border-blue-500 text-white shadow-xl shadow-blue-500/10'
                : 'bg-slate-950/30 border-slate-700/50 text-slate-400 hover:border-slate-600'
            }`}
          >
            <Building2 className={`w-6 h-6 ${role === 'coordinator' ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
            <span className="text-sm font-bold">Coordinator</span>
          </button>
          <button
            type="button"
            onClick={() => setRole('volunteer')}
            className={`p-4 rounded-[1.5rem] border-2 transition-all flex flex-col items-center gap-2 group ${
              role === 'volunteer'
                ? 'bg-blue-600/20 border-blue-500 text-white shadow-xl shadow-blue-500/10'
                : 'bg-slate-950/30 border-slate-700/50 text-slate-400 hover:border-slate-600'
            }`}
          >
            <User className={`w-6 h-6 ${role === 'volunteer' ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
            <span className="text-sm font-bold">Volunteer</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                <User className="w-3 h-3" /> Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-950/40 border border-slate-700/50 text-white rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                <Phone className="w-3 h-3" /> Phone Number
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950/40 border border-slate-700/50 text-white rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
                placeholder="+91 98..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-2">
              <Mail className="w-3 h-3" /> Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950/40 border border-slate-700/50 text-white rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
              placeholder="name@example.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-2">
              <Lock className="w-3 h-3" /> Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950/40 border border-slate-700/50 text-white rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
              placeholder="••••••••"
            />
          </div>

          {/* Conditional Fields */}
          {role === 'coordinator' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                <Building2 className="w-3 h-3" /> Organization / NGO Name
              </label>
              <input
                type="text"
                required
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="w-full bg-slate-950/40 border border-slate-700/50 text-white rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
                placeholder="e.g. Red Cross India"
              />
            </div>
          )}

          {role === 'volunteer' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                <Briefcase className="w-3 h-3" /> Skills (Comma separated)
              </label>
              <input
                type="text"
                required
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="w-full bg-slate-950/40 border border-slate-700/50 text-white rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
                placeholder="e.g. Medical, Driving, Language"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !role}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl py-4 shadow-xl shadow-blue-500/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4 flex items-center justify-center gap-2 capitalize"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                {role ? `Sign Up as ${role}` : 'Choose Your Role'}
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-slate-800/50 text-center">
          <p className="text-slate-400 text-sm font-medium">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-bold transition-colors underline underline-offset-4 decoration-blue-500/30">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
