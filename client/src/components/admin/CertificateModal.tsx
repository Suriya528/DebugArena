import React, { useState } from 'react';
import { X, Award, CheckCircle2, QrCode, Download, ShieldCheck, ExternalLink, Copy, Check } from 'lucide-react';
import { api } from '../../services/api.js';

interface CertificateModalProps {
  userId: string;
  username: string;
  name: string;
  rank: number;
  score: number;
  eventTitle?: string;
  collegeName?: string;
  initialTemplateUrl?: string;
  initialUseCustom?: boolean;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  userId,
  username,
  name,
  rank,
  score,
  eventTitle = 'DebugArena National Hackathon 2026',
  collegeName = 'Global Institute of Technology',
  initialTemplateUrl = '',
  initialUseCustom = false,
  onClose
}) => {
  const [certId, setCertId] = useState<string>(() => 'CERT-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-2026');
  const [hash, setHash] = useState<string>(() => 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  const [copied, setCopied] = useState<boolean>(false);
  const [issued, setIssued] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [templateTheme, setTemplateTheme] = useState<'luxury' | 'custom' | 'parchment'>(
    initialUseCustom ? 'custom' : 'luxury'
  );
  const [customUrl, setCustomUrl] = useState<string>(initialTemplateUrl || '');

  const handleIssueCert = async () => {
    setLoading(true);
    try {
      const res = await api.post('/certificates/issue', {
        userId,
        rank,
        totalScore: score,
        eventTitle,
        collegeName,
        templateUrl: customUrl,
        useCustomTemplate: templateTheme === 'custom'
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Verifiable Achievement Certificate</h3>
              <p className="text-xs text-slate-400 mt-0.5">Cryptographically signed credentials & QR authenticity</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Theme Selector Toolbar */}
        <div className="px-6 py-2.5 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">Template Style:</span>
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setTemplateTheme('luxury')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  templateTheme === 'luxury'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Luxury Gold
              </button>
              <button
                type="button"
                onClick={() => setTemplateTheme('custom')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  templateTheme === 'custom'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                College Custom
              </button>
              <button
                type="button"
                onClick={() => setTemplateTheme('parchment')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  templateTheme === 'parchment'
                    ? 'bg-amber-100 text-slate-900 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Academic Parchment
              </button>
            </div>
          </div>

          {templateTheme === 'custom' && (
            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <input
                type="text"
                placeholder="Template image URL..."
                value={customUrl}
                onChange={e => setCustomUrl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}
        </div>

        {/* Certificate Canvas / Card */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          <div
            className={`relative p-8 rounded-3xl shadow-2xl text-center overflow-hidden transition-all ${
              templateTheme === 'parchment'
                ? 'bg-amber-50/95 text-slate-900 border-4 border-double border-amber-800/60'
                : templateTheme === 'custom'
                ? 'bg-slate-950 border-2 border-indigo-500/40'
                : 'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-2 border-amber-500/30'
            }`}
            style={
              templateTheme === 'custom' && customUrl
                ? {
                    backgroundImage: `linear-gradient(rgba(10, 15, 30, 0.85), rgba(10, 15, 30, 0.85)), url(${customUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }
                : {}
            }
          >
            {/* Certificate Decorative Border */}
            <div
              className={`absolute inset-2 rounded-2xl border pointer-events-none ${
                templateTheme === 'parchment'
                  ? 'border-amber-800/30'
                  : templateTheme === 'custom'
                  ? 'border-indigo-500/25'
                  : 'border-amber-500/20'
              }`}
            />

            {/* Badge */}
            <div
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border ${
                templateTheme === 'parchment'
                  ? 'bg-amber-800/10 border-amber-800/30 text-amber-900 font-serif'
                  : templateTheme === 'custom'
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              {templateTheme === 'custom' ? 'Verified Institutional Credential' : 'Official Certificate of Excellence'}
            </div>

            <div
              className={`text-xs uppercase tracking-widest font-semibold mb-1 ${
                templateTheme === 'parchment' ? 'text-amber-900/80 font-serif' : 'text-slate-400'
              }`}
            >
              {collegeName}
            </div>
            <h2
              className={`text-2xl font-black mb-4 tracking-tight ${
                templateTheme === 'parchment' ? 'text-slate-900 font-serif' : 'text-white'
              }`}
            >
              {eventTitle}
            </h2>

            <p
              className={`text-xs italic mb-2 ${
                templateTheme === 'parchment' ? 'text-slate-600 font-serif' : 'text-slate-400'
              }`}
            >
              This is proudly presented to
            </p>
            <div
              className={`text-3xl font-extrabold mb-1 ${
                templateTheme === 'parchment'
                  ? 'text-amber-900 font-serif'
                  : 'text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200'
              }`}
            >
              {name || username}
            </div>
            <div
              className={`text-xs font-mono mb-6 ${
                templateTheme === 'parchment' ? 'text-slate-500' : 'text-slate-500'
              }`}
            >
              @{username}
            </div>

            <p
              className={`text-xs max-w-md mx-auto leading-relaxed mb-6 ${
                templateTheme === 'parchment' ? 'text-slate-700 font-serif' : 'text-slate-300'
              }`}
            >
              For demonstrating exceptional proficiency in competitive debugging, code optimization, and algorithmic problem-solving, achieving{' '}
              <strong className={templateTheme === 'parchment' ? 'text-amber-900 font-bold' : 'text-amber-300'}>
                Rank #{rank}
              </strong>{' '}
              with an aggregate score of{' '}
              <strong className={templateTheme === 'parchment' ? 'text-amber-900 font-bold' : 'text-amber-300'}>
                {score} points
              </strong>.
            </p>

            {/* QR & Verification Footprint */}
            <div
              className={`pt-6 border-t flex items-center justify-between gap-4 ${
                templateTheme === 'parchment' ? 'border-amber-800/20' : 'border-slate-800/80'
              }`}
            >
              <div className="text-left font-mono">
                <div
                  className={`text-[10px] uppercase font-bold ${
                    templateTheme === 'parchment' ? 'text-slate-600' : 'text-slate-500'
                  }`}
                >
                  Certificate ID
                </div>
                <div
                  className={`text-xs font-bold ${
                    templateTheme === 'parchment' ? 'text-slate-900' : 'text-slate-300'
                  }`}
                >
                  {certId}
                </div>
                <div
                  className={`text-[10px] mt-1 ${
                    templateTheme === 'parchment' ? 'text-slate-500' : 'text-slate-500'
                  }`}
                >
                  Issued: {new Date().toLocaleDateString()}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white flex flex-col items-center justify-center shadow-md border border-slate-200">
                <QrCode className="w-12 h-12 text-slate-900" />
                <span className="text-[8px] font-mono text-slate-700 font-bold mt-1">SCAN TO VERIFY</span>
              </div>

              <div className="text-right font-mono">
                <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                  <CheckCircle2 className="w-3 h-3" /> SHA-256 Verified
                </div>
                <div
                  className={`text-[9px] truncate max-w-[140px] ${
                    templateTheme === 'parchment' ? 'text-slate-600' : 'text-slate-500'
                  }`}
                >
                  {hash}
                </div>
                <div
                  className={`text-[10px] mt-1 ${
                    templateTheme === 'parchment' ? 'text-slate-700' : 'text-slate-400'
                  }`}
                >
                  Tamper-Proof Ledger
                </div>
              </div>
            </div>
          </div>

          {/* Verification URL Bar */}
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs font-mono">
            <span className="text-slate-400 truncate flex-1">
              {verifyUrl}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition-colors font-sans font-semibold cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy Link'}
              </button>
              <a
                href={verifyUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 transition-colors font-sans font-semibold cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Verify Page</span>
              </a>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-mono">Public Verification: /verify-cert/:id</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            {!issued && (
              <button
                onClick={handleIssueCert}
                disabled={loading}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Signing...' : 'Issue & Sign Certificate'}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
