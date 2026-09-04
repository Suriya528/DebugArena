import React, { useState, useEffect } from 'react';
import { Trophy, Download, Award, Clock, RefreshCw, Medal } from 'lucide-react';
import { LeaderboardRow } from '../../types/index.js';
import { api } from '../../services/api.js';

export const LeaderboardView: React.FC = () => {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/leaderboard');
      setRows(res.data.leaderboard || []);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const handleExportCSV = () => {
    if (rows.length === 0) return;

    const headers = [
      'Rank',
      'Team Name',
      'Username',
      'R1 Score',
      'R2 Score',
      'R3 Score',
      'Total Score',
      'Total Time (s)',
      'Status'
    ];

    const csvLines = [headers.join(',')];
    rows.forEach(r => {
      csvLines.push(
        [
          r.rank,
          `"${r.name.replace(/"/g, '""')}"`,
          r.username,
          r.r1Score,
          r.r2Score,
          r.r3Score,
          r.totalScore,
          r.totalTimeSeconds,
          r.isDisqualified ? 'Disqualified' : r.lastStatus
        ].join(',')
      );
    });

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `debugarena_final_leaderboard_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2">
            <Trophy className="w-3.5 h-3.5" />
            <span>Official Admin Standings</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Final Tournament Leaderboard
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Aggregated standings across Round 1, Round 2, and Round 3 with tie-break resolutions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchLeaderboard}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 cursor-pointer transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Podium Top 3 Cards (if at least 3 rows) */}
      {rows.length >= 3 && !loading && (
        <div className="grid sm:grid-cols-3 gap-4 pt-2">
          {/* Rank 2 */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-700 shadow-xl flex flex-col justify-between order-2 sm:order-1 sm:mt-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="w-8 h-8 rounded-xl bg-slate-300 text-black font-extrabold flex items-center justify-center text-sm shadow">
                  2
                </span>
                <span className="text-xs text-slate-400 font-mono">1st Runner Up</span>
              </div>
              <h3 className="text-base font-bold text-white">{rows[1].name}</h3>
              <div className="text-xs text-slate-400 font-mono">@{rows[1].username}</div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs font-mono">
              <span className="text-emerald-400 font-bold text-base">{rows[1].totalScore} pts</span>
              <span className="text-slate-400">
                {Math.floor(rows[1].totalTimeSeconds / 60)}m {rows[1].totalTimeSeconds % 60}s
              </span>
            </div>
          </div>

          {/* Rank 1 (Champion) */}
          <div className="p-6 rounded-2xl bg-gradient-to-b from-amber-500/15 via-slate-900 to-slate-900 border-2 border-amber-500/50 shadow-2xl shadow-amber-500/10 flex flex-col justify-between order-1 sm:order-2">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="w-10 h-10 rounded-xl bg-amber-400 text-black font-black flex items-center justify-center text-base shadow-lg shadow-amber-400/30">
                  👑 1
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Champion
                </span>
              </div>
              <h3 className="text-lg font-black text-white">{rows[0].name}</h3>
              <div className="text-xs text-amber-300 font-mono">@{rows[0].username}</div>
            </div>
            <div className="mt-5 pt-4 border-t border-amber-500/20 flex justify-between items-center text-xs font-mono">
              <span className="text-amber-400 font-black text-xl">{rows[0].totalScore} pts</span>
              <span className="text-slate-300">
                {Math.floor(rows[0].totalTimeSeconds / 60)}m {rows[0].totalTimeSeconds % 60}s
              </span>
            </div>
          </div>

          {/* Rank 3 */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-700 shadow-xl flex flex-col justify-between order-3 sm:mt-10">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="w-8 h-8 rounded-xl bg-amber-700 text-white font-extrabold flex items-center justify-center text-sm shadow">
                  3
                </span>
                <span className="text-xs text-slate-400 font-mono">2nd Runner Up</span>
              </div>
              <h3 className="text-base font-bold text-white">{rows[2].name}</h3>
              <div className="text-xs text-slate-400 font-mono">@{rows[2].username}</div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs font-mono">
              <span className="text-emerald-400 font-bold text-base">{rows[2].totalScore} pts</span>
              <span className="text-slate-400">
                {Math.floor(rows[2].totalTimeSeconds / 60)}m {rows[2].totalTimeSeconds % 60}s
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="p-4 w-16">Rank</th>
                <th className="p-4">Participant Team</th>
                <th className="p-4">R1 (MCQ)</th>
                <th className="p-4">R2 (Code)</th>
                <th className="p-4">R3 (Code)</th>
                <th className="p-4">Total Score</th>
                <th className="p-4">Total Time</th>
                <th className="p-4">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 font-sans">
                    Loading standings...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 font-sans">
                    No participants recorded yet.
                  </td>
                </tr>
              ) : (
                rows.map(r => (
                  <tr key={r.userId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-bold">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${
                          r.rank === 1
                            ? 'bg-amber-400 text-black font-black'
                            : r.rank === 2
                            ? 'bg-slate-300 text-black font-bold'
                            : r.rank === 3
                            ? 'bg-amber-700 text-white font-bold'
                            : 'text-slate-400'
                        }`}
                      >
                        {r.rank}
                      </span>
                    </td>

                    <td className="p-4 font-sans">
                      <div className="font-bold text-white">{r.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">@{r.username}</div>
                    </td>

                    <td className="p-4 text-slate-300">{r.r1Score} pts</td>
                    <td className="p-4 text-slate-300">{r.r2Score} pts</td>
                    <td className="p-4 text-slate-300">{r.r3Score} pts</td>

                    <td className="p-4 text-emerald-400 font-bold text-sm">
                      {r.totalScore} pts
                    </td>

                    <td className="p-4 text-slate-300">
                      {Math.floor(r.totalTimeSeconds / 60)}m {r.totalTimeSeconds % 60}s
                    </td>

                    <td className="p-4 font-sans">
                      {r.isDisqualified ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400">
                          Disqualified
                        </span>
                      ) : (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            r.rank === 1
                              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {r.rank === 1 ? 'Winner' : r.lastStatus}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
