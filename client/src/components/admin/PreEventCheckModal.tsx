import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, RefreshCw, Server, ShieldCheck, Stethoscope } from 'lucide-react';
import { api } from '../../services/api.js';

interface PreEventCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PreEventCheckModal: React.FC<PreEventCheckModalProps> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const runCheck = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/control-room/readiness');
      setData(res.data);
    } catch (err) {
      console.error('Failed to run readiness check:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) runCheck();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl text-left my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Pre-Event System Inspector</h2>
              <p className="text-xs text-slate-400">Hardware, Judge, Database, and Question Bank Readiness</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500 font-mono text-sm flex items-center justify-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
            <span>Scanning platform infrastructure...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Master Banner */}
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between ${
                data?.ready
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
            >
              <div className="flex items-center gap-3">
                {data?.ready ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                )}
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider font-bold">Platform Status</div>
                  <div className="text-base font-black text-white">{data?.statusLabel}</div>
                </div>
              </div>

              <button
                onClick={runCheck}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors"
                title="Rerun Check"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Checklist items */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {data?.checks?.map((chk: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    {chk.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span className="font-bold text-white">{chk.name}</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">{chk.detail}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
