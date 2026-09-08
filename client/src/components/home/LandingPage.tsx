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
  Send,
  Sun,
  Moon,
  Bug,
  Split,
  Timer,
  Eye,
  FileCode,
  QrCode,
  CheckCircle
} from 'lucide-react';
import { AdminAuthModal } from '../auth/AdminAuthModal.js';
import { JoinEventModal } from '../participant/JoinEventModal.js';
import { FooterDetailModal, FooterTopicId } from './FooterDetailModal.js';
import { ThemeToggle } from '../common/ThemeToggle.js';
import { useTheme } from '../../context/ThemeContext.js';

export const LandingPage: React.FC = () => {
  const { isDark } = useTheme();
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [enteredEventCode, setEnteredEventCode] = useState('');
  const [certLookupId, setCertLookupId] = useState('');

  // Footer Details Modal state
  const [footerTopic, setFooterTopic] = useState<FooterTopicId | null>(null);
  const [isFooterModalOpen, setIsFooterModalOpen] = useState(false);

  // Interactive Live Simulator Console State
  const [activeConsoleTab, setActiveConsoleTab] = useState<'debugger' | 'proctor' | 'standings'>('debugger');
  const [hasInjectedDefect, setHasInjectedDefect] = useState(false);
  const [isEvaluatingCode, setIsEvaluatingCode] = useState(false);
  const [simulatedProctorStrike, setSimulatedProctorStrike] = useState<number>(0);
  const [proctorAlertMessage, setProctorAlertMessage] = useState<string | null>(null);

  const handleJoinWithCode = (e: React.FormEvent) => {
    e.preventDefault();
    setIsJoinModalOpen(true);
  };

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

  const handleRunSimulatorJudge = () => {
    setIsEvaluatingCode(true);
    setTimeout(() => {
      setIsEvaluatingCode(false);
    }, 550);
  };

  const handleSimulateViolation = () => {
    setSimulatedProctorStrike((prev) => Math.min(3, prev + 1));
    setProctorAlertMessage('TELEMETRY ALERT: window.onblur captured! Focus-lock violation recorded.');
    setTimeout(() => {
      setProctorAlertMessage(null);
    }, 4500);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0e17] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-amber-500 selection:text-black relative overflow-x-hidden font-sans transition-colors duration-200">
      {/* Background Matrix Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04] dark:opacity-[0.035]"
        style={{
          backgroundImage: `radial-gradient(#f59e0b 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent pointer-events-none" />

      {/* ========================================================= */}
      {/* 1. TOP STATUS TICKER (LEETCODE / HACKERRANK STYLE)        */}
      {/* ========================================================= */}
      <div className="w-full bg-slate-100 dark:bg-[#070a10] border-b border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-400 py-1.5 px-4 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto scrollbar-none whitespace-nowrap gap-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>COLLEGIATE TOURNAMENT CLUSTER: ONLINE</span>
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>1,420 Contestants Sandboxed (Zero Server Lag)</span>
            </span>
            <span className="text-slate-300 dark:text-slate-700 hidden md:inline">|</span>
            <span className="hidden md:inline text-slate-500 dark:text-slate-400">Sandbox: Pyodide WASM v314.0</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden lg:inline text-slate-500 dark:text-slate-400">Proctor: KIOSK_LEVEL_3</span>
            <span className="text-slate-300 dark:text-slate-700 hidden lg:inline">|</span>
            <button
              onClick={() => openTopic('system-status')}
              className="text-amber-600 dark:text-amber-400 hover:underline transition-colors flex items-center gap-1 font-medium cursor-pointer"
            >
              <span>Cluster Status</span>
              <Activity className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. LEETCODE / HACKERRANK NAVIGATION BAR                   */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0d121f]/95 backdrop-blur-xl transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Identity & Quick Section Links */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => scrollToSection('hero')}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
                <Bug className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              </div>
              <span className="font-black text-lg tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                DebugArena
                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[9px] font-bold border border-amber-500/25">
                  TOURNAMENT OS
                </span>
              </span>
            </div>

            {/* Main Navigation Links */}
            <nav className="hidden md:flex items-center gap-5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <button
                onClick={() => scrollToSection('tournament-pipeline')}
                className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
              >
                3-Round Pipeline
              </button>
              <button
                onClick={() => scrollToSection('competition-engine')}
                className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
              >
                Tournament Engine
              </button>
              <button
                onClick={() => scrollToSection('scoreboard')}
                className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
              >
                Collegiate Standings
              </button>
              <button
                onClick={() => scrollToSection('kiosk-defense')}
                className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
              >
                Anti-Cheat Kiosk
              </button>
              <button
                onClick={() => scrollToSection('verification')}
                className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
              >
                Verify Proofs
              </button>
            </nav>
          </div>

          {/* Right Action Tools (Theme, Organizer Sign In, Enter Contest) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Universal Theme Toggle */}
            <ThemeToggle />

            {/* Organizer Portal */}
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="hidden lg:inline-flex h-9 px-3.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 transition-all items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Shield className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Host Tournament</span>
            </button>

            {/* Enter Competition Button */}
            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="h-9 px-4 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-amber-400 shadow-md shadow-amber-500/25 transition-all inline-flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Trophy className="w-3.5 h-3.5 text-slate-950 shrink-0" />
              <span>Enter Competition</span>
            </button>

            {/* Mobile Hamburger Menu */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 transition-all cursor-pointer"
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Collapsible Mobile Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white/98 dark:bg-[#0d121f]/98 px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-200 shadow-xl">
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <button
                onClick={() => {
                  scrollToSection('tournament-pipeline');
                  setIsMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left hover:text-amber-500"
              >
                3-Round Pipeline
              </button>
              <button
                onClick={() => {
                  scrollToSection('competition-engine');
                  setIsMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left hover:text-amber-500"
              >
                Tournament Engine
              </button>
              <button
                onClick={() => {
                  scrollToSection('scoreboard');
                  setIsMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left hover:text-amber-500"
              >
                Collegiate Ranks
              </button>
              <button
                onClick={() => {
                  scrollToSection('verification');
                  setIsMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left hover:text-amber-500"
              >
                Verify Credentials
              </button>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  setIsAdminModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4 text-amber-500" />
                <span>Host Tournament / Organizer Portal</span>
              </button>
              <button
                onClick={() => {
                  setIsJoinModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center gap-2"
              >
                <Trophy className="w-4 h-4 text-slate-950" />
                <span>Enter Contest Lobby</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Competitive Platform Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* ========================================================= */}
        {/* 3. HERO: DUAL-TRACK COMPETITION ARENA & LIVE WORKSPACE     */}
        {/* ========================================================= */}
        <section id="hero" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Col: Hero Statement, Event Code Input & Quick CTAs */}
          <div className="lg:col-span-6 space-y-5">
            {/* Season Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-700 dark:text-amber-300 font-mono shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span className="font-bold uppercase tracking-wider">2026 Collegiate Debugging Season</span>
              <span className="text-slate-400 dark:text-slate-600">|</span>
              <span className="text-slate-600 dark:text-slate-400">Campus Tournaments</span>
            </div>

            {/* Headline */}
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.1]">
                The Competitive <br />
                <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 dark:from-amber-400 dark:via-orange-400 dark:to-amber-200 bg-clip-text text-transparent">
                  Debugging Tournament
                </span>{' '}
                Platform.
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl pt-1 font-normal">
                Engineered for universities, student symposiums, and departmental coding rounds.
                Compete in live, proctored debugging battles with in-browser WebAssembly sandboxes, hardware focus-lock proctoring, synchronized timers, and official HMAC-SHA256 QR certificates.
              </p>
            </div>

            {/* Interactive Quick Join Bar (Enter with Event Code) */}
            <div className="p-3 rounded-2xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800 shadow-md max-w-lg space-y-2">
              <div className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center justify-between">
                <span>Enter Live Tournament with Code:</span>
                <span className="text-amber-600 dark:text-amber-400">Host Code Ready</span>
              </div>

              <form onSubmit={handleJoinWithCode} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={enteredEventCode}
                    onChange={(e) => setEnteredEventCode(e.target.value.toUpperCase())}
                    placeholder="e.g. ACM2026 or ALPHA1"
                    maxLength={10}
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold uppercase text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-amber-400 shadow-md shadow-amber-500/25 transition-all inline-flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <Trophy className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                  <span>Join Event Lobby</span>
                </button>
              </form>
            </div>

            {/* Organizer Secondary Action */}
            <div className="flex items-center gap-3 pt-1 font-mono text-xs">
              <span className="text-slate-500 dark:text-slate-400">Hosting a College Event?</span>
              <button
                onClick={() => setIsAdminModalOpen(true)}
                className="text-amber-600 dark:text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Organizer Command Center</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Telemetry Architecture Metric Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-lg font-mono text-[11px] pt-2">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-amber-600 dark:text-amber-400 font-bold block">Pyodide WASM</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">0ms Cold Starts</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-rose-600 dark:text-rose-400 font-bold block">Kiosk Lock</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Blur & Tab Traps</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold block">3-Round Flow</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Auto Quota Cutoffs</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold block">HMAC-SHA256</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">QR Certificates</span>
              </div>
            </div>
          </div>

          {/* Right Col: Interactive Live Competition Debugging Terminal */}
          <div className="lg:col-span-6">
            <div className="rounded-3xl border border-slate-700/80 bg-[#0d121f] shadow-2xl overflow-hidden backdrop-blur-md">
              {/* Window Header */}
              <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 font-mono text-slate-400 text-[11px] font-semibold hidden sm:inline">
                    DEBUGARENA://LIVE_ROUND_2_SANDBOX
                  </span>
                </div>

                {/* Console Mode Tabs */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-mono shrink-0">
                  <button
                    onClick={() => setActiveConsoleTab('debugger')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      activeConsoleTab === 'debugger'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Debugger</span>
                  </button>
                  <button
                    onClick={() => setActiveConsoleTab('proctor')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      activeConsoleTab === 'proctor'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Proctor</span>
                  </button>
                  <button
                    onClick={() => setActiveConsoleTab('standings')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      activeConsoleTab === 'standings'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Standings</span>
                  </button>
                </div>
              </div>

              {/* TAB 1: LIVE CODE DEBUGGING ARENA */}
              {activeConsoleTab === 'debugger' && (
                <div className="p-4 sm:p-5 font-mono text-xs space-y-3.5 text-slate-200">
                  {/* Problem Spec Strip */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold">BUG #042: Binary Search Pivot Underflow</span>
                      <span className="px-2 py-0.2 rounded bg-amber-500/15 text-amber-400 text-[10px] font-bold border border-amber-500/30">
                        100 PTS
                      </span>
                    </div>
                    <button
                      onClick={() => setHasInjectedDefect(!hasInjectedDefect)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                        hasInjectedDefect
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      {hasInjectedDefect ? '✅ View Solution Patch' : '🐞 View Faulty Starter Code'}
                    </button>
                  </div>

                  {/* Failing Assertion Box */}
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] space-y-1">
                    <div className="text-rose-400 font-bold uppercase text-[10px] flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Failing Assertion Telemetry:</span>
                    </div>
                    <code className="text-slate-300 text-[10px] block break-all">
                      AssertionError: binary_search([2, 5, 8, 12], target=8) =&gt; Expected: 2, Got: 3 (Line 6)
                    </code>
                  </div>

                  {/* Code Editor Preview */}
                  <div className="p-3.5 rounded-2xl bg-[#06080f] border border-slate-800 text-slate-300 text-[11px] leading-relaxed overflow-x-auto">
                    <div>
                      <span className="text-indigo-400 font-bold">def</span>{' '}
                      <span className="text-amber-300 font-bold">binary_search</span>(nums: list[int], target: int) -&gt; int:
                    </div>
                    <div className="pl-4">
                      low, high = <span className="text-orange-400">0</span>, <span className="text-indigo-400">len</span>(nums) - <span className="text-orange-400">1</span>
                    </div>
                    <div className="pl-4">
                      <span className="text-indigo-400 font-bold">while</span> low &lt;= high:
                    </div>
                    <div className="pl-8">
                      mid = (low + high) // <span className="text-orange-400">2</span>
                    </div>
                    <div className="pl-8">
                      <span className="text-indigo-400 font-bold">if</span> nums[mid] == target:
                    </div>
                    <div className="pl-12">
                      {hasInjectedDefect ? (
                        <span className="text-rose-400 bg-rose-500/10 px-1 py-0.5 rounded border border-rose-500/30 font-semibold">
                          <span className="text-indigo-400 font-bold">return</span> mid + <span className="text-orange-400">1</span>{' '}
                          <span className="text-rose-300 font-normal"># 🐞 DEFECT: Off-by-one boundary shift!</span>
                        </span>
                      ) : (
                        <span className="text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/30 font-semibold">
                          <span className="text-indigo-400 font-bold">return</span> mid{' '}
                          <span className="text-emerald-300 font-normal"># ✅ PATCH: Verified correct index</span>
                        </span>
                      )}
                    </div>
                    <div className="pl-8">
                      <span className="text-indigo-400 font-bold">elif</span> nums[mid] &lt; target:
                    </div>
                    <div className="pl-12">
                      low = mid + <span className="text-orange-400">1</span>
                    </div>
                    <div className="pl-8">
                      <span className="text-indigo-400 font-bold">else</span>:
                    </div>
                    <div className="pl-12">
                      high = mid - <span className="text-orange-400">1</span>
                    </div>
                    <div className="pl-4">
                      <span className="text-indigo-400 font-bold">return</span> -<span className="text-orange-400">1</span>
                    </div>
                  </div>

                  {/* Actions & Live Verdict */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <div className="text-[11px]">
                      <span className="text-slate-500">Verdict: </span>
                      <strong className={hasInjectedDefect ? 'text-rose-400' : 'text-emerald-400'}>
                        {hasInjectedDefect ? 'Wrong Answer (0 / 48 Passed)' : 'Accepted (48 / 48 Passed - 18ms)'}
                      </strong>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        disabled={isEvaluatingCode}
                        onClick={handleRunSimulatorJudge}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        <Play className="w-3.5 h-3.5 inline mr-1 text-slate-300" />
                        <span>Run Test Cases</span>
                      </button>

                      <button
                        disabled={isEvaluatingCode}
                        onClick={() => setIsJoinModalOpen(true)}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20 cursor-pointer active:scale-95"
                      >
                        <Zap className="w-3.5 h-3.5 inline mr-1 text-slate-950" />
                        <span>Submit Live Fix</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PROCTOR RADAR */}
              {activeConsoleTab === 'proctor' && (
                <div className="p-4 sm:p-5 font-mono text-xs space-y-3.5 text-slate-200">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 text-[11px]">
                    <div>
                      <span className="text-slate-500 uppercase">Proctor Telemetry: </span>
                      <span className="text-emerald-400 font-bold">ARMED & ACTIVE</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[10px] font-bold border border-rose-500/30">
                      KIOSK LOCK LEVEL 3
                    </span>
                  </div>

                  {proctorAlertMessage && (
                    <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{proctorAlertMessage}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Trap 01: Fullscreen</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Enforced Kiosk
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Trap 02: Tab Switch</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Blur Detection
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Trap 03: Paste Block</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Clipboard Trapped
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Trap 04: Suspicion Engine</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Timing AI Armed
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Recorded Strikes</span>
                      <span className="text-white text-xs font-bold">Current Strike: {simulatedProctorStrike} / 3</span>
                    </div>
                    <button
                      onClick={handleSimulateViolation}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[11px] font-bold cursor-pointer active:scale-95"
                    >
                      Simulate Tab Blur
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: ROUND STANDINGS */}
              {activeConsoleTab === 'standings' && (
                <div className="p-4 sm:p-5 font-mono text-xs space-y-3 text-slate-200">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px]">
                    <div>
                      <span className="text-slate-500 uppercase">Live Match: </span>
                      <span className="text-amber-400 font-bold">Inter-Collegiate Hackathon #2026</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                      ROUND 2 ACTIVE
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {[
                      { rank: 1, name: 'Ananya Sharma', college: 'Stanford University', score: '380 pts', time: '18m 12s', badge: 'Qualified R3' },
                      { rank: 2, name: 'Karthik Raja', college: 'CEG Anna University', score: '365 pts', time: '21m 04s', badge: 'Qualified R3' },
                      { rank: 3, name: 'David Chen', college: 'MIT EECS', score: '350 pts', time: '22m 30s', badge: 'Qualified R3' },
                      { rank: 4, name: 'Elena Rostova', college: 'Cambridge Computer Lab', score: '340 pts', time: '24m 15s', badge: 'In Contention' }
                    ].map((item) => (
                      <div
                        key={item.rank}
                        className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-[11px]"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] bg-amber-500/20 text-amber-300">
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
        </section>

        {/* ========================================================= */}
        {/* 4. MULTI-STAGE TOURNAMENT PIPELINE (HOW IT WORKS)         */}
        {/* ========================================================= */}
        <section id="tournament-pipeline" className="space-y-6 pt-4">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              The 3-Round Tournament Progression
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              Organizers structure competitions into sequential filter stages with automated advancement quotas and real-time eliminations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Round 1 Card */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between font-mono">
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                    STAGE 01
                  </span>
                  <span className="text-slate-400 text-xs flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> 15–20 Mins
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Rapid MCQ Algorithmic Screening
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  High-velocity algorithmic triage: time complexity, syntax gotchas, bitwise operations, and output prediction under time pressure. Automated quota cutoffs eliminate bottom percentiles automatically.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                Automatic Cutoff Thresholds &rarr;
              </div>
            </div>

            {/* Round 2 Card */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#0d121f] border border-amber-300 dark:border-amber-500/40 shadow-sm flex flex-col justify-between space-y-4 relative overflow-hidden">
              <div className="space-y-3">
                <div className="flex items-center justify-between font-mono">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold text-xs">
                    STAGE 02
                  </span>
                  <span className="text-slate-400 text-xs flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> 45–60 Mins
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Timed Algorithmic Debugging Sprint
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Client-side Pyodide WebAssembly sandboxes. Candidates are given complex broken codebases (concurrency deadlocks, memory leaks, off-by-one errors) and must diagnose and submit clean patches.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono text-amber-600 dark:text-amber-400 font-semibold">
                Pyodide WASM Isolation &rarr;
              </div>
            </div>

            {/* Round 3 Card */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between font-mono">
                  <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-xs">
                    STAGE 03
                  </span>
                  <span className="text-slate-400 text-xs flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> 10 Mins
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Sudden-Death Tiebreaker Engine
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Ultra-fast head-to-head edge case sprint. When top contestants tie on score, the sudden-death engine triggers a synchronized live race where milliseconds decide the championship.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono text-rose-600 dark:text-rose-400 font-semibold">
                Millisecond Time-Penalty Precision &rarr;
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 5. HOST COLLEGE COMMAND CENTER & ARCHITECTURE             */}
        {/* ========================================================= */}
        <section id="competition-engine" className="space-y-6 pt-4">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Engineered for Zero-Cheat Collegiate Contests
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              Built to withstand unstable university Wi-Fi, computer lab reboots, and evasion attempts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Feature 1 */}
            <div
              onClick={() => openTopic('kiosk-proctoring')}
              className="p-6 rounded-3xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-500/50 transition-all cursor-pointer group flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 dark:text-rose-400 mb-5 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 group-hover:text-rose-600 dark:group-hover:text-rose-300 transition-colors">
                  Hardware Focus-Lock Kiosk
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Browser-enforced fullscreen lock. Traps tab switches, window blur, and external paste bursts with multi-strike penalty rules.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-rose-600 dark:text-rose-400 font-semibold font-mono">
                <span>SPEC_DOCS</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Feature 2 */}
            <div
              onClick={() => openTopic('code-sandbox')}
              className="p-6 rounded-3xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500/50 transition-all cursor-pointer group flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 dark:text-amber-400 mb-5 group-hover:scale-105 transition-transform">
                  <Cpu className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
                  Pyodide WASM Client Sandbox
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  In-browser Python 3.11 worker execution with strict 2,000ms CPU execution caps, 128MB memory bounds, and zero server cold-start delays.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-semibold font-mono">
                <span>SPEC_DOCS</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Feature 3 */}
            <div
              onClick={() => openTopic('multi-stage-rounds')}
              className="p-6 rounded-3xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/50 transition-all cursor-pointer group flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 dark:text-indigo-400 mb-5 group-hover:scale-105 transition-transform">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                  Multi-Tenant College Privacy
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Strict multi-tenant security. Colleges maintain private question banks, isolated participant rosters, and tenant-scoped leaderboards.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-semibold font-mono">
                <span>SPEC_DOCS</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Feature 4 */}
            <div
              onClick={() => openTopic('cryptographic-credentials')}
              className="p-6 rounded-3xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500/50 transition-all cursor-pointer group flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400 mb-5 group-hover:scale-105 transition-transform">
                  <QrCode className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors">
                  HMAC-SHA256 QR Proofs
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Authentic parchment certificates featuring the host institution's dynamic color combination, rosette seals, and instant public QR validation.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                <span>SPEC_DOCS</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 6. COLLEGIATE CONTEST SCOREBOARD (HACKERRANK STYLE)       */}
        {/* ========================================================= */}
        <section id="scoreboard" className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <span>Inter-Collegiate Contest Standings</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Official tournament scoreboard sorted by points, bugs patched, and completion timestamps.
              </p>
            </div>

            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-400 text-amber-600 dark:text-amber-400 text-xs font-bold transition-all cursor-pointer font-mono shadow-sm"
            >
              Enter Contest Lobby &rarr;
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d121f] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4 w-16 text-center">Rank</th>
                    <th className="py-3 px-4">Contestant</th>
                    <th className="py-3 px-4">University / Engineering College</th>
                    <th className="py-3 px-4 text-center">Score</th>
                    <th className="py-3 px-4 text-center">Time Taken</th>
                    <th className="py-3 px-4 text-center">Bugs Patched</th>
                    <th className="py-3 px-4 text-right">Verifiable Credential</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {[
                    { rank: 1, name: 'Ananya Sharma', college: 'Stanford University', score: '380 pts', time: '18m 12s', patches: '3 of 3', cert: 'CERT-DEBUG-2026-A1' },
                    { rank: 2, name: 'Karthik Raja', college: 'CEG Anna University', score: '365 pts', time: '21m 04s', patches: '3 of 3', cert: 'CERT-ACM-STANFORD-04' },
                    { rank: 3, name: 'David Chen', college: 'MIT EECS', score: '350 pts', time: '22m 30s', patches: '3 of 3', cert: 'CERT-MIT-2026-X8' },
                    { rank: 4, name: 'Elena Rostova', college: 'Cambridge Computer Lab', score: '340 pts', time: '24m 15s', patches: '2 of 3', cert: 'CERT-CAMB-2026-Q2' },
                    { rank: 5, name: 'Rohan Gupta', college: 'IIT Madras', score: '325 pts', time: '25m 48s', patches: '2 of 3', cert: 'CERT-IITM-2026-P9' }
                  ].map((entry) => (
                    <tr key={entry.rank} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 px-4 text-center align-middle">
                        <span
                          className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-xs ${
                            entry.rank === 1
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40'
                              : entry.rank === 2
                              ? 'bg-slate-200 dark:bg-slate-300/20 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-400/40'
                              : entry.rank === 3
                              ? 'bg-amber-700/20 text-amber-700 dark:text-amber-400 border border-amber-700/40'
                              : 'text-slate-400'
                          }`}
                        >
                          {entry.rank}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white font-sans align-middle">{entry.name}</td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 align-middle">{entry.college}</td>
                      <td className="py-3 px-4 text-center text-amber-600 dark:text-amber-400 font-bold align-middle">{entry.score}</td>
                      <td className="py-3 px-4 text-center text-slate-500 dark:text-slate-400 align-middle">{entry.time}</td>
                      <td className="py-3 px-4 text-center align-middle">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                          {entry.patches}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right align-middle">
                        <button
                          type="button"
                          onClick={() => {
                            window.location.href = `/verify-cert/${encodeURIComponent(entry.cert)}`;
                          }}
                          className="text-cyan-600 dark:text-cyan-400 hover:underline text-[11px] cursor-pointer font-bold"
                        >
                          {entry.cert} &rarr;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 7. KIOSK INTEGRITY & CERTIFICATE VERIFICATION FORM        */}
        {/* ========================================================= */}
        <section id="kiosk-defense" className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Proctoring Card */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-rose-500" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Hardware Kiosk Anti-Cheat</h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-mono border border-rose-500/30">
                LEVEL 3 ENFORCED
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              Browser-enforced fullscreen lock and telemetry monitoring traps focus-blur events, tab switching, and clipboard pasting with automatic multi-strike disqualification.
            </p>

            {proctorAlertMessage && (
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{proctorAlertMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-mono">
              <span className="text-slate-500 dark:text-slate-400">Recorded Strikes: <strong className="text-slate-900 dark:text-white">{simulatedProctorStrike} / 3</strong></span>
              <button
                onClick={handleSimulateViolation}
                className="px-3 py-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-300 border border-rose-500/30 text-[11px] font-bold cursor-pointer active:scale-95"
              >
                Simulate Tab Blur
              </button>
            </div>
          </div>

          {/* Certificate Verification Card */}
          <div id="verification" className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-cyan-500" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Authenticate Credentials</h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[10px] font-mono border border-cyan-500/30">
                HMAC-SHA256
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              Recruiters and universities can verify cryptographic certificate signatures, official ranks, and tournament timestamps on the public ledger.
            </p>

            <form onSubmit={handleVerifyCert} className="flex gap-2">
              <input
                type="text"
                value={certLookupId}
                onChange={(e) => setCertLookupId(e.target.value)}
                placeholder="Enter Certificate ID (e.g. CERT-DEBUG-2026-A1)"
                className="flex-1 h-9 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                className="h-9 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer whitespace-nowrap"
              >
                Verify
              </button>
            </form>

            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
              <span>Sample:</span>
              <button
                type="button"
                onClick={() => setCertLookupId('CERT-DEBUG-2026-A1')}
                className="text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
              >
                CERT-DEBUG-2026-A1
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================= */}
      {/* 8. LEETCODE CLEAN DEVELOPER FOOTER                        */}
      {/* ========================================================= */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#06080e] pt-10 pb-8 text-slate-500 dark:text-slate-400 text-xs mt-10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Col 1: Platform Summary */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-black">
                  <Bug className="w-3 h-3 text-slate-950 stroke-[2.5]" />
                </div>
                <span className="font-bold text-slate-900 dark:text-white text-sm">DebugArena</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                The collegiate debugging tournament platform. Dedicated to testing real software defect diagnosis and algorithmic optimization.
              </p>
              <button
                type="button"
                onClick={() => openTopic('system-status')}
                className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer font-medium"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>All Tournament Clusters Operational</span>
              </button>
            </div>

            {/* Col 2: Platform Specs */}
            <div className="space-y-2">
              <div className="font-bold text-slate-900 dark:text-white uppercase text-[11px] font-mono">Platform Specs</div>
              <ul className="space-y-1 text-[11px]">
                <li><button onClick={() => openTopic('code-sandbox')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Pyodide WASM Engine</button></li>
                <li><button onClick={() => openTopic('kiosk-proctoring')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Focus-Lock Kiosk Specs</button></li>
                <li><button onClick={() => openTopic('multi-stage-rounds')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">3-Round Tournament Rules</button></li>
                <li><button onClick={() => openTopic('cryptographic-credentials')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">HMAC-SHA256 QR Proofs</button></li>
                <li><button onClick={() => openTopic('question-bank')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Question Bank Studio</button></li>
              </ul>
            </div>

            {/* Col 3: Tournament Portals */}
            <div className="space-y-2">
              <div className="font-bold text-slate-900 dark:text-white uppercase text-[11px] font-mono">Tournament Portals</div>
              <ul className="space-y-1 text-[11px]">
                <li><button onClick={() => setIsJoinModalOpen(true)} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer text-amber-600 dark:text-amber-400 font-semibold">Enter Contest Lobby &rarr;</button></li>
                <li><button onClick={() => setIsAdminModalOpen(true)} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Organizer Command Room</button></li>
                <li><button onClick={() => setIsAdminModalOpen(true)} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Create College Workspace</button></li>
                <li><button onClick={() => openTopic('organizer-dispatch')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Host Operations Checklist</button></li>
                <li><button onClick={() => scrollToSection('verification')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Public Certificate Lookup</button></li>
              </ul>
            </div>

            {/* Col 4: Integrity & Legal */}
            <div className="space-y-2">
              <div className="font-bold text-slate-900 dark:text-white uppercase text-[11px] font-mono">Integrity & Legal</div>
              <ul className="space-y-1 text-[11px]">
                <li><button onClick={() => openTopic('anti-cheat-guidelines')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Anti-Cheat Rulebook</button></li>
                <li><button onClick={() => openTopic('academic-honor-code')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Collegiate Honor Code</button></li>
                <li><button onClick={() => openTopic('security-standards')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Passkey Authentication</button></li>
                <li><button onClick={() => openTopic('privacy-policy')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Privacy Policy</button></li>
                <li><button onClick={() => openTopic('terms-of-service')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Terms of Competition</button></li>
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 font-mono">
            <div>&copy; {new Date().getFullYear()} DebugArena Tournament System. Built for competitive debugging.</div>
            <div className="flex items-center gap-3">
              <button onClick={() => openTopic('academic-license')} className="hover:text-slate-700 dark:hover:text-slate-400">Academic License</button>
              <span>•</span>
              <button onClick={() => openTopic('system-status')} className="hover:text-slate-700 dark:hover:text-slate-400">Cluster Telemetry</button>
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
      <JoinEventModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        defaultEventCode={enteredEventCode}
      />
    </div>
  );
};
