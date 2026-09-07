import React, { useState, useEffect } from 'react';
import { ShieldAlert, Maximize2, Lock, EyeOff, Timer, AlertOctagon } from 'lucide-react';

interface ViolationModalProps {
  isOpen: boolean;
  violationCount: number;
  violationLimit: number;
  type: string;
  details?: string;
  onResumeFullscreen: () => void;
  onTimeoutAutoSubmit?: () => void;
  gracePeriodSeconds?: number;
}

export const ViolationModal: React.FC<ViolationModalProps> = ({
  isOpen,
  violationCount,
  violationLimit,
  type,
  details,
  onResumeFullscreen,
  onTimeoutAutoSubmit,
  gracePeriodSeconds = 8
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(gracePeriodSeconds);
  const onTimeoutRef = React.useRef(onTimeoutAutoSubmit);
  onTimeoutRef.current = onTimeoutAutoSubmit;
  const timeoutFiredRef = React.useRef(false);

  // Countdown timer: 8-second self-destruct grace window using absolute timestamps
  useEffect(() => {
    if (!isOpen) {
      setSecondsRemaining(gracePeriodSeconds);
      timeoutFiredRef.current = false;
      return;
    }

    if (violationCount >= violationLimit) {
      return; // Already permanently locked
    }

    const deadline = Date.now() + gracePeriodSeconds * 1000;
    timeoutFiredRef.current = false;

    const tick = () => {
      const remainingMs = deadline - Date.now();
      const secs = Math.max(0, Math.ceil(remainingMs / 1000));
      setSecondsRemaining(secs);

      if (secs <= 0) {
        if (!timeoutFiredRef.current) {
          timeoutFiredRef.current = true;
          if (onTimeoutRef.current) {
            onTimeoutRef.current();
          }
        }
      }
    };

    tick();
    const timer = setInterval(tick, 250);

    return () => clearInterval(timer);
  }, [isOpen, violationCount, violationLimit, gracePeriodSeconds]);

  if (!isOpen) return null;

  const isFinalWarning = violationCount >= violationLimit - 1;
  const isExceeded = violationCount >= violationLimit || secondsRemaining === 0;

  // Visual categorization
  const isTabSwitch = type === 'tab_switch' || type === 'window_blur';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070b13] bg-opacity-95 backdrop-blur-2xl p-4 sm:p-6 animate-in fade-in duration-200 select-none">
      {/* Red ambient security perimeter pulse */}
      <div className="absolute inset-0 border-8 border-rose-600/50 pointer-events-none animate-pulse" />

      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border-2 border-rose-500/80 p-5 sm:p-8 shadow-2xl shadow-rose-950/90 text-center max-h-[92vh] flex flex-col overflow-y-auto">
        {/* Top Warning Icon */}
        <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center shadow-lg shadow-rose-950/50">
          {isExceeded ? (
            <Lock className="w-10 h-10 text-rose-500 animate-bounce" />
          ) : isTabSwitch ? (
            <AlertOctagon className="w-10 h-10 text-rose-400 animate-pulse" />
          ) : (
            <ShieldAlert className="w-10 h-10 text-rose-400 animate-pulse" />
          )}
        </div>

        {/* Security Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30 mb-3">
          <EyeOff className="w-3.5 h-3.5" />
          <span>
            {isTabSwitch ? 'Intentional Window / Tab Breach' : 'Proctoring Security Lockdown'}
          </span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
          {isExceeded
            ? 'Assessment Terminated'
            : isTabSwitch
            ? 'Tab Switch Prohibited'
            : 'Full-Screen Mode Exited'}
        </h2>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6 font-sans">
          {isExceeded
            ? 'You have exceeded the allowed grace period or strike threshold. Your assessment has been permanently collected and submitted to the server.'
            : isTabSwitch
            ? 'Switching tabs or navigating away from the test is strictly prohibited in OA proctoring mode. Return immediately before your test self-destructs.'
            : 'In compliance with real-world Online Assessment (OA) standards, all question statements are frozen while outside full-screen mode.'}
        </p>

        {/* 8-Second Self-Destruct Grace Window */}
        {!isExceeded && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-left">
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="text-rose-300 font-bold flex items-center gap-1.5">
                <Timer className="w-4 h-4 text-rose-400 animate-spin" /> Auto-Submit In:
              </span>
              <span className="text-lg font-black text-rose-400 font-mono">
                00:0{secondsRemaining}s
              </span>
            </div>

            {/* Visual timer countdown bar */}
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-1000 ease-linear"
                style={{ width: `${(secondsRemaining / gracePeriodSeconds) * 100}%` }}
              />
            </div>
            <div className="text-[11px] text-rose-400/80 mt-1.5 font-mono">
              Legitimate accidental keypresses resume within 2s. Exceeding 8s triggers auto-submit.
            </div>
          </div>
        )}

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
                FINAL WARNING!
              </span>
            )}
          </div>
        </div>

        {/* Resume Action */}
        {!isExceeded ? (
          <button
            onClick={onResumeFullscreen}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl shadow-indigo-600/30 transition-all cursor-pointer active:scale-[0.98]"
          >
            <Maximize2 className="w-5 h-5" />
            <span>Return to Full-Screen ({secondsRemaining}s remaining)</span>
          </button>
        ) : (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold text-center">
            Test session closed and auto-submitted by Proctoring Engine. Contact tournament administrator.
          </div>
        )}
      </div>
    </div>
  );
};
