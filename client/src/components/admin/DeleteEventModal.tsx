import React, { useState } from 'react';
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
  const [confirmCode, setConfirmCode] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !event) return null;

  const isMatch = confirmCode.trim().toUpperCase() === event.code.trim().toUpperCase();

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
          <h3 className="text-sm font-bold text-white mb-1">{event.name}</h3>
          <p className="text-xs text-slate-400 line-clamp-1">{event.description || 'No description provided'}</p>
        </div>

        {/* Cascade Impact Warning */}
        <div className="space-y-2 mb-6 p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-xs text-slate-300">
          <div className="flex items-center gap-2 text-rose-400 font-bold mb-1">
            <ShieldAlert className="w-4 h-4" />
            <span>Warning: Cascade Deletion Scope</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Deleting this event will permanently purge all of its child data:
          </p>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400 pl-1 font-mono">
            <li>All dynamic rounds & configured tournament rules</li>
            <li>All round-specific questions & test cases</li>
            <li>All participant submissions, code milestones & attempts</li>
            <li>All anti-cheat violation logs & issued certificates</li>
          </ul>
        </div>

        {/* Confirmation Form */}
        <form onSubmit={handleDelete} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              To confirm, please type the event code <span className="font-mono font-bold text-rose-400 select-all">{event.code}</span> below:
            </label>
            <input
              type="text"
              required
              disabled={isDeleting}
              value={confirmCode}
              onChange={e => setConfirmCode(e.target.value)}
              placeholder={`Type "${event.code}" to confirm`}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-rose-500 transition-colors"
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
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                  : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Purging Event...' : 'Delete Event Permanently'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
