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
  User,
  Hash,
  Eye,
  EyeOff,
  Maximize2,
  LogOut,
  Check,
  Laptop,
  Wifi,
  AlertTriangle,
  FileText,
  ChevronRight,
  RefreshCw,
  Calendar,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { ThemeToggle } from '../common/ThemeToggle.js';

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
  const { user, logout, setSession } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventData, setEventData] = useState<any>(null);

  // Participant Login State (Self-registration is completely removed)
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Authenticated candidate state (for immediate transition to lobby post-login)
  const [authenticatedCandidate, setAuthenticatedCandidate] = useState<any>(null);
  const [agreedHonorCode, setAgreedHonorCode] = useState(false);

  // Live telemetry clock
  const [liveTime, setLiveTime] = useState<string>(() => new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        setError(null);
        let res;
        try {
          res = await api.get(`/participant/access/${encodeURIComponent(eventCode)}`);
        } catch {
          res = await api.get(`/participant/event-info/${encodeURIComponent(eventCode)}`);
        }
        setEventData(res.data.event);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Assessment link is invalid, expired, or deactivated.');
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

  const handleDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setSubmitError(null);

      const rawIdentifier = identifier.trim();
      if (!rawIdentifier || !password.trim()) {
        setSubmitError('Please enter your Username / Roll Number and Password.');
        setSubmitting(false);
        return;
      }

      let res: any;
      try {
        const tokenRes = await api.post('/participant/join-by-token', {
          participantToken: eventCode.trim(),
          username: rawIdentifier,
          regNo: rawIdentifier,
          password: password.trim()
        });
        if (tokenRes.data.token) {
          res = tokenRes.data;
        }
      } catch (tokenErr: any) {
        // Fallback to join-by-code if participantToken lookup failed or eventCode was provided
        const codeRes = await api.post('/participant/join-by-code', {
          eventCode: (eventData?.code || eventCode).trim().toUpperCase(),
          username: rawIdentifier,
          regNo: rawIdentifier,
          password: password.trim()
        });
        if (codeRes.data.token) {
          res = codeRes.data;
        }
      }

      if (!res || !res.token) {
        throw new Error('Authentication failed. No token received from server.');
      }

      // Persist participant session
      localStorage.setItem('debugarena_token', res.token);
      if (res.event?._id) {
        localStorage.setItem('debugarena_active_event_id', res.event._id);
      }

      try {
        localStorage.setItem(
          'debugarena_participant_recovery',
          JSON.stringify({
            regNo: rawIdentifier,
            username: res.user?.username || rawIdentifier,
            eventCode: (eventData?.code || eventCode).trim().toUpperCase()
          })
        );
      } catch {}

      // Update AuthContext session & local state so Candidate Briefing Lobby renders immediately
      setSession(res.token, res.user);
      setAuthenticatedCandidate(res.user);
    } catch (err: any) {
      setSubmitError(
        err.response?.data?.error ||
        err.message ||
        'Authentication failed. Please verify your credentials or contact your test coordinator.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartAssessment = async () => {
    if (!agreedHonorCode) return;
    try {
      await requestKioskFullscreen();
    } catch (e) {
      console.warn('Fullscreen kiosk lockdown bypassed:', e);
    }
    onJoinedSuccess();
  };

  const handleSignOutCandidate = () => {
    try {
      localStorage.removeItem('debugarena_participant_recovery');
      localStorage.removeItem('debugarena_token');
    } catch {}
    logout();
    setAuthenticatedCandidate(null);
    setPassword('');
    setAgreedHonorCode(false);
    setSubmitError(null);
  };

  // Determine active participant
  const candidate = authenticatedCandidate || (user && user.role === 'participant' ? user : null);
  const isCandidateAuthenticated = Boolean(candidate);

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b14] text-slate-200 flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center animate-pulse">
              <Trophy className="w-6 h-6 text-amber-500" />
            </div>
            <div className="absolute -inset-1 border-2 border-amber-500/20 border-t-amber-500 rounded-2xl animate-spin" />
          </div>
          <div className="text-center space-y-1">
            <div className="text-sm font-semibold text-white tracking-wide">Connecting to Assessment Server</div>
            <div className="text-xs font-mono text-slate-400">Verifying Assessment Code {eventCode.toUpperCase()}...</div>
          </div>
        </div>
      </div>
    );
  }

  // Error / Invalid Link Screen
  if (error || !eventData) {
    return (
      <div className="min-h-screen bg-[#070b14] text-slate-200 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full p-8 rounded-3xl bg-[#0d1424] border border-slate-800 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-white tracking-tight">Assessment Not Found</h2>
            <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-left text-xs font-mono text-slate-400 space-y-1">
            <div className="text-[10px] uppercase font-bold text-slate-500">Troubleshooting Checklist</div>
            <div>• Confirm you clicked the exact URL provided by your institution.</div>
            <div>• Verify the event code has not expired or been archived.</div>
          </div>
          <button
            onClick={onBackToHome}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold font-mono transition-all cursor-pointer"
          >
            Return to DebugArena Home
          </button>
        </div>
      </div>
    );
  }

  // Calculated round telemetry for Briefing Lobby
  const rounds: any[] = eventData.rounds || [];
  const totalDurationMinutes = rounds.reduce((acc: number, r: any) => acc + (Number(r.durationMinutes) || 0), 0);
  const totalQuestions = rounds.reduce((acc: number, r: any) => acc + (Number(r.questionCount) || 0), 0);
  const totalMarks = rounds.reduce((acc: number, r: any) => acc + (Number(r.totalMarks) || 0), 0);

  // =========================================================================
  // STATE 2: POST-LOGIN CANDIDATE BRIEFING LOBBY (Amazon OA Style)
  // Revealed ONLY AFTER authentication. Shows round details, timings, rules & checks.
  // =========================================================================
  if (isCandidateAuthenticated && candidate) {
    return (
      <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-amber-500/30">
        {/* Top Assessment Header Bar */}
        <header className="border-b border-slate-800/80 bg-[#0a101d]/90 backdrop-blur-xl px-4 sm:px-8 h-16 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
              <Trophy className="w-4 h-4 text-slate-950" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg text-white tracking-tight">DebugArena</span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-mono font-bold uppercase border border-amber-500/25">
                Assessment Lobby
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            {/* Live Clock & Proctoring indicator */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-[11px]">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>{liveTime}</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="hidden sm:inline">Proctoring Engine Online</span>
              <span className="sm:hidden">Active</span>
            </div>

            {/* Candidate Identity Pill & Sign Out */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="hidden lg:flex flex-col text-right text-[11px]">
                <span className="font-bold text-white">{candidate.name}</span>
                <span className="text-slate-400 text-[10px]">{candidate.regNo || candidate.username}</span>
              </div>
              <button
                type="button"
                onClick={handleSignOutCandidate}
                title="Sign out of this candidate session"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer flex items-center gap-1 text-[11px]"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>

            <ThemeToggle />
          </div>
        </header>

        {/* Main Briefing Container */}
        <main className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-8 space-y-8">
          {/* Hero Welcome Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[#0d1527] to-[#121c35] border border-slate-800 p-6 sm:p-8 shadow-2xl">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Authenticated &amp; Verified Candidate</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Welcome, {candidate.name}
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
                  You are registered for <strong className="text-amber-400">{eventData.name}</strong>. Please review your assessment structure, section timings, and anti-cheat policies before launching the proctored test environment.
                </p>
              </div>

              {/* Assessment Quick Badge */}
              <div className="shrink-0 p-4 rounded-2xl bg-slate-950/60 border border-slate-800 font-mono text-xs space-y-1.5 min-w-[200px]">
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Assessment Details</div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Code:</span>
                  <span className="font-bold text-amber-400 text-sm tracking-wider">{eventData.code}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="font-bold text-emerald-400 uppercase">{eventData.status}</span>
                </div>
                {eventData.college && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
                    <span className="text-slate-500">Institution:</span>
                    <span className="text-slate-300 font-semibold truncate max-w-[120px]" title={eventData.college.name}>
                      {eventData.college.code || eventData.college.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Two-Column Structured Briefing */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Candidate Profile & Pre-Flight Diagnostics & Proctoring Guidelines */}
            <div className="lg:col-span-5 space-y-6">
              {/* Candidate Verification Card */}
              <div className="p-5 sm:p-6 rounded-3xl bg-[#0d1424] border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-amber-400" />
                    <h3 className="font-bold text-white text-sm">Candidate Profile</h3>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    VERIFIED
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-0.5">
                    <span className="text-[10px] text-slate-500 uppercase block">Candidate Name</span>
                    <span className="font-bold text-white truncate block">{candidate.name}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-0.5">
                    <span className="text-[10px] text-slate-500 uppercase block">Roll / Reg No</span>
                    <span className="font-bold text-amber-400 truncate block">{candidate.regNo || candidate.username}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-0.5">
                    <span className="text-[10px] text-slate-500 uppercase block">Username</span>
                    <span className="font-bold text-slate-300 truncate block">{candidate.username}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-0.5">
                    <span className="text-[10px] text-slate-500 uppercase block">Department</span>
                    <span className="font-bold text-slate-300 truncate block">{candidate.department || 'Computer Science'}</span>
                  </div>
                </div>
              </div>

              {/* Pre-Flight System Readiness Check (Amazon OA Style) */}
              <div className="p-5 sm:p-6 rounded-3xl bg-[#0d1424] border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
                  <Laptop className="w-4 h-4 text-amber-400" />
                  <h3 className="font-bold text-white text-sm">System Diagnostics Readiness</h3>
                </div>

                <div className="space-y-2.5 font-mono text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-slate-300">Browser Environment</span>
                    </div>
                    <span className="text-[11px] text-emerald-400 font-bold">Compatible</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-slate-300">Fullscreen Kiosk Lock</span>
                    </div>
                    <span className="text-[11px] text-emerald-400 font-bold">Supported</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-slate-300">Network &amp; WebSocket Link</span>
                    </div>
                    <span className="text-[11px] text-emerald-400 font-bold">Active</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-slate-300">Integrity Telemetry Engine</span>
                    </div>
                    <span className="text-[11px] text-emerald-400 font-bold">Armed</span>
                  </div>
                </div>
              </div>

              {/* Assessment Guidelines & Anti-Cheat Regulations */}
              <div className="p-5 sm:p-6 rounded-3xl bg-[#0d1424] border border-slate-800 shadow-xl space-y-3 font-mono text-xs">
                <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3 font-sans">
                  <Shield className="w-4 h-4 text-rose-400" />
                  <h3 className="font-bold text-white text-sm">Proctoring &amp; Anti-Cheat Policies</h3>
                </div>

                <div className="space-y-2 text-slate-400 text-[11px] leading-relaxed">
                  <div className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">1.</span>
                    <span><strong>Fullscreen Lockdown:</strong> The test must be completed in fullscreen kiosk mode. Minimizing or attempting to exit fullscreen is logged as a strike.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">2.</span>
                    <span><strong>Tab &amp; Window Switching:</strong> Navigating away from the active assessment tab or switching applications triggers automated security alerts.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">3.</span>
                    <span><strong>Clipboard &amp; Shortcuts Restricted:</strong> Copy-pasting, right-click inspection, and developer tools shortcuts are strictly disabled.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">4.</span>
                    <span><strong>Automated Submission:</strong> Each stage has a strict countdown timer. Your progress will be saved and submitted automatically when time expires.</span>
                  </div>
                </div>

                {/* Custom Organizer Rules (if any) */}
                {eventData.rules && eventData.rules.length > 0 && (
                  <div className="pt-2 border-t border-slate-800 space-y-1.5">
                    <div className="text-[11px] font-bold text-white">Event Organizer Instructions:</div>
                    {eventData.rules.map((rule: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-400">
                        <span className="text-amber-400">•</span>
                        <span>{rule}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Assessment Structure & Round Breakdown & Launch Action */}
            <div className="lg:col-span-7 space-y-6">
              {/* Assessment Breakdown Header & Stat Badges */}
              <div className="p-5 sm:p-6 rounded-3xl bg-[#0d1424] border border-slate-800 shadow-xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">Assessment Structure &amp; Stages</h2>
                    <p className="text-xs text-slate-400">Stages must be attempted sequentially within their allotted duration.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 text-xs font-mono font-bold">
                      {rounds.length} {rounds.length === 1 ? 'Stage' : 'Stages'} Total
                    </span>
                  </div>
                </div>

                {/* Summary Metrics Bar */}
                <div className="grid grid-cols-3 gap-3 font-mono text-center">
                  <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-center gap-1 text-slate-500 text-[10px] uppercase font-bold">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>Total Time</span>
                    </div>
                    <div className="text-base sm:text-lg font-black text-amber-400">{totalDurationMinutes} Mins</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-center gap-1 text-slate-500 text-[10px] uppercase font-bold">
                      <HelpCircle className="w-3 h-3 text-indigo-400" />
                      <span>Questions</span>
                    </div>
                    <div className="text-base sm:text-lg font-black text-indigo-400">{totalQuestions} Qs</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-center gap-1 text-slate-500 text-[10px] uppercase font-bold">
                      <Award className="w-3 h-3 text-emerald-400" />
                      <span>Max Marks</span>
                    </div>
                    <div className="text-base sm:text-lg font-black text-emerald-400">{totalMarks} Pts</div>
                  </div>
                </div>

                {/* Dynamic Rounds Cards List */}
                <div className="space-y-3 pt-2">
                  {rounds.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center font-mono text-xs text-slate-500">
                      Assessment rounds are being finalized by the test coordinator.
                    </div>
                  ) : (
                    rounds.map((round: any, index: number) => {
                      const isCoding = round.type === 'coding';
                      return (
                        <div
                          key={round._id || round.roundNumber || index}
                          className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 transition-all space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-400 font-mono font-bold text-[10px] uppercase border border-indigo-500/25">
                                  Stage {round.roundNumber || index + 1}
                                </span>
                                <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase border ${
                                  isCoding
                                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                                }`}>
                                  {isCoding ? 'Live Coding & Debugging' : 'MCQ Assessment'}
                                </span>
                              </div>
                              <h4 className="font-bold text-white text-sm sm:text-base">
                                {round.title}
                              </h4>
                              {round.description && (
                                <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                                  {round.description}
                                </p>
                              )}
                            </div>

                            <div className="text-right shrink-0">
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-xs font-bold">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{round.durationMinutes} Mins</span>
                              </div>
                            </div>
                          </div>

                          {/* Stage Telemetry Badges */}
                          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/60 font-mono text-[11px] text-slate-400">
                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800">
                              <HelpCircle className="w-3 h-3 text-slate-500" />
                              <span>{round.questionCount || 0} Questions</span>
                            </div>
                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800">
                              <Award className="w-3 h-3 text-slate-500" />
                              <span>{round.totalMarks || 0} Marks</span>
                            </div>
                            {round.passingMarks > 0 && (
                              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800">
                                <span>Pass: {round.passingMarks} Marks</span>
                              </div>
                            )}
                            {isCoding && round.allowedLanguages && round.allowedLanguages.length > 0 && (
                              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300">
                                <Code2 className="w-3 h-3 text-amber-400" />
                                <span className="uppercase">{round.allowedLanguages.join(', ')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Honor Code & Assessment Launch Card */}
              <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-[#0d1424] via-[#101b33] to-[#0d1424] border-2 border-amber-500/30 shadow-2xl space-y-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider font-mono">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Candidate Honor Code &amp; Authorization</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Declaration of Academic Integrity
                  </h3>
                </div>

                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="briefingHonorCode"
                    checked={agreedHonorCode}
                    onChange={(e) => setAgreedHonorCode(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-amber-500 text-amber-600 focus:ring-amber-500 cursor-pointer shrink-0"
                  />
                  <label htmlFor="briefingHonorCode" className="cursor-pointer select-none text-xs text-slate-200 leading-relaxed font-sans">
                    I, <strong className="text-white">{candidate.name}</strong>, affirm that I am the registered candidate for Roll No. <strong className="text-amber-400 font-mono">{candidate.regNo || candidate.username}</strong>. I declare that I will complete this online assessment independently, adhering strictly to proctoring policies. I understand that tab switching, window blurring, and external aids will trigger automated strikes and may result in immediate disqualification.
                  </label>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={handleStartAssessment}
                    disabled={!agreedHonorCode}
                    className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm tracking-wide font-mono transition-all flex items-center justify-center gap-3 shadow-xl shadow-amber-500/25 cursor-pointer active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                  >
                    <Maximize2 className="w-5 h-5 text-slate-950" />
                    <span>START PROCTORED ASSESSMENT (ENTER FULLSCREEN LOCKDOWN)</span>
                  </button>
                  <p className="text-[11px] text-center text-slate-400 mt-2 font-mono">
                    Engages browser kiosk lockdown and commences Stage 1 countdown timer.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // =========================================================================
  // STATE 1: PRE-LOGIN OFFICIAL CANDIDATE SIGN-IN (Amazon OA Style)
  // Strict Privacy: Zero round details, zero section timings, zero rules leaked.
  // Self-registration completely removed. Official login only.
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-amber-500/30">
      {/* Official Assessment Portal Top Bar */}
      <header className="border-b border-slate-800/80 bg-[#0a101d]/90 backdrop-blur-xl px-4 sm:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
            <Trophy className="w-4 h-4 text-slate-950" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-black text-lg text-white tracking-tight">DebugArena</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono font-bold uppercase border border-slate-700">
              Online Assessment
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          {/* Real-time UTC/Local Synchronization Clock */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-[11px]">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>{liveTime}</span>
          </div>

          <ThemeToggle />
        </div>
      </header>

      {/* Main Centered Authentication Stage */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md space-y-6">
          {/* Assessment Header Chip (Safe metadata only, no round leakage) */}
          <div className="text-center space-y-2">
            {eventData.college && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 font-mono text-xs font-bold">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>{eventData.college.name} ({eventData.college.code})</span>
              </div>
            )}
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {eventData.name}
            </h1>
            <div className="flex items-center justify-center gap-2 font-mono text-xs">
              <span className="text-slate-500 uppercase text-[10px]">Assessment Code:</span>
              <span className="font-bold text-amber-400 tracking-wider">{eventData.code}</span>
            </div>
          </div>

          {/* Admin warning banner (if an organizer/superadmin is already logged in on this browser) */}
          {user && user.role !== 'participant' && (
            <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-xs font-mono text-indigo-300 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 truncate">
                <Shield className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="truncate">Admin Session: <strong>{user.username}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => logout()}
                className="px-2 py-1 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 text-[10px] font-bold uppercase transition cursor-pointer shrink-0"
              >
                Sign Out
              </button>
            </div>
          )}

          {/* Centered Amazon OA Login Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#0d1424] border border-slate-800 shadow-2xl space-y-5 relative overflow-hidden">
            {/* Ambient subtle glow accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-1 border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Candidate Sign In
                </h2>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enter the assessment credentials provisioned by your institution or test administrator.
              </p>
            </div>

            {submitError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{submitError}</span>
              </div>
            )}

            <form onSubmit={handleDirectLogin} className="space-y-4">
              <div>
                <label className="text-[11px] font-mono font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">
                  Username or Roll / Registration ID *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. suriya or 22CS041"
                    className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">
                  Password / Access Passcode *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your assigned password"
                    className="w-full h-11 pl-10 pr-10 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || !identifier.trim() || !password.trim()}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Authenticating Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Assessment Lobby</span>
                      <ArrowRight className="w-4 h-4 text-slate-950" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};
