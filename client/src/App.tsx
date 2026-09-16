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
import { EventDirectJoinView } from './components/public/EventDirectJoinView.js';
import { LandingPage } from './components/home/LandingPage.js';
import { AdminAuthModal } from './components/auth/AdminAuthModal.js';
import { VerifySignInView } from './components/auth/VerifySignInView.js';
import { KioskRecoveryPortal } from './components/participant/KioskRecoveryPortal.js';
import { useFullscreen } from './hooks/useFullscreen.js';
import { useTimer } from './hooks/useTimer.js';
import { api, getAdminEventManagement } from './services/api.js';
import { Terminal, Shield, LogIn, Lock, AlertTriangle, Maximize2, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const { user, loading: authLoading, login, logout } = useAuth();
  const { socket } = useRealtime();

  // URL Path State for direct routes
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Login form state
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Admin Dashboard State
  const [adminTab, setAdminTab] = useState<AdminTab>('monitor');

  // Private Admin Management Route State (/manage/:adminToken)
  const isManageRoute = currentPath.startsWith('/manage/');
  const adminManageToken = isManageRoute ? currentPath.split('/manage/')[1]?.trim() : null;
  const [manageError, setManageError] = useState<string | null>(null);
  const [manageLoading, setManageLoading] = useState<boolean>(false);
  const [manageAuthModalOpen, setManageAuthModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isManageRoute && adminManageToken && user && user.role !== 'participant') {
      let isMounted = true;
      setManageLoading(true);
      setManageError(null);
      getAdminEventManagement(adminManageToken)
        .then((data) => {
          if (!isMounted) return;
          if (data.event && data.event._id) {
            localStorage.setItem('debugarena_active_event_id', data.event._id);
          }
          setAdminTab('events');
          window.history.pushState({}, '', '/');
          setCurrentPath('/');
        })
        .catch((err) => {
          if (!isMounted) return;
          setManageError(err.response?.data?.error || 'Invalid or expired tournament management link.');
        })
        .finally(() => {
          if (isMounted) setManageLoading(false);
        });
      return () => {
        isMounted = false;
      };
    }
  }, [isManageRoute, adminManageToken, user]);

  // Participant Portal State
  const [roundState, setRoundState] = useState<any>(null);
  const [portalLoading, setPortalLoading] = useState<boolean>(false);
  const [hasStartedActiveRound, setHasStartedActiveRoundState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('debugarena_active_round_session') === 'true';
    } catch {
      return false;
    }
  });

  const setHasStartedActiveRound = useCallback((val: boolean) => {
    try {
      if (val) {
        localStorage.setItem('debugarena_active_round_session', 'true');
      } else {
        localStorage.removeItem('debugarena_active_round_session');
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

      // Server-Authoritative Crash Recovery: If the round is active and progress status is in_progress,
      // resume automatically regardless of whether browser restarted or computer crashed.
      if (res.data.round?.status === 'active' && res.data.progress?.status === 'in_progress') {
        setHasStartedActiveRound(true);
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
      try {
        localStorage.removeItem('debugarena_participant_recovery');
      } catch {}
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

  // Strict Proctoring Condition (Mathematical Invariant):
  // Proctoring is armed ONLY when:
  // 1. User is authenticated with role 'participant'
  // 2. User is NOT disqualified
  // 3. User has explicitly started the active round
  // 4. Round status is 'active'
  // 5. Round progress status is 'in_progress' (disarmed immediately once submitted/eliminated/advanced)
  // 6. User is not in the middle of submitting round (submission flight protection)
  const isProctoringArmed = Boolean(
    user &&
    user.role === 'participant' &&
    !user.isDisqualified &&
    hasStartedActiveRound &&
    roundState?.round?.status === 'active' &&
    roundState?.progress?.status === 'in_progress' &&
    !isSubmittingRound
  );

  // Handle anti-cheat violation
  const handleViolation = useCallback(
    async (type: 'fullscreen_exit' | 'tab_switch' | 'window_blur' | 'unauthorized_shortcut', details: string) => {
      // Guard: strictly ignore any violations if proctoring is disarmed (e.g. submitted, eliminated, or submitting)
      if (!isProctoringArmed) return;

      // Always show lockout screen to conceal test content; prioritize intentional tab switch / blur
      setCurrentViolationType(prev => {
        if ((prev === 'tab_switch' || prev === 'window_blur') && type === 'fullscreen_exit') {
          return prev;
        }
        return type;
      });
      setCurrentViolationDetails(details);
      setViolationModalOpen(true);

      try {
        const res = await api.post('/participant/log-violation', {
          roundNumber: roundState?.round?.roundNumber || 1,
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
    },
    [isProctoringArmed, roundState, fetchRoundState]
  );

  const { requestFullscreen, isFullscreen } = useFullscreen({
    enabled: isProctoringArmed,
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
      try {
        const rNum = roundState.round?.roundNumber || 1;
        Object.keys(localStorage).forEach(key => {
          if (
            key.startsWith(`debugarena_code_draft_${rNum}`) ||
            key.startsWith(`debugarena_mcq_draft_${rNum}`) ||
            key.startsWith(`debugarena_lang_draft_${rNum}`)
          ) {
            localStorage.removeItem(key);
          }
        });
        localStorage.removeItem('debugarena_participant_recovery');
      } catch {}
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

    socket.on('participant:disqualified', () => {
      if (user?.role === 'participant') {
        setHasStartedActiveRound(false);
        fetchRoundState();
      }
    });

    return () => {
      socket.off('round:started');
      socket.off('round:locked');
      socket.off('round:auto_submitted');
      socket.off('round:advancement_announced');
      socket.off('tiebreak:started');
      socket.off('participant:disqualified');
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

  // Magic Passkey Sign-In Authorization Portal
  const isVerifySignInRoute =
    window.location.pathname.startsWith('/verify-signin') ||
    (new URLSearchParams(window.location.search).has('token') && (window.location.pathname === '/' || window.location.pathname === '/verify-signin'));

  if (isVerifySignInRoute) {
    return (
      <VerifySignInView
        onBackToHome={() => {
          window.location.href = '/';
        }}
      />
    );
  }

  // Public Direct Join Portal (/join/:eventCode, /arena/:eventCode, /event/:eventCode)
  const isJoinRoute =
    currentPath.startsWith('/join/') ||
    currentPath.startsWith('/arena/') ||
    currentPath.startsWith('/event/');

  const directEventCode = isJoinRoute
    ? (currentPath.split('/join/')[1] ||
       currentPath.split('/arena/')[1] ||
       currentPath.split('/event/')[1])?.trim()
    : null;

  if (isJoinRoute && directEventCode) {
    return (
      <EventDirectJoinView
        eventCode={directEventCode}
        onJoinedSuccess={() => {
          window.history.pushState({}, '', '/');
          setCurrentPath('/');
          fetchRoundState();
        }}
        onBackToHome={() => {
          window.history.pushState({}, '', '/');
          setCurrentPath('/');
        }}
      />
    );
  }

  // Private Admin Management Route (/manage/:adminToken)
  if (isManageRoute && adminManageToken) {
    if (user && user.role !== 'participant') {
      if (manageLoading) {
        return (
          <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-4">
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Verifying Management Authorization</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Connecting to tournament control center and establishing event workspace...
                </p>
              </div>
            </div>
          </div>
        );
      }

      if (manageError) {
        return (
          <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-4">
            <div className="bg-[#0f172a] border border-rose-500/30 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Management Access Denied</h2>
                <p className="text-sm text-rose-300 mt-1 font-mono bg-rose-950/40 p-2 rounded border border-rose-900/50">
                  {manageError}
                </p>
              </div>
              <p className="text-xs text-slate-400">
                Only authorized organizers of this event or super-administrators may access this tournament workspace.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    logout();
                    setManageAuthModalOpen(true);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
                >
                  Switch Account
                </button>
                <button
                  onClick={() => {
                    window.history.pushState({}, '', '/');
                    setCurrentPath('/');
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/30"
                >
                  Return to Home
                </button>
              </div>
              <AdminAuthModal
                isOpen={manageAuthModalOpen}
                onClose={() => setManageAuthModalOpen(false)}
              />
            </div>
          </div>
        );
      }
    }

    if (user && user.role === 'participant') {
      return (
        <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-amber-500/30 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Administrative Access Required</h2>
              <p className="text-sm text-slate-400 mt-1">
                You are currently signed in with a participant account (<span className="text-amber-300 font-mono">{user.username}</span>). Contestants cannot access administrative links.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  logout();
                  setManageAuthModalOpen(true);
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 transition shadow-lg shadow-amber-600/30"
              >
                Sign Out & Log In as Admin
              </button>
              <button
                onClick={() => {
                  window.history.pushState({}, '', '/');
                  setCurrentPath('/');
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition"
              >
                Return to Participant Portal
              </button>
            </div>
            <AdminAuthModal
              isOpen={manageAuthModalOpen}
              onClose={() => setManageAuthModalOpen(false)}
            />
          </div>
        </div>
      );
    }

    // Unauthenticated user with an admin manage link
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-4 relative">
        <div className="bg-[#0f172a] border border-indigo-500/30 rounded-2xl p-8 max-w-md w-full text-center space-y-5 shadow-2xl relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Private Tournament Administration</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              This link contains a cryptographically protected management token for tournament organizers. Sign in with your administrator credentials to open the event control center.
            </p>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/80 text-left space-y-1">
            <span className="text-[10px] uppercase font-mono font-bold text-slate-500 tracking-wider">Access Scope</span>
            <p className="text-xs text-slate-300">
              Only the organizer who created this event or super-administrators are permitted to manage this tournament.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <button
              onClick={() => setManageAuthModalOpen(true)}
              className="w-full py-3 px-4 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Sign In as Administrator
            </button>
            <button
              onClick={() => {
                window.history.pushState({}, '', '/');
                setCurrentPath('/');
              }}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-transparent hover:bg-slate-800/50 transition"
            >
              Return to Homepage
            </button>
          </div>
        </div>

        <AdminAuthModal
          isOpen={manageAuthModalOpen}
          onClose={() => setManageAuthModalOpen(false)}
        />
      </div>
    );
  }

  // 1. Unauthenticated Public Landing Page (or Kiosk Recovery if active session was interrupted)
  if (!user) {
    const rawRecovery = localStorage.getItem('debugarena_participant_recovery');
    if (rawRecovery) {
      try {
        const recoveryData = JSON.parse(rawRecovery);
        if (recoveryData && (recoveryData.regNo || recoveryData.username)) {
          return (
            <KioskRecoveryPortal
              recoveryData={recoveryData}
              onResumeSuccess={() => {
                fetchRoundState();
              }}
              onSwitchUser={() => {
                localStorage.removeItem('debugarena_participant_recovery');
                window.location.reload();
              }}
            />
          );
        }
      } catch (e) {
        localStorage.removeItem('debugarena_participant_recovery');
      }
    }
    return <LandingPage />;
  }

  if (user.role !== 'participant') {
    const isNeedsOnboarding = Boolean(user.needsOnboarding || !user.collegeId);
    return (
      <div className="min-h-screen bg-[#090d16] flex flex-col relative">
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

        {/* Persistent Onboarding Modal for Admins without assigned College/University */}
        {isNeedsOnboarding && (
          <AdminAuthModal
            isOpen={true}
            onClose={() => {}}
            initialStep="onboarding"
            forcedOnboarding={true}
          />
        )}
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

      {/* When outside fullscreen during active armed proctoring: conceal assessment content and provide re-entry button */}
      {isProctoringArmed && !isFullscreen ? (
        <div className="flex-1 flex items-center justify-center p-6 text-center z-10">
          <div className="max-w-md p-8 rounded-3xl bg-slate-900/95 border border-rose-500/50 backdrop-blur-xl text-slate-300 text-sm shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto mb-4 text-rose-400">
              <Lock className="w-6 h-6" />
            </div>
            <div className="text-rose-400 font-bold text-base mb-2">🔒 Assessment Content Concealed</div>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Assessment questions and code editors are hidden while outside full-screen mode. Click below to return to your assessment.
            </p>
            <button
              onClick={requestFullscreen}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              <Maximize2 className="w-4 h-4" />
              Return to Full-Screen Assessment
            </button>
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
        isOpen={isProctoringArmed && (violationModalOpen || !isFullscreen)}
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
