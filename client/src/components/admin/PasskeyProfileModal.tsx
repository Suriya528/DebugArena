import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  ShieldCheck,
  Mail,
  User as UserIcon,
  CheckCircle2,
  AlertOctagon,
  Eye,
  EyeOff,
  Building2,
  Lock,
  Trash2,
  RefreshCw
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
  const [passkeyMeta, setPasskeyMeta] = useState<{ hasPasskey: boolean; updatedAt?: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [banner, setBanner] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

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
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

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
      const res = await setupPasskey(trimmed);
      setBanner({
        text: `Passkey successfully active! A confirmation email has been dispatched to ${user.email || user.username}.`,
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
      setBanner({ text: 'Passkey revoked successfully.', type: 'success' });
      await fetchPasskeyStatus();
      await refreshUser();
    } catch (err: any) {
      setBanner({ text: 'Failed to revoke passkey.', type: 'error' });
    } finally {
      setIsRevoking(false);
    }
  };

  const isConfigured = Boolean(passkeyMeta?.hasPasskey ?? user.hasPasskey);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg bg-[#0c1220] border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden my-8 text-left">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-indigo-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Organizer Profile & Passkey</h2>
            <p className="text-xs text-slate-400">
              Manage your administrator identity and configure keyword passkeys
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

        {/* SECTION 1: Organizer Identity Summary */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
              Organizer Account Details
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
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

        {/* SECTION 2: Passkey Security Center */}
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-amber-500/30 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-black text-white">Security Passkey</h3>
            </div>
            {isConfigured ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Active
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
                Not Configured
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Passkeys allow you to sign in instantly via the Organizer portal using any keyword of your choice.
            Supports <strong>numeric</strong> (e.g. <code>9821</code>), <strong>alphanumeric</strong> (e.g. <code>Alpha2026</code>),
            or <strong>special symbols</strong> (e.g. <code>#Pass@99!</code>).
          </p>

          {/* Form to Set / Update Passkey */}
          <form onSubmit={handleSavePasskey} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                {isConfigured ? 'Change / Update Passkey Keyword' : 'Set Security Passkey Keyword'}
              </label>
              <div className="relative">
                <input
                  type={showPasskey ? 'text' : 'password'}
                  required
                  placeholder="Enter keyword (e.g. Tech#2026! or 9821)"
                  value={passkeyInput}
                  onChange={e => setPasskeyInput(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPasskey(!showPasskey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
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
                An official security confirmation email will be dispatched to <strong>{user.email || 'your registered email'}</strong> immediately after setting this passkey.
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
};
