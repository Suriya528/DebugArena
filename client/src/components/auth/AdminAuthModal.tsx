import React, { useState } from 'react';
import { X, Shield, Lock, Building2, Mail, ArrowRight, Sparkles, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({ isOpen, onClose }) => {
  const { login, loginWithGoogle } = useAuth();
  const [activeTab, setActiveTab] = useState<'google' | 'password'>('google');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google Flow Fields
  const [collegeName, setCollegeName] = useState('');
  const [collegeCode, setCollegeCode] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [adminName, setAdminName] = useState('');

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Password Flow Fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleGoogleAuth = async (mockEmailToUse?: string) => {
    try {
      setLoading(true);
      setError(null);

      // If live Google Identity Services is available and VITE_GOOGLE_CLIENT_ID is set
      if (!mockEmailToUse && googleClientId && (window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: any) => {
            try {
              setLoading(true);
              setError(null);
              await loginWithGoogle({
                credential: response.credential,
                collegeName: collegeName.trim() || undefined,
                collegeCode: collegeCode.trim() || undefined
              });
              onClose();
            } catch (err: any) {
              setError(err.response?.data?.error || 'Google authentication failed.');
            } finally {
              setLoading(false);
            }
          }
        });
        (window as any).google.accounts.id.prompt();
        setLoading(false);
        return;
      }

      const targetEmail = mockEmailToUse || customEmail.trim();
      if (!targetEmail) {
        setError('Please provide a valid official institution email.');
        setLoading(false);
        return;
      }

      // Enforce real-world email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(targetEmail)) {
        setError('Please enter a valid real-world email address (e.g., organizer@mit.edu).');
        setLoading(false);
        return;
      }

      await loginWithGoogle({
        mockEmail: targetEmail,
        name: adminName.trim() || undefined,
        collegeName: collegeName.trim() || undefined,
        collegeCode: collegeCode.trim() || undefined
      });

      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Google authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await login(username.trim(), password);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid admin credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0c1220] border border-slate-700/60 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Glow accents */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Admin & Organizer Portal</h2>
            <p className="text-xs text-slate-400">Institutional event creation, live telemetry & proctoring</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex p-1 bg-slate-900/80 border border-slate-800 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => { setActiveTab('google'); setError(null); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'google'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-300" />
            <span>Google Sign-In / Up</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('password'); setError(null); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'password'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Direct Credentials</span>
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab 1: Google OAuth Flow */}
        {activeTab === 'google' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Building2 className="w-4 h-4 text-indigo-400" />
                <span>Institution Onboarding (For New Admins)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-medium text-slate-400 mb-1 block">College Name</label>
                  <input
                    type="text"
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    placeholder="e.g., Stanford University"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400 mb-1 block">College Code</label>
                  <input
                    type="text"
                    value={collegeCode}
                    onChange={(e) => setCollegeCode(e.target.value.toUpperCase())}
                    placeholder="e.g., STAN"
                    maxLength={8}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 uppercase transition-colors"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 mb-1.5 block">Official Google Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="organizer@university.edu"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Must be an existing, real-world verified Google email.</p>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleGoogleAuth()}
              className="w-full py-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs flex items-center justify-center gap-3 transition-all shadow-lg shadow-white/5 active:scale-[0.99] disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.94H1.24v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.26c-.25-.72-.38-1.49-.38-2.26s.13-1.54.38-2.26V6.59H1.24C.45 8.16 0 9.94 0 12s.45 3.84 1.24 5.41l4.04-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.59l4.04 3.15c.95-2.84 3.6-4.99 6.72-4.99z"
                />
              </svg>
              <span>{loading ? 'Authenticating with Google...' : 'Continue with Google'}</span>
            </button>

            {/* Google OAuth Environment Status */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-800/80 text-[11px]">
              <span className="text-slate-400">OAuth Mode:</span>
              {googleClientId ? (
                <span className="text-emerald-400 flex items-center gap-1.5 font-mono font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Live (Client ID Set)
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1.5 font-mono text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Dev Verified Mock (Set VITE_GOOGLE_CLIENT_ID)
                </span>
              )}
            </div>

            {/* Dev Demo Quick Accounts */}
            <div className="pt-3 border-t border-slate-800">
              <div className="text-[11px] font-medium text-slate-400 mb-2">⚡ Quick 1-Click Dev Admin Accounts:</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleGoogleAuth('superadmin@debugarena.io')}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/70 hover:border-indigo-500/60 text-left text-xs transition-colors"
                >
                  <div className="font-semibold text-slate-200">Super Admin</div>
                  <div className="text-[10px] text-slate-400 truncate">superadmin@debugarena.io</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleGoogleAuth('college_organizer@mit.edu')}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/70 hover:border-cyan-500/60 text-left text-xs transition-colors"
                >
                  <div className="font-semibold text-slate-200">College Admin</div>
                  <div className="text-[10px] text-slate-400 truncate">college_organizer@mit.edu</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Direct Username/Password */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-300 mb-1.5 block">Admin Username</label>
              <div className="relative">
                <Shield className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin or college_admin"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/30 active:scale-[0.99] disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Admin Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Quick autofill credentials */}
            <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <span>Demo Fill:</span>
              <button
                type="button"
                onClick={() => { setUsername('admin'); setPassword('admin123'); }}
                className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 transition-colors"
              >
                admin:admin123
              </button>
              <button
                type="button"
                onClick={() => { setUsername('college_admin'); setPassword('college123'); }}
                className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-colors"
              >
                college_admin:college123
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
