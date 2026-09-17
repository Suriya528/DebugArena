import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Users,
  HelpCircle,
  Activity,
  Trophy,
  Play,
  Lock,
  Unlock,
  Copy,
  Check,
  QrCode,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Award,
  Sparkles,
  Sliders,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Flame,
  Radio,
  Split,
  Eye
} from 'lucide-react';
import { Event, DynamicRound } from '../../types/index.js';
import {
  getEventDetails,
  regenerateAdminLink,
  validateEventSetup,
  startEvent,
  freezeEvent,
  unfreezeEvent,
  startDynamicRound,
  api
} from '../../services/api.js';
import { ParticipantManager } from './ParticipantManager.js';
import { QuestionManager } from './QuestionManager.js';
import { LiveMonitor } from './LiveMonitor.js';
import { LeaderboardView } from './LeaderboardView.js';
import { RoundResultsView } from './RoundResultsView.js';
import { TieBreakManager } from './TieBreakManager.js';
import { ProjectorQrModal } from './ProjectorQrModal.js';
import { AdminTestSandboxModal } from './AdminTestSandboxModal.js';
import { PreEventCheckModal } from './PreEventCheckModal.js';

export type TournamentTab = 'overview' | 'participants' | 'questions' | 'control' | 'leaderboard';

interface TournamentWorkspaceProps {
  eventId: string;
  onBack: () => void;
}

