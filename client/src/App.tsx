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
import { TournamentWorkspace } from './components/admin/TournamentWorkspace.js';
import { MasterQuestionBank } from './components/admin/MasterQuestionBank.js';
import { OfflineSyncBanner } from './components/common/OfflineSyncBanner.js';
import { EventDirectJoinView } from './components/public/EventDirectJoinView.js';
import { LandingPage } from './components/home/LandingPage.js';
import { AdminAuthModal } from './components/auth/AdminAuthModal.js';
import { VerifySignInView } from './components/auth/VerifySignInView.js';
import { KioskRecoveryPortal } from './components/participant/KioskRecoveryPortal.js';
import { AdminControlEntryView } from './components/admin/AdminControlEntryView.js';
import { useFullscreen } from './hooks/useFullscreen.js';
import { useTimer } from './hooks/useTimer.js';
import { api, startParticipantRound } from './services/api.js';
import { Terminal, Shield, LogIn, Lock, AlertTriangle, Maximize2, RefreshCw, Building2, HelpCircle } from 'lucide-react';

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
  const [adminTab, setAdminTab] = useState<AdminTab>('events');
  const [adminGlobalView, setAdminGlobalView] = useState<'tournaments' | 'question_bank'>('tournaments');
  const [activeEventId, setActiveEventId] = useState<string | null>(() => {
    return localStorage.getItem('debugarena_active_event_id');
  });

  // Private Admin Control Route State (/control/:adminToken or legacy /manage/:adminToken)
  const isControlRoute = currentPath.startsWith('/control/') || currentPath.startsWith('/manage/');
  const adminControlToken = isControlRoute
    ? (currentPath.startsWith('/control/') ? currentPath.split('/control/')[1] : currentPath.split('/manage/')[1])?.trim()
    : null;

  // Participant Portal State
  const [roundState, setRoundState] = useState<any>(null);
  const [portalLoading, setPortalLoading] = useState<boolean>(false);
  const [hasStartedActiveRound, setHasStartedActiveRoundState] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.removeItem('debugarena_active_round_session');
    } catch {}
  }, []);

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

      // Server-Authoritative State:
      // Active assessment shell is armed ONLY if round is active AND participant attempt is in_progress
      if (res.data.round?.status === 'active' && res.data.progress?.status === 'in_progress') {
        setHasStartedActiveRound(true);
      } else {
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
    if (!roundState || roundState.progress?.status !== 'in_progress') return;
    console.log('⏰ Round timer expired. Finalizing submission.');
    try {
      await api.post('/participant/submit-round', {
        roundNumber: roundState.round?.roundNumber || 1
      });
      try {
        localStorage.removeItem('debugarena_participant_recovery');
        localStorage.removeItem('debugarena_active_round_session');
      } catch {}
      await fetchRoundState();
    } catch (e) {
      console.warn('Auto submit failed or already finalized');
    }
  }, [roundState, fetchRoundState]);

  // Server-authoritative timer hook
  const { formattedTime, isUrgent } = useTimer({
    serverRemainingSeconds: roundState?.round?.remainingSeconds || 0,
    deadlineAt: roundState?.progress?.endsAt || roundState?.round?.deadlineAt || null,
    isActive: roundState?.round?.status === 'active' && hasStartedActiveRound && roundState?.progress?.status === 'in_progress',
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

  const [isStartingRound, setIsStartingRound] = useState<boolean>(false);

  const handleStartRoundAssessment = async () => {
    const roundNumber = roundState?.round?.roundNumber || 1;
    setIsStartingRound(true);
    try {
      const res = await startParticipantRound(roundNumber);
      // Synchronize authoritative server attempt timestamps
      setRoundState((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          round: {
            ...prev.round,
            startedAt: res.startedAt,
            deadlineAt: res.endsAt,
            remainingSeconds: res.remainingSeconds
          },
          progress: {
            ...prev.progress,
            status: 'in_progress',
            startedAt: res.startedAt,
            endsAt: res.endsAt,
            canStart: false
          }
        };
      });
      setHasStartedActiveRound(true);
      await requestFullscreen();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to start round. Please try again.');
      setHasStartedActiveRound(false);
    } finally {
      setIsStartingRound(false);
    }
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

    socket.on('round:results_published', () => {
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
      socket.off('round:results_published');
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

  // Private Admin Control Route (/control/:adminToken or legacy /manage/:adminToken)
  if (isControlRoute && adminControlToken) {
    return (
      <AdminControlEntryView
        adminToken={adminControlToken}
        onSuccess={(data) => {
          if (data.event && data.event._id) {
            localStorage.setItem('debugarena_active_event_id', data.event._id);
            setActiveEventId(data.event._id);
          }
          setAdminTab('events');
          window.history.pushState({}, '', '/');
          setCurrentPath('/');
        }}
        onBackToHome={() => {
          window.history.pushState({}, '', '/');
          setCurrentPath('/');
        }}
      />
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
      <div className="min-h-screen bg-[#090d16] flex flex-col relative text-slate-100">
        <Navbar />

        {/* Top-Level Admin Navigation Bar */}
        <div className="bg-slate-950/80 border-b border-slate-800/80 px-4 sm:px-6 py-2 flex items-center justify-between sticky top-16 z-30 backdrop-blur-md">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setAdminGlobalView('tournaments')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
                adminGlobalView === 'tournaments'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'bg-slate-900/90 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Tournaments &amp; Events</span>
            </button>

            <button
              type="button"
              onClick={() => setAdminGlobalView('question_bank')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
                adminGlobalView === 'question_bank'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'bg-slate-900/90 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span>Master Question Bank</span>
            </button>
          </div>

          {adminGlobalView === 'tournaments' && activeEventId && (
            <button
              type="button"
              onClick={() => {
                setActiveEventId(null);
                try {
                  localStorage.removeItem('debugarena_active_event_id');
                } catch {}
              }}
              className="text-[11px] font-mono font-bold text-slate-400 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              ← All Tournaments
            </button>
          )}
        </div>

        <main className="flex-1">
          {adminGlobalView === 'question_bank' ? (
            <MasterQuestionBank />
          ) : activeEventId ? (
            <TournamentWorkspace
              eventId={activeEventId}
              onBack={() => {
                setActiveEventId(null);
                try {
                  localStorage.removeItem('debugarena_active_event_id');
                } catch {}
              }}
              onSwitchEvent={(newEventId) => {
                setActiveEventId(newEventId);
                try {
                  localStorage.setItem('debugarena_active_event_id', newEventId);
                } catch {}
              }}
            />
          ) : (
            <EventManager
              onSelectEvent={(eventId) => {
                setActiveEventId(eventId);
                try {
                  localStorage.setItem('debugarena_active_event_id', eventId);
                } catch {}
              }}
            />
          )}
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
          {(() => {
            // Compute a single mutually-exclusive participant view to prevent duplicate headers/shells
            type ParticipantView = 'concluded' | 'tiebreak' | 'briefing' | 'active_session';

            let participantView: ParticipantView = 'briefing'; // default

            if (roundState?.isTieBreak && roundState?.question) {
              participantView = 'tiebreak';
            } else if (
              !roundState?.isTieBreak && (
                roundState?.isEliminated ||
                roundState?.isWaitingAdvancement ||
                roundState?.isQualifiedWaitingNextRound ||
                roundState?.nextRoundAvailable ||
                roundState?.result ||
                (roundState?.isFinalRound && (currentProgress?.status === 'submitted' || currentProgress?.status === 'expired' || currentProgress?.status === 'advanced')) ||
                currentProgress?.status === 'submitted' ||
                currentProgress?.status === 'expired' ||
                currentProgress?.status === 'advanced' ||
                currentProgress?.status === 'eliminated'
              )
            ) {
              participantView = 'concluded';
            } else if (
              !roundState?.isTieBreak && hasStartedActiveRound &&
              currentProgress?.status !== 'submitted' &&
              currentProgress?.status !== 'expired' &&
              currentProgress?.status !== 'advanced' &&
              currentProgress?.status !== 'eliminated'
            ) {
              participantView = 'active_session';
            } else {
              participantView = 'briefing';
            }

            // 3A. Participant Inactive / Concluded States (terminal result page)
            if (participantView === 'concluded') {
              return (
                <>
                  <Navbar roundTitle={currentRound?.title} roundNumber={currentRound?.roundNumber} />
                  <main className="flex-1 flex items-center justify-center p-4">
                    <RoundSummaryView
                      round={currentRound || ({ roundNumber: 1, title: 'Debug Arena', status: 'completed' } as any)}
                      progress={currentProgress || ({ totalScore: 0, timeTakenSeconds: 0, status: roundState?.isEliminated ? 'eliminated' : (currentProgress?.status || 'submitted') } as any)}
                      onRefresh={fetchRoundState}
                      isEliminated={roundState?.isEliminated}
                      isWaitingAdvancement={roundState?.isWaitingAdvancement}
                      isQualifiedWaitingNextRound={roundState?.isQualifiedWaitingNextRound}
                      nextRoundAvailable={roundState?.nextRoundAvailable}
                      isFinalRound={roundState?.isFinalRound}
                      resultData={roundState?.result}
                      onEnterNextRound={() => {
                        setHasStartedActiveRoundState(false);
                        fetchRoundState();
                      }}
                    />
                  </main>
                </>
              );
            }

            // 3B. Sudden Death Tie-Breaker
            if (participantView === 'tiebreak') {
              return (
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
              );
            }

            // 3E. Active Assessment Shell (MCQ / Coding)
            if (participantView === 'active_session') {
              return (
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
              );
            }

            // 3D. Assessment Briefing (default: before starting active round)
            return (
              <>
                <Navbar roundTitle={currentRound?.title} roundNumber={currentRound?.roundNumber} />
                <main className="flex-1 flex items-center justify-center p-4">
                  {currentRound ? (
                    <InstructionsView
                      round={currentRound}
                      onStartRound={handleStartRoundAssessment}
                      isLoading={isStartingRound}
                    />
                  ) : (
                    <div className="text-center text-slate-400 py-20 text-xs">
                      No active round found. Please wait for the tournament administrator.
                    </div>
                  )}
                </main>
              </>
            );
          })()}
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
