import React from 'react';
import { Play, ShieldAlert, CheckCircle2, Award, Clock, ArrowRight, BookOpen } from 'lucide-react';
import { Round } from '../../types/index.js';

interface InstructionsViewProps {
  round: Round;
  onStartRound: () => void;
  isLoading?: boolean;
}

export const InstructionsView: React.FC<InstructionsViewProps> = ({
  round,
  onStartRound,
  isLoading
}) => {
  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-10 px-3 sm:px-4">
      <div className="relative rounded-3xl bg-slate-900/90 border border-slate-800 p-5 sm:p-10 shadow-2xl overflow-hidden backdrop-blur-xl">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3 sm:mb-4">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Assessment Briefing</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-2 sm:mb-3">
            {round.title}
          </h1>
          <p className="text-slate-400 text-sm sm:text-base mb-6 sm:mb-8 max-w-2xl leading-relaxed">
            {round.description || 'Welcome to the debugging assessment. Please read the competition protocol carefully before starting.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
              <Clock className="w-5 h-5 text-indigo-400 mb-2" />
              <div className="text-xs text-slate-400">Time Limit</div>
              <div className="text-base sm:text-lg font-bold text-white">{round.durationMinutes} Minutes</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Strict server countdown</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
              <Award className="w-5 h-5 text-emerald-400 mb-2" />
              <div className="text-xs text-slate-400">Marking Scheme</div>
              <div className="text-base sm:text-lg font-bold text-white">No Negative Marks</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Wrong/unattempted is 0</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
              <ShieldAlert className="w-5 h-5 text-amber-400 mb-2" />
              <div className="text-xs text-slate-400">Proctoring</div>
              <div className="text-base sm:text-lg font-bold text-white">Full-Screen Required</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Max 3 strike limit</div>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-950/60 border border-slate-800/80 p-4 sm:p-6 mb-6 sm:mb-8 space-y-3">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              Competition Rules & Instructions
            </h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">•</span>
                <span>
                  <strong>Full-screen mode:</strong> The test must be taken in full screen. Pressing Esc or switching tabs triggers a violation strike.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">•</span>
                <span>
                  <strong>Continuous Auto-Save:</strong> All answers and code changes are debounced and saved to the server in real-time. In case of browser crash or reload, your progress will be restored instantly.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">•</span>
                <span>
                  <strong>Auto-Submit at Zero:</strong> When the countdown reaches 00:00, your test is automatically collected and evaluated.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">•</span>
                <span>
                  <strong>Admin Advancement:</strong> Only the top performers selected by the administrator will advance to subsequent rounds.
                </span>
              </li>
            </ul>
          </div>

          <button
            onClick={onStartRound}
            disabled={isLoading || round.status !== 'active'}
            className={`w-full py-4 px-6 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all cursor-pointer shadow-xl ${
              round.status === 'active'
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-indigo-600/25 active:scale-[0.99]'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Preparing Environment...
              </span>
            ) : round.status === 'active' ? (
              <>
                <Play className="w-5 h-5 fill-white" />
                <span>Begin Assessment</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <span>Round is currently {round.status}. Waiting for Admin to start.</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
