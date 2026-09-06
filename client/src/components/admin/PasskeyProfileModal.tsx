import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Key,
  Mail,
  User as UserIcon,
  CheckCircle2,
  AlertOctagon,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  Sparkles,
  Lock,
  Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';

interface PasskeyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PasskeyProfileModal: React.FC<PasskeyProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, setupPasskey, revokePasskey, refreshUser } = useAuth();
  const [passkeyInput, setPasskeyInput] = useState('');
  const [showPasskey, setShowPasskey] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [passkeyMeta, setPasskeyMeta] = useState<{ hasPasskey: boolean; updatedAt?: string; createdAt?: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [banner, setBanner] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Fetch status on open
  const fetchPasskeyStatus = async () => {
    try {
      setStatusLoading(true);
      const res = await api.get('/auth/passkey/status');
      setPasskeyMeta(res.data);
    } catch (err) {
      console.error('Failed to fetch passkey status:', err);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setPasskeyInput('');
      setBanner(null);
      fetchPasskeyStatus();

      // Lock body scroll
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // Escape key listener
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const isConfigured = Boolean(passkeyMeta?.hasPasskey ?? user.hasPasskey);

  const handleSavePasskey = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = passkeyInput.trim();
    if (!trimmed || trimmed.length < 3) {
      setBanner({ text: 'Passkey keyword must be at least 3 characters long.', type: 'error' });
      return;
    }

    try {
      setIsSaving(true);
      setBanner(null);
      await setupPasskey(trimmed);
      setBanner({
        text: `Passkey successfully active! A security confirmation email has been dispatched to ${user.email || user.username}.`,
        type: 'success'
      });
      setPasskeyInput('');
      await fetchPasskeyStatus();
      await refreshUser();
    } catch (err: any) {
      setBanner({
        text: err.response?.data?.error || 'Failed to configure security passkey.',
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevokePasskey = async () => {
    if (!confirm('Are you sure you want to revoke and disable your security passkey?')) return;
    try {
      setIsRevoking(true);
      setBanner(null);
      await revokePasskey();
      setBanner({ text: 'Passkey revoked successfully. Passkey-only sign-in is now disabled.', type: 'success' });
      await fetchPasskeyStatus();
      await refreshUser();
    } catch (err: any) {
      setBanner({ text: 'Failed to revoke passkey.', type: 'error' });
    } finally {
      setIsRevoking(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg bg-[#0c1220] border border-slate-700/90 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden my-auto text-left animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Ambient background glows */}
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4 mb-6 pb-4 border-b border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/25 to-indigo-600/25 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
            <Key className="w-6 h-6" />
          </div>
          <div className="pr-8">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white tracking-tight">Organizer Profile & Passkey</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Configure single-keyword passkeys for instant 1-step sign in without email
            </p>
          </div>
        </div>

        {/* Status Banner */}
        {banner && (
          <div
            className={`mb-5 p-3.5 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 ${
              banner.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/70 border-rose-500/40 text-rose-200'
            }`}
          >
            {banner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{banner.text}</span>
          </div>
        )}

        {/* SECTION 1: Organizer Identity Details */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-3 mb-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
              Organizer Account
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/25">
              {user.role}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Full Name</span>
              <span className="font-bold text-white truncate block">{user.name}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Username</span>
              <span className="font-mono text-indigo-300 truncate block">@{user.username}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500 block text-[11px]">Registered Email</span>
              <span className="font-mono text-slate-300 truncate block">{user.email || 'None set'}</span>
            </div>
          </div>
        </div>

        {/* SECTION 2: Passkey Setup & Management Card */}
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-amber-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-black text-white">Security Passkey</h3>
            </div>
            {isConfigured ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
                Not Configured
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Your passkey allows you to sign in instantly with just your keyword — <strong>no email or username required</strong>.
            Accepts <strong>numbers</strong> (e.g. <code>202688</code>), <strong>letters</strong>, or <strong>symbols</strong> (e.g. <code>Tech#2026!</code>).
          </p>

          {isConfigured && passkeyMeta?.updatedAt && (
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Last updated: {new Date(passkeyMeta.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}

          {/* Form to Set / Update Passkey */}
          <form onSubmit={handleSavePasskey} className="space-y-3.5 pt-1">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                {isConfigured ? 'Change / Update Passkey Keyword' : 'Set Security Passkey Keyword'}
              </label>
              <div className="relative">
                <input
                  type={showPasskey ? 'text' : 'password'}
                  required
                  placeholder="Enter keyword (e.g. 202688 or Admin#Key2026!)"
                  value={passkeyInput}
                  onChange={e => setPasskeyInput(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPasskey(!showPasskey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
                  aria-label={showPasskey ? 'Hide passkey' : 'Show passkey'}
                >
                  {showPasskey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Minimum 3 characters. Any combination of numbers, letters, and symbols is accepted.
              </span>
            </div>

            {/* Email Dispatch Notice */}
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-start gap-2.5">
              <Mail className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>
                An official security confirmation email will be dispatched to <strong>{user.email || 'your registered email'}</strong> immediately upon setting or updating this passkey.
              </span>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={isSaving || !passkeyInput.trim()}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving & Sending Email...</span>
                  </>
                ) : (
                  <>
                    <Key className="w-3.5 h-3.5" />
                    <span>{isConfigured ? 'Update Passkey & Send Mail' : 'Activate Passkey & Send Mail'}</span>
                  </>
                )}
              </button>

              {isConfigured && (
                <button
                  type="button"
                  disabled={isRevoking}
                  onClick={handleRevokePasskey}
                  className="px-3 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  title="Revoke and remove passkey"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Revoke</span>
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
