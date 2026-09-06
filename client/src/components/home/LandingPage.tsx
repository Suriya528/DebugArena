import React, { useState } from 'react';
import {
  Shield,
  Terminal,
  Trophy,
  Lock,
  Cpu,
  Zap,
  CheckCircle2,
  Search,
  ArrowRight,
  Building2,
  Users,
  Award,
  EyeOff
} from 'lucide-react';
import { AdminAuthModal } from '../auth/AdminAuthModal';
import { JoinEventModal } from '../participant/JoinEventModal';

export const LandingPage: React.FC = () => {
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [certLookupId, setCertLookupId] = useState('');

  const handleVerifyCert = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = certLookupId.trim();
    if (cleanId) {
      window.location.href = `/verify-cert/${encodeURIComponent(cleanId)}`;
    }
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black relative overflow-x-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 -mt-32 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#070b13]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-black font-black shadow-lg shadow-cyan-500/20">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-tight text-white">DebugArena</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 tracking-wide uppercase">
                  Enterprise
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">College Tournament Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 transition-all flex items-center gap-2"
            >
              <Shield className="w-4 h-4 text-indigo-400" />
              <span>Admin Portal</span>
            </button>

            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2 active:scale-95"
            >
              <Trophy className="w-4 h-4 text-slate-950" />
              <span>Join Event</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
          {/* Status Pills */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs text-slate-300 mb-8 backdrop-blur-md shadow-xl">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-medium">Strict Kiosk Anti-Cheat</span>
            <span className="text-slate-600">•</span>
            <span className="text-cyan-400 font-mono">AST Code Mutation</span>
            <span className="text-slate-600">•</span>
            <span className="text-indigo-400">Multi-College Tenancy</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight max-w-4xl mx-auto leading-[1.15]">
            High-Stakes College <br />
            <span className="bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              Debugging Competitions.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Eliminate cheating with automated browser tab lockdowns, AST test synthesis, 
            instant multi-language execution, and tamper-proof certificate verification.
          </p>

          {/* Action CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl text-sm font-bold text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 shadow-xl shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Trophy className="w-4 h-4" />
              <span>Enter with Event Code</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl text-sm font-semibold text-white bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 transition-all flex items-center justify-center gap-2"
            >
              <Shield className="w-4 h-4 text-indigo-400" />
              <span>Organizer Sign-In</span>
            </button>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="py-16 border-t border-slate-800/60 bg-slate-950/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Engineered for Integrity & Scale
              </h2>
              <p className="mt-3 text-sm text-slate-400">
                Built from the ground up for university hackathons, campus drives, and departmental coding rounds.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1 */}
              <div className="p-6 rounded-3xl bg-[#0b101c] border border-slate-800 hover:border-cyan-500/40 transition-all group">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-5 group-hover:scale-110 transition-transform">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">Strict Tab-Lock Kiosk</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Alt+Tab, window blur, and minimizing immediately trigger a blackout curtain, clipboard wipe, and severe 2-strike penalty. Proctoring is automatically disarmed the instant the round is submitted.
                </p>
              </div>

              {/* Card 2 */}
              <div className="p-6 rounded-3xl bg-[#0b101c] border border-slate-800 hover:border-indigo-500/40 transition-all group">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-5 group-hover:scale-110 transition-transform">
                  <Cpu className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">AST Code DNA Synthesis</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Prevents peer collusion by applying deterministic AST mutations to variable names, control flow, and seeded test values for every individual candidate seat.
                </p>
              </div>

              {/* Card 3 */}
              <div className="p-6 rounded-3xl bg-[#0b101c] border border-slate-800 hover:border-purple-500/40 transition-all group">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-5 group-hover:scale-110 transition-transform">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">Multi-College Tenancy</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Support multiple university departments and host institutions simultaneously with dedicated event access codes, custom strike thresholds, and branded certificate seals.
                </p>
              </div>

              {/* Card 4 */}
              <div className="p-6 rounded-3xl bg-[#0b101c] border border-slate-800 hover:border-emerald-500/40 transition-all group">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-110 transition-transform">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">Official Verified Certs</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Automated generation of cryptographic SVG/PDF certificates signed with unique SHA-256 verification hashes for top performers, verifiable by any employer.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Certificate Quick Lookup Section */}
        <section className="py-16 border-t border-slate-800/60 max-w-4xl mx-auto px-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto mb-4">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Verify Official Certificate Authenticity
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-md mx-auto">
            Recruiters, colleges, and participants can verify the authenticity and rank credentials of any issued certificate.
          </p>

          <form onSubmit={handleVerifyCert} className="mt-6 flex items-center gap-2 max-w-md mx-auto">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={certLookupId}
                onChange={(e) => setCertLookupId(e.target.value)}
                placeholder="Enter Certificate ID (e.g. CERT-DEBUG-001)"
                className="w-full pl-10 pr-3.5 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors whitespace-nowrap shadow-lg shadow-indigo-600/30"
            >
              Verify Certificate
            </button>
          </form>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#05080e] py-8 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">DebugArena</span>
            <span>•</span>
            <span>Production Grade v2.0</span>
          </div>
          <div>Strict Kiosk Active • Server-Authoritative Timing • Immutable Retention Engine</div>
        </div>
      </footer>

      {/* Modals */}
      <AdminAuthModal isOpen={isAdminModalOpen} onClose={() => setIsAdminModalOpen(false)} />
      <JoinEventModal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} />
    </div>
  );
};
