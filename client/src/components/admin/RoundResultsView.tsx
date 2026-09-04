import React, { useState, useEffect } from 'react';
import { Award, CheckSquare, Square, ArrowRight, UserCheck, ShieldAlert, Clock, RefreshCw } from 'lucide-react';
import { RoundResultRow } from '../../types/index.js';
import { api } from '../../services/api.js';

export const RoundResultsView: React.FC = () => {
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [results, setResults] = useState<RoundResultRow[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdvancing, setIsAdvancing] = useState<boolean>(false);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/rounds/${selectedRound}/results`);
      setResults(res.data.results || []);

      // Pre-select already advanced users if any
      const alreadyAdvanced = new Set<string>();
      (res.data.results || []).forEach((r: RoundResultRow) => {
        if (r.status === 'advanced') {
          alreadyAdvanced.add(r.userId?._id);
        }
      });
      setSelectedUserIds(alreadyAdvanced);
    } catch (err) {
      console.error('Failed to load round results:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [selectedRound]);

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds(prev => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  };

  // Select Top N performers
  const selectTopN = (n: number) => {
    const topIds = results.slice(0, n).map(r => r.userId?._id).filter(Boolean);
    setSelectedUserIds(new Set(topIds));
  };

  const selectAll = () => {
    const allIds = results.map(r => r.userId?._id).filter(Boolean);
    setSelectedUserIds(new Set(allIds));
  };

  const clearSelection = () => {
    setSelectedUserIds(new Set());
  };

  const handleAdvance = async () => {
    const count = selectedUserIds.size;
    if (count === 0) {
      alert('Please select at least one participant to advance.');
      return;
    }

    if (
      !confirm(
        `Are you sure you want to advance ${count} participants to Round ${selectedRound + 1}? All unselected participants who took this round will be marked ELIMINATED.`
      )
    ) {
      return;
    }

    setIsAdvancing(true);
    try {
      const res = await api.post(`/admin/rounds/${selectedRound}/advance`, {
        participantIds: Array.from(selectedUserIds)
      });
      alert(res.data.message || 'Advancement completed!');
      await fetchResults();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to advance participants');
    } finally {
      setIsAdvancing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Round Tab Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
          {[1, 2, 3].map(r => (
            <button
              key={r}
              onClick={() => setSelectedRound(r)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedRound === r
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Round {r} Rankings
            </button>
          ))}
        </div>

        <button
          onClick={fetchResults}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Results</span>
        </button>
      </div>

      {/* Top Controls & Top-N Selection Toolbar */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 mr-1">Quick Select Top:</span>
          {[2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => selectTopN(n)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer border border-slate-700"
            >
              Top {n}
            </button>
          ))}
          <button
            onClick={selectAll}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer border border-slate-700"
          >
            All
          </button>
          <button
            onClick={clearSelection}
            className="px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 text-xs font-semibold cursor-pointer"
          >
            Clear
          </button>
        </div>

        {selectedRound < 3 && (
          <button
            onClick={handleAdvance}
            disabled={selectedUserIds.size === 0 || isAdvancing}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            <span>Advance Selected ({selectedUserIds.size}) to Round {selectedRound + 1}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Results Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                {selectedRound < 3 && <th className="p-4 w-12 text-center">Select</th>}
                <th className="p-4 w-16">Rank</th>
                <th className="p-4">Participant</th>
                <th className="p-4">Score</th>
                <th className="p-4">Time Taken</th>
                <th className="p-4">Status</th>
                <th className="p-4">Violations</th>
                <th className="p-4">Submitted At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 font-sans">
                    Loading results...
                  </td>
                </tr>
              ) : results.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 font-sans">
                    No participants have attempted or finished Round {selectedRound} yet.
                  </td>
                </tr>
              ) : (
                results.map((row, idx) => {
                  const uid = row.userId?._id;
                  const isChecked = selectedUserIds.has(uid);

                  return (
                    <tr
                      key={uid || idx}
                      className={`transition-colors ${
                        isChecked ? 'bg-indigo-950/20' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      {selectedRound < 3 && (
                        <td className="p-4 text-center">
                          <button
                            onClick={() => toggleSelectUser(uid)}
                            className="text-slate-400 hover:text-white cursor-pointer"
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-indigo-400 fill-indigo-400/20" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      )}

                      <td className="p-4 font-bold text-white">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-md ${
                            row.rank === 1
                              ? 'bg-amber-500 text-black font-extrabold'
                              : row.rank === 2
                              ? 'bg-slate-300 text-black font-bold'
                              : row.rank === 3
                              ? 'bg-amber-700 text-white font-bold'
                              : 'text-slate-400'
                          }`}
                        >
                          {row.rank}
                        </span>
                      </td>

                      <td className="p-4 font-sans">
                        <div className="font-bold text-white">{row.userId?.name || 'Unknown'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          @{row.userId?.username}
                        </div>
                      </td>

                      <td className="p-4 text-emerald-400 font-bold text-sm">
                        {row.totalScore} pts
                      </td>

                      <td className="p-4 text-slate-300">
                        {Math.floor(row.timeTakenSeconds / 60)}m {row.timeTakenSeconds % 60}s
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            row.status === 'advanced'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : row.status === 'eliminated'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : row.status === 'submitted'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>

                      <td className="p-4">
                        {row.violationCount > 0 ? (
                          <span className="text-rose-400 flex items-center gap-1 font-bold">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            {row.violationCount} strikes
                          </span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>

                      <td className="p-4 text-slate-400 text-[11px]">
                        {row.submittedAt
                          ? new Date(row.submittedAt).toLocaleTimeString()
                          : 'In progress'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
