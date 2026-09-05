import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext.js';
import { useRealtime } from './context/SocketContext.js';
import { Navbar } from './components/common/Navbar.js';
import { ViolationModal } from './components/common/ViolationModal.js';
import { SecurityWatermark } from './components/common/SecurityWatermark.js';
import { InstructionsView } from './components/participant/InstructionsView.js';
import { McqShell } from './components/participant/McqShell.js';
import { CodingShell } from './components/participant/CodingShell.js';
import { TieBreakShell } from './components/participant/TieBreakShell.js';
import { RoundSummaryView } from './components/participant/RoundSummaryView.js';
import { AdminNav, AdminTab } from './components/admin/AdminNav.js';
import { LiveMonitor } from './components/admin/LiveMonitor.js';
import { CompetitionControl } from './components/admin/CompetitionControl.js';
import { RoundResultsView } from './components/admin/RoundResultsView.js';
import { ParticipantManager } from './components/admin/ParticipantManager.js';
import { QuestionManager } from './components/admin/QuestionManager.js';
import { TieBreakManager } from './components/admin/TieBreakManager.js';
import { LeaderboardView } from './components/admin/LeaderboardView.js';
import { EventManager } from './components/admin/EventManager.js';
import { OfflineSyncBanner } from './components/common/OfflineSyncBanner.js';
import { CertificateVerifyView } from './components/public/CertificateVerifyView.js';
import { useFullscreen } from './hooks/useFullscreen.js';
import { useTimer } from './hooks/useTimer.js';
import { api } from './services/api.js';
import { Terminal, Shield, LogIn, Lock, AlertTriangle, Maximize2 } from 'lucide-react';

