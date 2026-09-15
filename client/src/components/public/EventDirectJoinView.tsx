import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Shield,
  Building2,
  Clock,
  Code2,
  HelpCircle,
  Award,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Radio,
  User,
  Hash,
  Eye,
  EyeOff,
  Maximize2
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { ThemeToggle } from '../common/ThemeToggle.js';
import { AdminTestSandboxModal } from '../admin/AdminTestSandboxModal.js';

interface EventDirectJoinViewProps {
  eventCode: string;
  onJoinedSuccess: () => void;
  onBackToHome: () => void;
}

export const EventDirectJoinView: React.FC<EventDirectJoinViewProps> = ({
  eventCode,
  onJoinedSuccess,
  onBackToHome
}) => {
  const { user, joinEventByCode, login } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventData, setEventData] = useState<any>(null);

  // Admin Sandbox Modal State
  const [isAdminSandboxOpen, setIsAdminSandboxOpen] = useState(false);

  // Participant Form State
  const [activeTab, setActiveTab] = useState<'register' | 'login'>('register');
  const [fullName, setFullName] = useState('');
  const [regNo, setRegNo] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/participant/event-info/${encodeURIComponent(eventCode)}`);
        setEventData(res.data.event);
      } catch (err: any) {
        setError(err.response?.data?.error || `Event with code "${eventCode}" could not be found.`);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventCode]);

  const requestKioskFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        const elem = document.documentElement as any;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
          await elem.msRequestFullscreen();
        }
      }
      if ('keyboard' in navigator && (navigator as any).keyboard?.lock) {
        try {
          await (navigator as any).keyboard.lock(['Escape']);
        } catch (e) {}
      }
    } catch (err) {
      console.warn('Fullscreen request bypassed:', err);
    }
  };

  const handleRegisterAndJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setSubmitError(null);

      if (!fullName.trim() || !regNo.trim() || !password.trim()) {
        setSubmitError('Please enter your Full Name, Roll Number, and a Password PIN.');
        setSubmitting(false);
        return;
      }

      await requestKioskFullscreen();

      const res = await joinEventByCode({
        eventCode: eventCode.trim().toUpperCase(),
        name: fullName.trim(),
        regNo: regNo.trim().toUpperCase(),
        department: department.trim(),
        year: year.trim(),
        password: password.trim()
      });

      try {
        localStorage.setItem(
          'debugarena_participant_recovery',
          JSON.stringify({
            name: fullName.trim(),
            regNo: regNo.trim().toUpperCase(),
            username: res?.user?.username || regNo.trim().toUpperCase(),
            eventCode: eventCode.trim().toUpperCase()
          })
        );
      } catch {}

      onJoinedSuccess();
    } catch (err: any) {
      setSubmitError(err.response?.data?.error || 'Failed to join competition.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setSubmitError(null);

      if (!regNo.trim() || !password.trim()) {
        setSubmitError('Please enter your Roll Number / Username and Password.');
        setSubmitting(false);
        return;
      }

      await requestKioskFullscreen();

      // Scoped username fallback if simple roll number used
      const cleanReg = regNo.trim();
      const loginUser = cleanReg.includes('_')
        ? cleanReg
        : `${eventCode.toLowerCase()}_${cleanReg.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

      await login(loginUser, password);
      onJoinedSuccess();
    } catch (err: any) {
      setSubmitError(err.response?.data?.error || 'Invalid credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0e17] flex items-center justify-center font-mono text-xs text-slate-500">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          <span>Locating Event {eventCode.toUpperCase()}...</span>
        </div>
      </div>
    );
  }

  if (error || !eventData) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0e17] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Event Not Found</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{error}</p>
          <button
            onClick={onBackToHome}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold font-mono transition-all cursor-pointer"
          >
            Return to DebugArena Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0e17] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Header Bar */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0d121f]/95 backdrop-blur-xl px-4 sm:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={onBackToHome}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
            <Trophy className="w-4 h-4 text-slate-950" />
          </div>
          <span className="font-black text-lg text-slate-900 dark:text-white tracking-tight">
            DebugArena
          </span>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] font-mono font-bold uppercase border border-amber-500/30">
            Direct Join
          </span>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={onBackToHome}
            className="text-xs font-mono text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            &larr; Return Home
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-8 space-y-8">
        {/* Admin Warning/Quick Action Banner if already logged in as Admin */}
        {user && user.role !== 'participant' && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 text-xs">
              <div className="font-bold flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-500" />
                <span>Host Administrator Session Active</span>
              </div>
              <p className="text-amber-800 dark:text-amber-300">
                You are currently signed in as an event host. Use the Candidate Dry-Run Sandbox to test questions without countdown timers, kiosk lock, or leaderboard contamination.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsAdminSandboxOpen(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold font-mono transition-all shadow-md shadow-amber-500/20 cursor-pointer"
              >
                Dry-Run Sandbox Preview
              </button>
              <button
                onClick={onBackToHome}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold font-mono transition-all cursor-pointer"
              >
                Admin Control Room
              </button>
            </div>
          </div>
        )}

        {/* Event Header & Specs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Event Specs & Round Breakdown */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              {eventData.college && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-700 dark:text-indigo-400 font-mono text-xs font-bold">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{eventData.college.name} ({eventData.college.code})</span>
                </div>
              )}
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                {eventData.name}
              </h1>
              {eventData.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {eventData.description}
                </p>
              )}
            </div>

            {/* Event Code & Status Chips */}
            <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
              <div className="p-2.5 px-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2">
                <span className="text-slate-400 uppercase font-bold text-[10px]">Code:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 text-sm tracking-wider">{eventData.code}</span>
              </div>
              <div className="p-2.5 px-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2">
                <span className="text-slate-400 uppercase font-bold text-[10px]">Status:</span>
                <span className="font-bold uppercase text-emerald-600 dark:text-emerald-400">{eventData.status}</span>
              </div>
              <div className="p-2.5 px-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-rose-500" />
                <span className="text-slate-600 dark:text-slate-300">Fullscreen Anti-Cheat Enforced</span>
              </div>
            </div>

            {/* Configured Dynamic Rounds */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-mono font-bold text-slate-500 uppercase">
                Competition Stages &amp; Dynamic Rounds ({(eventData.rounds || []).length}):
              </div>

              <div className="space-y-2.5">
                {(eventData.rounds || []).map((round: any) => (
                  <div
                    key={round.roundNumber}
                    className="p-4 rounded-2xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between text-xs font-mono"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[10px]">
                          STAGE {round.roundNumber}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white font-sans text-sm">
                          {round.title}
                        </span>
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        Type: {round.type.toUpperCase()} • {round.questionCount || 0} Questions • {round.totalMarks || 0} Marks
                      </div>
                    </div>

                    <div className="text-right text-slate-500 shrink-0">
                      <div className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>{round.durationMinutes} Mins</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Event Rules */}
            {eventData.rules && eventData.rules.length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1.5 font-mono">
                <div className="font-bold text-slate-900 dark:text-white">Assessment Guidelines:</div>
                {eventData.rules.map((rule: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <span className="text-amber-500">•</span>
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Participant Direct Enrollment Card */}
          <div className="lg:col-span-5">
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800 shadow-xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-0.5">
                  <h3 className="font-black text-slate-900 dark:text-white text-lg tracking-tight">
                    Enter Competition Lobby
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Code: <strong className="text-amber-500">{eventData.code}</strong>
                  </p>
                </div>

                {(!user || user.role !== 'participant') && (
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => setActiveTab('register')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        activeTab === 'register'
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Register
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('login')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        activeTab === 'login'
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Resume
                    </button>
                  </div>
                )}
              </div>

              {user && user.role === 'participant' ? (
                <div className="space-y-4 py-2">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 space-y-2 font-mono">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Authenticated Candidate</span>
                    </div>
                    <div className="text-xs text-slate-700 dark:text-slate-300">
                      Welcome back, <strong>{user.name}</strong> ({user.regNo || user.username})
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Your test session is active and ready to launch.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      await requestKioskFullscreen();
                      onJoinedSuccess();
                    }}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black font-mono transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 cursor-pointer active:scale-95"
                  >
                    <Maximize2 className="w-4 h-4 text-slate-950" />
                    <span>Enter Proctored Assessment Room</span>
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          localStorage.removeItem('debugarena_participant_recovery');
                          localStorage.removeItem('token');
                        } catch {}
                        window.location.reload();
                      }}
                      className="text-[11px] font-mono text-slate-400 hover:text-slate-200 underline cursor-pointer"
                    >
                      Sign In As Different Participant
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {submitError && (
                    <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-mono flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}

              {/* Registration Mode */}
              {activeTab === 'register' ? (
                <form onSubmit={handleRegisterAndJoin} className="space-y-3.5">
                  <div>
                    <label className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ananya Sharma"
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      Roll Number / Registration ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={regNo}
                      onChange={(e) => setRegNo(e.target.value.toUpperCase())}
                      placeholder="e.g. 22CS041"
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold uppercase text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Department
                      </label>
                      <input
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="e.g. CSE"
                        className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Year
                      </label>
                      <input
                        type="text"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        placeholder="e.g. 3rd Year"
                        className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      Secret Password / PIN *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Used to reconnect if PC restarts"
                        className="w-full h-10 pl-3.5 pr-10 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full h-11 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      <Maximize2 className="w-4 h-4 text-slate-950" />
                      <span>{submitting ? 'Entering Lobby...' : 'Enter Fullscreen Assessment'}</span>
                    </button>
                    <p className="text-[10px] text-center text-slate-500 mt-2 font-mono">
                      Clicking above engages browser fullscreen lock for proctored evaluation.
                    </p>
                  </div>
                </form>
              ) : (
                /* Resume Mode */
                <form onSubmit={handleDirectLogin} className="space-y-3.5">
                  <div>
                    <label className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      Roll Number / Username *
                    </label>
                    <input
                      type="text"
                      required
                      value={regNo}
                      onChange={(e) => setRegNo(e.target.value.toUpperCase())}
                      placeholder="e.g. 22CS041"
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold uppercase text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      Password / PIN *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Your chosen PIN"
                        className="w-full h-10 pl-3.5 pr-10 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full h-11 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      <Maximize2 className="w-4 h-4 text-slate-950" />
                      <span>{submitting ? 'Resuming Session...' : 'Resume Assessment'}</span>
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
          </div>
        </div>
      </main>

      {/* Admin Sandbox Modal (if Admin previews this event) */}
      <AdminTestSandboxModal
        isOpen={isAdminSandboxOpen}
        onClose={() => setIsAdminSandboxOpen(false)}
        eventId={eventData._id}
      />
    </div>
  );
};
