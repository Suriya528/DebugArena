import React, { useState, useEffect } from 'react';
import { Trophy, Download, Award, Clock, RefreshCw, Medal, Search, Layers } from 'lucide-react';
import { LeaderboardRow, DynamicRound } from '../../types/index.js';
import { api } from '../../services/api.js';
import { CertificateModal } from './CertificateModal.js';

interface LeaderboardViewProps {
  eventId?: string;
  rounds?: DynamicRound[];
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ eventId: propEventId, rounds: propRounds }) => {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [eventRounds, setEventRounds] = useState<any[]>(propRounds || []);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCertRow, setSelectedCertRow] = useState<LeaderboardRow | null>(null);
  const [activeCollege, setActiveCollege] = useState<any>(null);
  const [activeEvent, setActiveEvent] = useState<any>(null);
  const [eventsList, setEventsList] = useState<any[]>([]);

  useEffect(() => {
    if (propRounds && propRounds.length > 0) {
      setEventRounds(propRounds);
    }
  }, [propRounds]);

  const fetchLeaderboard = async (targetEventId?: string) => {
    try {
      setLoading(true);
      const evId = targetEventId || propEventId || activeEvent?._id || localStorage.getItem('debugarena_active_event_id');
      const url = evId ? `/admin/leaderboard?eventId=${evId}` : '/admin/leaderboard';
      const res = await api.get(url);
      setRows(res.data.leaderboard || []);
      if (res.data.rounds && res.data.rounds.length > 0) {
        setEventRounds(res.data.rounds);
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function loadMetaAndLeaderboard() {
      try {
        setLoading(true);
        const colRes = await api.get('/admin/events/colleges');
        if (colRes.data.colleges && colRes.data.colleges.length > 0) {
          setActiveCollege(colRes.data.colleges[0]);
        }

        const evRes = await api.get('/admin/events');
        const evList = evRes.data.events || [];
        setEventsList(evList);

        const savedEventId = propEventId || localStorage.getItem('debugarena_active_event_id');
        const matched = evList.find((e: any) => e._id === savedEventId) || (propEventId ? { _id: propEventId } : evList[0]) || null;
        setActiveEvent(matched);

        const effectiveId = propEventId || matched?._id;
        const url = effectiveId ? `/admin/leaderboard?eventId=${effectiveId}` : '/admin/leaderboard';
        const lbRes = await api.get(url);
        setRows(lbRes.data.leaderboard || []);
        if (lbRes.data.rounds && lbRes.data.rounds.length > 0) {
          setEventRounds(lbRes.data.rounds);
        }
      } catch (e) {
        console.warn('Could not load college/event meta', e);
      } finally {
        setLoading(false);
      }
    }
    loadMetaAndLeaderboard();
  }, [propEventId]);

  const handleEventChange = async (evId: string) => {
    const selected = eventsList.find(e => e._id === evId);
    if (selected) {
      setActiveEvent(selected);
      localStorage.setItem('debugarena_active_event_id', selected._id);
      fetchLeaderboard(selected._id);
    }
  };

  const handleExportCSV = () => {
    if (rows.length === 0) return;

    const roundHeaders = eventRounds.map(r => `Stage ${r.roundNumber} - ${r.title} (${r.type})`);
    const headers = [
      'Rank',
      'Team / Candidate Name',
      'Username',
      ...roundHeaders,
      'Total Score (pts)',
      'Total Time (s)',
      'Status / Outcome'
    ];

    const csvLines = [headers.join(',')];
    rows.forEach(r => {
      const roundScoresCols = eventRounds.map(er => {
        return r.roundScores?.[er.roundNumber] ?? (r as any)[`r${er.roundNumber}Score`] ?? 0;
      });

      csvLines.push(
        [
          r.rank,
          `"${r.name.replace(/"/g, '""')}"`,
          r.username,
          ...roundScoresCols,
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
    link.setAttribute('download', `${activeEvent?.name || 'tournament'}_leaderboard_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRows = rows.filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.username.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Trophy className="w-3.5 h-3.5" />
              <span>Official Admin Standings</span>
            </div>

            {/* Certificate Feature Status Indicator */}
            {activeEvent?.certificateConfig?.enabled ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>Certificates: Active</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                <Award className="w-3.5 h-3.5 text-slate-500" />
                <span>Certificates: Disabled</span>
              </div>
            )}
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Final Tournament Leaderboard
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {eventRounds.length > 0
              ? `Consolidated evaluation across all ${eventRounds.length} configured rounds with real-time test verification.`
              : 'Aggregated tournament standings across all evaluation rounds.'}
          </p>

          {/* Configured Round Stage Tags */}
          {eventRounds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-[11px] font-mono text-slate-500 uppercase font-bold flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-400" /> Stages:
              </span>
              {eventRounds.map(r => (
                <span
                  key={r.roundNumber}
                  className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center gap-1.5 shadow-sm"
                >
                  <span className="text-indigo-400 font-bold">Stage {r.roundNumber}:</span>
                  <span className="text-slate-200 truncate max-w-[130px]">{r.title}</span>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 font-bold">
                    {r.type}
                  </span>
                  {r.totalMarks > 0 && (
                    <span className="text-amber-400 text-[10px]">({r.totalMarks} pts)</span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!propEventId && eventsList.length > 1 && (
            <select
              value={activeEvent?._id || ''}
              onChange={e => handleEventChange(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {eventsList.map(ev => (
                <option key={ev._id} value={ev._id}>
                  {ev.name} ({ev.code})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => fetchLeaderboard()}
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

      {/* Search & Filter Strip */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search candidate by name or username..."
            className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>
        <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
          <span>Total Candidates: <strong className="text-white">{rows.length}</strong></span>
          {searchQuery && (
            <span>• Filtered: <strong className="text-indigo-400">{filteredRows.length}</strong></span>
          )}
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
                  🥈 2
                </span>
                <span className="text-xs text-slate-400 font-mono">1st Runner Up</span>
              </div>
              <h3 className="text-base font-bold text-white">{rows[1].name}</h3>
              <div className="text-xs text-slate-400 font-mono">@{rows[1].username}</div>
              {eventRounds.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {eventRounds.map(er => (
                    <span key={er.roundNumber} className="px-1.5 py-0.5 rounded bg-slate-950 text-[10px] font-mono text-slate-400 border border-slate-800">
                      S{er.roundNumber}: <strong className="text-slate-200">{rows[1].roundScores?.[er.roundNumber] ?? (rows[1] as any)[`r${er.roundNumber}Score`] ?? 0}</strong>
                    </span>
                  ))}
                </div>
              )}
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
              {eventRounds.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {eventRounds.map(er => (
                    <span key={er.roundNumber} className="px-1.5 py-0.5 rounded bg-slate-950 text-[10px] font-mono text-slate-300 border border-amber-500/30">
                      S{er.roundNumber}: <strong className="text-amber-300">{rows[0].roundScores?.[er.roundNumber] ?? (rows[0] as any)[`r${er.roundNumber}Score`] ?? 0}</strong>
                    </span>
                  ))}
                </div>
              )}
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
                  🥉 3
                </span>
                <span className="text-xs text-slate-400 font-mono">2nd Runner Up</span>
              </div>
              <h3 className="text-base font-bold text-white">{rows[2].name}</h3>
              <div className="text-xs text-slate-400 font-mono">@{rows[2].username}</div>
              {eventRounds.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {eventRounds.map(er => (
                    <span key={er.roundNumber} className="px-1.5 py-0.5 rounded bg-slate-950 text-[10px] font-mono text-slate-400 border border-slate-800">
                      S{er.roundNumber}: <strong className="text-amber-400">{rows[2].roundScores?.[er.roundNumber] ?? (rows[2] as any)[`r${er.roundNumber}Score`] ?? 0}</strong>
                    </span>
                  ))}
                </div>
              )}
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
                <th className="p-4 w-16 text-center">Rank</th>
                <th className="p-4">Participant / Team</th>
                {eventRounds.map(r => (
                  <th key={r.roundNumber} className="p-4 text-center">
                    <div className="text-white font-bold text-xs flex items-center justify-center gap-1.5">
                      <span>Stage {r.roundNumber}</span>
                      <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-slate-800 text-indigo-300">
                        {r.type}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal lowercase truncate max-w-[120px] mx-auto mt-0.5">
                      {r.title}
                    </div>
                  </th>
                ))}
                <th className="p-4 text-center">Total Score</th>
                <th className="p-4 text-center">Total Time</th>
                <th className="p-4 text-center">Outcome</th>
                <th className="p-4 text-right">Certificate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={5 + eventRounds.length} className="p-8 text-center text-slate-500 font-sans">
                    Loading standings...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={5 + eventRounds.length} className="p-8 text-center text-slate-500 font-sans">
                    {searchQuery ? 'No participants matched your search.' : 'No participants recorded for this event yet.'}
                  </td>
                </tr>
              ) : (
                filteredRows.map(r => (
                  <tr key={r.userId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-bold text-center">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-bold text-xs ${
                          r.rank === 1
                            ? 'bg-amber-400 text-black font-black shadow-md shadow-amber-400/20'
                            : r.rank === 2
                            ? 'bg-slate-300 text-black font-bold'
                            : r.rank === 3
                            ? 'bg-amber-700 text-white font-bold'
                            : 'text-slate-400'
                        }`}
                      >
                        {r.rank === 1 ? '👑 1' : r.rank}
                      </span>
                    </td>

                    <td className="p-4 font-sans">
                      <div className="font-bold text-white text-sm">{r.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                        <span>@{r.username}</span>
                      </div>
                    </td>

                    {/* Dynamic Round Columns */}
                    {eventRounds.map(er => {
                      const score = r.roundScores?.[er.roundNumber] ?? (r as any)[`r${er.roundNumber}Score`] ?? 0;
                      const brk = r.roundBreakdown?.[er.roundNumber];
                      const roundStatus = brk?.status;
                      return (
                        <td key={er.roundNumber} className="p-4 text-center font-mono">
                          <div className="font-bold text-slate-200">
                            {score} <span className="text-[10px] text-slate-500 font-normal">pts</span>
                          </div>
                          {roundStatus && roundStatus !== 'not_started' && (
                            <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase mt-0.5 ${
                              roundStatus === 'advanced'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : roundStatus === 'eliminated'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {roundStatus}
                            </span>
                          )}
                        </td>
                      );
                    })}

                    <td className="p-4 text-center font-mono">
                      <span className="text-emerald-400 font-black text-sm">
                        {r.totalScore} <span className="text-[10px] font-normal text-emerald-500">pts</span>
                      </span>
                    </td>

                    <td className="p-4 text-center text-slate-300 font-mono text-xs">
                      {Math.floor(r.totalTimeSeconds / 60)}m {r.totalTimeSeconds % 60}s
                    </td>

                    <td className="p-4 text-center font-sans">
                      {r.isDisqualified ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          Disqualified
                        </span>
                      ) : (
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            r.rank === 1
                              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                              : r.rank === 2
                              ? 'bg-slate-300/20 text-slate-200 border border-slate-300/30'
                              : r.rank === 3
                              ? 'bg-amber-700/20 text-amber-400 border border-amber-700/30'
                              : r.lastStatus === 'advanced'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : r.lastStatus === 'eliminated'
                              ? 'bg-rose-500/10 text-rose-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {r.rank === 1 ? 'Winner' : r.rank <= 3 ? `Rank ${r.rank}` : r.lastStatus}
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-right font-sans">
                      {activeEvent?.certificateConfig?.enabled ? (
                        <button
                          onClick={() => setSelectedCertRow(r)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-bold border border-amber-500/30 flex items-center gap-1.5 ml-auto cursor-pointer transition-colors shadow-sm shadow-amber-500/10"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>Verify & Issue</span>
                        </button>
                      ) : (
                        <span
                          title="Certificates are disabled for this event"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-500 bg-slate-900/80 border border-slate-800 cursor-not-allowed ml-auto"
                        >
                          <Award className="w-3 h-3 text-slate-600" />
                          <span>Certs Disabled</span>
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

      {/* Certificate Modal */}
      {selectedCertRow && (
        <CertificateModal
          userId={selectedCertRow.userId}
          username={selectedCertRow.username}
          name={selectedCertRow.name}
          rank={selectedCertRow.rank}
          score={selectedCertRow.totalScore}
          eventId={activeEvent?._id}
          eventTitle={activeEvent?.name || 'DebugX Championship 2026'}
          collegeName={activeCollege?.name || 'ABC Institute of Technology'}
          collegeCode={activeCollege?.code || 'ABC-TECH'}
          primaryColor={activeCollege?.primaryColor || '#b8860b'}
          secondaryColor={activeCollege?.secondaryColor || '#d97706'}
          onClose={() => setSelectedCertRow(null)}
        />
      )}
    </div>
  );
};
