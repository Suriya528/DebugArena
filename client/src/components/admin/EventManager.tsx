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
  ExternalLink
} from 'lucide-react';
import { College, Event, DynamicRound, AuditLog } from '../../types/index.js';
import {
  getColleges,
  getEvents,
  getEventDetails,
  freezeEvent,
  unfreezeEvent,
  startDynamicRound,
  getEventAuditLogs
} from '../../services/api.js';
import { EventBuilderModal } from './EventBuilderModal.js';
import { RoundBuilderModal } from './RoundBuilderModal.js';

export const EventManager: React.FC = () => {
  const [colleges, setColleges] = useState<College[]>([]);
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>('');
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [rounds, setRounds] = useState<DynamicRound[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isRoundModalOpen, setIsRoundModalOpen] = useState(false);

  // Unfreeze reason modal
  const [showUnfreezeModal, setShowUnfreezeModal] = useState(false);
  const [unfreezeReason, setUnfreezeReason] = useState('');

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
                Multi-Tenant Architecture
              </span>
              {activeEvent?.status === 'frozen' && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Event Frozen
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {activeEvent?.name || 'Competition Events & Colleges'}
            </h1>
            <p className="text-xs text-slate-400">
              Host institutional hackathons with dynamic round sequences and audit control
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* College Filter */}
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

      {/* Events Selector Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {events.map(ev => {
          const isSelected = ev._id === activeEvent?._id;
          return (
            <div
              key={ev._id}
              onClick={() => handleSelectEvent(ev._id)}
              className={`p-5 rounded-3xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 border-indigo-500 shadow-xl shadow-indigo-950/40'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-mono text-xs font-bold text-indigo-400">{ev.code}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    ev.status === 'live'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : ev.status === 'frozen'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {ev.status}
                </span>
              </div>
              <h3 className="font-bold text-white text-sm mb-1 truncate">{ev.name}</h3>
              <p className="text-xs text-slate-400 line-clamp-1 mb-3">{ev.description || 'No description'}</p>
              <div className="text-[11px] text-slate-500 font-mono">
                Violations Limit: {ev.scoringConfig?.violationLimit || 3} strikes
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Event Dynamic Rounds Workspace */}
      {activeEvent && (
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

            <div className="flex items-center gap-3">
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
                    </div>

                    {r.status !== 'active' && r.status !== 'completed' && (
                      <button
                        onClick={() => handleStartRound(r.roundNumber)}
                        disabled={activeEvent.status === 'frozen'}
                        className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Play className="w-3.5 h-3.5" /> Start Round
                      </button>
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
      )}

      {/* Unfreeze Emergency Override Modal */}
      {showUnfreezeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/50 rounded-3xl p-6 shadow-2xl text-left">
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
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-rose-500 mb-4 resize-none"
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
        onEventCreated={fetchData}
        onCollegeCreated={fetchData}
      />

      <RoundBuilderModal
        isOpen={isRoundModalOpen}
        onClose={() => setIsRoundModalOpen(false)}
        eventId={activeEvent?._id || ''}
        onRoundCreated={fetchData}
      />
    </div>
  );
};
