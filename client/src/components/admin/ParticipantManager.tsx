import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Upload, ShieldAlert, ShieldCheck, RotateCcw, Search, Check } from 'lucide-react';
import { api } from '../../services/api.js';

export const ParticipantManager: React.FC = () => {
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);

  // Add single form
  const [formData, setFormData] = useState({ username: '', name: '', password: '' });
  // Bulk import string
  const [bulkCsvText, setBulkCsvText] = useState<string>('');

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

    // Parse CSV lines: username,name,password
    const lines = bulkCsvText.trim().split('\n');
    const parsed = [];
    for (const line of lines) {
      const parts = line.split(',').map(s => s.trim());
      if (parts.length >= 3) {
        parsed.push({ username: parts[0], name: parts[1], password: parts[2] });
      }
    }

    if (parsed.length === 0) {
      alert('No valid CSV rows parsed. Format must be: username,name,password');
      return;
    }

    try {
      const res = await api.post('/admin/participants/bulk', { participants: parsed });
      alert(`Bulk Import Complete: ${res.data.createdCount} accounts created.`);
      setShowBulkModal(false);
      setBulkCsvText('');
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
                      <div className="text-[11px] text-slate-400 font-mono">@{p.username}</div>
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
                      <div className="flex items-center justify-end gap-2">
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
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Bulk Import Participants via CSV</h3>
            <p className="text-xs text-slate-400">
              Paste lines in format: <code className="text-indigo-400">username,team_name,password</code>
            </p>

            <textarea
              rows={8}
              value={bulkCsvText}
              onChange={e => setBulkCsvText(e.target.value)}
              placeholder={`team7,Bit Hackers,pass123\nteam8,Cyber Warriors,pass123`}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
            />

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowBulkModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkImport}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
              >
                Import Roster
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
