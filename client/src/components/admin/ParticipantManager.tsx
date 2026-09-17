import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Upload,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  Search,
  Check,
  Brain,
  Terminal,
  Eye,
  EyeOff,
  Key,
  RefreshCw,
  Download,
  Calendar,
  Sparkles,
  AlertCircle,
  Copy
} from 'lucide-react';
import { api } from '../../services/api.js';
import { SuspicionEvidenceModal } from './SuspicionEvidenceModal.js';
import { JourneyReplayModal } from './JourneyReplayModal.js';
import { SkillRadarModal } from './SkillRadarModal.js';

interface ParticipantManagerProps {
  eventId?: string;
}

export const ParticipantManager: React.FC<ParticipantManagerProps> = ({ eventId: propEventId }) => {
  const [participants, setParticipants] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(() => {
    return propEventId || localStorage.getItem('debugarena_active_event_id') || '';
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (propEventId) {
      setSelectedEventId(propEventId);
      setFormData(prev => ({ ...prev, eventId: propEventId }));
      setBulkEventId(propEventId);
      fetchParticipants(propEventId);
    }
  }, [propEventId]);

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [suspicionTarget, setSuspicionTarget] = useState<{ id: string; username: string } | null>(null);
  const [replayTarget, setReplayTarget] = useState<{ id: string; username: string; questionId: string } | null>(null);
  const [skillTarget, setSkillTarget] = useState<{ id?: string; username?: string } | null>(null);

  // Single Add form with custom credentials (username & password only)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    eventId: ''
  });
  const [showPassword, setShowPassword] = useState<boolean>(true);
  const [addLoading, setAddLoading] = useState<boolean>(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Bulk import string and file metadata (username & password)
  const [bulkCsvText, setBulkCsvText] = useState<string>('');
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [bulkEventId, setBulkEventId] = useState<string>('');
  const [bulkLoading, setBulkLoading] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let rand = '';
    for (let i = 0; i < 6; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `Debug#${rand}`;
  };

  const fetchEvents = async () => {
    try {
      const res = await api.get('/admin/events');
      const evList = res.data.events || [];
      setEvents(evList);
      if (!selectedEventId && evList.length > 0) {
        const saved = localStorage.getItem('debugarena_active_event_id');
        const validSaved = evList.find((e: any) => e._id === saved);
        const defaultId = validSaved ? validSaved._id : evList[0]._id;
        setSelectedEventId(defaultId);
        setFormData(prev => ({ ...prev, eventId: defaultId }));
        setBulkEventId(defaultId);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  };

  const fetchParticipants = async (targetEventId?: string) => {
    try {
      setLoading(true);
      const evId = targetEventId !== undefined ? targetEventId : selectedEventId;
      const url = evId ? `/admin/participants?eventId=${encodeURIComponent(evId)}` : '/admin/participants';
      const res = await api.get(url);
      setParticipants(res.data.participants || []);
    } catch (err) {
      console.error('Failed to load participants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    fetchParticipants(selectedEventId);
    if (selectedEventId) {
      localStorage.setItem('debugarena_active_event_id', selectedEventId);
      setFormData(prev => ({ ...prev, eventId: selectedEventId }));
      setBulkEventId(selectedEventId);
    }
  }, [selectedEventId]);

  const handleOpenAddModal = () => {
    setFormData({
      username: '',
      password: generatePassword(),
      eventId: selectedEventId || (events[0]?._id || '')
    });
    setShowPassword(true);
    setAddError(null);
    setShowAddModal(true);
  };

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError(null);

    const cleanUsername = formData.username.trim().toLowerCase();
    const cleanPassword = formData.password.trim();

    if (!cleanUsername || !cleanPassword) {
      setAddError('Username and password are required.');
      setAddLoading(false);
      return;
    }

    try {
      await api.post('/admin/participants', {
        username: cleanUsername,
        name: cleanUsername,
        password: cleanPassword,
        eventId: formData.eventId || selectedEventId || undefined
      });
      setShowAddModal(false);
      showToast(`Participant @${cleanUsername} added successfully.`);
      await fetchParticipants(selectedEventId);
    } catch (err: any) {
      setAddError(err.response?.data?.error || 'Failed to add participant');
    } finally {
      setAddLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setBulkCsvText(text.replace(/^\uFEFF/, ''));
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadSampleCsv = () => {
    const sample = `username,password
suriya,pass123
team1,debug2026
alex,secret456`;
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'participants_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkImport = async () => {
    if (!bulkCsvText.trim()) return;
    setBulkLoading(true);

    const rawLines = bulkCsvText.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
    const parsed = [];

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i].trim();
      if (!line) continue;

      const parts = line.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));

      // Skip header row
      if (
        i === 0 &&
        (parts[0]?.toLowerCase().includes('user') ||
          parts[0]?.toLowerCase().includes('username') ||
          parts[1]?.toLowerCase().includes('pass'))
      ) {
        continue;
      }

      if (parts.length >= 2 && parts[0] && parts[1]) {
        parsed.push({
          username: parts[0],
          name: parts[0],
          password: parts[1]
        });
      }
    }

    if (parsed.length === 0) {
      alert('No valid rows parsed. Format must be: username,password');
      setBulkLoading(false);
      return;
    }

    try {
      const res = await api.post('/admin/participants/bulk', {
        participants: parsed,
        eventId: bulkEventId || selectedEventId || undefined
      });
      showToast(`Bulk Import Complete: ${res.data.createdCount} participants created.`);
      setShowBulkModal(false);
      setBulkCsvText('');
      setCsvFileName('');
      await fetchParticipants(selectedEventId);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Bulk import failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleToggleDisqualify = async (id: string, currentDisqualified: boolean) => {
    const reason = !currentDisqualified
      ? prompt('Enter reason for disqualification:', 'Multiple proctoring violations') || 'Rule infringement'
      : undefined;

    try {
      await api.patch(`/admin/participants/${id}/disqualify`, {
        isDisqualified: !currentDisqualified,
        reason
      });
      await fetchParticipants();
    } catch (err) {
      alert('Failed to update disqualification status');
    }
  };

  const handleResetAttempt = async (id: string, username: string) => {
    const roundStr = prompt(`Reset attempt for @${username}. Enter round number (1, 2, or 3):`, '1');
    if (!roundStr) return;
    const roundNumber = parseInt(roundStr, 10);
    if (isNaN(roundNumber)) return;

    try {
      await api.post(`/admin/participants/${id}/reset-attempt`, { roundNumber });
      showToast(`Attempt reset for @${username} in Round ${roundNumber}`);
      await fetchParticipants();
    } catch (err) {
      alert('Failed to reset attempt');
    }
  };

  const filteredParticipants = participants.filter(
    p =>
      p.username.toLowerCase().includes(search.toLowerCase()) ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.regNo && p.regNo.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-top-4">
          <Check className="w-4 h-4" />
          {toastMessage}
        </div>
      )}

      {/* Header with Event Filter, Search, and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            Participant Management
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage contestant rosters, assign custom usernames & passwords, and monitor active rounds.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Tournament Selector Dropdown (Shown only if not scoped to a specific event) */}
          {!propEventId && (
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[11px] text-slate-500 font-semibold">Tournament:</span>
              <select
                value={selectedEventId}
                onChange={e => setSelectedEventId(e.target.value)}
                className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer"
              >
                <option value="" className="bg-slate-900 text-slate-300">All Tournaments</option>
                {events.map((ev: any) => (
                  <option key={ev._id} value={ev._id} className="bg-slate-900 text-white">
                    {ev.name} ({ev.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search @user..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={handleOpenAddModal}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Participant</span>
          </button>

          <button
            onClick={() => {
              setBulkEventId(selectedEventId || (events[0]?._id || ''));
              setShowBulkModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
          >
            <Upload className="w-4 h-4" />
            <span>Bulk CSV Import</span>
          </button>

          <button
            onClick={() => setSkillTarget({})}
            className="px-3.5 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-cyan-500/30"
          >
            <Brain className="w-4 h-4" />
            <span>Skill Radar</span>
          </button>
        </div>
      </div>

      {/* Contestant Join Information Banner */}
      {selectedEventId && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 font-bold">
              <Key className="w-4 h-4" />
            </span>
            <div>
              <div className="font-bold text-white flex items-center gap-2">
                <span>Contestant Login Instructions</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                  Username &amp; Password
                </span>
              </div>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Participants sign in using their assigned username and password at{' '}
                <strong className="text-amber-400 font-mono">
                  {window.location.origin}/join/{events.find((e: any) => e._id === selectedEventId)?.code || ''}
                </strong>
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const ev = events.find((e: any) => e._id === selectedEventId);
              const joinTarget = ev?.participantToken || ev?.code || selectedEventId;
              const joinUrl = `${window.location.origin}/join/${joinTarget}`;
              navigator.clipboard.writeText(joinUrl);
              showToast('Tournament participant join link copied to clipboard!');
            }}
            className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Join URL</span>
          </button>
        </div>
      )}

      {/* Participants Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="p-4">Participant (@Username)</th>
                <th className="p-4">Total Score</th>
                <th className="p-4">Rounds Status</th>
                <th className="p-4">Violations</th>
                <th className="p-4">Account Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-sans">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                      <span>Loading participant roster...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-sans">
                    No participants found. Click <span className="text-indigo-400 font-semibold">"Add Participant"</span> to issue a custom username & password.
                  </td>
                </tr>
              ) : (
                filteredParticipants.map(p => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-sans">
                      <div className="font-bold text-white text-sm">@{p.username}</div>
                      <div className="text-[11px] text-slate-400 font-mono flex flex-wrap items-center gap-1.5 mt-0.5">
                        {p.name && p.name !== p.username && <span className="text-slate-300 font-semibold">{p.name}</span>}
                        {p.eventName && (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-semibold font-sans">
                            {p.eventName}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-4 text-emerald-400 font-bold text-sm">
                      {p.totalScore} pts
                    </td>

                    <td className="p-4">
                      <div className="flex gap-1.5">
                        {[1, 2, 3].map(rNum => {
                          const rInfo = (p.rounds || []).find((r: any) => r.roundNumber === rNum);
                          return (
                            <span
                              key={rNum}
                              className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                rInfo?.status === 'advanced'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : rInfo?.status === 'eliminated'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : rInfo?.status === 'submitted'
                                  ? 'bg-cyan-500/20 text-cyan-300'
                                  : 'bg-slate-800 text-slate-500'
                              }`}
                            >
                              R{rNum}: {rInfo?.status ? rInfo.status.slice(0, 3) : 'NONE'}
                            </span>
                          );
                        })}
                      </div>
                    </td>

                    <td className="p-4">
                      {p.violationCount > 0 ? (
                        <span className="text-rose-400 font-bold flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          {p.violationCount}
                        </span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>

                    <td className="p-4">
                      {p.isDisqualified ? (
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold">
                          Disqualified ({p.disqualificationReason || 'Rule violation'})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                          Active
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-right font-sans">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSuspicionTarget({ id: p.id, username: p.username })}
                          title="View Proctoring Suspicion Audit"
                          className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 transition-colors cursor-pointer border border-rose-500/30"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setReplayTarget({ id: p.id, username: p.username, questionId: 'latest' })}
                          title="Watch Debugging Journey Replay"
                          className="p-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 transition-colors cursor-pointer border border-indigo-500/30"
                        >
                          <Terminal className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setSkillTarget({ id: p.id, username: p.username })}
                          title="View Candidate Skill Graph"
                          className="p-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 transition-colors cursor-pointer border border-cyan-500/30"
                        >
                          <Brain className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleResetAttempt(p.id, p.username)}
                          title="Reset attempt for a round"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleToggleDisqualify(p.id, p.isDisqualified)}
                          title={p.isDisqualified ? 'Reinstate participant' : 'Disqualify participant'}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            p.isDisqualified
                              ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30'
                              : 'bg-rose-600/20 text-rose-400 hover:bg-rose-600/30'
                          }`}
                        >
                          {p.isDisqualified ? (
                            <ShieldCheck className="w-3.5 h-3.5" />
                          ) : (
                            <ShieldAlert className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Single Participant Modal (Username & Password Only) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <form
            onSubmit={handleAddSingle}
            className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4"
          >
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                Add Participant
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Simply enter a custom username and password for this contestant.
              </p>
            </div>

            {addError && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{addError}</span>
              </div>
            )}

            {/* Target Tournament (if multiple) */}
            {events.length > 1 && (
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Tournament
                </label>
                <select
                  required
                  value={formData.eventId}
                  onChange={e => setFormData({ ...formData, eventId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {events.map((ev: any) => (
                    <option key={ev._id} value={ev._id}>
                      {ev.name} ({ev.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Custom Username */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Username <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. suriya or team1 or 21cs101"
                value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Custom Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">
                  Password <span className="text-rose-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, password: generatePassword() }))}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  Random
                </button>
              </div>

              <div className="relative">
                <Key className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter custom password (e.g. 123456)"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addLoading}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-1.5"
              >
                {addLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Add Participant</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bulk CSV Modal (Username & Password Only) */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-indigo-400" />
                  Bulk Import Participants
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Import multiple contestants using simply username and password.
                </p>
              </div>
              <button
                onClick={handleDownloadSampleCsv}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold bg-indigo-950/60 border border-indigo-800/60 px-2.5 py-1 rounded-lg cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Sample CSV
              </button>
            </div>

            {/* Target Tournament */}
            {events.length > 1 && (
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Tournament
                </label>
                <select
                  required
                  value={bulkEventId}
                  onChange={e => setBulkEventId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {events.map((ev: any) => (
                    <option key={ev._id} value={ev._id}>
                      {ev.name} ({ev.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <p className="text-xs text-slate-400 leading-relaxed">
              Format: <code className="text-indigo-400 font-bold">username, password</code> (one per line)
            </p>

            {/* File Upload Area */}
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-4 bg-slate-950/50 hover:bg-slate-950 cursor-pointer transition-all group">
              <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-400 mb-1 transition-colors" />
              <span className="text-xs font-semibold text-slate-300 group-hover:text-white">
                {csvFileName ? `Selected: ${csvFileName}` : 'Click to browse & upload .csv file'}
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Or Paste List:</span>
                {bulkCsvText && (
                  <button
                    onClick={() => {
                      setBulkCsvText('');
                      setCsvFileName('');
                    }}
                    className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <textarea
                rows={5}
                value={bulkCsvText}
                onChange={e => setBulkCsvText(e.target.value)}
                placeholder={`suriya, pass123\nteam1, debug2026\nalex, secret456`}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkCsvText('');
                  setCsvFileName('');
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkImport}
                disabled={!bulkCsvText.trim() || bulkLoading}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
              >
                {bulkLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Import Participants</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspicion Evidence Audit Modal */}
      {suspicionTarget && (
        <SuspicionEvidenceModal
          userId={suspicionTarget.id}
          username={suspicionTarget.username}
          onClose={() => setSuspicionTarget(null)}
        />
      )}

      {/* Debugging Journey Replay Modal */}
      {replayTarget && (
        <JourneyReplayModal
          userId={replayTarget.id}
          questionId={replayTarget.questionId}
          username={replayTarget.username}
          onClose={() => setReplayTarget(null)}
        />
      )}

      {/* Dynamic Skill Radar Modal */}
      {skillTarget && (
        <SkillRadarModal
          userId={skillTarget.id}
          username={skillTarget.username}
          onClose={() => setSkillTarget(null)}
        />
      )}
    </div>
  );
};
