import React, { useState } from 'react';
import { Shield, Lock, AlertTriangle, Eye, EyeOff, LogIn, ArrowRight, UserCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface KioskRecoveryPortalProps {
  recoveryData: {
    username?: string;
    regNo?: string;
    name?: string;
    eventCode?: string;
  };
  onResumeSuccess: () => void;
  onSwitchUser: () => void;
}

export const KioskRecoveryPortal: React.FC<KioskRecoveryPortalProps> = ({
  recoveryData,
  onResumeSuccess,
  onSwitchUser
}) => {
  const { login, user } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestKioskFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        const elem = document.documentElement as any;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
          await elem.msRequestFullscreen();
        }
      }
      if ('keyboard' in navigator && (navigator as any).keyboard?.lock) {
        try {
          await (navigator as any).keyboard.lock(['Escape']);
        } catch (e) {}
      }
    } catch (err) {
      console.warn('Fullscreen request bypassed or requires interaction:', err);
    }
  };

  const handleResumeAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      // Trigger fullscreen immediately in response to user click gesture
      await requestKioskFullscreen();

      // If user token is already valid, proceed directly
      if (!user) {
        const identifier = recoveryData.regNo || recoveryData.username || '';
        if (!password.trim()) {
          setError('Please enter your password to authenticate your seat.');
          setLoading(false);
          return;
        }
        await login(identifier, password.trim());
      }

      onResumeSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed. Please verify your password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060912] flex items-center justify-center p-4 select-none relative overflow-hidden">
      {/* Kiosk Security Backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/30 via-[#060912] to-[#060912] pointer-events-none" />
      <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-lg bg-slate-900/90 border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-left">
        {/* Header Alert */}
        <div className="flex items-center gap-3.5 pb-5 border-b border-slate-800 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-block mb-1 font-mono">
              System Crash Recovery Detected
            </span>
            <h1 className="text-xl font-black text-white tracking-tight">Active Assessment Interrupted</h1>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Seat / Candidate Identity Verification Card */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 mb-6">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-cyan-400" /> Seat Registration Lock
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 block">Candidate Name:</span>
              <span className="font-bold text-white truncate block">{recoveryData.name || 'Candidate'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Roll / Reg Number:</span>
              <span className="font-mono font-bold text-cyan-400 truncate block">{recoveryData.regNo || recoveryData.username || '—'}</span>
            </div>
            {recoveryData.eventCode && (
              <div className="col-span-2 pt-1 border-t border-slate-900">
                <span className="text-[10px] text-slate-500 block">Tournament Event Code:</span>
                <span className="font-mono font-bold text-indigo-400">{recoveryData.eventCode}</span>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed mb-6 font-sans">
          Your machine rebooted or disconnected mid-session. All previous submissions, saved drafts, and remaining timer allocations are preserved on the assessment engine. Click below to lock into full-screen mode and resume immediately.
        </p>

        {/* Resume / Auth Form */}
        <form onSubmit={handleResumeAssessment} className="space-y-4">
          {!user && (
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Enter Password / Security PIN to unlock seat:
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:via-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            <span>{loading ? 'Resuming Session...' : '🔒 Enter Full-Screen & Resume Assessment'}</span>
          </button>
        </form>

        {/* Switch User Option */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <span>Not {recoveryData.name || 'this participant'}?</span>
          <button
            type="button"
            onClick={onSwitchUser}
            className="text-cyan-400 hover:text-cyan-300 font-bold transition-colors cursor-pointer"
          >
            Switch Account / New Login
          </button>
        </div>
      </div>
    </div>
  );
};
