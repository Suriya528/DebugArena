import React, { useEffect, useState, useRef } from 'react';
import { ShieldCheck, CheckCircle2, AlertCircle, Loader2, ArrowRight, Lock, Key } from 'lucide-react';
import { useAuth, AuthResult } from '../../context/AuthContext.js';

interface VerifySignInViewProps {
  onSuccess?: (user: AuthResult) => void;
  onBackToHome?: () => void;
}

export const VerifySignInView: React.FC<VerifySignInViewProps> = ({
  onSuccess,
  onBackToHome = () => {
    window.history.replaceState({}, '', '/');
    window.location.reload();
  }
}) => {
  const { verifyPasskeyMagicToken } = useAuth();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [verifiedUser, setVerifiedUser] = useState<AuthResult | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number>(3);
  const verificationAttempted = useRef<boolean>(false);

  useEffect(() => {
    if (verificationAttempted.current) return;
    verificationAttempted.current = true;

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const session = urlParams.get('session') || urlParams.get('sessionId');

    if (!token) {
      setStatus('error');
      setErrorMessage('Missing sign-in authorization token. Please initiate a new passkey sign-in.');
      return;
    }

    const performVerification = async () => {
      try {
        setStatus('verifying');
        const userResult = await verifyPasskeyMagicToken(token, session || undefined);
        setVerifiedUser(userResult);
        setStatus('success');

        if (onSuccess) {
          onSuccess(userResult);
        }

        try {
          window.history.replaceState({}, '', '/');
        } catch {}
      } catch (err: any) {
        console.error('Magic link verification error:', err);
        setStatus('error');
        setErrorMessage(
          err.response?.data?.error ||
          'This sign-in link is invalid or has expired (links expire after 15 minutes). Please request a new passkey sign-in.'
        );
      }
    };

    performVerification();
  }, [verifyPasskeyMagicToken, onSuccess]);

  useEffect(() => {
    if (status !== 'success') return;

    const interval = setInterval(() => {
      setRedirectCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          window.location.href = '/';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  const handleManualProceed = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-4 relative overflow-hidden select-none">
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-[#0c1220]/95 border border-slate-700/80 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-xl text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Lock className="w-5 h-5" />
          </div>
          <span className="text-lg font-black tracking-wider text-white">DEBUGARENA</span>
        </div>

        {status === 'verifying' && (
          <div className="space-y-6 py-4 animate-in fade-in duration-300">
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-ping pointer-events-none" />
              <div className="w-20 h-20 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Loader2 className="w-9 h-9 animate-spin text-indigo-400" />
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Authorizing Sign-In
              </h2>
              <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
                Verifying your secure passkey token and establishing your organizer workspace session...
              </p>
            </div>

            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl text-[11px] font-mono text-slate-400 flex items-center justify-center gap-2">
              <Key className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Passkey cryptographic challenge verification</span>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6 py-2 animate-in zoom-in-95 duration-400">
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse pointer-events-none" />
              <div className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Logged In Successfully</span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Welcome, {verifiedUser?.name || verifiedUser?.username || 'Organizer'}!
              </h2>
              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                Your passkey identity has been securely confirmed. Welcome to the DebugArena tournament dashboard.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleManualProceed}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition-all cursor-pointer"
              >
                <span>Enter Dashboard ({redirectCountdown}s)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6 py-2 animate-in fade-in duration-300">
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/20">
                <AlertCircle className="w-10 h-10 text-rose-400" />
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Authorization Failed
              </h2>
              <p className="text-xs text-rose-300/90 mt-2 max-w-xs mx-auto leading-relaxed">
                {errorMessage}
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onBackToHome}
                className="w-full py-3 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Return to Sign In Portal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
