import React, { useState, useEffect } from 'react';
import {
  Building2,
  Calendar,
  Layers,
  Plus,
  Lock,
  Unlock,
  Play,
  History,
  ShieldAlert,
  Clock,
  Award,
  ChevronRight,
  ExternalLink,
  Trash2,
  Copy,
  Check,
  QrCode,
  Sparkles,
  Shield,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Search
} from 'lucide-react';
import { College, Event, DynamicRound, AuditLog } from '../../types/index.js';
import {
  getColleges,
  getEvents,
  getEventDetails,
  freezeEvent,
  unfreezeEvent,
  startDynamicRound,
  getEventAuditLogs,
  regenerateAdminLink,
  validateEventSetup,
  startEvent,
  api
} from '../../services/api.js';
import { EventBuilderModal } from './EventBuilderModal.js';
import { RoundBuilderModal } from './RoundBuilderModal.js';
import { DeleteEventModal } from './DeleteEventModal.js';
import { ProjectorQrModal } from './ProjectorQrModal.js';
import { AdminTestSandboxModal } from './AdminTestSandboxModal.js';

interface EventManagerProps {
  onSelectEvent?: (eventId: string) => void;
}

export const EventManager: React.FC<EventManagerProps> = ({ onSelectEvent }) => {
  const [colleges, setColleges] = useState<College[]>([]);
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>('');
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [rounds, setRounds] = useState<DynamicRound[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Status filters for tournament hub
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'ready' | 'draft' | 'completed'>('all');

  // Modals
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isRoundModalOpen, setIsRoundModalOpen] = useState(false);

  // Delete Event Modal State
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);

  // Unfreeze reason modal
  const [showUnfreezeModal, setShowUnfreezeModal] = useState(false);
  const [unfreezeReason, setUnfreezeReason] = useState('');

  // Share & Test Hub States
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedAdminLink, setCopiedAdminLink] = useState(false);
  const [isProjectorModalOpen, setIsProjectorModalOpen] = useState(false);
  const [isSandboxModalOpen, setIsSandboxModalOpen] = useState(false);
  const [isRegeneratingAdmin, setIsRegeneratingAdmin] = useState(false);
  const [isValidatingSetup, setIsValidatingSetup] = useState(false);
  const [validationResult, setValidationResult] = useState<any | null>(null);
  const [isStartingEvent, setIsStartingEvent] = useState(false);

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyAdminLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedAdminLink(true);
    setTimeout(() => setCopiedAdminLink(false), 2500);
  };

  const handleRegenerateAdmin = async () => {
    if (!activeEvent) return;
    if (!window.confirm('Revoke and regenerate the private Admin Management Link? Any administrators using the previous admin link will need the new link. Participant links will remain unchanged.')) {
      return;
    }
    try {
      setIsRegeneratingAdmin(true);
      const res = await regenerateAdminLink(activeEvent._id);
      setActiveEvent(prev => prev ? { ...prev, adminLink: res.adminLink } : prev);
      alert('Admin management link successfully regenerated! Please copy and bookmark the new link.');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to regenerate admin link');
    } finally {
      setIsRegeneratingAdmin(false);
    }
  };

  const handleValidateSetup = async () => {
    if (!activeEvent) return;
    try {
      setIsValidatingSetup(true);
      const res = await validateEventSetup(activeEvent._id);
      setValidationResult(res);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to validate setup');
    } finally {
      setIsValidatingSetup(false);
    }
  };

  const handleStartEvent = async () => {
    if (!activeEvent) return;

    const unready = rounds.filter(r => !r.isQuestionReady);
    if (unready.length > 0) {
      alert(`Cannot start event. Questions must be selected for all rounds before starting.\n\nIncomplete rounds:\n${unready.map(r => `• Round ${r.roundNumber} ("${r.title}"): ${r.assignedQuestionCount || 0}/${r.targetQuestionCount || r.questionCount} questions selected`).join('\n')}`);
      return;
    }

    if (!window.confirm(`Start the event "${activeEvent.name}" and begin the live timer now? Contestants will immediately receive Round 1 challenges.`)) {
      return;
    }
    try {
      setIsStartingEvent(true);
      await startEvent(activeEvent._id);
      alert(`Event "${activeEvent.name}" is now LIVE!`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to start event');
    } finally {
      setIsStartingEvent(false);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const fetchedColleges = await getColleges();
      setColleges(fetchedColleges);

      const fetchedEvents = await getEvents(selectedCollegeId || undefined);
      setEvents(fetchedEvents);

      const currentEventId = selectedEventId || fetchedEvents[0]?._id;
      if (currentEventId) {
        setSelectedEventId(currentEventId);
        const details = await getEventDetails(currentEventId);
        setActiveEvent(details.event);
        setRounds(details.rounds);
        const logs = await getEventAuditLogs(currentEventId);
        setAuditLogs(logs || []);
      }
    } catch (err) {
      console.error('Failed to load event data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCollegeId]);

  const handleSelectEvent = async (eventId: string) => {
    setSelectedEventId(eventId);
    localStorage.setItem('debugarena_active_event_id', eventId);
    try {
      const details = await getEventDetails(eventId);
      setActiveEvent(details.event);
      setRounds(details.rounds);
      const logs = await getEventAuditLogs(eventId);
      setAuditLogs(logs || []);
    } catch (err) {
      console.error('Failed to switch event:', err);
    }
  };

  const handleEventCreated = async (createdEvent?: any) => {
    try {
      const fetchedEvents = await getEvents(selectedCollegeId || undefined);
      setEvents(fetchedEvents);
      const targetId = createdEvent?._id || fetchedEvents[0]?._id;
      if (targetId) {
        if (onSelectEvent) {
          onSelectEvent(targetId);
          return;
        }
        await handleSelectEvent(targetId);
      }
    } catch (err) {
      console.error('Failed to switch to newly created event:', err);
      fetchData();
    }
  };

  const handleEventDeleted = async (deletedId: string) => {
    const remaining = events.filter(e => e._id !== deletedId);
    setEvents(remaining);
    if (selectedEventId === deletedId) {
      localStorage.removeItem('debugarena_active_event_id');
      if (remaining.length > 0) {
        await handleSelectEvent(remaining[0]._id);
      } else {
        setSelectedEventId('');
        setActiveEvent(null);
        setRounds([]);
        setAuditLogs([]);
      }
    }
  };

  const handleToggleFreeze = async () => {
    if (!activeEvent) return;

    if (activeEvent.status === 'frozen') {
      setShowUnfreezeModal(true);
    } else {
      if (window.confirm('Freeze this event? Structural edits to questions and rounds will be strictly locked.')) {
        try {
          await freezeEvent(activeEvent._id);
          fetchData();
        } catch (err: any) {
          alert(err.response?.data?.error || 'Failed to freeze event');
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
      await unfreezeEvent(activeEvent!._id, unfreezeReason.trim());
      setShowUnfreezeModal(false);
      setUnfreezeReason('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to unfreeze event');
    }
  };

  const handleStartRound = async (roundNumber: number) => {
    if (!activeEvent) return;
    if (window.confirm(`Start Round ${roundNumber} now for all active participants?`)) {
      try {
        await startDynamicRound(activeEvent._id, roundNumber);
        fetchData();
      } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to start round');
      }
    }
  };

  const filteredEvents = events.filter(ev => {
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery = !q ||
      ev.name.toLowerCase().includes(q) ||
      ev.code.toLowerCase().includes(q) ||
      (ev.description || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || ev.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 animate-in fade-in duration-200 text-left">
      {/* Top Banner & Multi-College Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                {onSelectEvent ? 'Tournaments Hub' : 'Institutional Championship Platform'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                {events.length} {events.length === 1 ? 'Tournament' : 'Tournaments'}
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {onSelectEvent ? 'All Tournaments' : (activeEvent?.name || 'Institutional Championship & Events')}
            </h1>
            <p className="text-xs text-slate-400">
              {onSelectEvent
                ? 'Select any previously created tournament below to open its workspace, or create a new competition.'
                : 'Host institutional hackathons with dynamic round sequences and audit control'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* College Badge or Filter */}
          {colleges.length > 1 ? (
            <select
              value={selectedCollegeId}
              onChange={e => setSelectedCollegeId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Colleges ({colleges.length})</option>
              {colleges.map(c => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          ) : colleges.length === 1 ? (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-bold text-white">{colleges[0].name}</span>
              <span className="text-[10px] font-mono text-slate-500">({colleges[0].code})</span>
            </div>
          ) : null}

          {/* New Event Button */}
          <button
            onClick={() => setIsEventModalOpen(true)}
            className="py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Event</span>
          </button>
        </div>
      </div>

      {/* Search & Status Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search previous tournaments by name or code (e.g. Stanford or DEBUG26)..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
          {(['all', 'live', 'ready', 'draft', 'completed'] as const).map((st) => {
            const count = st === 'all' ? events.length : events.filter(e => e.status === st).length;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-indigo-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Events Selector Strip */}
      {filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.map(ev => {
            return (
              <div
                key={ev._id}
                onClick={() => {
                  if (onSelectEvent) {
                    onSelectEvent(ev._id);
                  } else {
                    handleSelectEvent(ev._id);
                  }
                }}
                className="p-6 rounded-3xl border bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:shadow-xl hover:shadow-indigo-950/20 transition-all cursor-pointer flex flex-col justify-between space-y-4 text-left"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-xs font-bold text-indigo-400">{ev.code}</span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          ev.status === 'live'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                            : ev.status === 'ready'
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            : ev.status === 'frozen'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {ev.status}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEventToDelete(ev);
                        }}
                        className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete Event"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-extrabold text-base tracking-tight bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent truncate">
                    {ev.name}
                  </h3>
                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {ev.description || 'Institutional competition'}
                  </p>
                </div>

                {/* Properly Mention Event Rounds */}
                <div className="space-y-1.5 pt-3 border-t border-slate-800/80 font-mono text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-400 uppercase tracking-wider">
                      Rounds ({(ev.rounds || []).length}):
                    </span>
                    {(ev.rounds && ev.rounds.length > 0) ? (
                      <span className="text-amber-400 font-semibold">
                        {ev.rounds.reduce((s: number, r: any) => s + (Number(r.durationMinutes) || 0), 0)} Mins Total
                      </span>
                    ) : null}
                  </div>

                  {(!ev.rounds || ev.rounds.length === 0) ? (
                    <div className="text-[11px] text-slate-500 italic py-1">
                      No stages configured yet
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {ev.rounds.slice(0, 3).map((r: any, rIdx: number) => (
                        <div
                          key={rIdx}
                          className="flex items-center justify-between p-1.5 px-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-[11px]"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-bold text-indigo-400">Stage {r.roundNumber || rIdx + 1}:</span>
                            <span className="text-slate-200 truncate">{r.title}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-slate-400">
                            <span className={`uppercase font-bold ${r.type === 'coding' ? 'text-amber-400' : 'text-cyan-400'}`}>
                              {r.type}
                            </span>
                            <span>•</span>
                            <span>{r.durationMinutes}m</span>
                          </div>
                        </div>
                      ))}
                      {ev.rounds.length > 3 && (
                        <div className="text-[10px] text-slate-500 text-right pt-0.5">
                          +{ev.rounds.length - 3} more stages
                        </div>
                      )}
                    </div>
                  )}
                </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectEvent) {
                          onSelectEvent(ev._id);
                        } else {
                          handleSelectEvent(ev._id);
                        }
                      }}
                      className="flex-1 py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
                    >
                      <span>Open Workspace</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const joinUrl = `${window.location.origin}/join/${ev.participantToken || ev.code}`;
                        navigator.clipboard.writeText(joinUrl);
                        alert('Tournament join link copied to clipboard!');
                      }}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer"
                      title="Copy Participant Join Link"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEventToDelete(ev);
                      }}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:border-rose-500/50 transition-all cursor-pointer"
                      title={`Delete ${ev.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800/80 space-y-3">
          <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">No Tournaments Found</h3>
          <p className="text-xs text-slate-400 font-mono max-w-sm mx-auto">
            {events.length === 0
              ? 'No tournaments have been created yet. Click "+ Create Event" to get started.'
              : 'No tournaments match your filter criteria. Try adjusting your search query.'}
          </p>
          {events.length === 0 && (
            <button
              onClick={() => setIsEventModalOpen(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold font-mono transition-all inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Tournament</span>
            </button>
          )}
        </div>
      )}

      {/* Active Event Dynamic Rounds Workspace (Shown when standalone) */}
      {!onSelectEvent && activeEvent && (
        <div className="space-y-6">
          {/* Event Access & Control Center */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-amber-400" /> Event Access &amp; Lifecycle Center
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                    activeEvent.status === 'live'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : activeEvent.status === 'ready'
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    Status: {activeEvent.status}
                  </span>
                </div>
                <h3 className="text-xl font-black text-white tracking-tight">
                  {activeEvent.name} ({activeEvent.code})
                </h3>
              </div>

              {/* Lifecycle Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleValidateSetup}
                  disabled={isValidatingSetup}
                  className="px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold font-mono flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="Validate rounds, questions, and scoring readiness"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isValidatingSetup ? 'animate-spin' : ''}`} />
                  <span>{isValidatingSetup ? 'Validating...' : 'Pre-Event Checklist'}</span>
                </button>

                {activeEvent.status !== 'live' && activeEvent.status !== 'completed' && activeEvent.status !== 'finalized' && (
                  <button
                    onClick={handleStartEvent}
                    disabled={isStartingEvent}
                    className="px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black font-mono flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                    title="Start competition and begin live tournament timer"
                  >
                    <Play className="w-3.5 h-3.5 text-slate-950 fill-current" />
                    <span>{isStartingEvent ? 'Starting Event...' : 'START EVENT (Go LIVE)'}</span>
                  </button>
                )}

                <button
                  onClick={() => setIsSandboxModalOpen(true)}
                  className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black font-mono flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
                  title="Dry-run code and test cases without leaderboard pollution"
                >
                  <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                  <span>Dry-Run Sandbox</span>
                </button>
              </div>
            </div>

            {/* Validation Checklist Alert Banner */}
            {validationResult && (
              <div className={`p-4 rounded-2xl border text-xs font-mono space-y-2 ${
                validationResult.isValid
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    {validationResult.isValid ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
                    <span>{validationResult.isValid ? 'Pre-Event Checklist Passed: Ready for Tournament' : 'Setup Incomplete / Action Required'}</span>
                  </span>
                  <span className="text-[11px]">Rounds: {validationResult.checklist?.roundsCount || 0} • Questions: {validationResult.checklist?.totalQuestions || 0}</span>
                </div>
                {validationResult.errors && validationResult.errors.length > 0 && (
                  <ul className="list-disc pl-5 text-[11px] space-y-0.5 text-rose-200">
                    {validationResult.errors.map((err: string, i: number) => <li key={i}>{err}</li>)}
                  </ul>
                )}
                {validationResult.warnings && validationResult.warnings.length > 0 && (
                  <ul className="list-disc pl-5 text-[11px] space-y-0.5 text-amber-300">
                    {validationResult.warnings.map((warn: string, i: number) => <li key={i}>{warn}</li>)}
                  </ul>
                )}
              </div>
            )}

            {/* Dual Link Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Participant Join Link Card */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Participant Direct-Join Link</span>
                  </span>
                  <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded">
                    Student Entry
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                  Share this link or project the full-screen QR code in your lab. Participants access the proctored test environment directly.
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-indigo-300 truncate">
                    {`${window.location.origin}${activeEvent.participantLink || `/join/${activeEvent.code}`}`}
                  </div>
                  <button
                    onClick={() => handleCopyLink(`${window.location.origin}${activeEvent.participantLink || `/join/${activeEvent.code}`}`)}
                    className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold transition-all shadow-md shadow-indigo-600/20 shrink-0 cursor-pointer"
                  >
                    {copiedLink ? 'Copied!' : 'Copy Link'}
                  </button>
                  <button
                    onClick={() => setIsProjectorModalOpen(true)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-white border border-slate-700 transition-all shrink-0 cursor-pointer"
                    title="Display Lab Projector QR"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                  <a
                    href={activeEvent.participantLink || `/join/${activeEvent.code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-all shrink-0"
                    title="Preview in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Private Admin Management Link Card */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Private Admin Link</span>
                  </span>
                  <span className="text-[10px] font-mono bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded font-bold">
                    Private &amp; Confidential
                  </span>
                </div>
                <p className="text-[11px] text-amber-200/80 leading-relaxed font-sans">
                  Never share with contestants. In case of link exposure, regenerate below to instantly revoke old admin access.
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-amber-300 truncate">
                    {`${window.location.origin}${activeEvent.adminLink || ''}`}
                  </div>
                  <button
                    onClick={() => handleCopyAdminLink(`${window.location.origin}${activeEvent.adminLink || ''}`)}
                    className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-bold transition-all shadow-md shadow-amber-500/20 shrink-0 cursor-pointer"
                  >
                    {copiedAdminLink ? 'Copied!' : 'Copy Link'}
                  </button>
                  <button
                    onClick={handleRegenerateAdmin}
                    disabled={isRegeneratingAdmin}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 font-mono text-xs font-bold transition-all shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-1"
                    title="Regenerate Admin Link (Invalidates previous admin link)"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingAdmin ? 'animate-spin' : ''}`} />
                    <span>Regenerate</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Round Pipeline Workspace */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-bold text-cyan-400">
                  {typeof activeEvent.collegeId === 'object' ? (activeEvent.collegeId as any)?.name : 'College Event'}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-xs text-slate-400">Rules configured: {activeEvent.rules?.length || 0}</span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-400" /> Dynamic Round Pipeline
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
              {/* Event Freeze Toggle */}
              <button
                onClick={handleToggleFreeze}
                className={`py-2 px-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                  activeEvent.status === 'frozen'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
              >
                {activeEvent.status === 'frozen' ? (
                  <>
                    <Unlock className="w-3.5 h-3.5" /> Unfreeze Event
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" /> Freeze Event
                  </>
                )}
              </button>

              {/* Audit Logs Toggle */}
              <button
                onClick={() => setShowAuditLogs(!showAuditLogs)}
                className="py-2 px-3.5 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <History className="w-3.5 h-3.5" />
                <span>Audit Logs ({auditLogs.length})</span>
              </button>

              {/* Delete Event Button */}
              <button
                onClick={() => setEventToDelete(activeEvent)}
                className="py-2 px-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                title="Permanently delete this event and its dynamic rounds"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Delete</span>
              </button>

              {/* Add Round Button */}
              <button
                onClick={() => setIsRoundModalOpen(true)}
                disabled={activeEvent.status === 'frozen'}
                className="py-2 px-4 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>Add Round</span>
              </button>
            </div>
          </div>

          {/* Dynamic Rounds Cards */}
          <div className="space-y-4">
            {rounds.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-3xl">
                <Layers className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-400">No rounds configured for this event yet</h4>
                <p className="text-xs text-slate-500 mt-1">Add your first dynamic round using the button above.</p>
              </div>
            ) : (
              rounds.map(r => (
                <div
                  key={r._id}
                  className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center font-mono font-black text-indigo-400 text-base">
                      R{r.roundNumber}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                          {r.type}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            r.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                              : r.status === 'completed'
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-white tracking-tight">{r.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{r.description || 'No description provided'}</p>
                      
                      {/* Language and Quota Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {r.advancementQuota && r.advancementQuota > 0 ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                            ⚡ Top {r.advancementQuota} Advance
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            🏆 Championship Final
                          </span>
                        )}
                        {r.allowedLanguages && r.allowedLanguages.length > 0 && (
                          <div className="flex items-center gap-1">
                            {r.allowedLanguages.map(l => (
                              <span key={l} className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700">
                                {l}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0">
                    <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" /> {r.durationMinutes}m
                      </span>
                      <span className="flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-slate-500" /> {r.totalMarks} pts
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.isQuestionReady
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      }`}>
                        {r.assignedQuestionCount ?? 0}/{r.targetQuestionCount || r.questionCount} Qs
                      </span>
                    </div>

                    {r.status !== 'active' && r.status !== 'completed' && (
                      !r.isQuestionReady ? (
                        <button
                          onClick={() => {
                            if (typeof onSelectEvent === 'function') {
                              (onSelectEvent as (id: string) => void)(activeEvent._id);
                            } else {
                              alert(`Please navigate to the 'Questions' tab to select and assign questions for Round ${r.roundNumber}.`);
                            }
                          }}
                          className="py-2 px-3.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold font-mono flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                          title="Open workspace to select questions for this round"
                        >
                          <span>Select Questions ({r.assignedQuestionCount ?? 0}/{r.targetQuestionCount || r.questionCount})</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartRound(r.roundNumber)}
                          disabled={activeEvent.status === 'frozen'}
                          className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <Play className="w-3.5 h-3.5" /> Start Round
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Audit Trail Drawer */}
          {showAuditLogs && (
            <div className="pt-6 border-t border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" /> Immutable Audit Trail
              </h3>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {auditLogs.length === 0 ? (
                  <div className="text-xs text-slate-500 py-3">No actions logged for this event yet.</div>
                ) : (
                  auditLogs.map(log => (
                    <div
                      key={log._id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800/60 text-xs flex justify-between items-center"
                    >
                      <div>
                        <span className="font-bold text-indigo-400 font-mono">[{log.action}]</span>{' '}
                        <span className="text-slate-300">by @{log.adminUsername}</span>
                        {log.reason && <div className="text-[11px] text-amber-400/90 mt-0.5">Rationale: {log.reason}</div>}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )}

      {/* Unfreeze Emergency Override Modal */}
      {showUnfreezeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/50 rounded-3xl p-6 shadow-2xl text-left max-h-[92vh] flex flex-col overflow-y-auto">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white mb-2">Unfreeze Competition Event</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Unfreezing an event permits changes to active rounds, questions, and duration while participants are competing. An audit rationale is mandatory.
            </p>
            <textarea
              rows={3}
              placeholder="Provide explicit operational rationale for unfreezing..."
              value={unfreezeReason}
              onChange={e => setUnfreezeReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-base sm:text-xs text-white focus:outline-none focus:border-rose-500 mb-4 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowUnfreezeModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUnfreeze}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Confirm Unfreeze
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <EventBuilderModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        colleges={colleges}
        onEventCreated={handleEventCreated}
        onCollegeCreated={fetchData}
      />

      <RoundBuilderModal
        isOpen={isRoundModalOpen}
        onClose={() => setIsRoundModalOpen(false)}
        eventId={activeEvent?._id || ''}
        onRoundCreated={fetchData}
      />

      <DeleteEventModal
        isOpen={Boolean(eventToDelete)}
        event={eventToDelete}
        onClose={() => setEventToDelete(null)}
        onDeleted={handleEventDeleted}
      />

      <ProjectorQrModal
        isOpen={isProjectorModalOpen}
        onClose={() => setIsProjectorModalOpen(false)}
        event={
          activeEvent
            ? {
                name: activeEvent.name,
                code: activeEvent.code,
                participantLink: activeEvent.participantLink,
                collegeName:
                  typeof activeEvent.collegeId === 'object'
                    ? (activeEvent.collegeId as any)?.name
                    : undefined
              }
            : null
        }
      />

      <AdminTestSandboxModal
        isOpen={isSandboxModalOpen}
        onClose={() => setIsSandboxModalOpen(false)}
        eventId={activeEvent?._id || ''}
      />
    </div>
  );
};
