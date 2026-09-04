import React from 'react';
import { CheckCircle2, Clock, Award, ShieldAlert, AlertCircle, RefreshCw } from 'lucide-react';
import { RoundProgress, Round } from '../../types/index.js';

interface RoundSummaryViewProps {
  round: Round;
  progress: RoundProgress;
  onRefresh: () => void;
  isEliminated?: boolean;
  isWaitingAdvancement?: boolean;
}

export const RoundSummaryView: React.FC<RoundSummaryViewProps> = ({
  round,
  progress,
  onRefresh,
  isEliminated,
  isWaitingAdvancement
}) => {
  return (
    <div className="max-w-2xl mx-auto py-16 px-4">
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-8 sm:p-10 shadow-2xl backdrop-blur-xl text-center">
        {isEliminated ? (
          <div>
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-6">
              <ShieldAlert className="w-8 h-8 text-rose-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Round Concluded</h2>
            <p className="text-sm text-slate-400 mb-6">
              Thank you for participating in DebugArena. You did not advance to the next round of the competition.
            </p>
          </div>
        ) : isWaitingAdvancement ? (
          <div>
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-6">
              <Clock className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Awaiting Round Results</h2>
            <p className="text-sm text-slate-400 mb-6">
              The administrator is currently reviewing submissions and deciding top performer advancements. Please hold on.
            </p>
          </div>
        ) : (
          <div>
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Round {round.roundNumber} Submitted!
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              Your answers have been evaluated and recorded on the server.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-8 text-left">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-emerald-400" /> Total Score
                </div>
                <div className="text-2xl font-extrabold text-emerald-400 font-mono">
                  {progress.totalScore} pts
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" /> Time Taken
                </div>
                <div className="text-2xl font-extrabold text-white font-mono">
                  {Math.floor(progress.timeTakenSeconds / 60)}m {progress.timeTakenSeconds % 60}s
                </div>
              </div>
            </div>

            {progress.status === 'advanced' && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 mb-6 text-emerald-300 text-sm font-semibold">
                🎉 Congratulations! You have been advanced by the admin to Round {round.roundNumber + 1}!
              </div>
            )}
          </div>
        )}

        <button
          onClick={onRefresh}
          className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 mx-auto transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Check Advancement Status</span>
        </button>
      </div>
    </div>
  );
};
