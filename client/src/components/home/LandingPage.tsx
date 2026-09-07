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
  X,
  Clock,
  Compass,
  BookOpen,
  ChevronRight,
  BarChart2,
  Star,
  Hash,
  Send
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

  // Interactive Live Simulator widget state (LeetCode Playground Style)
  const [activeConsoleTab, setActiveConsoleTab] = useState<'debugger' | 'proctor' | 'leaderboard'>('debugger');
  const [isEvaluatingCode, setIsEvaluatingCode] = useState(false);
  const [hasInjectedDefect, setHasInjectedDefect] = useState(false);
  const [simulatedProctorStrike, setSimulatedProctorStrike] = useState<number>(0);
  const [proctorAlertMessage, setProctorAlertMessage] = useState<string | null>(null);
  const [activeTestCase, setActiveTestCase] = useState<number>(1);
  const [selectedLanguage, setSelectedLanguage] = useState<'python' | 'cpp' | 'java'>('python');

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
    }, 600);
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
    <div className="min-h-screen bg-[#0a0e17] text-slate-100 flex flex-col selection:bg-amber-500 selection:text-black relative overflow-x-hidden font-sans">
      {/* Background Matrix & Subtle Gradient Mesh */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: `radial-gradient(#f59e0b 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent pointer-events-none" />
      <div className="absolute top-28 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent pointer-events-none" />

      {/* Top LeetCode/HackerRank Tournament Alert Ticker */}
      <div className="w-full bg-[#070a10] border-b border-slate-800/80 text-[11px] font-mono text-slate-400 py-1.5 px-4 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto scrollbar-none whitespace-nowrap gap-6">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-amber-400 font-bold">
              <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>WEEKLY CONTEST #24: LIVE NOW</span>
            </span>
            <span className="text-slate-700">|</span>
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>1,420 Active Collegiate Sandboxes</span>
            </span>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <span className="text-slate-400 hidden sm:inline">Engine: Pyodide WASM v314.0 (Zero Server Lag)</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span className="hidden md:inline text-slate-500">Proctoring: KIOSK_LEVEL_3</span>
            <span className="text-slate-700 hidden md:inline">|</span>
            <button
              onClick={() => openTopic('system-status')}
              className="text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>Cluster Telemetry</span>
              <Activity className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Primary Navigation Header (LeetCode & HackerRank Style) */}
      <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-[#0a0e17]/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 border border-amber-400/40">
              <Terminal className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-white">DebugArena</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono text-[10px] font-bold border border-amber-500/30">
                  LEET_v2.4
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Competitive Code Debugging & Tournament Platform</p>
            </div>
          </div>

          {/* Quick Nav Anchor Links */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-slate-300">
            <button
              onClick={() => scrollToSection('problem-arena')}
              className="hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Code2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Problem Arena</span>
            </button>
            <button
              onClick={() => scrollToSection('explore-tracks')}
              className="hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              <span>Explore Tracks</span>
            </button>
            <button
              onClick={() => scrollToSection('weekly-contest')}
              className="hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Weekly Contest</span>
            </button>
            <button
              onClick={() => scrollToSection('integrity-proctor')}
              className="hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
              <span>Anti-Cheat Kiosk</span>
            </button>
            <button
              onClick={() => scrollToSection('verification')}
              className="hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Award className="w-3.5 h-3.5 text-cyan-400" />
              <span>Verify Proofs</span>
            </button>
          </nav>

          {/* Action CTAs & Mobile Hamburger */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="hidden sm:inline-flex h-10 px-4 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 transition-all items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Organizer Portal</span>
            </button>

            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="h-10 px-4 sm:px-5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-amber-400 shadow-lg shadow-amber-500/25 border border-transparent transition-all inline-flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-slate-950 shrink-0" />
              <span>
                <span className="inline sm:hidden">Join Contest</span>
                <span className="hidden sm:inline">Enter Contest Arena</span>
              </span>
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
          <div className="lg:hidden border-t border-slate-800 bg-[#0d121f]/98 backdrop-blur-2xl px-4 py-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-300">
              <button
                onClick={() => {
                  scrollToSection('problem-arena');
                  setIsMobileMenuOpen(false);
                }}
                className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 text-left hover:text-amber-400 hover:border-amber-500/40 transition-colors"
              >
                Problem Arena
              </button>
              <button
                onClick={() => {
                  scrollToSection('explore-tracks');
                  setIsMobileMenuOpen(false);
                }}
                className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 text-left hover:text-amber-400 hover:border-amber-500/40 transition-colors"
              >
                Explore Tracks
              </button>
              <button
                onClick={() => {
                  scrollToSection('weekly-contest');
                  setIsMobileMenuOpen(false);
                }}
                className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 text-left hover:text-amber-400 hover:border-amber-500/40 transition-colors"
              >
                Weekly Contest
              </button>
              <button
                onClick={() => {
                  scrollToSection('integrity-proctor');
                  setIsMobileMenuOpen(false);
                }}
                className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 text-left hover:text-amber-400 hover:border-amber-500/40 transition-colors"
              >
                Anti-Cheat Kiosk
              </button>
              <button
                onClick={() => {
                  scrollToSection('verification');
                  setIsMobileMenuOpen(false);
                }}
                className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 text-left hover:text-amber-400 hover:border-amber-500/40 transition-colors col-span-2"
              >
                Verify Certificate Proofs
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
                <Shield className="w-4 h-4 text-amber-400" />
                <span>Organizer Control Room</span>
              </button>

              <button
                onClick={() => {
                  setIsJoinModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-slate-950" />
                <span>Enter Contest Lobby</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ARENA_CLUSTER: ONLINE
              </span>
              <button
                onClick={() => {
                  openTopic('system-status');
                  setIsMobileMenuOpen(false);
                }}
                className="text-amber-400 hover:underline"
              >
                System Telemetry &rarr;
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {/* ========================================================= */}
        {/* HERO SECTION: LEETCODE / HACKERRANK SPLIT PLAYGROUND      */}
        {/* ========================================================= */}
        <section id="problem-arena" className="relative pt-10 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Left Column: Hero Headline & Action Matrix */}
            <div className="lg:col-span-6 space-y-6 text-left">
              {/* LeetCode Season Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 font-mono shadow-sm">
                <Flame className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                <span className="text-amber-400 font-bold uppercase tracking-wider">Collegiate Debugging Arena</span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400">2026 Season</span>
              </div>

              {/* Commanding Headline */}
              <div className="space-y-3">
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
                  A New Way to{' '}
                  <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 bg-clip-text text-transparent">
                    Learn, Compete & Debug Code.
                  </span>
                </h1>
                <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-xl pt-1 font-normal">
                  DebugArena is the premier competitive platform built for developers to master real-world debugging. 
                  Diagnose tricky production edge-cases, solve algorithmic bugs, and race on live collegiate scoreboards under hardware-enforced kiosk anti-cheat lockdown.
                </p>
              </div>

              {/* Primary Launch Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 max-w-lg">
                <button
                  onClick={() => setIsJoinModalOpen(true)}
                  className="h-12 px-6 rounded-2xl text-xs sm:text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-amber-400 shadow-xl shadow-amber-500/20 border border-transparent transition-all inline-flex items-center justify-center gap-2.5 active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <Trophy className="w-4 h-4 text-slate-950 shrink-0" />
                  <span>Start Debugging / Enter Contest</span>
                  <ArrowRight className="w-4 h-4 text-slate-950 shrink-0" />
                </button>

                <button
                  onClick={() => setIsAdminModalOpen(true)}
                  className="h-12 px-6 rounded-2xl text-xs sm:text-sm font-bold text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 transition-all inline-flex items-center justify-center gap-2.5 active:scale-95 cursor-pointer whitespace-nowrap group"
                >
                  <Key className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Organizer Portal (Passkey)</span>
                </button>
              </div>

              {/* LeetCode & HackerRank Telemetry Counter Stats */}
              <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg font-mono text-[11px]">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/90">
                  <div className="text-amber-400 font-bold text-base">50,000+</div>
                  <p className="text-slate-400 text-[10px] mt-0.5">Submissions Judged</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/90">
                  <div className="text-emerald-400 font-bold text-base">100%</div>
                  <p className="text-slate-400 text-[10px] mt-0.5">Client WASM Speed</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/90">
                  <div className="text-rose-400 font-bold text-base">0.0ms</div>
                  <p className="text-slate-400 text-[10px] mt-0.5">Cold Start Latency</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/90">
                  <div className="text-cyan-400 font-bold text-base">SHA-256</div>
                  <p className="text-slate-400 text-[10px] mt-0.5">Verified Proofs</p>
                </div>
              </div>
            </div>

            {/* Right Column: LeetCode-Style Interactive Problem & Code Playground */}
            <div className="lg:col-span-6">
              <div className="relative rounded-3xl border border-slate-700/80 bg-[#0d121f] shadow-2xl overflow-hidden backdrop-blur-md">
                {/* LeetCode Playground Header Bar */}
                <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                  {/* Window Traffic Dots */}
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    <span className="ml-2 font-mono text-slate-400 text-[11px] font-semibold hidden sm:inline">
                      DEBUGARENA://ARENA_PLAYGROUND
                    </span>
                  </div>

                  {/* Mode Navigation Tabs */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-mono overflow-x-auto scrollbar-none shrink-0">
                    <button
                      onClick={() => setActiveConsoleTab('debugger')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                        activeConsoleTab === 'debugger'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>Code Arena</span>
                    </button>
                    <button
                      onClick={() => setActiveConsoleTab('proctor')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                        activeConsoleTab === 'proctor'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>Proctor Radar</span>
                    </button>
                    <button
                      onClick={() => setActiveConsoleTab('leaderboard')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                        activeConsoleTab === 'leaderboard'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>Standings</span>
                    </button>
                  </div>
                </div>

                {/* TAB 1: LEETCODE STYLE PROBLEM & CODE EDITOR */}
                {activeConsoleTab === 'debugger' && (
                  <div className="p-4 sm:p-5 font-mono text-xs space-y-3.5">
                    {/* LeetCode Problem Info Strip */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-xs">#42. Binary Search Pivot Underflow</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold text-[10px] border border-amber-500/30">
                          Medium
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setHasInjectedDefect(!hasInjectedDefect)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                            hasInjectedDefect
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                              : 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
                          }`}
                        >
                          {hasInjectedDefect ? '✅ Apply Bug Fix' : '🐞 Inject Starter Defect'}
                        </button>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700 hidden sm:inline">
                          Python 3.11 (WASM)
                        </span>
                      </div>
                    </div>

                    {/* Problem Statement Snippet */}
                    <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400">
                      <p className="leading-relaxed">
                        <span className="text-amber-300 font-semibold">Problem: </span>
                        Given a sorted array of integers <code className="text-amber-200">nums</code> and an integer <code className="text-amber-200">target</code>, find the index of <code className="text-amber-200">target</code>. If target is missing, return <code className="text-amber-200">-1</code>.
                        You must diagnose and fix any boundary off-by-one errors in <span className="text-emerald-400 font-semibold">O(log n)</span> runtime.
                      </p>
                    </div>

                    {/* Code Editor Window with Line Numbers */}
                    <div className="rounded-2xl bg-[#070a10] border border-slate-800 text-slate-300 text-[11px] leading-relaxed overflow-hidden">
                      <div className="px-3 py-1.5 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400 font-bold">solution.py</span>
                          <span className="text-slate-600">|</span>
                          <span>Pyodide Sandbox</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400">Acceptance: 74.8%</span>
                        </div>
                      </div>

                      <div className="p-3 overflow-x-auto">
                        <table className="w-full text-left font-mono">
                          <tbody>
                            <tr>
                              <td className="text-slate-600 select-none pr-3 text-right w-6">1</td>
                              <td>
                                <span className="text-indigo-400 font-bold">def</span>{' '}
                                <span className="text-amber-300 font-bold">binary_search</span>(nums: list[int], target: int) -&gt; int:
                              </td>
                            </tr>
                            <tr>
                              <td className="text-slate-600 select-none pr-3 text-right">2</td>
                              <td className="pl-4">
                                low, high = <span className="text-orange-400">0</span>, <span className="text-indigo-400">len</span>(nums) - <span className="text-orange-400">1</span>
                              </td>
                            </tr>
                            <tr>
                              <td className="text-slate-600 select-none pr-3 text-right">3</td>
                              <td className="pl-4">
                                <span className="text-indigo-400 font-bold">while</span> low &lt;= high:
                              </td>
                            </tr>
                            <tr>
                              <td className="text-slate-600 select-none pr-3 text-right">4</td>
                              <td className="pl-8">
                                mid = (low + high) // <span className="text-orange-400">2</span>
                              </td>
                            </tr>
                            <tr>
                              <td className="text-slate-600 select-none pr-3 text-right">5</td>
                              <td className="pl-8">
                                <span className="text-indigo-400 font-bold">if</span> nums[mid] == target:
                              </td>
                            </tr>
                            <tr className={hasInjectedDefect ? 'bg-rose-500/10' : 'bg-emerald-500/10'}>
                              <td className="text-slate-600 select-none pr-3 text-right">6</td>
                              <td className="pl-12">
                                {hasInjectedDefect ? (
                                  <span className="text-rose-400 font-semibold">
                                    <span className="text-indigo-400 font-bold">return</span> mid + <span className="text-orange-400">1</span>{' '}
                                    <span className="text-rose-300 font-normal"># 🐞 BUG: Off-by-one pivot error!</span>
                                  </span>
                                ) : (
                                  <span className="text-emerald-400 font-semibold">
                                    <span className="text-indigo-400 font-bold">return</span> mid{' '}
                                    <span className="text-emerald-300 font-normal"># ✅ FIXED: Correct pivot index</span>
                                  </span>
                                )}
                              </td>
                            </tr>
                            <tr>
                              <td className="text-slate-600 select-none pr-3 text-right">7</td>
                              <td className="pl-8">
                                <span className="text-indigo-400 font-bold">elif</span> nums[mid] &lt; target:
                              </td>
                            </tr>
                            <tr>
                              <td className="text-slate-600 select-none pr-3 text-right">8</td>
                              <td className="pl-12">
                                low = mid + <span className="text-orange-400">1</span>
                              </td>
                            </tr>
                            <tr>
                              <td className="text-slate-600 select-none pr-3 text-right">9</td>
                              <td className="pl-8">
                                <span className="text-indigo-400 font-bold">else</span>:
                              </td>
                            </tr>
                            <tr>
                              <td className="text-slate-600 select-none pr-3 text-right">10</td>
                              <td className="pl-12">
                                high = mid - <span className="text-orange-400">1</span>
                              </td>
                            </tr>
                            <tr>
                              <td className="text-slate-600 select-none pr-3 text-right">11</td>
                              <td className="pl-4">
                                <span className="text-indigo-400 font-bold">return</span> -<span className="text-orange-400">1</span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* LeetCode Action Bar: Run / Submit */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveTestCase(1)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            activeTestCase === 1
                              ? 'bg-slate-800 text-white border border-slate-700'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          Case 1
                        </button>
                        <button
                          onClick={() => setActiveTestCase(2)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            activeTestCase === 2
                              ? 'bg-slate-800 text-white border border-slate-700'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          Case 2
                        </button>
                        <button
                          onClick={() => setActiveTestCase(3)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            activeTestCase === 3
                              ? 'bg-slate-800 text-white border border-slate-700'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          Case 3 (Hidden)
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          disabled={isEvaluatingCode}
                          onClick={handleRunSimulatorJudge}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                          <Play className="w-3 h-3 text-slate-300" />
                          <span>Run Code</span>
                        </button>

                        <button
                          disabled={isEvaluatingCode}
                          onClick={handleRunSimulatorJudge}
                          className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          <Zap className={`w-3.5 h-3.5 ${isEvaluatingCode ? 'animate-spin' : ''}`} />
                          <span>{isEvaluatingCode ? 'Judging...' : 'Submit'}</span>
                        </button>
                      </div>
                    </div>

                    {/* LeetCode Result Card Display */}
                    <div className="pt-1">
                      {hasInjectedDefect ? (
                        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-rose-400 font-bold text-xs flex items-center gap-1.5">
                              <AlertCircle className="w-4 h-4" />
                              <span>Wrong Answer</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold">12 / 48 testcases passed</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                            <div>
                              <span className="text-slate-500 block">Input:</span>
                              <code>nums = [2, 5, 8, 12], target = 8</code>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Output vs Expected:</span>
                              <span className="text-rose-400 font-bold">Output: 3</span>{' '}
                              <span className="text-slate-500">| Expected: </span>
                              <span className="text-emerald-400 font-bold">2</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Accepted</span>
                            </span>
                            <span className="text-[10px] text-emerald-400 font-semibold">All 48 testcases passed</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                            <div>
                              <span className="text-slate-500 block">Runtime:</span>
                              <span className="text-white font-bold">24 ms</span>{' '}
                              <span className="text-emerald-400">(Beats 97.4%)</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Memory:</span>
                              <span className="text-white font-bold">14.1 MB</span>{' '}
                              <span className="text-emerald-400">(Beats 92.3%)</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: PROCTORING RADAR */}
                {activeConsoleTab === 'proctor' && (
                  <div className="p-4 sm:p-5 font-mono text-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-[11px]">
                      <div>
                        <span className="text-slate-500 uppercase">Proctor Status: </span>
                        <span className="text-emerald-400 font-bold">ARMED & ACTIVE</span>
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

                {/* TAB 3: LIVE STANDINGS */}
                {activeConsoleTab === 'leaderboard' && (
                  <div className="p-4 sm:p-5 font-mono text-xs space-y-3">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 text-[11px]">
                      <div>
                        <span className="text-slate-500 uppercase">Live Contest: </span>
                        <span className="text-amber-400 font-bold">Weekly DebugArena Contest #24</span>
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
                            <span className="text-amber-400 font-bold block">{item.score}</span>
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
        {/* SECTION 2: EXPLORE DEBUGGING TRACKS (LEETCODE / HACKERRANK) */}
        {/* ========================================================= */}
        <section id="explore-tracks" className="py-20 border-t border-slate-800/90 bg-[#070a12]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-amber-400 font-mono mb-3">
                  <Compass className="w-3.5 h-3.5" />
                  <span>SKILL_TRACKS_&_BADGES</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                  Explore Debugging Tracks & Skill Categories
                </h2>
                <p className="mt-2 text-sm text-slate-400 max-w-xl">
                  Curated problem sets designed to train developers on real-world defect diagnosis across key computer science domains.
                </p>
              </div>

              <button
                onClick={() => setIsJoinModalOpen(true)}
                className="h-10 px-5 rounded-xl text-xs font-bold text-amber-400 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 transition-all inline-flex items-center gap-2 self-start md:self-auto cursor-pointer"
              >
                <span>View All 500+ Problems</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Track 1: Pointers & Memory Bounds */}
              <div
                onClick={() => setIsJoinModalOpen(true)}
                className="p-6 rounded-3xl bg-[#0d121f] border border-slate-800/90 hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/5 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 font-bold text-[11px] border border-rose-500/30">
                      Hard
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">14 Challenges</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-amber-300 transition-colors">
                    Pointers & Memory Bounds
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    Hunt down buffer overflows, null pointer dereferences, off-by-one heap allocations, and memory leaks in low-level systems.
                  </p>
                  <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">C / C++</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Memory Safety</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Segmentation</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-500">Acceptance: <strong className="text-slate-300">68.4%</strong></span>
                  <span className="text-amber-400 group-hover:translate-x-1 transition-transform flex items-center gap-1 font-mono">
                    <span>Start Practice</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>

              {/* Track 2: Binary Search & Array Invariants */}
              <div
                onClick={() => setIsJoinModalOpen(true)}
                className="p-6 rounded-3xl bg-[#0d121f] border border-slate-800/90 hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/5 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 font-bold text-[11px] border border-amber-500/30">
                      Medium
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">22 Challenges</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-amber-300 transition-colors">
                    Binary Search & Invariants
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    Debug subtle mid-point calculation overflows, termination conditions, rotated array splits, and boundary predicates.
                  </p>
                  <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Python / Java</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Divide & Conquer</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Monotonicity</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-500">Acceptance: <strong className="text-slate-300">76.2%</strong></span>
                  <span className="text-amber-400 group-hover:translate-x-1 transition-transform flex items-center gap-1 font-mono">
                    <span>Start Practice</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>

              {/* Track 3: Concurrency & Thread Contention */}
              <div
                onClick={() => setIsJoinModalOpen(true)}
                className="p-6 rounded-3xl bg-[#0d121f] border border-slate-800/90 hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/5 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 font-bold text-[11px] border border-rose-500/30">
                      Hard
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">10 Challenges</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-amber-300 transition-colors">
                    Concurrency & Deadlocks
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    Resolve asynchronous race hazards, mutex deadlocks, thread starvations, and non-atomic state updates in distributed logic.
                  </p>
                  <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Go / Java</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Multithreading</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Lock Ordering</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-500">Acceptance: <strong className="text-slate-300">62.1%</strong></span>
                  <span className="text-amber-400 group-hover:translate-x-1 transition-transform flex items-center gap-1 font-mono">
                    <span>Start Practice</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>

              {/* Track 4: Tree Traversal & Recursion Depth */}
              <div
                onClick={() => setIsJoinModalOpen(true)}
                className="p-6 rounded-3xl bg-[#0d121f] border border-slate-800/90 hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/5 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 font-bold text-[11px] border border-amber-500/30">
                      Medium
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">16 Challenges</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-amber-300 transition-colors">
                    Tree Traversal & Cycles
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    Fix infinite recursion loops, unvisited cyclic graph nodes, inverted binary search trees, and stack overflow pitfalls.
                  </p>
                  <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Python / C++</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">DFS / BFS</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Graph Theory</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-500">Acceptance: <strong className="text-slate-300">81.5%</strong></span>
                  <span className="text-amber-400 group-hover:translate-x-1 transition-transform flex items-center gap-1 font-mono">
                    <span>Start Practice</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>

              {/* Track 5: Dynamic Programming & Memoization */}
              <div
                onClick={() => setIsJoinModalOpen(true)}
                className="p-6 rounded-3xl bg-[#0d121f] border border-slate-800/90 hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/5 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 font-bold text-[11px] border border-amber-500/30">
                      Medium
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">18 Challenges</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-amber-300 transition-colors">
                    Dynamic Programming & States
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    Correct corrupted memoization caches, overlapping subproblem transitions, base case initialization bugs, and index shifts.
                  </p>
                  <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Python / Java</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Memoization</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Knapsack</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-500">Acceptance: <strong className="text-slate-300">70.9%</strong></span>
                  <span className="text-amber-400 group-hover:translate-x-1 transition-transform flex items-center gap-1 font-mono">
                    <span>Start Practice</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>

              {/* Track 6: Rapid MCQ Algorithmic Screening */}
              <div
                onClick={() => setIsJoinModalOpen(true)}
                className="p-6 rounded-3xl bg-[#0d121f] border border-slate-800/90 hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/5 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-[11px] border border-emerald-500/30">
                      Easy
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">30 Questions</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-amber-300 transition-colors">
                    Rapid MCQ Algorithmic Filter
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    High-speed conceptual screening questions testing asymptotic complexity, bit manipulation, operator precedence, and memory layout.
                  </p>
                  <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Multi-Lang</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Time Complexity</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Bitwise Math</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-500">Acceptance: <strong className="text-slate-300">93.8%</strong></span>
                  <span className="text-amber-400 group-hover:translate-x-1 transition-transform flex items-center gap-1 font-mono">
                    <span>Start Practice</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 3: WEEKLY TOURNAMENT ARENA (LEETCODE CONTEST)     */}
        {/* ========================================================= */}
        <section id="weekly-contest" className="py-20 border-t border-slate-800/90 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {/* Tournament Headline Card */}
            <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-[#0e1628] via-[#0b101d] to-[#070a12] border border-amber-500/30 shadow-2xl relative overflow-hidden">
              <div className="absolute -right-20 -top-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
                <div className="space-y-4 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-xs text-amber-300 font-mono">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>TOURNAMENT_MODE : WEEKLY CONTEST #24</span>
                  </div>
                  <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                    Compete in Synchronized Live Rounds
                  </h2>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Every Saturday, thousands of collegiate developers enter the synchronized arena. Contestants progress through 3 rigorous tournament stages scored in real-time.
                  </p>
                </div>

                <button
                  onClick={() => setIsJoinModalOpen(true)}
                  className="h-12 px-7 rounded-2xl text-xs sm:text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-amber-400 shadow-xl shadow-amber-500/25 border border-transparent transition-all inline-flex items-center justify-center gap-2.5 active:scale-95 cursor-pointer shrink-0"
                >
                  <Trophy className="w-4 h-4 text-slate-950" />
                  <span>Enter Contest Lobby</span>
                  <ArrowRight className="w-4 h-4 text-slate-950" />
                </button>
              </div>

              {/* 3-Round Progression Visual Pipeline */}
              <div className="mt-10 pt-8 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col">
                  <div className="flex items-center justify-between mb-3 font-mono">
                    <span className="text-xs font-bold text-amber-400">STAGE 01</span>
                    <span className="text-[10px] text-slate-500">15 Mins</span>
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1.5">MCQ Screening Round</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Rapid 20-question algorithmic filter testing Big-O time complexity, bit operations, and output tracing.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col">
                  <div className="flex items-center justify-between mb-3 font-mono">
                    <span className="text-xs font-bold text-emerald-400">STAGE 02</span>
                    <span className="text-[10px] text-slate-500">45 Mins</span>
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1.5">Timed Debugging Sprint</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    3 In-depth broken codebases executed in client Pyodide WASM. Contestants diagnose and patch boundary bugs.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col">
                  <div className="flex items-center justify-between mb-3 font-mono">
                    <span className="text-xs font-bold text-rose-400">STAGE 03</span>
                    <span className="text-[10px] text-slate-500">10 Mins</span>
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1.5">Sudden-Death Tie-Breaker</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Head-to-head sprint where milliseconds decide the victor. The fastest verified patch secures the championship.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 4: ENTERPRISE PROCTORING & TRUST (HACKERRANK WORK) */}
        {/* ========================================================= */}
        <section id="integrity-proctor" className="py-20 border-t border-slate-800/90 bg-[#070a12]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-rose-400 font-mono mb-3">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>INTEGRITY_ENGINE</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Enterprise Anti-Cheat Proctoring for Universities
              </h2>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                Engineered to enforce fair, tamper-proof competitions in university computer labs, campus placements, and remote hackathons.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Feature Card 1 */}
              <div
                onClick={() => openTopic('kiosk-proctoring')}
                className="p-6 rounded-3xl bg-[#0d121f] border border-slate-800/90 hover:border-rose-500/50 transition-all cursor-pointer group flex flex-col justify-between"
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
                className="p-6 rounded-3xl bg-[#0d121f] border border-slate-800/90 hover:border-amber-500/50 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-5 group-hover:scale-105 transition-transform">
                    <Cpu className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2 group-hover:text-amber-300 transition-colors">
                    Pyodide WASM Sandbox
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    In-browser Python 3.11 worker execution with strict 2,000ms execution caps, 128MB memory bounds, and zero server cold-start delays.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-amber-400 font-semibold font-mono">
                  <span>SPEC_DOCS</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Feature Card 3 */}
              <div
                onClick={() => openTopic('multi-stage-rounds')}
                className="p-6 rounded-3xl bg-[#0d121f] border border-slate-800/90 hover:border-indigo-500/50 transition-all cursor-pointer group flex flex-col justify-between"
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
                className="p-6 rounded-3xl bg-[#0d121f] border border-slate-800/90 hover:border-emerald-500/50 transition-all cursor-pointer group flex flex-col justify-between"
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
        {/* SECTION 5: TOURNAMENT WORKFLOW TIMELINE                   */}
        {/* ========================================================= */}
        <section className="py-20 border-t border-slate-800/90 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Collegiate Tournament Lifecycle
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-slate-400">
              How universities run smooth coding events from preliminary registration to certified rankings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-3xl bg-[#0d121f] border border-slate-800 flex flex-col items-start">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 font-mono font-bold text-xs flex items-center justify-center mb-4">
                01
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">Event Setup</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Organizers specify round durations, select questions from the repository, and generate a 6-digit event code.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#0d121f] border border-slate-800 flex flex-col items-start">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center mb-4">
                02
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">Kiosk Roll Call</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Students enter the lobby with their event code and registration number. The system initializes hardware focus locks.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#0d121f] border border-slate-800 flex flex-col items-start">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 font-mono font-bold text-xs flex items-center justify-center mb-4">
                03
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">Synchronized Battle</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Contestants debug under kiosk lockdown while server-synchronized timers and automated test runners score submissions.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#0d121f] border border-slate-800 flex flex-col items-start">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 font-mono font-bold text-xs flex items-center justify-center mb-4">
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
        {/* SECTION 6: INTEGRATED PUBLIC CERTIFICATE VERIFICATION     */}
        {/* ========================================================= */}
        <section id="verification" className="py-20 border-t border-slate-800/90 max-w-4xl mx-auto px-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-4">
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
                className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-amber-300 transition-colors cursor-pointer"
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
                className="w-full pl-10 pr-3.5 py-3 rounded-2xl bg-slate-900/90 border border-slate-700 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors whitespace-nowrap shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              Verify Credential
            </button>
          </form>
        </section>
      </main>

      {/* ========================================================= */}
      {/* SECTION 7: REAL PRODUCTION-GRADE SAAS FOOTER              */}
      {/* ========================================================= */}
      <footer className="border-t border-slate-800/90 bg-[#06080e] pt-16 pb-12 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            {/* Column 1: Brand & Live Status */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
                  <Terminal className="w-4 h-4 text-slate-950 stroke-[2.5]" />
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
                    className="hover:text-amber-400 transition-colors cursor-pointer text-left"
                  >
                    WASM Sandbox Engine
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => openTopic('kiosk-proctoring')}
                    className="hover:text-amber-400 transition-colors cursor-pointer text-left"
                  >
                    Focus-Lock Kiosk Specs
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => openTopic('multi-stage-rounds')}
                    className="hover:text-amber-400 transition-colors cursor-pointer text-left"
                  >
                    3-Round Tournament Engine
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => openTopic('cryptographic-credentials')}
                    className="hover:text-amber-400 transition-colors cursor-pointer text-left"
                  >
                    SHA-256 Verifiable Proofs
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => openTopic('question-bank')}
                    className="hover:text-amber-400 transition-colors cursor-pointer text-left"
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
                    className="hover:text-amber-400 transition-colors cursor-pointer text-left font-semibold text-slate-300"
                  >
                    Enter Active Contest &rarr;
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setIsAdminModalOpen(true)}
                    className="hover:text-amber-400 transition-colors cursor-pointer text-left"
                  >
                    Organizer Control Room
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setIsAdminModalOpen(true)}
                    className="hover:text-amber-400 transition-colors cursor-pointer text-left"
                  >
                    Create College Workspace
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection('verification')}
                    className="hover:text-amber-400 transition-colors cursor-pointer text-left"
                  >
                    Public Certificate Lookup
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => openTopic('organizer-dispatch')}
                    className="hover:text-amber-400 transition-colors cursor-pointer text-left"
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
                    className="hover:text-amber-400 transition-colors cursor-pointer text-left"
                  >
                    Anti-Cheat Rulebook
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => openTopic('academic-honor-code')}
                    className="hover:text-amber-400 transition-colors cursor-pointer text-left"
                  >
                    Collegiate Honor Code
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => openTopic('security-standards')}
                    className="hover:text-amber-400 transition-colors cursor-pointer text-left"
                  >
                    Passkey & Auth Security
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => openTopic('data-privacy')}
                    className="hover:text-amber-400 transition-colors cursor-pointer text-left"
                  >
                    Student Data Privacy
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => openTopic('system-status')}
                    className="hover:text-amber-400 transition-colors cursor-pointer text-left"
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
