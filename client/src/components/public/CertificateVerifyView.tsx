import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Award, Download, CheckCircle2, ArrowLeft } from 'lucide-react';
import { verifyCertificatePublic } from '../../services/api.js';

interface CertificateVerifyViewProps {
  certificateId: string;
  onBack?: () => void;
}

export const CertificateVerifyView: React.FC<CertificateVerifyViewProps> = ({ certificateId, onBack }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadVerification() {
      try {
        setLoading(true);
        setError(null);
        const result = await verifyCertificatePublic(certificateId);
        setData(result);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Certificate not found or verification error');
      } finally {
        setLoading(false);
      }
    }
    if (certificateId) {
      loadVerification();
    }
  }, [certificateId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      {/* Background Glow */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/10 via-slate-950 to-slate-950 pointer-events-none" />

      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6 animate-in fade-in">
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wide text-white uppercase">
                DebugArena Verification Portal
              </h1>
              <p className="text-[11px] text-slate-400">Cryptographic HMAC-SHA256 Public Registry</p>
            </div>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="p-6 sm:p-8 space-y-6">
          {loading ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-mono">Verifying cryptographic signature on ledger...</p>
            </div>
          ) : error || !data?.valid ? (
            <div className="p-6 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-rose-300">Verification Failed</h2>
                <p className="text-xs text-rose-200/80 mt-1 max-w-md mx-auto">
                  {error || 'This certificate record could not be authenticated or the signature does not match.'}
                </p>
              </div>
              <div className="text-[11px] font-mono text-slate-500">ID: {certificateId}</div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Genuine Certificate Authenticity Banner */}
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Authentic & Tamper-Free Credential
                  </div>
                  <p className="text-[11px] text-emerald-200/80 mt-0.5">
                    Cryptographic signature is valid and confirmed by the tournament ledger.
                  </p>
                </div>
                <span className="hidden sm:inline-block px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold font-mono">
                  SHA-256 MATCH
                </span>
              </div>

              {/* Certificate Details Card */}
              <div
                className="relative p-6 sm:p-8 rounded-3xl border border-amber-500/30 shadow-xl text-center overflow-hidden"
                style={
                  data.useCustomTemplate && data.templateUrl
                    ? {
                        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.88), rgba(15, 23, 42, 0.88)), url(${data.templateUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }
                    : {
                        background: 'linear-gradient(180deg, #090d16 0%, #0d121f 100%)'
                      }
                }
              >
                <div className="text-xs text-amber-400 font-bold uppercase tracking-widest mb-1">
                  {data.collegeName}
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
                  {data.eventTitle}
                </h2>

                <div className="py-4 my-2 border-y border-slate-800/80">
                  <p className="text-xs text-slate-400 italic mb-1">Awarded to</p>
                  <div className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200">
                    {data.participantName}
                  </div>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">@{data.username}</div>
                </div>

                <div className="grid grid-cols-2 gap-4 my-4 max-w-sm mx-auto">
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                    <div className="text-[10px] uppercase font-bold text-slate-500">Official Rank</div>
                    <div className="text-xl font-black text-amber-400">Rank #{data.rank}</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                    <div className="text-[10px] uppercase font-bold text-slate-500">Final Score</div>
                    <div className="text-xl font-black text-emerald-400">{data.totalScore} pts</div>
                  </div>
                </div>

                {/* Ledger Signature Hash */}
                <div className="pt-4 mt-2 border-t border-slate-800/80 text-left font-mono space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between text-[10px]">
                    <span className="text-slate-500 font-bold">CERTIFICATE ID:</span>
                    <span className="text-slate-300 font-bold">{data.certificateId}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between text-[10px]">
                    <span className="text-slate-500 font-bold">ISSUED AT:</span>
                    <span className="text-slate-300">
                      {data.issueDate ? new Date(data.issueDate).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex flex-col text-[10px] pt-1">
                    <span className="text-slate-500 font-bold">DIGITAL LEDGER HASH (SHA-256):</span>
                    <span className="text-emerald-400 break-all text-[9px] bg-slate-950/90 p-2 rounded-xl border border-slate-800 mt-1">
                      {data.verificationHash}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <span className="text-xs text-slate-500 font-mono">
                  Verified publicly without authentication
                </span>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Print Verification Record</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
