import React, { useState } from 'react';
import { X, Copy, Check, Maximize2, Minimize2, ExternalLink, QrCode, Building2, Sparkles, Trophy } from 'lucide-react';
import { QrCodeSvg } from '../common/QrCodeSvg.js';

interface ProjectorQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: {
    name: string;
    code: string;
    collegeName?: string;
    participantLink?: string;
  } | null;
}

export const ProjectorQrModal: React.FC<ProjectorQrModalProps> = ({
  isOpen,
  onClose,
  event
}) => {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!isOpen || !event) return null;

  // Invariant: QR code encodes ONLY the participant join link
  const joinUrl = event.participantLink
    ? (event.participantLink.startsWith('http') ? event.participantLink : `${window.location.origin}${event.participantLink}`)
    : `${window.location.origin}/join/${encodeURIComponent(event.code)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-gradient-to-b from-[#0e1424] to-[#080c16] border border-amber-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl text-center overflow-hidden">
        {/* Glow ambient background elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Controls: Fullscreen & Close */}
        <div className="flex items-center justify-between relative z-10 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span>LAB PROJECTOR DISPLAY MODE</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              title="Toggle Fullscreen for Projector"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-8 items-center relative z-10">
          {/* Left / Center QR Code Display */}
          <div className="md:col-span-5 flex flex-col items-center justify-center space-y-3">
            <div className="p-4 rounded-3xl bg-white/95 border-2 border-amber-400/40 shadow-2xl shadow-amber-500/20">
              <QrCodeSvg value={joinUrl} size={240} className="mx-auto" />
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Scan with mobile or lab device camera
            </span>
          </div>

          {/* Right Instructions & Event Code Card */}
          <div className="md:col-span-7 text-left space-y-5">
            <div>
              {event.collegeName && (
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider mb-1">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{event.collegeName}</span>
                </div>
              )}
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {event.name}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Official On-Campus Debugging Assessment Portal
              </p>
            </div>

            {/* Huge Event Code Box */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/40 shadow-lg space-y-1.5">
              <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                Event Code:
              </div>
              <div className="text-3xl sm:text-4xl font-black tracking-widest text-amber-400 font-mono select-all">
                {event.code}
              </div>
            </div>

            {/* Direct Join Link with 1-Click Copy */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-mono text-slate-400 font-bold uppercase">
                Direct Browser Join Link:
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={joinUrl}
                  className="flex-1 h-10 px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-slate-200 focus:outline-none select-all"
                />
                <button
                  onClick={handleCopyLink}
                  className="h-10 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-bold font-mono transition-all flex items-center gap-1.5 active:scale-95 shadow-md shadow-amber-500/20 cursor-pointer whitespace-nowrap"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Lab Student Instructions */}
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-[11px] font-mono space-y-1.5 text-slate-300">
              <div className="text-amber-400 font-bold">Contestant Instructions:</div>
              <div className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">1.</span>
                <span>Connect to campus computer lab network or Wi-Fi.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">2.</span>
                <span>Open browser to the link above or scan the QR code.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">3.</span>
                <span>Enter your Roll Number / Registration ID and begin.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
