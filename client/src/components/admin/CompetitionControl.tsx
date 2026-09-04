import React, { useState, useEffect } from 'react';
import { Play, Lock, AlertOctagon, Pause, CheckCircle2, Settings, Shield, Clock } from 'lucide-react';
import { Round, Competition } from '../../types/index.js';
import { api } from '../../services/api.js';

export const CompetitionControl: React.FC = () => {
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [compRes, roundsRes] = await Promise.all([
        api.get('/admin/competition'),
        api.get('/admin/rounds')
      ]);
      setCompetition(compRes.data.competition);
      setRounds(roundsRes.data.rounds);
    } catch (err) {
      console.error('Failed to load competition data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStartRound = async (roundNumber: number) => {
    if (!confirm(`Are you sure you want to START Round ${roundNumber}? This will activate the timer and allow eligible participants to begin.`)) return;
    setActionLoading(`start_${roundNumber}`);
    try {
      await api.post(`/admin/rounds/${roundNumber}/start`);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to start round');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLockRound = async (roundNumber: number) => {
    if (!confirm(`Are you sure you want to LOCK Round ${roundNumber}? All active participants will be auto-submitted and their final scores graded.`)) return;
    setActionLoading(`lock_${roundNumber}`);
    try {
      await api.post(`/admin/rounds/${roundNumber}/lock`);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to lock round');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateSettings = async (field: string, value: any) => {
    try {
      const res = await api.patch('/admin/competition', { [field]: value });
      setCompetition(res.data.competition);
    } catch (err) {
      alert('Failed to update setting');
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-slate-400">Loading competition controls...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Global Competition Header Card */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Tournament Control Center
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              {competition?.title || 'DebugArena Championship'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-medium">Status:</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                competition?.status === 'active'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : competition?.status === 'paused'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {competition?.status || 'Active'}
            </span>

            {competition?.status === 'active' ? (
              <button
                onClick={() => handleUpdateSettings('status', 'paused')}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600/20 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 hover:bg-amber-600/30 transition-all cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Event</span>
              </button>
            ) : (
              <button
                onClick={() => handleUpdateSettings('status', 'active')}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-600/30 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Resume Event</span>
              </button>
            )}
          </div>
        </div>

        {/* Proctoring Settings */}
        <div className="pt-6 grid sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-indigo-400" />
              <div>
                <div className="text-xs font-bold text-white">Full-Screen Violation Limit</div>
                <div className="text-[11px] text-slate-400">Strikes allowed before auto-submit</div>
              </div>
            </div>
            <select
              value={competition?.violationLimit || 3}
              onChange={e => handleUpdateSettings('violationLimit', parseInt(e.target.value, 10))}
              className="bg-slate-900 border border-slate-700 text-xs font-bold text-white rounded-lg px-3 py-1.5 cursor-pointer"
            >
              <option value={1}>1 Strike</option>
              <option value={2}>2 Strikes</option>
              <option value={3}>3 Strikes (Default)</option>
              <option value={5}>5 Strikes</option>
            </select>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertOctagon className="w-5 h-5 text-rose-400" />
              <div>
                <div className="text-xs font-bold text-white">Auto-Submit on Limit Exceeded</div>
                <div className="text-[11px] text-slate-400">Immediately finalize student's round</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={competition?.autoSubmitOnViolation ?? true}
              onChange={e => handleUpdateSettings('autoSubmitOnViolation', e.target.checked)}
              className="w-5 h-5 rounded accent-indigo-600 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Rounds Control Grid */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-400" />
          Individual Round Timers & Status
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {rounds.map(r => {
            const isActive = r.status === 'active';
            const isLocked = r.status === 'locked' || r.status === 'completed';

            return (
              <div
                key={r.roundNumber}
                className={`rounded-3xl border p-6 flex flex-col justify-between shadow-xl transition-all ${
                  isActive
                    ? 'bg-slate-900 border-indigo-500/50 shadow-indigo-500/10'
                    : 'bg-slate-900/70 border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      Round {r.roundNumber} ({r.type.toUpperCase()})
                    </span>
                    <span
                      className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-md ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-400 animate-pulse'
                          : isLocked
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-2">{r.title}</h3>
                  <p className="text-xs text-slate-400 mb-4 line-clamp-2">
                    {r.description || 'Competition round.'}
                  </p>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 mb-6 text-xs text-slate-300 font-mono space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Duration:</span>
                      <span>{r.durationMinutes} Minutes</span>
                    </div>
                    {r.startedAt && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Started:</span>
                        <span>{new Date(r.startedAt).toLocaleTimeString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Round Control Buttons */}
                <div className="space-y-2">
                  {!isActive && !isLocked && (
                    <button
                      onClick={() => handleStartRound(r.roundNumber)}
                      disabled={actionLoading === `start_${r.roundNumber}`}
                      className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Start Round {r.roundNumber}</span>
                    </button>
                  )}

                  {isActive && (
                    <button
                      onClick={() => handleLockRound(r.roundNumber)}
                      disabled={actionLoading === `lock_${r.roundNumber}`}
                      className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-600/25 transition-all cursor-pointer"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Lock & Auto-Grade Round</span>
                    </button>
                  )}

                  {isLocked && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-400 text-xs font-bold text-center border border-slate-700">
                        Round Concluded
                      </div>
                      <button
                        onClick={() => handleStartRound(r.roundNumber)}
                        title="Reopen round"
                        className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                      >
                        Re-open
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
