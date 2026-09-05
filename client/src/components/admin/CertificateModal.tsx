import React, { useState } from 'react';
import {
  X,
  Award,
  CheckCircle2,
  Download,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  Printer,
  Building2,
  Sparkles,
  Palette
} from 'lucide-react';
import { api } from '../../services/api.js';

interface CertificateModalProps {
  userId: string;
  username: string;
  name: string;
  rank: number;
  score: number;
  eventId?: string;
  eventTitle?: string;
  collegeName?: string;
  collegeCode?: string;
  primaryColor?: string;
  secondaryColor?: string;
  initialTemplateUrl?: string;
  initialUseCustom?: boolean;
  onClose: () => void;
}

interface ColorPreset {
  id: string;
  label: string;
  primary: string;
  secondary: string;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  userId,
  username,
  name,
  rank,
  score,
  eventId,
  eventTitle = 'DebugX Championship 2026',
  collegeName = 'ABC Institute of Technology',
  collegeCode = 'ABC-TECH',
  primaryColor: initialPrimary = '#b8860b',
  secondaryColor: initialSecondary = '#d97706',
  initialTemplateUrl = '',
  initialUseCustom = false,
  onClose
}) => {
  const [certId, setCertId] = useState<string>(
    () => 'CERT-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-2026'
  );
  const [hash, setHash] = useState<string>(
    () => 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  );
  const [copied, setCopied] = useState<boolean>(false);
  const [issued, setIssued] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Color Combination state: defaults to Government / Institutional Gold & Ochre (like the user's pic)
  const [primaryColor, setPrimaryColor] = useState<string>(initialPrimary || '#b8860b');
  const [secondaryColor, setSecondaryColor] = useState<string>(initialSecondary || '#d97706');
  const [signatoryName, setSignatoryName] = useState<string>('Dr. A. Sakthivel');
  const [signatoryTitle, setSignatoryTitle] = useState<string>('Chairman, Examination & Technical Board');
  const [identificationNo, setIdentificationNo] = useState<string>(
    () => `UP00F20-${Math.floor(100000 + Math.random() * 900000)}`
  );

  const presets: ColorPreset[] = [
    {
      id: 'govt_gold',
      label: '🏛️ National Gold & Ochre (Standard)',
      primary: '#b8860b',
      secondary: '#d97706'
    },
    {
      id: 'inst_brand',
      label: '🎓 Institutional Auto-Brand',
      primary: initialPrimary && initialPrimary !== '#b8860b' ? initialPrimary : '#4f46e5',
      secondary: initialSecondary && initialSecondary !== '#d97706' ? initialSecondary : '#06b6d4'
    },
    {
      id: 'royal_navy',
      label: '👑 Royal Navy & Gold',
      primary: '#1e3a8a',
      secondary: '#c59b27'
    },
    {
      id: 'emerald_laureate',
      label: '🌲 Emerald Laureate',
      primary: '#065f46',
      secondary: '#d97706'
    },
    {
      id: 'crimson_laureate',
      label: '🍷 Crimson Distinction',
      primary: '#991b1b',
      secondary: '#b45309'
    }
  ];

  const handleIssueCert = async () => {
    setLoading(true);
    try {
      const res = await api.post('/certificates/issue', {
        userId,
        rank,
        totalScore: score,
        eventId,
        eventTitle,
        collegeName,
        primaryColor,
        secondaryColor,
        signatoryName,
        signatoryTitle,
        identificationNo
      });
      if (res.data.success && res.data.certificate) {
        setCertId(res.data.certificate.certificateId);
        setHash(res.data.certificate.verificationHash);
        setIssued(true);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to issue certificate');
    } finally {
      setLoading(false);
    }
  };

  const verifyUrl = `${window.location.origin}/verify-cert/${certId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-4xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col my-auto max-h-[96vh] overflow-hidden text-left">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg"
              style={{ backgroundColor: primaryColor }}
            >
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Official Verifiable Certificate of Merit
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  NSDC & Technical Standard
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Standardized high-contrast institutional credential with unique college color combinations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Color Palette Selector Bar */}
        <div className="px-6 py-3 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-indigo-400" />
              Institutional Color Combination:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {presets.map(p => {
                const isActive = primaryColor === p.primary && secondaryColor === p.secondary;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPrimaryColor(p.primary);
                      setSecondaryColor(p.secondary);
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                      isActive
                        ? 'bg-slate-800 text-white border-indigo-500 shadow-md'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-black/30"
                      style={{ backgroundColor: p.primary }}
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-black/30 -ml-1"
                      style={{ backgroundColor: p.secondary }}
                    />
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Hex Color Pickers */}
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-slate-400 flex items-center gap-1">
              Primary:
              <input
                type="color"
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
                className="w-6 h-6 rounded-md bg-transparent border-0 cursor-pointer"
              />
            </label>
            <label className="text-[11px] text-slate-400 flex items-center gap-1">
              Accent:
              <input
                type="color"
                value={secondaryColor}
                onChange={e => setSecondaryColor(e.target.value)}
                className="w-6 h-6 rounded-md bg-transparent border-0 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Certificate Display Area */}
        <div className="flex-1 overflow-auto p-4 sm:p-8 bg-slate-950/50">
          {/* Print container */}
          <div
            id="printable-certificate"
            className="relative mx-auto w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden transition-all text-slate-900 selection:bg-amber-100"
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
              {/* Intermediate Clean White Margin Gap */}
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
                  {/* Subtle Background Watermark Crest */}
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
                          {collegeName}
                        </div>
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                          Institutional Examination Host • Code: {collegeCode}
                        </div>
                      </div>
                    </div>

                    {/* Center: National Assessment / Skill Framework */}
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
                        Government & Autonomous Standard
                      </div>
                    </div>

                    {/* Right: Championship / Event Emblem */}
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
                      {name || username}
                    </div>
                    <p className="text-[11px] font-mono text-slate-500">
                      (Aadhaar / System Reg: <span className="font-bold text-slate-700">{identificationNo}</span> • @{username})
                    </p>

                    <p className="font-serif text-xs leading-relaxed text-slate-700 pt-2 px-4">
                      has successfully cleared the technical evaluation for the competitive debugging challenge in{' '}
                      <strong className="text-slate-900 font-bold underline decoration-slate-300">
                        {eventTitle}
                      </strong>
                      , conforming to the National Technical Competency Framework Level 4, achieving{' '}
                      <strong className="font-black text-slate-900">
                        Rank #{rank}
                      </strong>{' '}
                      with <strong className="font-black text-slate-900">Grade A ({score} Points)</strong>.
                    </p>

                    <div className="pt-2 text-[10px] text-slate-500 font-serif">
                      <span>March 20, 2026</span> •{' '}
                      <span className="font-bold text-slate-700">System Identification Number: {identificationNo}</span>
                    </div>
                    <div className="text-[9px] text-slate-400 font-serif">
                      Training & Evaluation Facilitated by {collegeName} Department of Computer Science & Engineering
                    </div>
                  </div>

                  {/* BOTTOM ROW: QR Code, Official Rosette Seal, and Digital Signature */}
                  <div className="mt-8 pt-4 border-t border-slate-300/90 grid grid-cols-3 items-center">
                    {/* Left: Scannable QR Code */}
                    <div className="flex items-center gap-2.5 text-left">
                      <div className="p-1.5 rounded-lg bg-white border border-slate-300 shadow-sm flex-shrink-0">
                        {/* High-Contrast Crisp SVG QR representation */}
                        <svg className="w-14 h-14" viewBox="0 0 100 100" fill="#0f172a">
                          {/* Corner positioning squares */}
                          <rect x="5" y="5" width="28" height="28" fill="none" stroke="#0f172a" strokeWidth="6" />
                          <rect x="13" y="13" width="12" height="12" fill="#0f172a" />
                          <rect x="67" y="5" width="28" height="28" fill="none" stroke="#0f172a" strokeWidth="6" />
                          <rect x="75" y="13" width="12" height="12" fill="#0f172a" />
                          <rect x="5" y="67" width="28" height="28" fill="none" stroke="#0f172a" strokeWidth="6" />
                          <rect x="13" y="75" width="12" height="12" fill="#0f172a" />
                          {/* Data matrix pattern */}
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
                        <div className="font-bold text-slate-800">{certId}</div>
                        <div className="truncate max-w-[110px] text-slate-400 mt-0.5 font-bold">
                          Hash: {hash.slice(0, 12)}...
                        </div>
                        <div className="text-[7.5px] text-indigo-700 font-bold underline mt-0.5">
                          verify.debugarena.edu
                        </div>
                      </div>
                    </div>

                    {/* Center: Official Medal / Rosette Seal */}
                    <div className="flex flex-col items-center justify-center">
                      <div className="relative flex items-center justify-center">
                        <svg className="w-14 h-14" viewBox="0 0 100 100">
                          {/* Outer Rosette Ring */}
                          <circle
                            cx="50"
                            cy="50"
                            r="42"
                            fill="none"
                            stroke={primaryColor}
                            strokeWidth="3.5"
                            strokeDasharray="4 2"
                          />
                          {/* Inner Circle */}
                          <circle cx="50" cy="50" r="34" fill="#fffdfa" stroke={secondaryColor} strokeWidth="2" />
                          {/* Star */}
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

                    {/* Right: Signature of Chairman */}
                    <div className="flex flex-col items-end text-right">
                      {/* Realistic Digital Pen Signature in Fountain Pen Blue */}
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
                          {collegeName}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 font-mono">
              ID: {certId}
            </span>
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Link Copied' : 'Copy Verification URL'}</span>
            </button>
            <a
              href={verifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Public Verify Page</span>
            </a>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>

            {!issued ? (
              <button
                type="button"
                onClick={handleIssueCert}
                disabled={loading}
                className="px-5 py-2 rounded-xl text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: primaryColor }}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{loading ? 'Issuing Certificate...' : 'Save & Register Credential'}</span>
              </button>
            ) : (
              <div className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Officially Registered in Ledger</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