export const App: React.FC = () => {
  const { user, loading: authLoading, login } = useAuth();
  const { socket } = useRealtime();

  // Login form state
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Admin Dashboard State
  const [adminTab, setAdminTab] = useState<AdminTab>('monitor');

  // Participant Portal State
  const [roundState, setRoundState] = useState<any>(null);
  const [portalLoading, setPortalLoading] = useState<boolean>(false);
  const [hasStartedActiveRound, setHasStartedActiveRoundState] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('debugarena_active_round_session') === 'true';
    } catch {
      return false;
    }
  });

  const setHasStartedActiveRound = useCallback((val: boolean) => {
    try {
      if (val) {
        sessionStorage.setItem('debugarena_active_round_session', 'true');
      } else {
        sessionStorage.removeItem('debugarena_active_round_session');
      }
    } catch {}
    setHasStartedActiveRoundState(val);
  }, []);
  const [isSubmittingRound, setIsSubmittingRound] = useState<boolean>(false);

  // Anti-Cheat & Violation Modal State
  const [violationModalOpen, setViolationModalOpen] = useState<boolean>(false);
  const [currentViolationType, setCurrentViolationType] = useState<string>('');
  const [currentViolationDetails, setCurrentViolationDetails] = useState<string>('');
  const [violationCount, setViolationCount] = useState<number>(0);
  const violationLimit = roundState?.competition?.violationLimit || 3;

  // Fetch participant round state
  const fetchRoundState = useCallback(async () => {
    if (!user || user.role !== 'participant') return;
    try {
      setPortalLoading(true);
      const res = await api.get('/participant/round-state');
      setRoundState(res.data);
      setViolationCount(res.data.progress?.violationCount || 0);

      // If participant is in an active round, ensure session resume
      if (res.data.round?.status === 'active' && res.data.progress?.status === 'in_progress') {
        const stored = sessionStorage.getItem('debugarena_active_round_session');
        if (stored === 'true' || res.data.progress?.startedAt) {
          setHasStartedActiveRound(true);
        }
      }
      if (
        res.data.progress?.status === 'submitted' ||
        res.data.progress?.status === 'eliminated' ||
        res.data.progress?.status === 'advanced'
      ) {
        setHasStartedActiveRound(false);
      }
    } catch (err: any) {
      if (err.response?.status === 403) {
        setRoundState({
          isEliminated: err.response.data.status === 'eliminated',
          isWaitingAdvancement: err.response.data.status === 'waiting_advancement',
          errorMessage: err.response.data.error
        });
        setHasStartedActiveRound(false);
      }
    } finally {
      setPortalLoading(false);
    }
  }, [user, setHasStartedActiveRound]);

  useEffect(() => {
    if (user && user.role === 'participant') {
      fetchRoundState();
    }
  }, [user, fetchRoundState]);

  // Handle participant auto-submit on timer expiry
  const handleTimerExpire = useCallback(async () => {
    if (!roundState || roundState.progress?.status === 'submitted') return;
    console.log('⏰ Round timer expired. Finalizing submission.');
    try {
      await api.post('/participant/submit-round', {
        roundNumber: roundState.round?.roundNumber || 1
      });
      await fetchRoundState();
    } catch (e) {
      console.warn('Auto submit failed or already finalized');
    }
  }, [roundState, fetchRoundState]);

  // Server-authoritative timer hook
  const { formattedTime, isUrgent } = useTimer({
    serverRemainingSeconds: roundState?.round?.remainingSeconds || 0,
    isActive: roundState?.round?.status === 'active' && hasStartedActiveRound,
    onExpire: handleTimerExpire
  });

  // Handle anti-cheat violation
  const handleViolation = useCallback(
    async (type: 'fullscreen_exit' | 'tab_switch' | 'window_blur' | 'unauthorized_shortcut', details: string) => {
      // Always show lockout screen to conceal test content; prioritize intentional tab switch / blur
      setCurrentViolationType(prev => {
        if ((prev === 'tab_switch' || prev === 'window_blur') && type === 'fullscreen_exit') {
          return prev;
        }
        return type;
      });
      setCurrentViolationDetails(details);
      setViolationModalOpen(true);

      // Only increment strikes on server if participant is actively in-progress
      if (
        user &&
        user.role === 'participant' &&
        hasStartedActiveRound &&
        roundState?.round?.status === 'active' &&
        roundState?.progress?.status !== 'submitted'
      ) {
        try {
          const res = await api.post('/participant/log-violation', {
            roundNumber: roundState.round?.roundNumber || 1,
            type,
            details
          });
          setViolationCount(res.data.violationCount);
          if (res.data.autoSubmitted) {
            await fetchRoundState();
          }
        } catch (err) {
          console.warn('Failed to log violation on server');
        }
      }
    },
    [user, hasStartedActiveRound, roundState, fetchRoundState]
  );

  // Continuous Fullscreen manager: strictly enforced for unauthenticated portal and participant accounts
  const isParticipantSession = !user || user.role === 'participant';
  const { requestFullscreen, isFullscreen } = useFullscreen({
    enabled: isParticipantSession,
    onViolation: handleViolation
  });

  const handleStartRoundAssessment = async () => {
    await requestFullscreen();
    setHasStartedActiveRound(true);
  };

  const handleResumeFullscreen = async () => {
    setViolationModalOpen(false);
    await requestFullscreen();
  };

  const handleSubmitRoundExplicitly = useCallback(async () => {
    if (!roundState) return;
    setIsSubmittingRound(true);
    try {
      await api.post('/participant/submit-round', {
        roundNumber: roundState.round?.roundNumber || 1
      });
      setHasStartedActiveRound(false);
      await fetchRoundState();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit round');
    } finally {
      setIsSubmittingRound(false);
    }
  }, [roundState, fetchRoundState, setHasStartedActiveRound]);

  // Socket event listeners for live updates
  useEffect(() => {
    if (!socket) return;

    socket.on('round:started', () => {
      if (user?.role === 'participant') fetchRoundState();
    });

    socket.on('round:locked', () => {
      if (user?.role === 'participant') fetchRoundState();
    });

    socket.on('round:auto_submitted', () => {
      if (user?.role === 'participant') fetchRoundState();
    });

    socket.on('round:advancement_announced', () => {
      if (user?.role === 'participant') fetchRoundState();
    });

    socket.on('tiebreak:started', () => {
      if (user?.role === 'participant') fetchRoundState();
    });

    return () => {
      socket.off('round:started');
      socket.off('round:locked');
      socket.off('round:auto_submitted');
      socket.off('round:advancement_announced');
      socket.off('tiebreak:started');
    };
  }, [socket, user, fetchRoundState]);

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      await requestFullscreen();
      await login(username, password);
    } catch (err: any) {
      setLoginError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const fillCredentials = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <span className="text-xs font-mono text-slate-400">Loading DebugArena...</span>
        </div>
      </div>
    );
  }

  // Public Unauthenticated Certificate Verification Portal
  const isVerifyRoute = window.location.pathname.startsWith('/verify-cert/');
  const verifyCertId = isVerifyRoute ? window.location.pathname.split('/verify-cert/')[1]?.trim() : null;

  if (isVerifyRoute && verifyCertId) {
    return (
      <CertificateVerifyView
        certificateId={verifyCertId}
        onBack={() => {
          window.location.href = '/';
        }}
      />
    );
  }

  // 1. Unauthenticated Login Screen with Full-Screen Lockdown Gate
  if (!user) {
    // If not in fullscreen, present the mandatory entry gate
    if (!isFullscreen) {
      return (
        <div className="min-h-screen bg-[#070b13] flex flex-col items-center justify-center p-6 text-center select-none relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-lg w-full rounded-3xl bg-slate-900/95 border-2 border-indigo-500/40 p-8 sm:p-10 shadow-2xl backdrop-blur-xl">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center mx-auto mb-5 text-indigo-400">
              <Shield className="w-8 h-8" />
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3">
              <Lock className="w-3.5 h-3.5" />
              <span>OA Proctoring Environment</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
              DebugArena Challenge Portal
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mb-8 leading-relaxed">
              This online competition operates under continuous full-screen lockdown from start to end. You must enter full-screen mode to proceed to sign in.
            </p>

            <button
              onClick={requestFullscreen}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl shadow-indigo-600/30 transition-all cursor-pointer active:scale-[0.98]"
            >
              <Maximize2 className="w-5 h-5" />
              <span>Enter Full-Screen to Sign In</span>
            </button>
          </div>
        </div>
      );
    }

    // Inside Fullscreen: Login Form
    return (
      <div className="min-h-screen bg-[#090d16] flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
        <header className="h-16 px-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-md">
              <Terminal className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-white">DebugArena</span>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Lock className="w-3 h-3" />
            <span>Proctoring Locked (Full-Screen)</span>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-8 shadow-2xl backdrop-blur-md">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-extrabold text-white tracking-tight">
                  Sign In to Assessment
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Enter your assigned participant or administrator credentials
                </p>
              </div>

              {loginError && (
                <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Username / Team ID
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="e.g. team1 or admin"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 outline-none transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Security Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 outline-none transition-all font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold tracking-wide uppercase flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50 mt-2"
                >
                  {isLoggingIn ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                  <span>Authenticate & Enter</span>
                </button>
              </form>

              {/* Demo Quick-Fill Helpers */}
              <div className="mt-8 pt-6 border-t border-slate-800/80">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 text-center">
                  Quick Demo Logins
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => fillCredentials('admin', 'admin123')}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-left transition-all cursor-pointer"
                  >
                    <div className="text-xs font-bold text-amber-400 flex items-center gap-1">
                      <Shield className="w-3 h-3" /> Admin
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">admin / admin123</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => fillCredentials('team1', 'debug123')}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-left transition-all cursor-pointer"
                  >
                    <div className="text-xs font-bold text-indigo-400 flex items-center gap-1">
                      <Terminal className="w-3 h-3" /> Participant
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">team1 / debug123</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="py-4 text-center text-xs text-slate-600 font-mono">
          DebugArena Timed Code Assessment & Debugging Engine © 2026
        </footer>
      </div>
    );
  }

  // 2. Admin Dashboard Application (Available to all admin roles)
  if (user.role !== 'participant') {
    return (
      <div className="min-h-screen bg-[#090d16] flex flex-col">
        <Navbar />
        <AdminNav activeTab={adminTab} onTabChange={setAdminTab} />
        <main className="flex-1">
          {adminTab === 'events' && <EventManager />}
          {adminTab === 'monitor' && <LiveMonitor />}
          {adminTab === 'control' && <CompetitionControl />}
          {adminTab === 'results' && <RoundResultsView />}
          {adminTab === 'participants' && <ParticipantManager />}
          {adminTab === 'questions' && <QuestionManager />}
          {adminTab === 'tiebreak' && <TieBreakManager />}
          {adminTab === 'leaderboard' && <LeaderboardView />}
        </main>
      </div>
    );
  }

  // 3. Participant Portal Application (Locked in full-screen from start to end)
  if (portalLoading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center text-slate-400 text-xs font-mono">
        Connecting to test server...
      </div>
    );
  }

  const currentRound = roundState?.round;
  const currentProgress = roundState?.progress;

  return (
    <div className="min-h-screen bg-[#090d16] flex flex-col select-none relative overflow-hidden">
      {user && <SecurityWatermark username={user.username} />}
      <OfflineSyncBanner />

      {/* When outside fullscreen: conceal all assessment content */}
      {!isFullscreen ? (
        <div className="flex-1 flex items-center justify-center p-6 text-center z-10">
          <div className="max-w-md p-8 rounded-3xl bg-slate-900/90 border border-rose-500/40 backdrop-blur-xl text-slate-300 text-sm shadow-2xl">
            <div className="text-rose-400 font-bold text-base mb-2">🔒 Assessment Content Concealed</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Assessment questions and test controls are hidden while outside full-screen mode.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* 3A. Participant Eliminated or Waiting for Admin Advancement */}
          {(roundState?.isEliminated || roundState?.isWaitingAdvancement) && (
            <>
              <Navbar />
              <main className="flex-1 flex items-center justify-center p-4">
                <RoundSummaryView
                  round={{ roundNumber: 1, title: 'DebugArena', status: 'completed' } as any}
                  progress={{ totalScore: 0, timeTakenSeconds: 0, status: 'eliminated' } as any}
                  onRefresh={fetchRoundState}
                  isEliminated={roundState.isEliminated}
                  isWaitingAdvancement={roundState.isWaitingAdvancement}
                />
              </main>
            </>
          )}

          {/* 3B. Sudden Death Tie-Breaker */}
          {roundState?.isTieBreak && roundState?.question && (
            <>
              <Navbar roundTitle="Sudden-Death Tie-Breaker" />
              <main className="flex-1">
                <TieBreakShell
                  question={roundState.question}
                  attempt={roundState.attempt}
                  tieBreakId={roundState.tieBreakId}
                  onCompleted={fetchRoundState}
                />
              </main>
            </>
          )}

          {/* 3C. Round Submitted -> Shows "Submitted Successfully" */}
          {!roundState?.isTieBreak && (currentProgress?.status === 'submitted' || currentProgress?.status === 'advanced') && (
            <>
              <Navbar roundTitle={currentRound?.title} roundNumber={currentRound?.roundNumber} />
              <main className="flex-1 flex items-center justify-center p-4">
                <RoundSummaryView
                  round={currentRound}
                  progress={currentProgress}
                  onRefresh={fetchRoundState}
                />
              </main>
            </>
          )}

          {/* 3D. Assessment Briefing (Before starting active round) */}
          {!roundState?.isTieBreak && currentProgress?.status !== 'submitted' && currentProgress?.status !== 'advanced' && !hasStartedActiveRound && (
            <>
              <Navbar roundTitle={currentRound?.title} roundNumber={currentRound?.roundNumber} />
              <main className="flex-1 flex items-center justify-center p-4">
                {currentRound ? (
                  <InstructionsView
                    round={currentRound}
                    onStartRound={handleStartRoundAssessment}
                  />
                ) : (
                  <div className="text-center text-slate-400 py-20 text-xs">
                    No active round found. Please wait for the tournament administrator.
                  </div>
                )}
              </main>
            </>
          )}

          {/* 3E. Active Assessment Shell (MCQ / Coding) */}
          {!roundState?.isTieBreak && currentProgress?.status !== 'submitted' && currentProgress?.status !== 'advanced' && hasStartedActiveRound && (
            <>
              <Navbar
                roundTitle={currentRound?.title}
                roundNumber={currentRound?.roundNumber}
                timerFormatted={formattedTime}
                isTimerUrgent={isUrgent}
                proctoringMode={true}
                violationCount={violationCount}
                violationLimit={violationLimit}
              />
              <main className="flex-1 relative z-10">
                {currentRound?.type === 'mcq' ? (
                  <McqShell
                    questions={roundState.questions || []}
                    roundNumber={currentRound.roundNumber}
                    initialAttempts={roundState.attempts || []}
                    initialMarkedForReview={currentProgress?.markedForReview || []}
                    onSubmitRound={handleSubmitRoundExplicitly}
                    isSubmitting={isSubmittingRound}
                  />
                ) : (
                  <CodingShell
                    questions={roundState.questions || []}
                    roundNumber={currentRound.roundNumber}
                    initialAttempts={roundState.attempts || []}
                    onSubmitRound={handleSubmitRoundExplicitly}
                    isSubmittingRound={isSubmittingRound}
                  />
                )}
              </main>
            </>
          )}
        </>
      )}

      {/* Global Security Violation & Fullscreen Lockout Modal with 8s Grace Window */}
      <ViolationModal
        isOpen={(violationModalOpen || !isFullscreen) && currentProgress?.status !== 'submitted' && currentProgress?.status !== 'advanced'}
        violationCount={violationCount}
        violationLimit={violationLimit}
        type={currentViolationType || 'fullscreen_exit'}
        details={currentViolationDetails || 'You must be in true full-screen mode to access this assessment.'}
        onResumeFullscreen={handleResumeFullscreen}
        onTimeoutAutoSubmit={handleSubmitRoundExplicitly}
        gracePeriodSeconds={8}
      />
    </div>
  );
};
