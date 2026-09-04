import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Award,
  Download,
  CheckCircle2,
  ArrowLeft,
  Building2,
  Sparkles,
  Printer,
  ExternalLink
} from 'lucide-react';
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

  const primaryColor = data?.primaryColor || '#b8860b';
  const secondaryColor = data?.secondaryColor || '#d97706';
  const signatoryName = data?.signatoryName || 'Dr. A. Sakthivel';
  const signatoryTitle = data?.signatoryTitle || 'Chairman, Examination & Technical Board';
  const identificationNo = data?.identificationNo || `UP00F20-${certificateId.slice(-6)}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-3 sm:p-6 font-sans">
      {/* Background Glow */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/10 via-slate-950 to-slate-950 pointer-events-none" />

      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6 animate-in fade-in text-left">
        {/* Top Portal Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md"
              style={{ backgroundColor: primaryColor }}
            >
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wide text-white uppercase flex items-center gap-2">
                DebugArena Cryptographic Verification Registry
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  SHA-256 Public Ledger
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">
                Official public credential validation for universities, employers, and recruiters
              </p>
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
        <div className="p-4 sm:p-8 space-y-6">
          {loading ? (
            <div className="text-center py-16 space-y-3">
              <div
                className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto"
                style={{ borderColor: primaryColor, borderTopColor: 'transparent' }}
              />
              <p className="text-xs text-slate-400 font-mono">
                Verifying digital cryptographic signature against tournament ledger...
              </p>
            </div>
          ) : error || !data?.valid ? (
            <div className="p-8 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-rose-300">Certificate Verification Failed</h2>
                <p className="text-xs text-rose-200/80 mt-1 max-w-md mx-auto">
                  {error || 'This credential record could not be found or has failed digital signature verification.'}
                </p>
              </div>
              <div className="text-[11px] font-mono text-slate-500">Certificate ID: {certificateId}</div>
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
                    Authentic & Tamper-Free Institutional Credential
                  </div>
                  <p className="text-[11px] text-emerald-200/80 mt-0.5">
                    Cryptographic signature is verified and matches the immutable assessment ledger.
                  </p>
                </div>
                <span className="hidden sm:inline-block px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold font-mono">
                  HMAC-SHA256 MATCH
                </span>
              </div>

              {/* Standardized Educational / Government Certificate Canvas */}
              <div
                id="printable-certificate"
                className="relative mx-auto w-full rounded-2xl shadow-2xl overflow-hidden transition-all text-slate-900"
                style={{
                  backgroundColor: '#fefcf8',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)'
                }}
              >
                {/* Outer Bold Border */}
                <div
                  className="p-2 sm:p-3 transition-colors"
                  style={{
                    border: `6px solid ${primaryColor}`
                  }}
                >
                  {/* Intermediate Margin Gap */}
                  <div
                    className="p-1 sm:p-1.5 transition-colors"
                    style={{
                      border: `1.5px solid ${secondaryColor}`
                    }}
                  >
                    {/* Inner Canvas Area */}
                    <div
                      className="relative p-6 sm:p-10 border border-slate-300/80 rounded-sm"
                      style={{
                        backgroundColor: '#fffdfa',
                        backgroundImage: `radial-gradient(${primaryColor}12 0.75px, transparent 0.75px), radial-gradient(${secondaryColor}08 0.75px, #fffdfa 0.75px)`,
                        backgroundSize: '24px 24px',
                        backgroundPosition: '0 0, 12px 12px'
                      }}
                    >
                      {/* Watermark Crest */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-[0.035] pointer-events-none select-none">
                        <svg className="w-80 h-80 text-slate-900" viewBox="0 0 100 100" fill="currentColor">
                          <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" />
                          <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="4" />
                        </svg>
                      </div>

                      {/* Corner Ornaments */}
                      <div
                        className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2"
                        style={{ borderColor: primaryColor }}
                      />
                      <div
                        className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2"
                        style={{ borderColor: primaryColor }}
                      />
                      <div
                        className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2"
                        style={{ borderColor: primaryColor }}
                      />
                      <div
                        className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2"
                        style={{ borderColor: primaryColor }}
                      />

                      {/* TOP HEADER: Institutional Logos & Accreditation */}
                      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-300">
                        {/* Left: Host Institution */}
                        <div className="flex items-center gap-2.5 text-left">
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-serif font-black text-sm shadow-sm"
                            style={{ backgroundColor: primaryColor }}
                          >
                            <Building2 className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="text-[11px] font-black uppercase tracking-wider text-slate-900 font-serif">
                              {data.collegeName}
                            </div>
                            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                              Institutional Examination Host
                            </div>
                          </div>
                        </div>

                        {/* Center: National Technical Council */}
                        <div className="hidden sm:flex flex-col items-center text-center px-3 border-x border-slate-200">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <div
                              className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-white"
                              style={{ backgroundColor: secondaryColor }}
                            >
                              <Sparkles className="w-2.5 h-2.5" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-800">
                              Skill & Technical Assessment
                            </span>
                          </div>
                          <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                            National Educational Standard
                          </div>
                        </div>

                        {/* Right: Championship Badge */}
                        <div className="flex items-center gap-2 text-right">
                          <div>
                            <div
                              className="text-[11px] font-black uppercase tracking-wider font-serif"
                              style={{ color: primaryColor }}
                            >
                              DebugArena 2026
                            </div>
                            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                              Certified Merit Credential
                            </div>
                          </div>
                          <div
                            className="w-11 h-11 rounded-xl border flex items-center justify-center text-amber-700 bg-amber-50"
                            style={{ borderColor: secondaryColor }}
                          >
                            <Award className="w-6 h-6" style={{ color: secondaryColor }} />
                          </div>
                        </div>
                      </div>

                      {/* MAIN TITLE: CERTIFICATE */}
                      <div className="text-center my-5">
                        <h1
                          className="font-serif text-3xl sm:text-4xl font-black uppercase tracking-[0.22em] text-slate-900"
                          style={{ letterSpacing: '0.22em' }}
                        >
                          Certificate
                        </h1>
                        <div className="flex items-center justify-center gap-2 my-1.5">
                          <div className="w-12 h-[1.5px]" style={{ backgroundColor: secondaryColor }} />
                          <div
                            className="text-[9px] font-black uppercase tracking-[0.25em]"
                            style={{ color: primaryColor }}
                          >
                            Of Merit & Technical Excellence
                          </div>
                          <div className="w-12 h-[1.5px]" style={{ backgroundColor: secondaryColor }} />
                        </div>
                      </div>

                      {/* ATTESTATION BODY */}
                      <div className="text-center space-y-2 max-w-xl mx-auto my-3">
                        <p className="font-serif italic text-xs text-slate-600">
                          This is to certify that
                        </p>
                        <div className="font-serif font-black text-2xl sm:text-3xl text-slate-900 tracking-tight py-0.5">
                          {data.participantName}
                        </div>
                        <p className="text-[11px] font-mono text-slate-500">
                          (System Identification Number: <span className="font-bold text-slate-700">{identificationNo}</span> • @{data.username})
                        </p>

                        <p className="font-serif text-xs leading-relaxed text-slate-700 pt-2 px-4">
                          has successfully cleared the advanced technical assessment for the competitive debugging challenge in{' '}
                          <strong className="text-slate-900 font-bold underline decoration-slate-300">
                            {data.eventTitle}
                          </strong>
                          , conforming to the National Technical Competency Framework Level 4, achieving{' '}
                          <strong className="font-black text-slate-900">
                            Rank #{data.rank}
                          </strong>{' '}
                          with <strong className="font-black text-slate-900">Grade A ({data.totalScore} Points)</strong>.
                        </p>

                        <div className="pt-2 text-[10px] text-slate-500 font-serif">
                          <span>
                            {data.issueDate ? new Date(data.issueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'March 20, 2026'}
                          </span>{' '}
                          • <span className="font-bold text-slate-700">System ID: {identificationNo}</span>
                        </div>
                        <div className="text-[9px] text-slate-400 font-serif">
                          Training & Evaluation Facilitated by {data.collegeName} Department of Computer Science & Engineering
                        </div>
                      </div>

                      {/* BOTTOM ROW: QR Code, Rosette Seal, and Digital Signature */}
                      <div className="mt-8 pt-4 border-t border-slate-300/90 grid grid-cols-3 items-center">
                        {/* Left: QR Code */}
                        <div className="flex items-center gap-2.5 text-left">
                          <div className="p-1.5 rounded-lg bg-white border border-slate-300 shadow-sm flex-shrink-0">
                            <svg className="w-14 h-14" viewBox="0 0 100 100" fill="#0f172a">
                              <rect x="5" y="5" width="28" height="28" fill="none" stroke="#0f172a" strokeWidth="6" />
                              <rect x="13" y="13" width="12" height="12" fill="#0f172a" />
                              <rect x="67" y="5" width="28" height="28" fill="none" stroke="#0f172a" strokeWidth="6" />
                              <rect x="75" y="13" width="12" height="12" fill="#0f172a" />
                              <rect x="5" y="67" width="28" height="28" fill="none" stroke="#0f172a" strokeWidth="6" />
                              <rect x="13" y="75" width="12" height="12" fill="#0f172a" />
                              <rect x="42" y="8" width="6" height="6" />
                              <rect x="52" y="8" width="6" height="6" />
                              <rect x="42" y="18" width="6" height="6" />
                              <rect x="48" y="28" width="6" height="6" />
                              <rect x="8" y="42" width="6" height="6" />
                              <rect x="18" y="48" width="6" height="6" />
                              <rect x="28" y="42" width="6" height="6" />
                              <rect x="42" y="42" width="16" height="16" fill="none" stroke="#0f172a" strokeWidth="4" />
                              <rect x="46" y="46" width="8" height="8" fill="#0f172a" />
                              <rect x="68" y="42" width="6" height="6" />
                              <rect x="78" y="48" width="6" height="6" />
                              <rect x="88" y="42" width="6" height="6" />
                              <rect x="42" y="68" width="6" height="6" />
                              <rect x="52" y="78" width="6" height="6" />
                              <rect x="42" y="88" width="6" height="6" />
                              <rect x="68" y="68" width="6" height="6" />
                              <rect x="78" y="78" width="6" height="6" />
                              <rect x="88" y="88" width="6" height="6" />
                            </svg>
                          </div>
                          <div className="font-mono text-[8px] leading-tight text-slate-500">
                            <div className="font-bold text-slate-800">{data.certificateId}</div>
                            <div className="truncate max-w-[110px] text-slate-400 mt-0.5 font-bold">
                              Hash: {data.verificationHash?.slice(0, 12)}...
                            </div>
                            <div className="text-[7.5px] text-emerald-700 font-bold mt-0.5 flex items-center gap-0.5">
                              <CheckCircle2 className="w-2 h-2" /> VERIFIED
                            </div>
                          </div>
                        </div>

                        {/* Center: Rosette Seal */}
                        <div className="flex flex-col items-center justify-center">
                          <div className="relative flex items-center justify-center">
                            <svg className="w-14 h-14" viewBox="0 0 100 100">
                              <circle
                                cx="50"
                                cy="50"
                                r="42"
                                fill="none"
                                stroke={primaryColor}
                                strokeWidth="3.5"
                                strokeDasharray="4 2"
                              />
                              <circle cx="50" cy="50" r="34" fill="#fffdfa" stroke={secondaryColor} strokeWidth="2" />
                              <polygon
                                points="50,22 54,34 66,35 56,43 60,55 50,47 40,55 44,43 34,35 46,34"
                                fill={primaryColor}
                              />
                              <circle cx="50" cy="50" r="18" fill="none" stroke={secondaryColor} strokeWidth="1" />
                            </svg>
                          </div>
                          <div
                            className="text-[8px] font-black uppercase tracking-wider text-center mt-1 font-serif"
                            style={{ color: primaryColor }}
                          >
                            Official Certified Seal
                          </div>
                          <div className="text-[7px] text-slate-500 font-bold uppercase tracking-tight">
                            Authentic • Tamper-Free
                          </div>
                        </div>

                        {/* Right: Signature */}
                        <div className="flex flex-col items-end text-right">
                          <div className="h-9 w-32 flex items-center justify-end pr-2">
                            <svg className="w-28 h-8 text-blue-900" viewBox="0 0 160 50" fill="none">
                              <path
                                d="M 10 35 C 25 15, 30 5, 40 25 C 45 38, 55 42, 65 20 C 70 8, 75 12, 85 28 C 90 35, 100 30, 115 15 C 125 5, 135 22, 150 18"
                                stroke="#1e3a8a"
                                strokeWidth="2.4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M 30 38 C 50 42, 90 40, 140 36"
                                stroke="#1e3a8a"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                              />
                            </svg>
                          </div>
                          <div className="border-t border-slate-800 w-36 mt-0.5 pt-1">
                            <div className="text-[11px] font-black text-slate-900 font-serif">
                              {signatoryName}
                            </div>
                            <div className="text-[8.5px] font-bold text-slate-600 leading-tight">
                              {signatoryTitle}
                            </div>
                            <div className="text-[7.5px] text-slate-500 font-mono leading-tight">
                              {data.collegeName}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <span className="text-xs text-slate-400 font-mono">
                  Cryptographic Ledger Status: <span className="text-emerald-400 font-bold">GENUINE_VERIFIED_SHA256</span>
                </span>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Save PDF</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
