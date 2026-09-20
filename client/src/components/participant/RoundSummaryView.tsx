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
  ArrowRight,
  Hourglass
} from 'lucide-react';
import { RoundProgress, Round, ParticipantResultData } from '../../types/index.js';

interface RoundSummaryViewProps {
  round?: Round;
  progress?: RoundProgress;
  onRefresh: () => void;
  isEliminated?: boolean;
  isWaitingAdvancement?: boolean;
  isQualifiedWaitingNextRound?: boolean;
  nextRoundAvailable?: boolean;
  isFinalRound?: boolean;
  resultData?: ParticipantResultData | null;
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
  resultData,
  onEnterNextRound
}) => {

  // Derive the display state based on result publication
  // Priority order: resultData (new system) > legacy flags > default
  const getDisplayState = () => {
    // If result data exists and is published, use it
    if (resultData?.isPublished) {
      if (resultData.status === 'NOT_SELECTED') return 'not_selected';
      if (resultData.status === 'SELECTED') {
        if (isFinalRound) return 'final_round_completed';
        if (nextRoundAvailable) return 'next_round_available';
        return 'selected_waiting';
      }
    }

    // If result data exists but not published = awaiting results
    if (resultData && !resultData.isPublished) return 'result_pending';

    // Legacy fallback for backward compatibility
    if (isEliminated) return 'not_selected';
    if (isFinalRound && (progress?.status === 'submitted' || progress?.status === 'expired' || progress?.status === 'advanced')) return 'final_round_completed';
    if (nextRoundAvailable) return 'next_round_available';
    if (isQualifiedWaitingNextRound) return 'selected_waiting';
    if (isWaitingAdvancement) return 'result_pending';

    // Default: submission recorded, awaiting results
    return 'submission_recorded';
  };

  const displayState = getDisplayState();

  return (
    <div className="max-w-2xl mx-auto py-8 sm:py-16 px-3 sm:px-4">
      <div className="rounded-3xl bg-slate-900/95 border border-slate-800 p-5 sm:p-12 shadow-2xl backdrop-blur-xl text-center relative overflow-hidden">
        {/* Glow ambient accent */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* State: Not Selected (Eliminated) */}
          {displayState === 'not_selected' && (
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
                Sorry, you were not selected. Thank you for participating.
              </p>
              {resultData?.publishedAt && (
                <div className="text-[11px] text-slate-500 font-mono mb-6">
                  Result published: {new Date(resultData.publishedAt).toLocaleString()}
                </div>
              )}
            </div>
          )}

          {/* State: Final Round Completed */}
          {displayState === 'final_round_completed' && (
            <div>
              <div className="w-20 h-20 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-amber-950/40">
                <Trophy className="w-10 h-10 text-amber-400" />
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3 font-mono uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tournament Completed</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-3">
                🎉 Congratulations!
              </h1>
              <p className="text-sm text-slate-300 mb-8 max-w-md mx-auto leading-relaxed">
                You have successfully completed the competition. Thank you for participating.
              </p>
            </div>
          )}

          {/* State: Selected — Next Round is LIVE */}
          {displayState === 'next_round_available' && (
            <div>
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-950/40 animate-pulse">
                <Play className="w-10 h-10 text-emerald-400 fill-current" />
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 mb-3 font-mono uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Next Round Is Live</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-3">
                🎉 Congratulations!
              </h1>
              <p className="text-sm text-slate-300 mb-8 max-w-md mx-auto leading-relaxed">
                You're selected for the next round. Click below to proceed to your next challenge.
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
          )}

          {/* State: Selected but next round NOT yet started */}
          {displayState === 'selected_waiting' && (
            <div>
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-950/40">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 mb-3 font-mono uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Selected</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-3">
                🎉 Congratulations!
              </h1>
              <p className="text-sm text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
                You're selected for the next round. Please wait for the tournament organizer to launch the round.
              </p>
              {resultData?.publishedAt && (
                <div className="text-[11px] text-slate-500 font-mono mb-6">
                  Result published: {new Date(resultData.publishedAt).toLocaleString()}
                </div>
              )}
            </div>
          )}

          {/* State: Result Pending (Submitted, awaiting admin to publish results) */}
          {displayState === 'result_pending' && (
            <div>
              <div className="w-20 h-20 rounded-3xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center mx-auto mb-6">
                <Hourglass className="w-10 h-10 text-cyan-400 animate-pulse" />
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-3 font-mono uppercase">
                <span>Awaiting Results</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">
                Submission Received
              </h2>
              <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto leading-relaxed">
                Your submission has been recorded and locked securely on the server. Results will be announced by the organizer.
              </p>

              {/* Status info grid — NO SCORES */}
              <div className="grid grid-cols-1 gap-3 mb-6 text-left max-w-lg mx-auto">
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" /> Submission Status
                  </div>
                  <div className="text-base font-bold text-emerald-400">
                    Recorded &amp; Locked
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Integrity hash verified</div>
                </div>
              </div>

              {/* Confidentiality Notice */}
              <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 mb-6 text-left text-xs text-indigo-300 leading-relaxed max-w-lg mx-auto">
                <strong className="text-white block mb-1">Results Announcement:</strong>
                Scores, rankings, and selection outcomes will be announced by tournament coordinators after evaluation. You will be notified automatically when results are published.
              </div>
            </div>
          )}

          {/* State: Just Submitted (before result system kicks in — immediate post-submit) */}
          {displayState === 'submission_recorded' && (
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

              {/* Status info grid — NO SCORES OR MARKS DISPLAYED */}
              <div className="grid grid-cols-1 gap-3 mb-6 sm:mb-8 text-left max-w-lg mx-auto">
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" /> Submission Status
                  </div>
                  <div className="text-base font-bold text-emerald-400">
                    Recorded &amp; Locked
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Integrity hash verified</div>
                </div>
              </div>

              {/* Confidentiality Notice */}
              <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 mb-6 sm:mb-8 text-left text-xs text-indigo-300 leading-relaxed max-w-lg mx-auto">
                <strong className="text-white block mb-1">Confidential Scoring Protocol:</strong>
                In compliance with competition rules, participant scores and rankings remain confidential until officially declared by tournament coordinators.
              </div>
            </div>
          )}

          {/* Refresh Action (not shown if eliminated/not selected, final round, or next round available) */}
          {displayState !== 'not_selected' && displayState !== 'final_round_completed' && displayState !== 'next_round_available' && (
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

