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
  ShieldCheck,
  Layers,
  Code2,
  ExternalLink,
  Sparkles,
  Activity
} from 'lucide-react';
import { AdminAuthModal } from '../auth/AdminAuthModal.js';
import { JoinEventModal } from '../participant/JoinEventModal.js';

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

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black relative overflow-x-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 -mt-32 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#070b13]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-black shadow-lg shadow-cyan-500/20">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white">DebugArena</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Collegiate Tournament Platform</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
            <button
              onClick={() => scrollToSection('features')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('verification')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Verify Certificate
            </button>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Shield className="w-4 h-4 text-indigo-400" />
              <span>Organizer Portal</span>
            </button>

            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-slate-950" />
              <span>Join Tournament</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs text-slate-300 mb-8 backdrop-blur-md shadow-xl">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-slate-200">Next-Gen Collegiate Code & Debugging Arena</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight max-w-4xl mx-auto leading-[1.15]">
            Host High-Stakes Collegiate <br />
            <span className="bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              Debugging Competitions.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            The all-in-one tournament platform for university hackathons, campus drives, and departmental coding rounds. Built with automated test runners, focus-lock proctoring, live scoreboards, and verified credentials.
          </p>

          {/* Action CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl text-sm font-bold text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 shadow-xl shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <Trophy className="w-4 h-4" />
              <span>Enter with Event Code</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl text-sm font-semibold text-white bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Shield className="w-4 h-4 text-indigo-400" />
              <span>Organizer Sign-In</span>
            </button>
          </div>

          {/* Trust Metrics / Stats Row */}
          <div className="mt-16 pt-8 border-t border-slate-800/60 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-4xl mx-auto text-center">
            <div>
              <div className="text-2xl sm:text-3xl font-black text-white">4+ Languages</div>
              <p className="text-xs text-slate-400 mt-1">Python, Java, C++, JS</p>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-cyan-400">Strict Kiosk</div>
              <p className="text-xs text-slate-400 mt-1">Focus & Tab-Lock</p>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-indigo-400">&lt; 500ms</div>
              <p className="text-xs text-slate-400 mt-1">Execution Sandbox</p>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">SHA-256</div>
              <p className="text-xs text-slate-400 mt-1">Verifiable Credentials</p>
            </div>
          </div>
        </section>

        {/* Live Code Arena Interactive Preview */}
        <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <div className="rounded-3xl border border-slate-800 bg-[#090e18] shadow-2xl overflow-hidden">
            {/* Editor Top Bar */}
            <div className="px-5 py-3.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="ml-3 font-mono text-slate-400 text-[11px]">Round 2: Algorithmic Debugging Sprint</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-mono font-bold flex items-center gap-1">
                  <Activity className="w-3 h-3" /> PROCTORING ARMED
                </span>
                <span className="font-mono text-cyan-400 font-bold">14:32</span>
              </div>
            </div>

            {/* Editor & Execution Split Pane */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 font-mono text-xs">
              {/* Code Snippet */}
              <div className="p-5 text-slate-300 leading-relaxed bg-[#070b13]/50 overflow-x-auto">
                <div className="text-slate-500 mb-2">// Fix the off-by-one bug in binary search</div>
                <div><span className="text-indigo-400">def</span> <span className="text-cyan-300">binary_search</span>(arr, target):</div>
                <div className="pl-4">low = <span className="text-amber-400">0</span></div>
                <div className="pl-4">high = <span className="text-indigo-400">len</span>(arr) - <span className="text-amber-400">1</span></div>
                <div className="pl-4"><span className="text-indigo-400">while</span> low &lt;= high:</div>
                <div className="pl-8">mid = (low + high) // <span className="text-amber-400">2</span></div>
                <div className="pl-8"><span className="text-indigo-400">if</span> arr[mid] == target:</div>
                <div className="pl-12 text-emerald-400"><span className="text-indigo-400">return</span> mid  <span className="text-slate-500"># Bug resolved</span></div>
                <div className="pl-8"><span className="text-indigo-400">elif</span> arr[mid] &lt; target:</div>
                <div className="pl-12">low = mid + <span className="text-amber-400">1</span></div>
                <div className="pl-8"><span className="text-indigo-400">else</span>:</div>
                <div className="pl-12">high = mid - <span className="text-amber-400">1</span></div>
                <div className="pl-4"><span className="text-indigo-400">return</span> -<span className="text-amber-400">1</span></div>
              </div>

              {/* Live Sandbox Results */}
              <div className="p-5 bg-slate-950/60 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Test Suite Evaluation</div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Test Case 1: Standard Array</span>
                    <span className="text-slate-400">18ms</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Test Case 2: Boundary Match</span>
                    <span className="text-slate-400">22ms</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Test Case 3: Element Not Found</span>
                    <span className="text-slate-400">14ms</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Score: <strong className="text-white">100/100</strong></span>
                  <span className="text-emerald-400 font-semibold">ALL TESTS PASSED</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section id="features" className="py-20 border-t border-slate-800/60 bg-slate-950/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Architected for Competition Integrity
              </h2>
              <p className="mt-3 text-sm text-slate-400">
                A complete software suite designed for collegiate departments, academic hackathons, and high-volume technical screening.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1 */}
              <div className="p-6 rounded-3xl bg-[#0b101c] border border-slate-800 hover:border-cyan-500/40 transition-all group">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-5 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">Focus-Lock Proctoring</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Enforces full-screen kiosk mode, tracks window blur and tab switching, and detects unauthorized copy-paste attempts with configurable multi-strike penalty rules.
                </p>
              </div>

              {/* Card 2 */}
              <div className="p-6 rounded-3xl bg-[#0b101c] border border-slate-800 hover:border-indigo-500/40 transition-all group">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-5 group-hover:scale-110 transition-transform">
                  <Code2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">Sandboxed Test Runner</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Real-time code evaluation across Python, Java, C++, and JavaScript with isolated memory limits, execution time thresholds, and automated unit test verification.
                </p>
              </div>

              {/* Card 3 */}
              <div className="p-6 rounded-3xl bg-[#0b101c] border border-slate-800 hover:border-purple-500/40 transition-all group">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-5 group-hover:scale-110 transition-transform">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">Dynamic Multi-Stage Rounds</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Configure custom tournament progression with MCQ screening rounds, rapid debugging sprints, and automated sudden-death tie-breakers for top finalists.
                </p>
              </div>

              {/* Card 4 */}
              <div className="p-6 rounded-3xl bg-[#0b101c] border border-slate-800 hover:border-emerald-500/40 transition-all group">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-110 transition-transform">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">Verifiable Credentials</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Auto-generates cryptographically signed achievement certificates complete with individual ranks, scores, and permanent public verification hashes for recruiters.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* "How It Works" Section */}
        <section id="how-it-works" className="py-20 border-t border-slate-800/60 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              How Tournaments Run
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              From event creation to final certificate issuance in four frictionless steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="relative p-6 rounded-3xl bg-[#0b101c] border border-slate-800 flex flex-col items-start">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 font-black text-xs flex items-center justify-center mb-4">
                01
              </div>
              <h4 className="text-sm font-bold text-white mb-2">Create & Configure</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Organizers set up tournament rounds, select question banks, and configure proctoring limits.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative p-6 rounded-3xl bg-[#0b101c] border border-slate-800 flex flex-col items-start">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 font-black text-xs flex items-center justify-center mb-4">
                02
              </div>
              <h4 className="text-sm font-bold text-white mb-2">Lobby Access</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Participants enter with a 6-digit event code and student roll number with instant reconnection safety.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative p-6 rounded-3xl bg-[#0b101c] border border-slate-800 flex flex-col items-start">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 font-black text-xs flex items-center justify-center mb-4">
                03
              </div>
              <h4 className="text-sm font-bold text-white mb-2">Proctored Arena</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Contestants debug under focus lockdown while the sandboxed judge verifies test cases in milliseconds.
              </p>
            </div>

            {/* Step 4 */}
            <div className="relative p-6 rounded-3xl bg-[#0b101c] border border-slate-800 flex flex-col items-start">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center mb-4">
                04
              </div>
              <h4 className="text-sm font-bold text-white mb-2">Rankings & Certs</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Live leaderboards update automatically and top performers receive verified cryptographic certificates.
              </p>
            </div>
          </div>
        </section>

        {/* Certificate Quick Lookup Section */}
        <section id="verification" className="py-20 border-t border-slate-800/60 max-w-4xl mx-auto px-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto mb-4">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Verify Official Tournament Certificate
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-md mx-auto">
            Recruiters, colleges, and students can authenticate the score, rank, and cryptographic hash of any issued credential.
          </p>

          <form onSubmit={handleVerifyCert} className="mt-6 flex flex-col sm:flex-row items-center gap-2.5 max-w-md mx-auto">
            <div className="relative flex-1 w-full">
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
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors whitespace-nowrap shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              Verify Credential
            </button>
          </form>
        </section>
      </main>

      {/* Production-Grade SaaS Footer */}
      <footer className="border-t border-slate-800/80 bg-[#05080e] pt-16 pb-12 text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            {/* Column 1: Brand & Status */}
            <div className="col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-black shadow-md shadow-cyan-500/20">
                  <Terminal className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-white text-base">DebugArena</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm mb-5">
                The enterprise-grade competitive debugging and code assessment platform built for university hackathons, campus recruitment, and departmental tournaments.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>All Tournament Systems Operational</span>
              </div>
            </div>

            {/* Column 2: Platform */}
            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">Platform</h4>
              <ul className="space-y-2 text-xs">
                <li><button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors cursor-pointer">Code Sandbox</button></li>
                <li><button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors cursor-pointer">Focus-Lock Kiosk</button></li>
                <li><button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors cursor-pointer">Multi-Stage Rounds</button></li>
                <li><button onClick={() => scrollToSection('verification')} className="hover:text-white transition-colors cursor-pointer">Credential Verification</button></li>
              </ul>
            </div>

            {/* Column 3: Portals */}
            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">Access Portals</h4>
              <ul className="space-y-2 text-xs">
                <li><button onClick={() => setIsJoinModalOpen(true)} className="hover:text-white transition-colors cursor-pointer">Enter Tournament</button></li>
                <li><button onClick={() => setIsAdminModalOpen(true)} className="hover:text-white transition-colors cursor-pointer">Organizer Sign-In</button></li>
                <li><button onClick={() => setIsAdminModalOpen(true)} className="hover:text-white transition-colors cursor-pointer">University Setup</button></li>
                <li><button onClick={() => scrollToSection('verification')} className="hover:text-white transition-colors cursor-pointer">Certificate Lookup</button></li>
              </ul>
            </div>

            {/* Column 4: Integrity & Compliance */}
            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">Integrity</h4>
              <ul className="space-y-2 text-xs">
                <li className="text-slate-500">Anti-Cheat Guidelines</li>
                <li className="text-slate-500">Academic Honor Code</li>
                <li className="text-slate-500">Data Privacy</li>
                <li className="text-slate-500">Security Standards</li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div>
              &copy; {new Date().getFullYear()} DebugArena Platform. Built for competitive programming and academic excellence.
            </div>
            <div className="flex items-center gap-4">
              <span>Privacy Policy</span>
              <span>•</span>
              <span>Terms of Service</span>
              <span>•</span>
              <span>Academic License</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AdminAuthModal isOpen={isAdminModalOpen} onClose={() => setIsAdminModalOpen(false)} />
      <JoinEventModal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} />
    </div>
  );
};
