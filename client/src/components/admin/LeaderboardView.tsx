import React, { useState, useEffect } from 'react';
import { Trophy, Download, Award, Clock, RefreshCw, Medal, Search, Layers, Lock, Eye, EyeOff, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { LeaderboardRow, DynamicRound } from '../../types/index.js';
import { api, lockDynamicRound } from '../../services/api.js';
import { useRealtime } from '../../context/SocketContext.js';

interface LeaderboardViewProps {
  eventId?: string;
  rounds?: DynamicRound[];
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ eventId: propEventId, rounds: propRounds }) => {
  const { socket } = useRealtime();
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [eventRounds, setEventRounds] = useState<any[]>(propRounds || []);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [activeCollege, setActiveCollege] = useState<any>(null);
  const [activeEvent, setActiveEvent] = useState<any>(null);
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [isUnblinded, setIsUnblinded] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleFinishRound = async (roundNumber: number) => {
    const evId = propEventId || activeEvent?._id;
    if (!evId) return;
    if (!window.confirm(`Finish and LOCK Round ${roundNumber} now? This will finalize all contestant attempts and reveal the official tournament leaderboard.`)) {
      return;
    }
    try {
      setActionLoading(`lock_${roundNumber}`);
      await lockDynamicRound(evId, roundNumber);
      await fetchLeaderboard(evId);
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to lock round');
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    if (propRounds && propRounds.length > 0) {
      setEventRounds(propRounds);
    }
  }, [propRounds]);

  const fetchLeaderboard = async (targetEventId?: string, isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const evId = propEventId || targetEventId || activeEvent?._id;
      const url = evId ? `/admin/leaderboard?eventId=${encodeURIComponent(evId)}` : '/admin/leaderboard';
      const res = await api.get(url);
      setRows(res.data.leaderboard || []);
      if (res.data.rounds && res.data.rounds.length > 0) {
        setEventRounds(res.data.rounds);
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  // Real-time live scoreboard refresh on socket events & periodic 6s pulse
  useEffect(() => {
    const targetEvId = propEventId || activeEvent?._id;
    const interval = setInterval(() => {
      fetchLeaderboard(targetEvId, true);
    }, 6000);

    if (!socket) return () => clearInterval(interval);

    const handleUpdate = (data: any) => {
      if (!targetEvId || !data?.eventId || data.eventId === targetEvId) {
        fetchLeaderboard(targetEvId, true);
      }
    };

    socket.on('admin:leaderboard_update', handleUpdate);
    socket.on('admin:participant_submitted', handleUpdate);
    socket.on('admin:submit_code', handleUpdate);
    socket.on('round:completed', handleUpdate);
    socket.on('round:locked', handleUpdate);

    return () => {
      clearInterval(interval);
      socket.off('admin:leaderboard_update', handleUpdate);
      socket.off('admin:participant_submitted', handleUpdate);
      socket.off('admin:submit_code', handleUpdate);
      socket.off('round:completed', handleUpdate);
      socket.off('round:locked', handleUpdate);
    };
  }, [socket, propEventId, activeEvent?._id]);

  useEffect(() => {
    async function loadMetaAndLeaderboard() {
      try {
        setLoading(true);
        if (propEventId) {
          // Strictly lock to propEventId
          const [evRes, lbRes] = await Promise.all([
            api.get(`/admin/events/${propEventId}`).catch(() => null),
            api.get(`/admin/leaderboard?eventId=${encodeURIComponent(propEventId)}`)
          ]);
          if (evRes?.data?.event) {
            setActiveEvent(evRes.data.event);
            if (evRes.data.rounds && evRes.data.rounds.length > 0) {
              setEventRounds(evRes.data.rounds);
            }
          } else if (propRounds && propRounds.length > 0) {
            setEventRounds(propRounds);
          }
          setRows(lbRes?.data?.leaderboard || []);
          if (lbRes?.data?.rounds && lbRes.data.rounds.length > 0) {
            setEventRounds(lbRes.data.rounds);
          }
        } else {
          // Standalone / fallback mode
          const colRes = await api.get('/admin/events/colleges');
          if (colRes.data.colleges && colRes.data.colleges.length > 0) {
            setActiveCollege(colRes.data.colleges[0]);
          }

          const evRes = await api.get('/admin/events');
          const evList = evRes.data.events || [];
          setEventsList(evList);

          const savedEventId = localStorage.getItem('debugarena_active_event_id');
          const matched = evList.find((e: any) => e._id === savedEventId) || evList[0] || null;
          setActiveEvent(matched);

          const effectiveId = matched?._id;
          const url = effectiveId ? `/admin/leaderboard?eventId=${effectiveId}` : '/admin/leaderboard';
          const lbRes = await api.get(url);
          setRows(lbRes.data.leaderboard || []);
          if (lbRes.data.rounds && lbRes.data.rounds.length > 0) {
            setEventRounds(lbRes.data.rounds);
          }
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

  const finishedRounds = eventRounds.filter(r => r.status === 'completed' || r.status === 'locked');
  const activeRounds = eventRounds.filter(r => r.status === 'active');
  const hasRoundsConfigured = eventRounds.length > 0;
  const isAnyRoundFinished = finishedRounds.length > 0;
  const hasSubmittedParticipants = rows.some(r => r.lastStatus === 'submitted' || r.lastStatus === 'eliminated');
  const shouldShowLeaderboard = !hasRoundsConfigured || isAnyRoundFinished || isUnblinded || hasSubmittedParticipants;

  const getDisplayTotalScore = (r: LeaderboardRow) => {
    if (isUnblinded || !hasRoundsConfigured) return r.totalScore;
    return finishedRounds.reduce((sum, er) => {
      const s = r.roundScores?.[er.roundNumber] ?? (r as any)[`r${er.roundNumber}Score`] ?? 0;
      return sum + s;
    }, 0);
  };

  const getDisplayTotalTime = (r: LeaderboardRow) => {
    if (isUnblinded || !hasRoundsConfigured) return r.totalTimeSeconds;
    return finishedRounds.reduce((sum, er) => {
      const t = r.roundTimes?.[er.roundNumber] ?? 0;
      return sum + t;
    }, 0);
  };

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

      {/* If round has not finished yet: Display Institutional Locked Notice */}
      {!shouldShowLeaderboard ? (
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-2xl space-y-6 my-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/5">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Leaderboard Locked During Round
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Official Standings Available After Round Finishes
            </h2>
            <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
              Contestant standings, scores, and ranks are locked during live evaluation to preserve competition integrity. The official leaderboard will be published automatically once the active round concludes.
            </p>
          </div>

          {/* Current Stage Status Pill */}
          {activeRounds.length > 0 ? (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-3 max-w-lg mx-auto">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-slate-400 uppercase font-bold">Active Stage:</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Now
                </span>
              </div>
              <div className="font-bold text-white text-base">
                Stage {activeRounds[0].roundNumber}: {activeRounds[0].title}
              </div>
              <div className="text-xs text-slate-400 font-mono flex items-center gap-3">
                <span>{activeRounds[0].type?.toUpperCase() || 'ASSESSMENT'}</span>
                <span>•</span>
                <span>{activeRounds[0].durationMinutes} Minutes</span>
                {activeRounds[0].totalMarks > 0 && (
                  <>
                    <span>•</span>
                    <span>{activeRounds[0].totalMarks} Marks</span>
                  </>
                )}
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  onClick={() => handleFinishRound(activeRounds[0].roundNumber)}
                  disabled={actionLoading !== null}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 cursor-pointer transition-all disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  <span>
                    {actionLoading === `lock_${activeRounds[0].roundNumber}`
                      ? 'Finalizing Round...'
                      : `End Round ${activeRounds[0].roundNumber} & Finalize Leaderboard`}
                  </span>
                </button>
                <button
                  onClick={() => fetchLeaderboard()}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-2 max-w-lg mx-auto">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-slate-400 uppercase font-bold">Upcoming Stage:</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono text-[10px] font-bold">
                  Scheduled
                </span>
              </div>
              <div className="font-bold text-white text-sm">
                {eventRounds[0]?.title || 'Stage 1'} (Not Started)
              </div>
              <p className="text-xs text-slate-500">
                Start Round 1 from the Stages control panel. The leaderboard will be displayed after contestants complete the round.
              </p>
            </div>
          )}

          {/* Organizer Unblind Emergency Override */}
          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-xs">
            <button
              onClick={() => setIsUnblinded(true)}
              className="text-slate-500 hover:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer text-[11px] font-mono"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview in-progress live scores (Organizer Unblind)</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Supervisory Notice if organizer explicitly unblinded while rounds are still running */}
          {isUnblinded && !isAnyRoundFinished && (
            <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Supervisory Preview: Showing in-progress unfinalized attempts. Official standings are finalized upon round conclusion.</span>
              </div>
              <button
                onClick={() => setIsUnblinded(false)}
                className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-bold shrink-0 cursor-pointer"
              >
                Re-lock Leaderboard
              </button>
            </div>
          )}

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
                      {eventRounds.map(er => {
                        const isRoundFin = er.status === 'completed' || er.status === 'locked' || isUnblinded;
                        return (
                          <span key={er.roundNumber} className="px-1.5 py-0.5 rounded bg-slate-950 text-[10px] font-mono text-slate-400 border border-slate-800">
                            S{er.roundNumber}: <strong className="text-slate-200">{isRoundFin ? (rows[1].roundScores?.[er.roundNumber] ?? (rows[1] as any)[`r${er.roundNumber}Score`] ?? 0) : 'In Progress'}</strong>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs font-mono">
                  <span className="text-emerald-400 font-bold text-base">{getDisplayTotalScore(rows[1])} pts</span>
                  <span className="text-slate-400">
                    {Math.floor(getDisplayTotalTime(rows[1]) / 60)}m {getDisplayTotalTime(rows[1]) % 60}s
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
                      {eventRounds.map(er => {
                        const isRoundFin = er.status === 'completed' || er.status === 'locked' || isUnblinded;
                        return (
                          <span key={er.roundNumber} className="px-1.5 py-0.5 rounded bg-slate-950 text-[10px] font-mono text-slate-300 border border-amber-500/30">
                            S{er.roundNumber}: <strong className="text-amber-300">{isRoundFin ? (rows[0].roundScores?.[er.roundNumber] ?? (rows[0] as any)[`r${er.roundNumber}Score`] ?? 0) : 'In Progress'}</strong>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="mt-5 pt-4 border-t border-amber-500/20 flex justify-between items-center text-xs font-mono">
                  <span className="text-amber-400 font-black text-xl">{getDisplayTotalScore(rows[0])} pts</span>
                  <span className="text-slate-300">
                    {Math.floor(getDisplayTotalTime(rows[0]) / 60)}m {getDisplayTotalTime(rows[0]) % 60}s
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
                      {eventRounds.map(er => {
                        const isRoundFin = er.status === 'completed' || er.status === 'locked' || isUnblinded;
                        return (
                          <span key={er.roundNumber} className="px-1.5 py-0.5 rounded bg-slate-950 text-[10px] font-mono text-slate-400 border border-slate-800">
                            S{er.roundNumber}: <strong className="text-amber-400">{isRoundFin ? (rows[2].roundScores?.[er.roundNumber] ?? (rows[2] as any)[`r${er.roundNumber}Score`] ?? 0) : 'In Progress'}</strong>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs font-mono">
                  <span className="text-emerald-400 font-bold text-base">{getDisplayTotalScore(rows[2])} pts</span>
                  <span className="text-slate-400">
                    {Math.floor(getDisplayTotalTime(rows[2]) / 60)}m {getDisplayTotalTime(rows[2]) % 60}s
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
                    {eventRounds.map(r => {
                      const isRoundFin = r.status === 'completed' || r.status === 'locked' || isUnblinded;
                      return (
                        <th key={r.roundNumber} className="p-4 text-center">
                          <div className="text-white font-bold text-xs flex items-center justify-center gap-1.5">
                            <span>Stage {r.roundNumber}</span>
                            <span className={`text-[9px] uppercase font-mono px-1 py-0.2 rounded ${
                              isRoundFin ? 'bg-slate-800 text-indigo-300' : 'bg-amber-500/20 text-amber-300 font-bold'
                            }`}>
                              {isRoundFin ? r.type : 'LIVE'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-normal lowercase truncate max-w-[120px] mx-auto mt-0.5">
                            {r.title}
                          </div>
                        </th>
                      );
                    })}
                    <th className="p-4 text-center">Total Score</th>
                    <th className="p-4 text-center">Total Time</th>
                    <th className="p-4 text-center">Outcome</th>
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
                          const isRoundFin = er.status === 'completed' || er.status === 'locked' || isUnblinded;
                          if (!isRoundFin) {
                            return (
                              <td key={er.roundNumber} className="p-4 text-center font-mono">
                                <span className="inline-flex items-center gap-1 text-[11px] text-amber-400/90 font-medium px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                                  <Clock className="w-3 h-3 animate-spin" /> In Progress
                                </span>
                              </td>
                            );
                          }
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
                            {getDisplayTotalScore(r)} <span className="text-[10px] font-normal text-emerald-500">pts</span>
                          </span>
                        </td>

                        <td className="p-4 text-center text-slate-300 font-mono text-xs">
                          {Math.floor(getDisplayTotalTime(r) / 60)}m {getDisplayTotalTime(r) % 60}s
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
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
