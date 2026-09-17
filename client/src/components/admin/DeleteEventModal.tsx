import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert } from 'lucide-react';
import { Event } from '../../types/index.js';
import { deleteEvent } from '../../services/api.js';

interface DeleteEventModalProps {
  isOpen: boolean;
  event: Event | null;
  onClose: () => void;
  onDeleted: (deletedEventId: string) => void;
}

export const DeleteEventModal: React.FC<DeleteEventModalProps> = ({
  isOpen,
  event,
  onClose,
  onDeleted
}) => {
  const [confirmName, setConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfirmName('');
      setError(null);
    }
  }, [isOpen, event]);

  if (!isOpen || !event) return null;

  const cleanTargetName = (event.name || '').trim();
  const cleanInput = confirmName.trim();
  const isMatch =
    cleanInput.length > 0 &&
    (cleanInput === cleanTargetName || cleanInput.toLowerCase() === cleanTargetName.toLowerCase());

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMatch) return;

    try {
      setIsDeleting(true);
      setError(null);
      await deleteEvent(event._id);
      onDeleted(event._id);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete event.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-[#0c1220] border border-rose-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden text-left animate-in fade-in zoom-in-95 duration-200">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Delete Event Permanently</h2>
              <p className="text-xs text-rose-400 font-semibold">Irreversible cascade cleanup</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Event Card Summary */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 mb-5">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-xs font-bold text-rose-400">{event.code}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300">
              {event.status}
            </span>
          </div>
          <h3 className="text-sm font-bold bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent mb-1">{event.name}</h3>
          <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">{event.description || 'No description provided'}</p>
        </div>

        {/* GitHub-style Danger Banner */}
        <div className="space-y-3 mb-6 p-4 rounded-2xl bg-rose-950/25 border border-rose-500/40 text-xs text-rose-200">
          <div className="flex items-center gap-2 text-rose-400 font-bold">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>This action cannot be undone.</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            This will permanently delete the <strong className="text-white font-semibold">"{event.name}"</strong> (<span className="font-mono text-amber-400">{event.code}</span>) tournament, along with all of its stages, question sets, participant scores, submissions, code milestones, and anti-cheat audit logs.
          </p>
        </div>

        {/* Confirmation Form */}
        <form onSubmit={handleDelete} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2 leading-relaxed">
              Please type <strong className="font-mono font-bold text-white bg-slate-900 border border-slate-700 px-2 py-0.5 rounded select-all">{event.name}</strong> to confirm:
            </label>
            <input
              type="text"
              required
              autoFocus
              disabled={isDeleting}
              value={confirmName}
              onChange={e => setConfirmName(e.target.value)}
              placeholder={`Type "${event.name}" to confirm`}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isMatch || isDeleting}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
                isMatch && !isDeleting
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 active:scale-95'
                  : 'bg-slate-800/80 text-slate-500 border border-slate-800 cursor-not-allowed'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Deleting Event...' : 'I understand the consequences, delete this event'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
