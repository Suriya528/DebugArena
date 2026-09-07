import React, { useState, useEffect } from 'react';
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
  Activity,
  Play,
  RotateCcw,
  AlertTriangle,
  AlertCircle,
  FileCheck,
  Flame,
  Check,
  Info,
  Server,
  Key,
  Menu,
  X
} from 'lucide-react';
import { AdminAuthModal } from '../auth/AdminAuthModal.js';
import { JoinEventModal } from '../participant/JoinEventModal.js';
import { FooterDetailModal, FooterTopicId } from './FooterDetailModal.js';

export const LandingPage: React.FC = () => {
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [certLookupId, setCertLookupId] = useState('');

  // Footer Details Modal state
  const [footerTopic, setFooterTopic] = useState<FooterTopicId | null>(null);
  const [isFooterModalOpen, setIsFooterModalOpen] = useState(false);

  // Interactive Live Simulator widget state
  const [activeConsoleTab, setActiveConsoleTab] = useState<'debugger' | 'proctor' | 'leaderboard'>('debugger');
  const [isEvaluatingCode, setIsEvaluatingCode] = useState(false);
  const [hasEvaluated, setHasEvaluated] = useState(true);
  const [hasInjectedDefect, setHasInjectedDefect] = useState(false);
  const [simulatedProctorStrike, setSimulatedProctorStrike] = useState<number>(0);
  const [proctorAlertMessage, setProctorAlertMessage] = useState<string | null>(null);

  const handleVerifyCert = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = certLookupId.trim();
    if (cleanId) {
      window.location.href = `/verify-cert/${encodeURIComponent(cleanId)}`;
    }
  };

  const openTopic = (topic: FooterTopicId) => {
    setFooterTopic(topic);
    setIsFooterModalOpen(true);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Run interactive sandbox simulator
  const handleRunSimulatorJudge = () => {
    setIsEvaluatingCode(true);
    setTimeout(() => {
      setIsEvaluatingCode(false);
      setHasEvaluated(true);
    }, 700);
  };

  // Simulate tab switch violation
  const handleSimulateViolation = () => {
    setSimulatedProctorStrike((prev) => Math.min(3, prev + 1));
    setProctorAlertMessage('TELEMETRY ALERT: window.onblur event captured! Focus-lock violation recorded.');
    setTimeout(() => {
      setProctorAlertMessage(null);
    }, 4500);
  };

  return (
    <div className="min-h-screen bg-[#06090e] text-slate-100 flex flex-col selection:bg-cyan-400 selection:text-black relative overflow-x-hidden font-sans">
      {/* High-Tech Architectural Grid Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: `radial-gradient(#94a3b8 1px, transparent 1px)`,
          backgroundSize: '28px 28px'
        }}
      />

      {/* Engineering Precision Horizon Lines */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent pointer-events-none" />
      <div className="absolute top-24 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent pointer-events-none" />

      {/* Top Telemetry & Status Ticker Bar */}
      <div className="w-full bg-[#04060a] border-b border-slate-800/80 text-[11px] font-mono text-slate-400 py-1.5 px-4 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto scrollbar-none whitespace-nowrap gap-6">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>ARENA_CLUSTER: ONLINE</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">ENGINE: Pyodide v314.0 (WASM/V8)</span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-slate-400 hidden sm:inline">PROCTOR: KIOSK_LEVEL_3</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span className="hidden md:inline text-slate-500">GATEWAY_LATENCY: 12ms</span>
            <span className="text-slate-600 hidden md:inline">|</span>
            <button
              onClick={() => openTopic('system-status')}
              className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>TELEMETRY_LOGS</span>
              <Activity className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Primary Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#06090e]/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 via-indigo-600 to-indigo-800 flex items-center justify-center text-white font-black shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white">DebugArena</span>
                <span className="px-2 py-0.2 rounded bg-slate-800/90 text-cyan-400 font-mono text-[10px] font-bold border border-slate-700">
                  v2.4
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Collegiate Tournament Operating System</p>
            </div>
          </div>

          {/* Quick Nav Anchor Links */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-slate-400">
            <button
              onClick={() => scrollToSection('tournament-os')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Platform OS
            </button>
            <button
              onClick={() => scrollToSection('architecture')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Engine Matrix
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Tournament Workflow
            </button>
            <button
              onClick={() => scrollToSection('verification')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Verify Certificate
            </button>
          </nav>

          {/* Action CTAs & Mobile Hamburger */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="hidden sm:inline-flex h-10 px-4 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 transition-all items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Shield className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Organizer Portal</span>
            </button>

            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="h-9 sm:h-10 px-3.5 sm:px-5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 shadow-lg shadow-cyan-500/25 border border-transparent transition-all inline-flex items-center justify-center gap-1.5 sm:gap-2 active:scale-95 cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5 text-slate-950 shrink-0" />
              <span><span className="inline sm:hidden">Join</span><span className="hidden sm:inline">Join with Code</span></span>
            </button>

            {/* Mobile Hamburger Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-all cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Collapsible Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-800 bg-[#070b14]/98 backdrop-blur-2xl px-4 py-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-300">
              <button
                onClick={() => {
                  scrollToSection('tournament-os');
                  setIsMobileMenuOpen(false);
                }}
                className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 text-left hover:text-cyan-400 hover:border-cyan-500/40 transition-colors"
              >
                Platform OS
              </button>
              <button
                onClick={() => {
                  scrollToSection('architecture');
                  setIsMobileMenuOpen(false);
                }}
                className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 text-left hover:text-cyan-400 hover:border-cyan-500/40 transition-colors"
              >
                Engine Matrix
              </button>
              <button
                onClick={() => {
                  scrollToSection('how-it-works');
                  setIsMobileMenuOpen(false);
                }}
                className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 text-left hover:text-cyan-400 hover:border-cyan-500/40 transition-colors"
              >
                Tournament Workflow
              </button>
              <button
                onClick={() => {
                  scrollToSection('verification');
                  setIsMobileMenuOpen(false);
                }}
                className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 text-left hover:text-cyan-400 hover:border-cyan-500/40 transition-colors"
              >
                Verify Certificate
              </button>
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
              <button
                onClick={() => {
                  setIsAdminModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Shield className="w-4 h-4 text-indigo-400" />
                <span>Organizer Control Portal</span>
              </button>

              <button
                onClick={() => {
                  setIsJoinModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-slate-950" />
                <span>Enter Contest Lobby</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                CLUSTER: ONLINE
              </span>
              <button
                onClick={() => {
                  openTopic('system-status');
                  setIsMobileMenuOpen(false);
                }}
                className="text-cyan-400 hover:underline"
              >
                System Telemetry Logs &rarr;
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {/* ========================================================= */}
        {/* HERO SECTION: ASYMMETRIC COMMAND CONSOLE & SIMULATOR      */}
        {/* ========================================================= */}
        <section id="tournament-os" className="relative pt-12 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Left Column: Command Overview */}
            <div className="lg:col-span-6 space-y-6 text-left">
              {/* Season Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 font-mono shadow-sm">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-cyan-300 font-bold uppercase">2026 Season</span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400">Campus Tournaments & Screening</span>
              </div>

              {/* Commanding Headline */}
              <div className="space-y-2">
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
                  The Collegiate <br />
                  <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
                    Debugging Tournament
                  </span>{' '}
                  Operating System.
                </h1>
                <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-xl pt-2 font-normal">
                  Purpose-built for engineering colleges, student symposiums, and departmental coding rounds.
                  Features in-browser WebAssembly test sandboxes, hardware focus-lock proctoring, live collegiate scoreboards, and instant SHA-256 verifiable credentials.
                </p>
              </div>

              {/* Primary Launch Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 max-w-lg">
                <button
                  onClick={() => setIsJoinModalOpen(true)}
                  className="h-12 px-6 rounded-2xl text-xs sm:text-sm font-bold text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 shadow-xl shadow-cyan-500/20 border border-transparent transition-all inline-flex items-center justify-center gap-2.5 active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <Trophy className="w-4 h-4 text-slate-950 shrink-0" />
                  <span>Enter Contest Lobby</span>
                  <ArrowRight className="w-4 h-4 text-slate-950 shrink-0" />
                </button>

                <button
                  onClick={() => setIsAdminModalOpen(true)}
                  className="h-12 px-6 rounded-2xl text-xs sm:text-sm font-bold text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 transition-all inline-flex items-center justify-center gap-2.5 active:scale-95 cursor-pointer whitespace-nowrap group"
                >
                  <Key className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Instant Passkey Sign-In</span>
                </button>
              </div>

              {/* Architectural Highlights Matrix */}
              <div className="pt-4 grid grid-cols-2 gap-3 max-w-lg font-mono text-[11px]">
                <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80">
                  <div className="text-cyan-400 font-bold flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5" />
                    <span>WASM ISOLATION</span>
                  </div>
                  <p className="text-slate-400 text-[10px] mt-0.5">Pyodide 3.11 client sandbox</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80">
                  <div className="text-rose-400 font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>KIOSK PROCTOR</span>
                  </div>
                  <p className="text-slate-400 text-[10px] mt-0.5">Strict blur & tab-lock traps</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80">
                  <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" />
                    <span>SHA-256 PROOFS</span>
                  </div>
                  <p className="text-slate-400 text-[10px] mt-0.5">Cryptographically signed certs</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80">
                  <div className="text-indigo-400 font-bold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>3-ROUND PIPELINE</span>
                  </div>
                  <p className="text-slate-400 text-[10px] mt-0.5">MCQ + Debug + Sudden Death</p>
                </div>
              </div>
            </div>

            {/* Right Column: Live Interactive Tournament Sandbox Simulator */}
            <div className="lg:col-span-6">
              <div className="relative rounded-3xl border border-slate-700/80 bg-[#090d16] shadow-2xl overflow-hidden backdrop-blur-md">
                {/* Simulator Window Header */}
                <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                  {/* Window Controls */}
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    <span className="ml-2 font-mono text-slate-400 text-[11px] font-semibold hidden sm:inline">
                      DEBUGARENA_SIMULATOR://LIVE_RUNNER
                    </span>
                  </div>

                  {/* Mode Tabs */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-mono overflow-x-auto scrollbar-none shrink-0">
                    <button
                      onClick={() => setActiveConsoleTab('debugger')}
                      className={`px-2 sm:px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                        activeConsoleTab === 'debugger'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="hidden sm:inline">Judge Sandbox</span>
                      <span className="sm:hidden">Judge</span>
                    </button>
                    <button
                      onClick={() => setActiveConsoleTab('proctor')}
                      className={`px-2 sm:px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                        activeConsoleTab === 'proctor'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="hidden sm:inline">Proctor Radar</span>
                      <span className="sm:hidden">Radar</span>
                    </button>
                    <button
                      onClick={() => setActiveConsoleTab('leaderboard')}
                      className={`px-2 sm:px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                        activeConsoleTab === 'leaderboard'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="hidden sm:inline">Scoreboard</span>
                      <span className="sm:hidden">Scores</span>
                    </button>
                  </div>
                </div>

                {/* TAB 1: CODE DEBUGGER SANDBOX */}
                {activeConsoleTab === 'debugger' && (
                  <div className="p-4 sm:p-5 font-mono text-xs space-y-4">
                    {/* Problem Meta */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-[11px]">
                      <div>
                        <span className="text-slate-500 uppercase">Challenge: </span>
                        <span className="text-white font-bold">Fix Binary Search Off-By-One</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setHasInjectedDefect(!hasInjectedDefect);
                            setHasEvaluated(false);
                          }}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-300 transition-colors border border-slate-700 cursor-pointer"
                        >
                          {hasInjectedDefect ? 'Fix Starter Bug' : 'Inject Faulty Code'}
                        </button>
                        <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-bold text-[10px] border border-cyan-500/30">
                          PYTHON 3.11
                        </span>
                      </div>
                    </div>

                    {/* Code Snippet Box */}
                    <div className="p-3.5 rounded-2xl bg-[#05070c] border border-slate-800/90 text-slate-300 text-[11px] leading-relaxed overflow-x-auto">
                      <div>
                        <span className="text-indigo-400 font-bold">def</span>{' '}
                        <span className="text-cyan-300 font-bold">binary_search</span>(arr, target):
                      </div>
                      <div className="pl-4">
                        low, high = <span className="text-amber-400">0</span>, <span className="text-indigo-400">len</span>(arr) -{' '}
                        <span className="text-amber-400">1</span>
                      </div>
                      <div className="pl-4">
                        <span className="text-indigo-400 font-bold">while</span> low &lt;= high:
                      </div>
                      <div className="pl-8">
                        mid = (low + high) // <span className="text-amber-400">2</span>
                      </div>
                      <div className="pl-8">
                        <span className="text-indigo-400 font-bold">if</span> arr[mid] == target:
                      </div>
                      <div className="pl-12">
                        {hasInjectedDefect ? (
                          <span className="text-rose-400 bg-rose-500/10 px-1 py-0.5 rounded border border-rose-500/30">
                            <span className="text-indigo-400 font-bold">return</span> mid + 1{' '}
                            <span className="text-slate-500"># &lt;-- Off-by-one Defect!</span>
                          </span>
                        ) : (
                          <span className="text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/30">
                            <span className="text-indigo-400 font-bold">return</span> mid{' '}
                            <span className="text-slate-500"># &lt;-- Verified Correct Index</span>
                          </span>
                        )}
                      </div>
                      <div className="pl-8">
                        <span className="text-indigo-400 font-bold">elif</span> arr[mid] &lt; target:
                      </div>
                      <div className="pl-12">
                        low = mid + <span className="text-amber-400">1</span>
                      </div>
                      <div className="pl-8">
                        <span className="text-indigo-400 font-bold">else</span>:
                      </div>
                      <div className="pl-12">
                        high = mid - <span className="text-amber-400">1</span>
                      </div>
                      <div className="pl-4">
                        <span className="text-indigo-400 font-bold">return</span> -<span className="text-amber-400">1</span>
                      </div>
                    </div>

                    {/* Test Evaluation Results */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 uppercase font-bold text-[10px]">Pyodide WASM Judge Evaluation</span>
                        <button
                          disabled={isEvaluatingCode}
                          onClick={handleRunSimulatorJudge}
                          className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20 active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          <Play className={`w-3 h-3 ${isEvaluatingCode ? 'animate-spin' : ''}`} />
                          <span>{isEvaluatingCode ? 'Compiling & Judging...' : 'Run Sandboxed Judge'}</span>
                        </button>
                      </div>

                      {/* Result Pills */}
                      <div className="space-y-1.5">
                        <div
                          className={`p-2.5 rounded-xl border flex items-center justify-between text-[11px] transition-all ${
                            hasInjectedDefect
                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {hasInjectedDefect ? (
                              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            )}
                            <span>Case 1: `arr=[2, 5, 8, 12]`, `target=8`</span>
                          </span>
                          <span className="text-slate-400 font-semibold">{hasInjectedDefect ? 'FAIL (Expected 2, Got 3)' : 'PASS (18ms)'}</span>
                        </div>

                        <div
                          className={`p-2.5 rounded-xl border flex items-center justify-between text-[11px] transition-all ${
                            hasInjectedDefect
                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {hasInjectedDefect ? (
                              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            )}
                            <span>Case 2: Hidden Boundary Match (Weight: 50)</span>
                          </span>
                          <span className="text-slate-400 font-semibold">{hasInjectedDefect ? 'FAIL' : 'PASS (14ms)'}</span>
                        </div>
                      </div>

                      {/* Summary Score Bar */}
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">
                          Score:{' '}
                          <strong className={hasInjectedDefect ? 'text-rose-400' : 'text-emerald-400'}>
                            {hasInjectedDefect ? '0 / 100' : '100 / 100'}
                          </strong>
                        </span>
                        <span className={`font-bold ${hasInjectedDefect ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {hasInjectedDefect ? 'TEST SUITE REJECTED' : 'ALL ASSERTIONS VERIFIED'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: PROCTORING RADAR */}
                {activeConsoleTab === 'proctor' && (
                  <div className="p-4 sm:p-5 font-mono text-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-[11px]">
                      <div>
                        <span className="text-slate-500 uppercase">Proctor Status: </span>
                        <span className="text-emerald-400 font-bold">ARMED & WATCHING</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[10px] font-bold border border-rose-500/30">
                        KIOSK LOCK LEVEL 3
                      </span>
                    </div>

                    {/* Proctor Alert Box */}
                    {proctorAlertMessage && (
                      <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
                        <span>{proctorAlertMessage}</span>
                      </div>
                    )}

                    {/* 4 Proctor Shields Grid */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Trap 01: Fullscreen</span>
                        <span className="text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Enforced Kiosk
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Trap 02: Tab Switch</span>
                        <span className="text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Blur Traps Active
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Trap 03: Clipboard</span>
                        <span className="text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> External Paste Blocked
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Trap 04: DevTools</span>
                        <span className="text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Inspect Suppressed
                        </span>
                      </div>
                    </div>

                    {/* Violation Strike Counter */}
                    <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Recorded Strike Telemetry</span>
                        <span className="text-white text-xs font-bold">Current Strike: {simulatedProctorStrike} / 3</span>
                      </div>
                      <button
                        onClick={handleSimulateViolation}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[11px] font-bold transition-all cursor-pointer active:scale-95"
                      >
                        Simulate Tab-Switch Blur
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 3: LIVE SCOREBOARD */}
                {activeConsoleTab === 'leaderboard' && (
                  <div className="p-4 sm:p-5 font-mono text-xs space-y-3">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 text-[11px]">
                      <div>
                        <span className="text-slate-500 uppercase">Live Event: </span>
                        <span className="text-cyan-400 font-bold">Inter-Collegiate Hackathon #2026</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                        ROUND 2 ACTIVE
                      </span>
                    </div>

                    {/* Top Ranks */}
                    <div className="space-y-1.5">
                      {[
                        { rank: 1, name: 'Ananya Sharma', college: 'Stanford Engineering', score: '380 pts', time: '18m 12s', badge: 'Qualified R3' },
                        { rank: 2, name: 'Karthik Raja', college: 'CEG Anna University', score: '365 pts', time: '21m 04s', badge: 'Qualified R3' },
                        { rank: 3, name: 'David Chen', college: 'MIT EECS', score: '350 pts', time: '22m 30s', badge: 'Qualified R3' },
                        { rank: 4, name: 'Elena Rostova', college: 'Cambridge Computer Lab', score: '340 pts', time: '24m 15s', badge: 'In Contention' }
                      ].map((item) => (
                        <div
                          key={item.rank}
                          className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-[11px]"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                                item.rank === 1
                                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                                  : item.rank === 2
                                  ? 'bg-slate-300/20 text-slate-200 border border-slate-400/40'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {item.rank}
                            </span>
                            <div>
                              <span className="text-white font-bold">{item.name}</span>
                              <span className="text-slate-500 block text-[10px]">{item.college}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-cyan-400 font-bold block">{item.score}</span>
                            <span className="text-[10px] text-slate-500">{item.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 2: ARCHITECTURAL ENGINE MATRIX                    */}
        {/* ========================================================= */}
        <section id="architecture" className="py-20 border-t border-slate-800/80 bg-slate-950/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-cyan-400 font-mono mb-3">
                <span>SYSTEM_SPECIFICATION</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Engineered for Zero-Cheat Collegiate Contests
              </h2>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                Every subsystem is architected from first principles to survive unstable classroom Wi-Fi, power outages, and evasion attempts.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Feature Card 1 */}
              <div
                onClick={() => openTopic('kiosk-proctoring')}
                className="p-6 rounded-3xl bg-[#090e18] border border-slate-800/90 hover:border-rose-500/50 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-5 group-hover:scale-105 transition-transform">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2 group-hover:text-rose-300 transition-colors">
                    Hardware Focus-Lock Kiosk
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Browser-enforced fullscreen lock. Flags window blur, tab switching, and paste events with multi-strike penalty rules.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-rose-400 font-semibold font-mono">
                  <span>SPEC_DOCS</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Feature Card 2 */}
              <div
                onClick={() => openTopic('code-sandbox')}
                className="p-6 rounded-3xl bg-[#090e18] border border-slate-800/90 hover:border-cyan-500/50 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-5 group-hover:scale-105 transition-transform">
                    <Cpu className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                    Pyodide WASM Sandbox
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    In-browser Python 3.11 worker execution with strict 2,000ms execution caps, 128MB memory bounds, and zero server cold-start delays.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-cyan-400 font-semibold font-mono">
                  <span>SPEC_DOCS</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Feature Card 3 */}
              <div
                onClick={() => openTopic('multi-stage-rounds')}
                className="p-6 rounded-3xl bg-[#090e18] border border-slate-800/90 hover:border-indigo-500/50 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-5 group-hover:scale-105 transition-transform">
                    <Layers className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors">
                    Multi-Round Pipeline
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Sequential tournament progression: MCQ screening rounds, algorithmic debugging sprints, and sudden-death tie-breakers.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-indigo-400 font-semibold font-mono">
                  <span>SPEC_DOCS</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Feature Card 4 */}
              <div
                onClick={() => openTopic('cryptographic-credentials')}
                className="p-6 rounded-3xl bg-[#090e18] border border-slate-800/90 hover:border-emerald-500/50 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-105 transition-transform">
                    <Award className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2 group-hover:text-emerald-300 transition-colors">
                    SHA-256 Verifiable Proofs
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Automated cryptographically signed certificates with public URLs for recruiters and LinkedIn profiles. Zero login needed to verify.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-emerald-400 font-semibold font-mono">
                  <span>SPEC_DOCS</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 3: TOURNAMENT WORKFLOW TIMELINE                   */}
        {/* ========================================================= */}
        <section id="how-it-works" className="py-20 border-t border-slate-800/80 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Collegiate Tournament Lifecycle
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-slate-400">
              How universities run smooth coding events from preliminary registration to certified rankings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-3xl bg-[#090e18] border border-slate-800 flex flex-col items-start">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 font-mono font-bold text-xs flex items-center justify-center mb-4">
                01
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">Event Setup</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Organizers specify round durations, select questions from the repository, and generate a 6-digit event code.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#090e18] border border-slate-800 flex flex-col items-start">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 font-mono font-bold text-xs flex items-center justify-center mb-4">
                02
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">Kiosk Roll Call</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Students enter the lobby with their event code and registration number. The system initializes hardware focus locks.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#090e18] border border-slate-800 flex flex-col items-start">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 font-mono font-bold text-xs flex items-center justify-center mb-4">
                03
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">Synchronized Battle</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Contestants debug under kiosk lockdown while server-synchronized timers and automated test runners score submissions.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#090e18] border border-slate-800 flex flex-col items-start">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center mb-4">
                04
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">Verified Badges</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Final standings are published instantly. Achievers receive cryptographically signed SHA-256 digital certificates.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 4: INTEGRATED PUBLIC CERTIFICATE VERIFICATION     */}
        {/* ========================================================= */}
        <section id="verification" className="py-20 border-t border-slate-800/80 max-w-4xl mx-auto px-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto mb-4">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Authenticate Official Tournament Credentials
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-md mx-auto">
            Recruiters, university faculty, and candidates can verify the authenticity, rank, score, and cryptographic signature of any issued certificate.
          </p>

          {/* Quick Sample IDs */}
          <div className="mt-4 flex items-center justify-center gap-2 text-[11px] font-mono text-slate-400">
            <span>Sample IDs:</span>
            {['CERT-DEBUG-2026-A1', 'CERT-ACM-STANFORD-04'].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setCertLookupId(sample)}
                className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-cyan-300 transition-colors cursor-pointer"
              >
                {sample}
              </button>
            ))}
          </div>

          <form onSubmit={handleVerifyCert} className="mt-5 flex flex-col sm:flex-row items-center gap-2.5 max-w-md mx-auto">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={certLookupId}
                onChange={(e) => setCertLookupId(e.target.value)}
                placeholder="Enter Certificate ID (e.g. CERT-DEBUG-2026-A1)"
                className="w-full pl-10 pr-3.5 py-3 rounded-2xl bg-slate-900/90 border border-slate-700 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors whitespace-nowrap shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              Verify Credential
            </button>
          </form>
        </section>
      </main>

      {/* ========================================================= */}
      {/* SECTION 5: REAL PRODUCTION-GRADE SAAS FOOTER              */}
      {/* ========================================================= */}
      <footer className="border-t border-slate-800/80 bg-[#04070c] pt-16 pb-12 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            {/* Column 1: Brand & Live Status */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-black shadow-md shadow-cyan-500/20">
                  <Terminal className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-white text-base tracking-tight">DebugArena</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm font-normal">
                The enterprise competitive programming and code assessment platform built for university hackathons, campus recruitment, and departmental tournaments.
              </p>

              {/* Clickable System Status Badge */}
              <button
                type="button"
                onClick={() => openTopic('system-status')}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 text-[11px] text-emerald-400 transition-all cursor-pointer active:scale-95 group shadow-sm"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono font-medium">All Tournament Systems Operational</span>
                <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>

            {/* Column 2: Architecture & Platform */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 font-mono">
                Platform Spec
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <button
                    onClick={() => openTopic('code-sandbox')}
                    className="hover:text-cyan-400 transition-colors cursor-pointer text-left"
                  >
                    WASM Sandbox Engine
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => openTopic('kiosk-proctoring')}
                    className="hover:text-cyan-400 transition-colors cursor-pointer text-left"
                  >
                    Focus-Lock Kiosk Specs
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => openTopic('multi-stage-rounds')}
                    className="hover:text-cyan-400 transition-colors cursor-pointer text-left"
                  >
                    3-Round Tournament Engine
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => openTopic('cryptographic-credentials')}
                    className="hover:text-cyan-400 transition-colors cursor-pointer text-left"
                  >
                    SHA-256 Verifiable Proofs
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => openTopic('question-bank')}
                    className="hover:text-cyan-400 transition-colors cursor-pointer text-left"
                  >
                    Question Bank & Test Suites
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Access Portals */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 font-mono">
                Tournament Portals
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <button
                    onClick={() => setIsJoinModalOpen(true)}
                    className="hover:text-cyan-400 transition-colors cursor-pointer text-left font-semibold text-slate-300"
                  >
                    Enter Active Contest &rarr;
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setIsAdminModalOpen(true)}
                    className="hover:text-cyan-400 transition-colors cursor-pointer text-left"
                  >
                    Organizer Control Room
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setIsAdminModalOpen(true)}
                    className="hover:text-cyan-400 transition-colors cursor-pointer text-left"
                  >
                    Create College Workspace
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection('verification')}
                    className="hover:text-cyan-400 transition-colors cursor-pointer text-left"
                  >
                    Public Certificate Lookup
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => openTopic('organizer-dispatch')}
                    className="hover:text-cyan-400 transition-colors cursor-pointer text-left"
                  >
                    Host Operations Checklist
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: Integrity & Compliance */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 font-mono">
                Integrity & Trust
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <button
                    onClick={() => openTopic('anti-cheat-guidelines')}
                    className="hover:text-cyan-400 transition-colors cursor-pointer text-left"
                  >
                    Anti-Cheat Rulebook
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => openTopic('academic-honor-code')}
                    className="hover:text-cyan-400 transition-colors cursor-pointer text-left"
                  >
                    Collegiate Honor Code
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => openTopic('security-standards')}
                    className="hover:text-cyan-400 transition-colors cursor-pointer text-left"
                  >
                    Passkey & Auth Security
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => openTopic('data-privacy')}
                    className="hover:text-cyan-400 transition-colors cursor-pointer text-left"
                  >
                    Student Data Privacy
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => openTopic('system-status')}
                    className="hover:text-cyan-400 transition-colors cursor-pointer text-left"
                  >
                    Cluster Telemetry & Logs
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Legal & Copyright Bar */}
          <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <div>
              &copy; {new Date().getFullYear()} DebugArena Technologies. High-stakes competition infrastructure for universities.
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => openTopic('privacy-policy')}
                className="hover:text-slate-300 transition-colors cursor-pointer"
              >
                Privacy Policy
              </button>
              <span>•</span>
              <button
                onClick={() => openTopic('terms-of-service')}
                className="hover:text-slate-300 transition-colors cursor-pointer"
              >
                Terms of Service
              </button>
              <span>•</span>
              <button
                onClick={() => openTopic('academic-license')}
                className="hover:text-slate-300 transition-colors cursor-pointer"
              >
                Academic Free License
              </button>
              <span>•</span>
              <button
                onClick={() => openTopic('system-status')}
                className="hover:text-slate-300 transition-colors cursor-pointer"
              >
                Status
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Real Interactive Technical Documentation Modal */}
      <FooterDetailModal
        isOpen={isFooterModalOpen}
        topic={footerTopic}
        onClose={() => setIsFooterModalOpen(false)}
        onSelectTopic={(t) => setFooterTopic(t)}
        onAction={(type) => {
          if (type === 'join') setIsJoinModalOpen(true);
          if (type === 'admin') setIsAdminModalOpen(true);
          if (type === 'verify') scrollToSection('verification');
        }}
      />

      {/* Core Application Modals (Unchanged Business Logic) */}
      <AdminAuthModal isOpen={isAdminModalOpen} onClose={() => setIsAdminModalOpen(false)} />
      <JoinEventModal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} />
    </div>
  );
};
