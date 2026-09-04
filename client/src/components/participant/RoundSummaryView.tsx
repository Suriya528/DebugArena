import React from 'react';
import { CheckCircle2, Clock, ShieldCheck, ShieldAlert, RefreshCw, Lock } from 'lucide-react';
import { RoundProgress, Round } from '../../types/index.js';

interface RoundSummaryViewProps {
  round?: Round;
  progress?: RoundProgress;
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
      <div className="rounded-3xl bg-slate-900/95 border border-slate-800 p-8 sm:p-12 shadow-2xl backdrop-blur-xl text-center relative overflow-hidden">
        {/* Glow ambient accent */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {isEliminated ? (
            <div>
              <div className="w-20 h-20 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto mb-6">
                <ShieldAlert className="w-10 h-10 text-rose-500" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">
                Round Concluded
              </h2>
              <p className="text-sm text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
                Thank you for competing in DebugArena. The current round has finished and you did not advance to subsequent stages.
              </p>
            </div>
          ) : isWaitingAdvancement ? (
            <div>
              <div className="w-20 h-20 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-cyan-400 animate-spin" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">
                Awaiting Round Evaluation
              </h2>
              <p className="text-sm text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
                Your submission is securely locked on the server. The tournament administrators are reviewing submissions to announce advancements.
              </p>
            </div>
          ) : (
            <div>
              {/* Submission Success Icon */}
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-950/40">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>

              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Assessment Received & Verified</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3">
                Submitted Successfully
              </h1>
              <p className="text-sm text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
                Your responses have been transmitted to the server and locked against further modifications.
              </p>

              {/* Status info grid — STRICTLY NO SCORES OR MARKS DISPLAYED */}
              <div className="grid sm:grid-cols-2 gap-4 mb-8 text-left max-w-lg mx-auto">
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" /> Submission Status
                  </div>
                  <div className="text-base font-bold text-emerald-400">
                    Recorded & Locked
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Integrity hash verified</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" /> Time Elapsed
                  </div>
                  <div className="text-base font-bold text-white font-mono">
                    {progress?.timeTakenSeconds
                      ? `${Math.floor(progress.timeTakenSeconds / 60)}m ${progress.timeTakenSeconds % 60}s`
                      : 'Completed'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Logged on server</div>
                </div>
              </div>

              {/* Confidentiality Notice */}
              <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 mb-8 text-left text-xs text-indigo-300 leading-relaxed max-w-lg mx-auto">
                <strong className="text-white block mb-1">Confidential Scoring Protocol:</strong>
                In compliance with competition rules, participant scores and rankings remain confidential until officially declared by tournament coordinators.
              </div>

              {progress?.status === 'advanced' && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 mb-8 text-emerald-300 text-sm font-bold max-w-lg mx-auto">
                  🎉 Congratulations! You have been advanced to the next round by the administrator.
                </div>
              )}
            </div>
          )}

          <button
            onClick={onRefresh}
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 mx-auto transition-all cursor-pointer shadow-lg shadow-indigo-600/25 active:scale-[0.98]"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Check Advancement Status</span>
          </button>
        </div>
      </div>
    </div>
  );
};
