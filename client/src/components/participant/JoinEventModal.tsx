import React, { useState } from 'react';
import { X, Trophy, KeyRound, User as UserIcon, BookOpen, GraduationCap, ArrowRight, Lock, Hash } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface JoinEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEventCode?: string;
  onSuccess?: () => void;
}

export const JoinEventModal: React.FC<JoinEventModalProps> = ({
  isOpen,
  onClose,
  defaultEventCode = '',
  onSuccess
}) => {
  const { joinEventByCode, login } = useAuth();
  const [activeTab, setActiveTab] = useState<'code' | 'login'>('code');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Event Code Join Form State
  const [eventCode, setEventCode] = useState(defaultEventCode);
  const [fullName, setFullName] = useState('');
  const [regNo, setRegNo] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [password, setPassword] = useState('');

  // Direct Participant Login State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  if (!isOpen) return null;

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      if (!eventCode.trim() || !fullName.trim() || !regNo.trim() || !password.trim()) {
        setError('Please fill in Event Code, Full Name, Roll Number, and a secure PIN/Password.');
        setLoading(false);
        return;
      }

      await joinEventByCode({
        eventCode: eventCode.trim().toUpperCase(),
        name: fullName.trim(),
        regNo: regNo.trim().toUpperCase(),
        department: department.trim(),
        year: year.trim(),
        password: password.trim()
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to join event with code.');
    } finally {
      setLoading(false);
    }
  };

  const handleDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await login(loginUsername.trim(), loginPassword);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0c1220] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Glow accents */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Enter Competition Event</h2>
            <p className="text-xs text-slate-400">Join via 6-digit event code or pre-registered credentials</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-slate-900/80 border border-slate-800 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => { setActiveTab('code'); setError(null); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'code'
                ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Hash className="w-4 h-4 text-cyan-300" />
            <span>Join with Event Code</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('login'); setError(null); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'login'
                ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Pre-Registered Login</span>
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab 1: Join with Event Code */}
        {activeTab === 'code' && (
          <form onSubmit={handleJoinByCode} className="space-y-3.5">
            <div>
              <label className="text-xs font-medium text-slate-300 mb-1 block">Event Access Code</label>
              <div className="relative">
                <Hash className="w-4 h-4 text-cyan-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={eventCode}
                  onChange={(e) => setEventCode(e.target.value.toUpperCase())}
                  placeholder="e.g., TECH26"
                  maxLength={12}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-sm font-mono font-bold text-cyan-300 tracking-wider placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1 block">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Candidate Name"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1 block">Roll / Reg Number</label>
                <input
                  type="text"
                  required
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value.toUpperCase())}
                  placeholder="e.g., 22CS101"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 uppercase transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1 block">Department</label>
                <div className="relative">
                  <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g., CSE / IT"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1 block">Year</label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="e.g., 3rd Year"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 mb-1 block">
                Session PIN / Password <span className="text-slate-500 text-[10px] font-normal">(Used for reconnection if laptop restarts)</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create your event PIN / password"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-600/30 active:scale-[0.99] disabled:opacity-50"
            >
              <span>{loading ? 'Validating Event & Enrolling...' : 'Enter Competition Lobby'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Tab 2: Direct Username/Password */}
        {activeTab === 'login' && (
          <form onSubmit={handleDirectLogin} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-300 mb-1.5 block">Participant Username or Roll No</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="e.g., student1 or 22CS101"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-600/30 active:scale-[0.99] disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Resume Competition Session'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
