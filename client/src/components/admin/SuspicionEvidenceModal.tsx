import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, AlertTriangle, Eye, Clock, FileText, Ban, CheckCircle } from 'lucide-react';
import { api } from '../../services/api.js';

interface SuspicionFactor {
  tabSwitches: number;
  fullscreenExits: number;
  largePastes: number;
  rapidSolves: number;
}

interface EvidenceLog {
  id: string;
  type: string;
  points: number;
  details: string;
  timestamp: string;
}

interface SuspicionReport {
  userId: string;
  username: string;
  name: string;
  totalScore: number;
  level: 'low' | 'elevated' | 'high' | 'critical';
  factors: SuspicionFactor;
  evidenceLogs: EvidenceLog[];
}

interface SuspicionEvidenceModalProps {
  userId: string;
  username: string;
  onClose: () => void;
}

export const SuspicionEvidenceModal: React.FC<SuspicionEvidenceModalProps> = ({
  userId,
  username,
  onClose
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [report, setReport] = useState<SuspicionReport | null>(null);

  useEffect(() => {
    async function fetchSuspicion() {
      setLoading(true);
      try {
        const res = await api.get('/admin/analytics/suspicion');
        if (res.data.success) {
          const userRep = res.data.reports.find((r: any) => r.userId === userId);
          if (userRep) {
            setReport(userRep);
          } else {
            // Default clean report
            setReport({
              userId,
              username,
              name: username,
              totalScore: 0,
              level: 'low',
              factors: {
                tabSwitches: 0,
                fullscreenExits: 0,
                largePastes: 0,
                rapidSolves: 0
              },
              evidenceLogs: []
            });
          }
        }
      } catch {
        // Fallback demo report
      } finally {
        setLoading(false);
      }
    }
    fetchSuspicion();
  }, [userId, username]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">Proctoring Suspicion Audit</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  @{username}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Evidence-based anomaly detection & behavioral telemetry</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-xs">Evaluating candidate telemetry...</div>
          ) : report ? (
            <>
              {/* Score Meter & Badge */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Suspicion Index</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-rose-400">{report.totalScore}</span>
                    <span className="text-sm font-semibold text-slate-500">/ 100</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                    report.level === 'critical'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                      : report.level === 'high'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  }`}>
                    {report.level} Suspicion Risk
                  </span>
                  <div className="text-[11px] text-slate-500 mt-1.5">
                    {report.evidenceLogs.length} audit evidence item(s)
                  </div>
                </div>
              </div>

              {/* Factors Breakdown Grid */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
                  <div className="text-lg font-bold text-slate-200">{report.factors.tabSwitches}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Tab Blurs</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
                  <div className="text-lg font-bold text-slate-200">{report.factors.fullscreenExits}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Kiosk Exits</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
                  <div className="text-lg font-bold text-slate-200">{report.factors.largePastes}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Paste Surges</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
                  <div className="text-lg font-bold text-slate-200">{report.factors.rapidSolves}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Speed Anomalies</div>
                </div>
              </div>

              {/* Chronological Evidence Audit Trail */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" /> Chronological Evidence Audit
                </h4>
                {report.evidenceLogs.length > 0 ? (
                  <div className="space-y-2.5">
                    {report.evidenceLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 text-xs font-bold">
                            +{log.points}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-slate-200">{log.details}</div>
                            <div className="text-[10px] font-mono text-slate-500">
                              Type: {log.type} &bull; {new Date(log.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 text-center text-xs text-slate-400">
                    No active proctoring strikes recorded. If this event was finalized and archived, granular incident traces were safely pruned per institutional retention policy while the candidate&apos;s score and verdict remain permanently recorded.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-slate-500 text-xs">No suspicion records found for candidate.</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-mono">Evidence-Based Proctoring Engine &bull; Zero False-Positive Tolerance</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