export const TournamentWorkspace: React.FC<TournamentWorkspaceProps> = ({ eventId, onBack }) => {
  const [activeTab, setActiveTab] = useState<TournamentTab>('overview');
  const [event, setEvent] = useState<Event | null>(null);
  const [rounds, setRounds] = useState<DynamicRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Link copy states
  const [copiedParticipantLink, setCopiedParticipantLink] = useState(false);
  const [copiedAdminLink, setCopiedAdminLink] = useState(false);

  // Modals
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isSandboxModalOpen, setIsSandboxModalOpen] = useState(false);
  const [isPreCheckModalOpen, setIsPreCheckModalOpen] = useState(false);
  const [isRegeneratingAdmin, setIsRegeneratingAdmin] = useState(false);
  const [isValidatingSetup, setIsValidatingSetup] = useState(false);
  const [validationResult, setValidationResult] = useState<any | null>(null);
  const [isStartingEvent, setIsStartingEvent] = useState(false);

  // Unfreeze modal state
  const [showUnfreezeModal, setShowUnfreezeModal] = useState(false);
  const [unfreezeReason, setUnfreezeReason] = useState('');

  // Leaderboard subview state
  const [leaderboardSubView, setLeaderboardSubView] = useState<'standings' | 'advance' | 'tiebreak'>('standings');

  const fetchWorkspaceData = async () => {
    try {
      setLoading(true);
      setError(null);
      const details = await getEventDetails(eventId);
      setEvent(details.event);
      setRounds(details.rounds || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load tournament data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      fetchWorkspaceData();
    }
  }, [eventId]);

  const participantJoinUrl = event
    ? `${window.location.origin}/join/${event.participantToken || event.code}`
    : '';

  const adminManageUrl = event?.adminLink
    ? `${window.location.origin}${event.adminLink}`
    : '';

  const handleCopyParticipantLink = () => {
    if (!participantJoinUrl) return;
    navigator.clipboard.writeText(participantJoinUrl);
    setCopiedParticipantLink(true);
    setTimeout(() => setCopiedParticipantLink(false), 2500);
  };

  const handleCopyAdminLink = () => {
    if (!adminManageUrl) return;
    navigator.clipboard.writeText(adminManageUrl);
    setCopiedAdminLink(true);
    setTimeout(() => setCopiedAdminLink(false), 2500);
  };

  const handleRegenerateAdmin = async () => {
    if (!event) return;
    if (
      !window.confirm(
        'Revoke and regenerate the private Admin Management Link? Any administrators using the previous admin link will need the new link. Participant links will remain unchanged.'
      )
    ) {
      return;
    }
    try {
      setIsRegeneratingAdmin(true);
      const res = await regenerateAdminLink(event._id);
      setEvent(prev => (prev ? { ...prev, adminLink: res.adminLink } : prev));
      alert('Admin management link successfully regenerated! Please copy and bookmark the new link.');
      fetchWorkspaceData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to regenerate admin link');
    } finally {
      setIsRegeneratingAdmin(false);
    }
  };

  const handleValidateSetup = async () => {
    if (!event) return;
    try {
      setIsValidatingSetup(true);
      const res = await validateEventSetup(event._id);
      setValidationResult(res);
      fetchWorkspaceData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to validate setup');
    } finally {
      setIsValidatingSetup(false);
    }
  };

  const handleStartEvent = async () => {
    if (!event) return;
    if (
      !window.confirm(
        `Start the tournament "${event.name}" and begin the live timer now? Eligible participants will immediately receive Round 1 challenges.`
      )
    ) {
      return;
    }
    try {
      setIsStartingEvent(true);
      await startEvent(event._id);
      alert(`Tournament "${event.name}" is now LIVE!`);
      fetchWorkspaceData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to start tournament');
    } finally {
      setIsStartingEvent(false);
    }
  };

  const handleToggleFreeze = async () => {
    if (!event) return;
    if (event.status === 'frozen') {
      setShowUnfreezeModal(true);
    } else {
      if (
        window.confirm(
          'Freeze this tournament? Structural edits to questions and rounds will be strictly locked.'
        )
      ) {
        try {
          await freezeEvent(event._id);
          fetchWorkspaceData();
        } catch (err: any) {
          alert(err.response?.data?.error || 'Failed to freeze tournament');
        }
      }
    }
  };

  const handleConfirmUnfreeze = async () => {
    if (!unfreezeReason.trim()) {
      alert('An explicit audit rationale is required to unfreeze an active event');
      return;
    }
    try {
      await unfreezeEvent(event!._id, unfreezeReason.trim());
      setShowUnfreezeModal(false);
      setUnfreezeReason('');
      fetchWorkspaceData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to unfreeze event');
    }
  };

  const handleToggleCertificates = async () => {
    if (!event) return;
    const isCurrentlyEnabled = event.certificateConfig?.enabled === true;
    const confirmMsg = isCurrentlyEnabled
      ? `Disable certificates for "${event.name}"?`
      : `Activate certificate issuance for "${event.name}"? Winners can receive QR-verifiable credentials.`;

    if (window.confirm(confirmMsg)) {
      try {
        await api.patch(`/admin/events/${event._id}/toggle-certificates`, {
          enabled: !isCurrentlyEnabled
        });
        await fetchWorkspaceData();
      } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to toggle certificates');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center font-mono text-xs text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <span>Opening Tournament Workspace...</span>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4 shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Failed to Load Tournament</h2>
        <p className="text-xs text-slate-400 font-mono">{error || 'Event not found'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold font-mono transition-all"
        >
          &larr; Return to Tournaments Hub
        </button>
      </div>
    );
  }

  const navTabs = [
    { id: 'overview' as TournamentTab, label: 'Overview & Settings', icon: Building2 },
    { id: 'participants' as TournamentTab, label: 'Participants', icon: Users },
    { id: 'questions' as TournamentTab, label: 'Rounds & Questions', icon: HelpCircle },
    { id: 'control' as TournamentTab, label: 'Live Control Room', icon: Activity, badge: event.status === 'live' },
    { id: 'leaderboard' as TournamentTab, label: 'Leaderboard & Results', icon: Trophy }
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 animate-in fade-in duration-200 text-left">
      {/* Top Header & Breadcrumb Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            {/* Breadcrumb back to all tournaments */}
            <div className="flex items-center gap-2">
              <button
                onClick={onBack}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold font-mono transition-all cursor-pointer border border-slate-700/60"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>All Tournaments</span>
              </button>
              <span className="text-slate-600 font-mono text-xs">/</span>
              <span className="text-xs font-mono font-bold text-indigo-400">
                {event.code}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  event.status === 'live'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                    : event.status === 'ready'
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : event.status === 'frozen'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {event.status}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {event.name}
            </h1>
            <p className="text-xs text-slate-400 line-clamp-1">
              {event.description || 'Institutional competition workspace'}
            </p>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsQrModalOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold font-mono flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Project high-contrast QR code for students"
            >
              <QrCode className="w-4 h-4 text-amber-400" />
              <span>Projector QR</span>
            </button>

            <button
              onClick={() => setIsSandboxModalOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold font-mono flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Dry-run questions and test cases safely"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Dry-Run Sandbox</span>
            </button>

            {event.status !== 'live' && event.status !== 'completed' && event.status !== 'finalized' && (
              <button
                onClick={handleStartEvent}
                disabled={isStartingEvent}
                className="px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black font-mono flex items-center gap-1.5 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isStartingEvent ? 'Starting...' : 'GO LIVE (Start Event)'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Permanent Participant Join URL Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
          <div className="flex items-center gap-2 text-xs font-mono min-w-0">
            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-bold text-[10px] uppercase shrink-0">
              Contestant Join URL
            </span>
            <span className="text-slate-300 truncate select-all font-semibold">
              {participantJoinUrl}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyParticipantLink}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                copiedParticipantLink
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {copiedParticipantLink ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Join Link</span>
                </>
              )}
            </button>

            <a
              href={participantJoinUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
              title="Open Join Page in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* 5 Focused Navigation Tabs Inside the Event */}
        <div className="flex space-x-2 overflow-x-auto scrollbar-none pt-2 border-t border-slate-800/80">
          {navTabs.map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                    : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
                {t.badge && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Overview & Settings */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Quick Metrics */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-500">
                Competition Stages
              </span>
              <div className="text-2xl font-black text-white">{rounds.length} Dynamic Rounds</div>
              <p className="text-xs text-slate-400">
                Configured with automatic timer transitions
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-500">
                Anti-Cheat Strike Limit
              </span>
              <div className="text-2xl font-black text-amber-400">
                {event.scoringConfig?.violationLimit || 3} Strikes Allowed
              </div>
              <p className="text-xs text-slate-400">
                Auto-submits when contestant exceeds limit
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-500">
                QR Credentials
              </span>
              <div className="text-2xl font-black text-emerald-400">
                {event.certificateConfig?.enabled ? 'Active' : 'Disabled'}
              </div>
              <p className="text-xs text-slate-400">
                Official certificates with public verification
              </p>
            </div>
          </div>

          {/* Access Links & Pre-Event Diagnostics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Private Admin Management Token */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">Private Admin Management Link</h3>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                  Organizers Only
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                This link grants administrative control to this tournament. Bookmark this URL or regenerate if leaked.
              </p>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 truncate select-all">
                {adminManageUrl || 'Admin link generated'}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCopyAdminLink}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
                >
                  {copiedAdminLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAdminLink ? 'Admin Link Copied' : 'Copy Admin Link'}</span>
                </button>
                <button
                  onClick={handleRegenerateAdmin}
                  disabled={isRegeneratingAdmin}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingAdmin ? 'animate-spin' : ''}`} />
                  <span>Regenerate Admin Link</span>
                </button>
              </div>
            </div>

            {/* Pre-Event Diagnostics Checklist */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Pre-Event System Readiness</h3>
                </div>
                <button
                  onClick={handleValidateSetup}
                  disabled={isValidatingSetup}
                  className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
                >
                  <RefreshCw className={`w-3 h-3 ${isValidatingSetup ? 'animate-spin text-cyan-400' : ''}`} />
                  <span>Run Diagnostics</span>
                </button>
              </div>

              {validationResult ? (
                <div className="space-y-3">
                  <div className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                    validationResult.isValid
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  }`}>
                    {validationResult.isValid ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                    )}
                    <div className="text-xs font-mono">
                      <strong>{validationResult.isValid ? 'READY TO LAUNCH' : 'ISSUES DETECTED'}:</strong>{' '}
                      {validationResult.message || (validationResult.isValid ? 'All system checks passed successfully.' : 'Check validation warnings below.')}
                    </div>
                  </div>

                  {validationResult.errors && validationResult.errors.length > 0 && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 font-mono text-[11px] text-rose-400">
                      {validationResult.errors.map((e: string, idx: number) => (
                        <div key={idx}>• {e}</div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 font-mono leading-relaxed">
                  Click "Run Diagnostics" to scan questions, test cases, round timers, and judging containers before letting contestants in.
                </p>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  onClick={handleToggleCertificates}
                  className="text-xs font-mono text-indigo-400 hover:text-indigo-300 cursor-pointer"
                >
                  {event.certificateConfig?.enabled ? 'Disable Certificates' : 'Enable Official Certificates'}
                </button>
                <button
                  onClick={handleToggleFreeze}
                  className={`text-xs font-mono font-bold cursor-pointer ${
                    event.status === 'frozen' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {event.status === 'frozen' ? 'Unfreeze Event' : 'Freeze Event (Lock Edits)'}
                </button>
              </div>
            </div>
          </div>

          {/* Event Rules Box */}
          {event.rules && event.rules.length > 0 && (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3 font-mono text-xs">
              <h3 className="font-bold text-white uppercase text-[11px] tracking-wider text-slate-400">
                Event Assessment Rules &amp; Guidelines
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                {event.rules.map((rule, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-amber-400">•</span>
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Participants (Scoped to this tournament) */}
      {activeTab === 'participants' && (
        <ParticipantManager eventId={eventId} />
      )}

      {/* Tab 3: Rounds & Questions (Scoped to this tournament) */}
      {activeTab === 'questions' && (
        <QuestionManager eventId={eventId} defaultView="round_questions" />
      )}

      {/* Tab 4: Live Control Room (Merged live round management + proctoring stream) */}
      {activeTab === 'control' && (
        <div className="space-y-6">
          {/* Dynamic Rounds Control Strip */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Activity className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-bold text-white">Live Round Execution Center</h3>
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  Trigger dynamic stages, manage remaining seconds, and monitor candidate submissions.
                </p>
              </div>

              {event.status !== 'live' && (
                <button
                  onClick={handleStartEvent}
                  disabled={isStartingEvent}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-bold font-mono flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Live Event</span>
                </button>
              )}
            </div>

            {/* Stages Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {rounds.map(r => (
                <div
                  key={r.roundNumber}
                  className={`p-4 rounded-2xl border transition-all ${
                    r.status === 'active'
                      ? 'bg-indigo-950/30 border-indigo-500/50 shadow-lg shadow-indigo-950/40'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 text-[10px] font-mono font-bold">
                      STAGE {r.roundNumber}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold uppercase ${
                        r.status === 'active'
                          ? 'text-emerald-400'
                          : r.status === 'locked'
                          ? 'text-rose-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {r.status || 'Draft'}
                    </span>
                  </div>
                  <h4 className="font-bold text-white text-sm truncate">{r.title}</h4>
                  <div className="text-[11px] text-slate-400 font-mono mt-1">
                    {r.type.toUpperCase()} • {r.durationMinutes} Mins
                  </div>
                  <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between">
                    {r.status !== 'active' ? (
                      <button
                        onClick={async () => {
                          if (window.confirm(`Start Round ${r.roundNumber} now for all active contestants?`)) {
                            try {
                              await startDynamicRound(eventId, r.roundNumber);
                              fetchWorkspaceData();
                            } catch (e: any) {
                              alert(e.response?.data?.error || 'Failed to start round');
                            }
                          }
                        }}
                        className="w-full py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Start Round {r.roundNumber}</span>
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        Round Live Now
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Embedded Real-Time Candidate Proctoring Monitor */}
          <LiveMonitor />
        </div>
      )}

      {/* Tab 5: Leaderboard & Results */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-6">
          {/* Subview Selector */}
          <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-900 border border-slate-800 w-fit">
            <button
              onClick={() => setLeaderboardSubView('standings')}
              className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                leaderboardSubView === 'standings'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Live Standings
            </button>
            <button
              onClick={() => setLeaderboardSubView('advance')}
              className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                leaderboardSubView === 'advance'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Round Results &amp; Advance
            </button>
            <button
              onClick={() => setLeaderboardSubView('tiebreak')}
              className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                leaderboardSubView === 'tiebreak'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tie-Break Engine
            </button>
          </div>

          {leaderboardSubView === 'standings' && (
            <LeaderboardView eventId={eventId} />
          )}

          {leaderboardSubView === 'advance' && (
            <RoundResultsView eventId={eventId} />
          )}

          {leaderboardSubView === 'tiebreak' && (
            <TieBreakManager />
          )}
        </div>
      )}

      {/* Modals */}
      <ProjectorQrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        event={event}
      />

      <AdminTestSandboxModal
        isOpen={isSandboxModalOpen}
        onClose={() => setIsSandboxModalOpen(false)}
        eventId={event._id}
      />

      <PreEventCheckModal
        isOpen={isPreCheckModalOpen}
        onClose={() => setIsPreCheckModalOpen(false)}
      />

      {/* Unfreeze Rationale Modal */}
      {showUnfreezeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Unlock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Unfreeze Tournament</h3>
                <p className="text-xs text-slate-400">Audit rationale is required by protocol.</p>
              </div>
            </div>

            <textarea
              rows={3}
              value={unfreezeReason}
              onChange={e => setUnfreezeReason(e.target.value)}
              placeholder="State explicit reason (e.g. Adding emergency clarification to Round 2 prompt)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowUnfreezeModal(false);
                  setUnfreezeReason('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUnfreeze}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-mono transition-all shadow-lg shadow-rose-600/30"
              >
                Confirm Unfreeze
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
