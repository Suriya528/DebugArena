import React, { useState, useEffect } from 'react';
import { Award, CheckSquare, Square, ArrowRight, UserCheck, ShieldAlert, Clock, RefreshCw, Zap, Sparkles } from 'lucide-react';
import { RoundResultRow } from '../../types/index.js';
import { api, autoAdvanceParticipants } from '../../services/api.js';

export const RoundResultsView: React.FC = () => {
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [results, setResults] = useState<RoundResultRow[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdvancing, setIsAdvancing] = useState<boolean>(false);
  const [quota, setQuota] = useState<number>(15);
  const [tieStrategy, setTieStrategy] = useState<'expand' | 'strict'>('expand');
  const [advancementSummary, setAdvancementSummary] = useState<string | null>(null);

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
    // Default quotas: Round 1 -> 15 advance, Round 2 -> 10 advance
    setQuota(selectedRound === 1 ? 15 : selectedRound === 2 ? 10 : 5);
    setAdvancementSummary(null);
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

  // Automated Cutoff Advancement using Upfront Quota
  const handleAutoAdvanceByQuota = async () => {
    if (results.length === 0) {
      alert('No results available to auto-advance.');
      return;
    }

    if (
      !confirm(
        `Execute Auto-Advancement for Round ${selectedRound}?\n\nTarget Quota: Top ${quota} participants\nSorting: Score DESC -> Time ASC -> Strikes ASC\nTie Policy: ${tieStrategy === 'expand' ? 'Expand Cutoff (Fairness)' : 'Strict'}\n\nTop participants will be marked ADVANCED and remaining will be marked ELIMINATED.`
      )
    ) {
      return;
    }

    setIsAdvancing(true);
    try {
      const data = await autoAdvanceParticipants(selectedRound, {
        quota,
        tieStrategy
      });
      setAdvancementSummary(data.message);
      alert(data.message || 'Auto-advancement successfully applied!');
      await fetchResults();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to auto-advance participants');
    } finally {
      setIsAdvancing(false);
    }
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

      {/* Top Controls & Upfront Quota Advancement Toolbar */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Automated Cutoff Quota Section */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
              <Zap className="w-4 h-4 fill-amber-400" />
              <span>Advancement Quota:</span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                max={500}
                value={quota}
                onChange={e => setQuota(parseInt(e.target.value, 10) || 1)}
                className="w-16 bg-slate-900 border border-amber-500/40 rounded-lg px-2 py-1 text-xs text-white font-mono font-bold text-center focus:outline-none focus:border-amber-400"
              />
              <span className="text-xs text-slate-400 font-semibold">teams</span>
            </div>
            <select
              value={tieStrategy}
              onChange={e => setTieStrategy(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
            >
              <option value="expand">Fairness: Expand on Tie</option>
              <option value="strict">Strict Slicing</option>
            </select>

            {selectedRound < 3 && (
              <button
                onClick={handleAutoAdvanceByQuota}
                disabled={results.length === 0 || isAdvancing}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-600 hover:from-amber-400 hover:to-emerald-500 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 fill-black" />
                <span>⚡ Auto-Advance Top {quota}</span>
              </button>
            )}
          </div>

          {/* Manual Selection Fallback */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 mr-1">Quick Select:</span>
            {[quota, 5, 10, 15].filter((v, i, a) => a.indexOf(v) === i && v > 0).map(n => (
              <button
                key={n}
                onClick={() => selectTopN(n)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer border border-slate-700"
              >
                Top {n}
              </button>
            ))}
            <button
              onClick={selectAll}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer border border-slate-700"
            >
              All
            </button>
            <button
              onClick={clearSelection}
              className="px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 text-xs font-semibold cursor-pointer"
            >
              Clear
            </button>

            {selectedRound < 3 && (
              <button
                onClick={handleAdvance}
                disabled={selectedUserIds.size === 0 || isAdvancing}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>Advance Selected ({selectedUserIds.size})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {advancementSummary && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{advancementSummary}</span>
          </div>
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
                  const isCutoffPoint = idx === quota - 1 && selectedRound < 3 && results.length > quota;

                  return (
                    <React.Fragment key={uid || idx}>
                      <tr
                        className={`transition-colors ${
                          isChecked ? 'bg-indigo-950/20' : 'hover:bg-slate-800/40'
                        } ${row.userId?.isDisqualified ? 'opacity-60 bg-rose-950/10' : ''}`}
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
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{row.userId?.name || 'Unknown'}</span>
                            {row.userId?.isDisqualified && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                Disqualified
                              </span>
                            )}
                          </div>
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

                      {/* Visual Cutoff Divider Line */}
                      {isCutoffPoint && (
                        <tr className="bg-gradient-to-r from-amber-950/60 via-emerald-950/70 to-amber-950/60 border-y-2 border-amber-500/60">
                          <td colSpan={selectedRound < 3 ? 8 : 7} className="py-2.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-wider text-amber-300">
                              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                              <span>--- ⚡ ADVANCEMENT CUTOFF: TOP {quota} TEAMS ADVANCE TO ROUND {selectedRound + 1} ---</span>
                              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
