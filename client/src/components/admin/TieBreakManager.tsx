import React, { useState, useEffect } from 'react';
import { Split, AlertTriangle, Play, CheckCircle2, Trophy, Clock } from 'lucide-react';
import { api } from '../../services/api.js';
import { Question } from '../../types/index.js';

export const TieBreakManager: React.FC = () => {
  const [hasTies, setHasTies] = useState<boolean>(false);
  const [tiedGroups, setTiedGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('');
  const [isTriggering, setIsTriggering] = useState<boolean>(false);

  const checkTies = async () => {
    try {
      setLoading(true);
      const [tieRes, qRes] = await Promise.all([
        api.get('/admin/tiebreak/check'),
        api.get('/admin/questions', { params: { roundNumber: 99 } })
      ]);
      setHasTies(tieRes.data.hasTies);
      setTiedGroups(tieRes.data.tiedGroups || []);
      const tieQuestions = qRes.data.questions || [];
      setQuestions(tieQuestions);
      if (tieQuestions.length > 0) {
        setSelectedQuestionId(tieQuestions[0]._id);
      }
    } catch (err) {
      console.error('Failed to check tie-break status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkTies();
  }, []);

  const handleTriggerTieBreak = async (group: any[]) => {
    if (!selectedQuestionId) {
      alert('Please select a tie-breaker question.');
      return;
    }

    const userIds = group.map(p => p.userId);
    setIsTriggering(true);

    try {
      await api.post('/admin/tiebreak/trigger', {
        tiedUserIds: userIds,
        questionId: selectedQuestionId,
        durationMinutes: 15
      });
      alert('Tie-Breaker successfully initiated for the tied participants!');
      await checkTies();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to trigger tie break');
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Split className="w-5 h-5 text-amber-400" />
          Sudden-Death Tie-Break Engine
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Detects competitors tied on BOTH total score AND total time taken post-Round 3.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500">Checking for tied competitors...</div>
      ) : !hasTies ? (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No Strict Ties Detected</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Every participant currently has a distinct combination of total points and completion time. No tie-breaker needed.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-300 text-xs">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
            <span>
              <strong>Identical Score & Time Detected:</strong> The competitors listed below are strictly tied on both score and time. Launch a sudden-death question to reorder their final ranks without altering main points.
            </span>
          </div>

          {tiedGroups.map((group, gIdx) => (
            <div
              key={gIdx}
              className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl space-y-5"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Tied Group #{gIdx + 1} ({group.length} Competitors)
                  </h3>
                  <div className="text-xs font-mono text-emerald-400 mt-0.5">
                    Tied at {group[0].totalScore} pts ({group[0].totalTimeSeconds}s total time)
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={selectedQuestionId}
                    onChange={e => setSelectedQuestionId(e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-xs text-white rounded-xl px-3 py-2"
                  >
                    {questions.map(q => (
                      <option key={q._id} value={q._id}>
                        {q.title}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleTriggerTieBreak(group)}
                    disabled={isTriggering}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-600/20"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Launch Tie-Break</span>
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {group.map((p: any) => (
                  <div
                    key={p.userId}
                    className="p-4 rounded-xl bg-slate-950/70 border border-slate-800"
                  >
                    <div className="font-bold text-white text-xs">{p.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">@{p.username}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
