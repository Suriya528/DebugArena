import React from 'react';
import { ShieldAlert, Maximize2, AlertTriangle, Lock, EyeOff } from 'lucide-react';

interface ViolationModalProps {
  isOpen: boolean;
  violationCount: number;
  violationLimit: number;
  type: string;
  details?: string;
  onResumeFullscreen: () => void;
}

export const ViolationModal: React.FC<ViolationModalProps> = ({
  isOpen,
  violationCount,
  violationLimit,
  type,
  details,
  onResumeFullscreen
}) => {
  if (!isOpen) return null;

  const isFinalWarning = violationCount >= violationLimit - 1;
  const isExceeded = violationCount >= violationLimit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070b13] bg-opacity-95 backdrop-blur-xl p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Red ambient security pulse */}
      <div className="absolute inset-0 border-8 border-rose-600/40 pointer-events-none animate-pulse" />

      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border-2 border-rose-500/70 p-8 shadow-2xl shadow-rose-950/80 text-center">
        {/* Top Warning Icon */}
        <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
          {isExceeded ? (
            <Lock className="w-10 h-10 text-rose-500 animate-bounce" />
          ) : (
            <ShieldAlert className="w-10 h-10 text-rose-400 animate-pulse" />
          )}
        </div>

        {/* Title & Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30 mb-3">
          <EyeOff className="w-3.5 h-3.5" />
          <span>Security Proctoring Lockdown</span>
        </div>

        <h2 className="text-2xl font-black text-white tracking-tight mb-2">
          {isExceeded ? 'Assessment Terminated' : 'Full-Screen Mode Exited'}
        </h2>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6 font-sans">
          {isExceeded
            ? 'You have exceeded the maximum allowed security strikes. Your assessment has been automatically locked and submitted.'
            : 'In compliance with real-world Online Assessment (OA) security standards, all test content is frozen while outside full-screen mode. You must return to full-screen to unlock the test.'}
        </p>

        {/* Strike Meter */}
        <div className="mb-6 p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left">
          <div className="flex justify-between items-center text-xs font-mono mb-2">
            <span className="text-slate-400">Violation Strike Counter:</span>
            <span
              className={`font-black text-sm ${
                isExceeded
                  ? 'text-rose-500'
                  : isFinalWarning
                  ? 'text-amber-400'
                  : 'text-indigo-400'
              }`}
            >
              {violationCount} / {violationLimit} Strikes
            </span>
          </div>

          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isExceeded ? 'bg-rose-600' : isFinalWarning ? 'bg-amber-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${Math.min(100, (violationCount / violationLimit) * 100)}%` }}
            />
          </div>

          <div className="mt-2.5 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>Event: {type.replace(/_/g, ' ')}</span>
            {isFinalWarning && !isExceeded && (
              <span className="text-rose-400 font-bold animate-pulse">
                FINAL WARNING BEFORE AUTO-SUBMIT!
              </span>
            )}
          </div>
        </div>

        {/* Action Button */}
        {!isExceeded ? (
          <button
            onClick={onResumeFullscreen}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl shadow-indigo-600/30 transition-all cursor-pointer active:scale-[0.98]"
          >
            <Maximize2 className="w-5 h-5" />
            <span>Return to Full-Screen to Resume Test</span>
          </button>
        ) : (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold">
            Test session closed by proctoring engine. Contact tournament admin.
          </div>
        )}
      </div>
    </div>
  );
};
