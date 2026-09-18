import React from 'react';
import {
  CheckCircle2,
  Clock,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Lock,
  Trophy,
  Play,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { RoundProgress, Round } from '../../types/index.js';

interface RoundSummaryViewProps {
  round?: Round;
  progress?: RoundProgress;
  onRefresh: () => void;
  isEliminated?: boolean;
  isWaitingAdvancement?: boolean;
  isQualifiedWaitingNextRound?: boolean;
  nextRoundAvailable?: boolean;
  isFinalRound?: boolean;
  onEnterNextRound?: () => void;
}

export const RoundSummaryView: React.FC<RoundSummaryViewProps> = ({
  round,
  progress,
  onRefresh,
  isEliminated,
  isWaitingAdvancement,
  isQualifiedWaitingNextRound,
  nextRoundAvailable,
  isFinalRound,
  onEnterNextRound
}) => {

  return (
    <div className="max-w-2xl mx-auto py-8 sm:py-16 px-3 sm:px-4">
      <div className="rounded-3xl bg-slate-900/95 border border-slate-800 p-5 sm:p-12 shadow-2xl backdrop-blur-xl text-center relative overflow-hidden">
        {/* Glow ambient accent */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Case 1: Eliminated (Not Selected) */}
          {isEliminated ? (
            <div>
              <div className="w-20 h-20 rounded-3xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-rose-950/40">
                <ShieldAlert className="w-10 h-10 text-rose-500" />
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-3 font-mono uppercase">
                <span>Not Selected</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">
                Round Concluded
              </h2>
              <p className="text-sm text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
                Thank you for attending and competing in Debug Arena. You have not been selected for subsequent stages.
              </p>
            </div>
          ) : isFinalRound && (progress?.status === 'submitted' || progress?.status === 'advanced') ? (
            /* Case 2: Final Round Completed */
            <div>
              <div className="w-20 h-20 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-amber-950/40">
                <Trophy className="w-10 h-10 text-amber-400" />
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3 font-mono uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tournament Completed</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-3">
                Congratulations!
              </h1>
              <p className="text-sm text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
                You have finished all rounds of this competition. Final official rankings and scores will be released by the coordinators.
              </p>
            </div>
          ) : nextRoundAvailable ? (
            /* Case 3: Qualified AND Next Round is LIVE */
            <div>
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-950/40 animate-pulse">
                <Play className="w-10 h-10 text-emerald-400 fill-current" />
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 mb-3 font-mono uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Next Round Is Live</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-3">
                Selected for Next Round!
              </h1>
              <p className="text-sm text-slate-300 mb-8 max-w-md mx-auto leading-relaxed">
                The administrator has launched the next stage of the tournament. Click below to proceed to your next challenge.
              </p>
              {onEnterNextRound && (
                <div className="mb-8">
                  <button
                    onClick={onEnterNextRound}
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 mx-auto transition-all cursor-pointer shadow-xl shadow-emerald-500/25 active:scale-95"
                  >
                    <span>Enter Next Round</span>
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              )}
            </div>
          ) : isQualifiedWaitingNextRound ? (
            /* Case 4: Qualified BUT Next Round is NOT yet live */
            <div>
              <div className="w-20 h-20 rounded-3xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-950/40">
                <CheckCircle2 className="w-10 h-10 text-indigo-400" />
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 mb-3 font-mono uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Qualified Candidate</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-3">
                Selected for Next Round
              </h1>
              <p className="text-sm text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
                Congratulations! You have qualified for the next round. Please wait for the tournament administrator to start the round.
              </p>
            </div>
          ) : isWaitingAdvancement ? (
            /* Case 5: Waiting for Admin to evaluate/advance */
            <div>
              <div className="w-20 h-20 rounded-3xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-cyan-400 animate-spin" />
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-3 font-mono uppercase">
                <span>Evaluation in Progress</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">
                Awaiting Round Evaluation
              </h2>
              <p className="text-sm text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
                Your submission is securely locked on the server. The tournament administrators are reviewing submissions to announce advancements.
              </p>
            </div>
          ) : (
            /* Case 6: Standard Initial Submission Recorded */
            <div>
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-950/40">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>

              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3 font-mono uppercase">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Assessment Received &amp; Verified</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-3">
                Submitted Successfully
              </h1>
              <p className="text-sm text-slate-400 mb-6 sm:mb-8 max-w-md mx-auto leading-relaxed">
                Your responses have been transmitted to the server and locked against further modifications.
              </p>

              {/* Status info grid — STRICTLY NO SCORES OR MARKS DISPLAYED */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8 text-left max-w-lg mx-auto">
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" /> Submission Status
                  </div>
                  <div className="text-base font-bold text-emerald-400">
                    Recorded &amp; Locked
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
              <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 mb-6 sm:mb-8 text-left text-xs text-indigo-300 leading-relaxed max-w-lg mx-auto">
                <strong className="text-white block mb-1">Confidential Scoring Protocol:</strong>
                In compliance with competition rules, participant scores and rankings remain confidential until officially declared by tournament coordinators.
              </div>
            </div>
          )}

          {/* Refresh Action (not shown if eliminated) */}
          {!isEliminated && !isFinalRound && !nextRoundAvailable && (
            <button
              onClick={onRefresh}
              className="w-full sm:w-auto px-6 sm:px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 mx-auto transition-all cursor-pointer shadow-lg shadow-indigo-600/25 active:scale-[0.98]"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh Status</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

