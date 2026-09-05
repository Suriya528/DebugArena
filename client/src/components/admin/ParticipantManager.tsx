import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Upload, ShieldAlert, ShieldCheck, RotateCcw, Search, Check, Brain, Terminal, Eye } from 'lucide-react';
import { api } from '../../services/api.js';
import { SuspicionEvidenceModal } from './SuspicionEvidenceModal.js';
import { JourneyReplayModal } from './JourneyReplayModal.js';
import { SkillRadarModal } from './SkillRadarModal.js';

export const ParticipantManager: React.FC = () => {
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [suspicionTarget, setSuspicionTarget] = useState<{ id: string; username: string } | null>(null);
  const [replayTarget, setReplayTarget] = useState<{ id: string; username: string; questionId: string } | null>(null);
  const [skillTarget, setSkillTarget] = useState<{ id?: string; username?: string } | null>(null);

  // Add single form
  const [formData, setFormData] = useState({ username: '', name: '', password: '' });
  // Bulk import string and file metadata
  const [bulkCsvText, setBulkCsvText] = useState<string>('');
  const [csvFileName, setCsvFileName] = useState<string>('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setBulkCsvText(text.replace(/^\uFEFF/, '')); // strip UTF-8 BOM
      }
    };
    reader.readAsText(file);
  };

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/participants');
      setParticipants(res.data.participants || []);
    } catch (err) {
      console.error('Failed to load participants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, []);

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/participants', formData);
      setShowAddModal(false);
      setFormData({ username: '', name: '', password: '' });
      await fetchParticipants();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add participant');
    }
  };

  const handleBulkImport = async () => {
    if (!bulkCsvText.trim()) return;

    // Clean BOM if present and split lines
    const rawLines = bulkCsvText.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
    const parsed = [];

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i].trim();
      if (!line) continue;

      const parts = line.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));

      // Auto-detect & skip header row
      if (
        i === 0 &&
        (parts[0]?.toLowerCase().includes('user') ||
          parts[0]?.toLowerCase().includes('team') ||
          parts[1]?.toLowerCase().includes('name'))
      ) {
        continue;
      }

      if (parts.length >= 3) {
        parsed.push({
          username: parts[0],
          name: parts[1],
          password: parts[2],
          department: parts[3] || undefined,
          year: parts[4] || undefined,
          regNo: parts[5] || undefined
        });
      }
    }

    if (parsed.length === 0) {
      alert('No valid CSV rows parsed. Format must be: username,name,password[,department,year,regNo]');
      return;
    }

    try {
      const res = await api.post('/admin/participants/bulk', { participants: parsed });
      alert(`Bulk Import Complete: ${res.data.createdCount} accounts created.`);
      setShowBulkModal(false);
      setBulkCsvText('');
      setCsvFileName('');
      await fetchParticipants();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Bulk import failed');
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
      alert(`Attempt reset for @${username} in Round ${roundNumber}`);
      await fetchParticipants();
    } catch (err) {
      alert('Failed to reset attempt');
    }
  };

  const filteredParticipants = participants.filter(
    p =>
      p.username.toLowerCase().includes(search.toLowerCase()) ||
      p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header with Search and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            Participant Management
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Issued participant rosters, proctoring strikes, and attempt resets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search team or name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Single</span>
          </button>

          <button
            onClick={() => setShowBulkModal(true)}
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

      {/* Participants Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="p-4">Participant</th>
                <th className="p-4">Total Score</th>
                <th className="p-4">Rounds Status</th>
                <th className="p-4">Violations</th>
                <th className="p-4">Disqualified?</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-sans">
                    Loading participants...
                  </td>
                </tr>
              ) : filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-sans">
                    No participants found.
                  </td>
                </tr>
              ) : (
                filteredParticipants.map(p => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-sans">
                      <div className="font-bold text-white">{p.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span>@{p.username}</span>
                        {p.regNo && <span className="text-indigo-400 font-semibold">({p.regNo})</span>}
                        {p.department && <span className="text-slate-500">• {p.department}</span>}
                        {p.year && <span className="text-slate-500">• Yr {p.year}</span>}
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
                          YES ({p.disqualificationReason || 'Disqualified'})
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
                          onClick={() => setReplayTarget({ id: p.id, username: p.username, questionId: 'demo' })}
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

      {/* Add Single Participant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <form
            onSubmit={handleAddSingle}
            className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4"
          >
            <h3 className="text-lg font-bold text-white">Create Participant Account</h3>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Username / Reg No:</label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Display / Team Name:</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Issued Password:</label>
              <input
                type="text"
                required
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
              >
                Save Participant
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bulk CSV Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-400" />
                Bulk Import Participants via CSV
              </h3>
              {csvFileName && (
                <span className="text-xs text-indigo-400 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded-md font-mono">
                  {csvFileName}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Upload a <code className="text-indigo-300">.csv</code> file or paste rows below. Supported columns:<br />
              <code className="text-indigo-400 font-bold">username, team_name, password, [department, year, regNo]</code>
            </p>

            {/* Native File Upload Area */}
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-4 bg-slate-950/50 hover:bg-slate-950 cursor-pointer transition-all group">
              <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-400 mb-1 transition-colors" />
              <span className="text-xs font-semibold text-slate-300 group-hover:text-white">
                {csvFileName ? 'Choose a different CSV file' : 'Click to browse & upload .csv file'}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5">UTF-8 / Excel CSV formats supported</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Or Paste CSV Text:</span>
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
                rows={6}
                value={bulkCsvText}
                onChange={e => setBulkCsvText(e.target.value)}
                placeholder={`team7,Bit Hackers,pass123,CSE,3,21CS101\nteam8,Cyber Warriors,pass123,ECE,4,20EC205`}
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
                disabled={!bulkCsvText.trim()}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                Import Roster
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
