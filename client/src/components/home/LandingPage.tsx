import React, { useState } from 'react';
import {
  Shield,
  Terminal,
  Trophy,
  CheckCircle2,
  ArrowRight,
  Building2,
  Users,
  Award,
  ShieldCheck,
  Layers,
  Code2,
  Activity,
  Play,
  RotateCcw,
  AlertTriangle,
  AlertCircle,
  Clock,
  ChevronRight,
  ChevronDown,
  Hash,
  Send,
  Bug,
  Split,
  Timer,
  Eye,
  FileCode,
  QrCode,
  CheckCircle,
  Menu,
  X,
  Sliders,
  Laptop,
  Check,
  Zap,
  Radio,
  Sparkles,
  HelpCircle
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

  // Interactive Live Debugger Playground State
  const [activePlaygroundTab, setActivePlaygroundTab] = useState<'code' | 'stdin' | 'testcases'>('code');
  const [isDefectFixed, setIsDefectFixed] = useState(false);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [customStdin, setCustomStdin] = useState('5\n10 20 30 40 50\n30');
  const [simulatedStdout, setSimulatedStdout] = useState<string | null>(null);

  // Proctor Kiosk Strike Demo State
  const [simulatedKioskStrikes, setSimulatedKioskStrikes] = useState(0);
  const [kioskAlert, setKioskAlert] = useState<string | null>(null);

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

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

  const handleRunTests = () => {
    setIsRunningTests(true);
    setTimeout(() => {
      setIsRunningTests(false);
      if (activePlaygroundTab === 'stdin') {
        if (isDefectFixed) {
          setSimulatedStdout('Output: Element found at index 2\nExecution time: 14ms\nMemory: 12.4 MB\nStatus: 0 (Success)');
        } else {
          setSimulatedStdout('Traceback (most recent call last):\n  File "solution.py", line 7, in <module>\nIndexError: list index out of range\nStatus: 1 (Runtime Error)');
        }
      }
    }, 600);
  };

  const handleSimulateKioskStrike = () => {
    const next = Math.min(3, simulatedKioskStrikes + 1);
    setSimulatedKioskStrikes(next);
    if (next === 3) {
      setKioskAlert('STRIKE 3/3 REACHED: Auto-submission triggered. Assessment locked to prevent academic dishonesty.');
    } else {
      setKioskAlert(`STRIKE ${next}/3 RECORDED: Tab blur detected! Please return to fullscreen assessment window.`);
    }
    setTimeout(() => {
      setKioskAlert(null);
    }, 5000);
  };

  const faqs = [
    {
      q: 'How do students join an on-campus competition?',
      a: 'Students enter the custom Event Code provided by the host (e.g. DEBUG26). In the join modal, they provide their Full Name, Roll/Registration Number, and Department to immediately enter the fullscreen proctored assessment.'
    },
    {
      q: 'Can organizers customize the number and types of rounds?',
      a: 'Yes. DebugArena includes a Dynamic Event Pipeline Designer. Organizers can configure 1, 2, or multiple stages, selecting between rapid Algorithmic MCQ screening and timed Code Debugging challenges with custom durations and advancement quotas.'
    },
    {
      q: 'Which programming languages are supported for code debugging?',
      a: 'Organizers can enable Python, C, C++, Java, and JavaScript. Candidates receive faulty starter code, diagnose defects, test with arbitrary stdin inputs, and submit patches to pass sample and hidden test suites.'
    },
    {
      q: 'How does the Fullscreen Kiosk Anti-Cheat work in college labs?',
      a: 'Upon entering the assessment lobby, participants are locked into browser fullscreen. Window minimization, tab switching, focus blur, and external clipboard paste events trigger strikes with configurable limits and auto-submission.'
    },
    {
      q: 'What happens if a lab computer reboots or Wi-Fi drops?',
      a: 'DebugArena features crash-resilient offline draft sync. Answers and code drafts are continuously cached locally and synchronized to the backend every 1.5 seconds. If a PC reboots, opening the link immediately recovers the exact session and timer state.'
    },
    {
      q: 'Are certificates customizable and publicly verifiable?',
      a: 'Yes. Certificate issuance is optional per event. When enabled, certificates automatically adopt the host college’s dynamic color combination, official seal, and signatory details with an HMAC-SHA256 QR code verified on the public ledger.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0e17] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-amber-500 selection:text-black relative overflow-x-hidden font-sans transition-colors duration-200">
      {/* Background Matrix Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035] dark:opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(#f59e0b 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent pointer-events-none" />

      {/* ========================================================= */}
      {/* 1. TOP LIVE EVENT TICKER                                  */}
      {/* ========================================================= */}
      <div className="w-full bg-slate-100 dark:bg-[#070a10] border-b border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-400 py-1.5 px-4 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto scrollbar-none whitespace-nowrap gap-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>COLLEGE DEBUGGING EVENT ARENA</span>
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>On-Campus &amp; Symposium Host Engine</span>
            </span>
            <span className="text-slate-300 dark:text-slate-700 hidden md:inline">|</span>
            <span className="hidden md:inline text-slate-500 dark:text-slate-400">
              Custom Dynamic Rounds: MCQ &amp; Code Debugging
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden lg:inline text-slate-500 dark:text-slate-400">Fullscreen Anti-Cheat Kiosk Active</span>
            <span className="text-slate-300 dark:text-slate-700 hidden lg:inline">|</span>
            <button
              onClick={() => openTopic('system-status')}
              className="text-amber-600 dark:text-amber-400 hover:underline transition-colors flex items-center gap-1 font-medium cursor-pointer"
            >
              <span>Event System Ready</span>
              <Activity className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. LEETCODE / HACKERRANK STYLE NAVIGATION BAR             */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0d121f]/95 backdrop-blur-xl transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Identity & Anchors */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => scrollToSection('hero')}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
                <Bug className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-lg tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 leading-none">
                  DebugArena
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[9px] font-bold border border-amber-500/25">
                    COLLEGE EVENT OS
                  </span>
                </span>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <button
                onClick={() => scrollToSection('dynamic-rounds')}
                className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
              >
                Dynamic Rounds
              </button>
              <button
                onClick={() => scrollToSection('interactive-debugger')}
                className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
              >
                Code Debugging
              </button>
              <button
                onClick={() => scrollToSection('kiosk-proctoring')}
                className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
              >
                Lab Kiosk Anti-Cheat
              </button>
              <button
                onClick={() => scrollToSection('event-leaderboard')}
                className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
              >
                Event Leaderboard
              </button>
              <button
                onClick={() => scrollToSection('faq')}
                className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
              >
                FAQ
              </button>
              <button
                onClick={() => scrollToSection('official-certificates')}
                className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
              >
                Verify Certificates
              </button>
            </nav>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Universal Theme Toggle */}
            <ThemeToggle />

            {/* Organizer Portal */}
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="hidden sm:inline-flex h-9 px-3.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 transition-all items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Shield className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Host College Event</span>
            </button>

            {/* Enter Competition Button */}
            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="h-9 px-4 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-amber-400 shadow-md shadow-amber-500/25 transition-all inline-flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Trophy className="w-3.5 h-3.5 text-slate-950 shrink-0" />
              <span>Join Competition</span>
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
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d121f] px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-200 shadow-xl">
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <button
                onClick={() => {
                  scrollToSection('dynamic-rounds');
                  setIsMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left hover:text-amber-500"
              >
                Dynamic Rounds
              </button>
              <button
                onClick={() => {
                  scrollToSection('interactive-debugger');
                  setIsMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left hover:text-amber-500"
              >
                Code Debugging
              </button>
              <button
                onClick={() => {
                  scrollToSection('kiosk-proctoring');
                  setIsMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left hover:text-amber-500"
              >
                Lab Anti-Cheat
              </button>
              <button
                onClick={() => {
                  scrollToSection('event-leaderboard');
                  setIsMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left hover:text-amber-500"
              >
                Event Leaderboard
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
                <span>Host College Event / Organizer Login</span>
              </button>
              <button
                onClick={() => {
                  setIsJoinModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center gap-2"
              >
                <Trophy className="w-4 h-4 text-slate-950" />
                <span>Enter Event Lobby</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Competitive Platform Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-16">
        {/* ========================================================= */}
        {/* 3. HERO: EVENT CODE FAST-ENTRY & LIVE DEBUGGING WORKSPACE */}
        {/* ========================================================= */}
        <section id="hero" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2">
          {/* Left Col: Real Purpose, Event Code Box, Faculty Controls */}
          <div className="lg:col-span-6 space-y-5">
            {/* Campus Edition Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-700 dark:text-amber-300 font-mono shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="font-bold uppercase tracking-wider">On-Campus Debugging Competitions</span>
              <span className="text-slate-400 dark:text-slate-600">|</span>
              <span className="text-slate-600 dark:text-slate-400">College Tech Fests &amp; Symposiums</span>
            </div>

            {/* Headline */}
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.15]">
                Host &amp; Compete in <br />
                <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 dark:from-amber-400 dark:via-orange-400 dark:to-amber-200 bg-clip-text text-transparent">
                  Live College Debugging
                </span>{' '}
                Events.
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl pt-1 font-normal">
                Built specifically for university tech symposiums, departmental hackathons, and lab contests.
                Organizers design custom dynamic rounds of MCQs and code debugging challenges, enforce fullscreen kiosk anti-cheat, track real-time team leaderboards, and award official QR-verified certificates.
              </p>
            </div>

            {/* Event Code Instant Entry Box */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800 shadow-md max-w-lg space-y-2.5">
              <div className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center justify-between">
                <span>Enter Your College Event Code:</span>
                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span>Lab Contests Ready</span>
                </span>
              </div>

              <form onSubmit={handleJoinWithCode} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={enteredEventCode}
                    onChange={(e) => setEnteredEventCode(e.target.value.toUpperCase())}
                    placeholder="e.g. DEBUG26 or TECHFEST"
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

            {/* Organizer Fast Action */}
            <div className="flex items-center gap-3 pt-0.5 font-mono text-xs">
              <span className="text-slate-500 dark:text-slate-400">Convening an Event for Your College?</span>
              <button
                onClick={() => setIsAdminModalOpen(true)}
                className="text-amber-600 dark:text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Host Command Center</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 4 Core Features Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-lg font-mono text-[11px] pt-1">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-amber-600 dark:text-amber-400 font-bold block">Dynamic Rounds</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Custom 1, 2, or N Stages</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-rose-600 dark:text-rose-400 font-bold block">Lab Kiosk Lock</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Tab Blur &amp; Paste Shield</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold block">Live Monitor</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Real-Time Team Scores</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold block">QR Certificates</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">College-Branded &amp; Public</span>
              </div>
            </div>
          </div>

          {/* Right Col: Interactive Live Debugging & Stdin Playground */}
          <div className="lg:col-span-6" id="interactive-debugger">
            <div className="rounded-3xl border border-slate-300 dark:border-slate-700/80 bg-white dark:bg-[#0d121f] shadow-2xl overflow-hidden backdrop-blur-md">
              {/* Terminal Window Header */}
              <div className="px-4 py-3 bg-slate-100 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 font-mono text-slate-600 dark:text-slate-400 text-[11px] font-bold">
                    EVENT_ROUND_2 // CODE_DEBUG_CHALLENGE
                  </span>
                </div>

                {/* Playground Tabs */}
                <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-950 p-1 rounded-xl border border-slate-300 dark:border-slate-800 text-[11px] font-mono shrink-0">
                  <button
                    onClick={() => setActivePlaygroundTab('code')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      activePlaygroundTab === 'code'
                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>Buggy Code</span>
                  </button>
                  <button
                    onClick={() => setActivePlaygroundTab('stdin')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      activePlaygroundTab === 'stdin'
                        ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>Custom Stdin</span>
                  </button>
                  <button
                    onClick={() => setActivePlaygroundTab('testcases')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      activePlaygroundTab === 'testcases'
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>Test Cases</span>
                  </button>
                </div>
              </div>

              {/* Code Tab: Real Bug Diagnosis */}
              {activePlaygroundTab === 'code' && (
                <div className="p-4 sm:p-5 font-mono text-xs space-y-3">
                  {/* Defect Spec Banner */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">BUG #03: Off-By-One Array Boundary</span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] font-bold border border-amber-500/30">
                        20 MARKS
                      </span>
                    </div>

                    <button
                      onClick={() => setIsDefectFixed(!isDefectFixed)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                        isDefectFixed
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                      }`}
                    >
                      {isDefectFixed ? '✅ Fix Applied (Click to Revert)' : '🐞 View Faulty Code (Click to Fix)'}
                    </button>
                  </div>

                  {/* Code Snippet */}
                  <div className="p-3.5 rounded-2xl bg-slate-900 text-slate-200 text-[11px] leading-relaxed overflow-x-auto">
                    <div>
                      <span className="text-indigo-400 font-bold">def</span>{' '}
                      <span className="text-amber-300 font-bold">find_target_index</span>(arr: list[int], target: int) -&gt; int:
                    </div>
                    <div className="pl-4 text-slate-400">
                      # Locate target in sorted array or return -1
                    </div>
                    <div className="pl-4">
                      {isDefectFixed ? (
                        <span className="text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/30 font-semibold block">
                          <span className="text-indigo-400 font-bold">for</span> i <span className="text-indigo-400 font-bold">in</span> <span className="text-indigo-400">range</span>(<span className="text-indigo-400">len</span>(arr)):{' '}
                          <span className="text-emerald-300 font-normal"># ✅ Fixed: Correct upper limit avoids index overflow</span>
                        </span>
                      ) : (
                        <span className="text-rose-400 bg-rose-500/10 px-1 py-0.5 rounded border border-rose-500/30 font-semibold block">
                          <span className="text-indigo-400 font-bold">for</span> i <span className="text-indigo-400 font-bold">in</span> <span className="text-indigo-400">range</span>(<span className="text-indigo-400">len</span>(arr) + <span className="text-orange-400">1</span>):{' '}
                          <span className="text-rose-300 font-normal"># 🐞 BUG: Iterates past array bounds (IndexError!)</span>
                        </span>
                      )}
                    </div>
                    <div className="pl-8">
                      <span className="text-indigo-400 font-bold">if</span> arr[i] == target:
                    </div>
                    <div className="pl-12">
                      <span className="text-indigo-400 font-bold">return</span> i
                    </div>
                    <div className="pl-4">
                      <span className="text-indigo-400 font-bold">return</span> -<span className="text-orange-400">1</span>
                    </div>
                  </div>

                  {/* Status Bar & Action */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="text-[11px]">
                      <span className="text-slate-500">Test Outcome: </span>
                      <strong className={isDefectFixed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                        {isDefectFixed ? 'Accepted (All 4 Test Cases Passed)' : 'IndexError on arr[len(arr)]'}
                      </strong>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        disabled={isRunningTests}
                        onClick={handleRunTests}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all border border-slate-300 dark:border-slate-700 cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        <Play className="w-3.5 h-3.5 inline mr-1" />
                        <span>{isRunningTests ? 'Running...' : 'Run Test Cases'}</span>
                      </button>
                      <button
                        onClick={() => setIsJoinModalOpen(true)}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20 cursor-pointer active:scale-95"
                      >
                        <span>Submit Fix</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Stdin Tab: Arbitrary Stdin Playground */}
              {activePlaygroundTab === 'stdin' && (
                <div className="p-4 sm:p-5 font-mono text-xs space-y-3">
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
                    <span>Interactive Stdin Playground: Test arbitrary inputs against your code.</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">Standard Input</span>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Custom Stdin Input:</label>
                    <textarea
                      rows={3}
                      value={customStdin}
                      onChange={(e) => setCustomStdin(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {simulatedStdout && (
                    <div className="p-2.5 rounded-xl bg-slate-900 text-slate-200 border border-slate-800 text-[11px] space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Stdout &amp; Diagnostics:</span>
                      <pre className="text-slate-300 text-[10px] whitespace-pre-wrap">{simulatedStdout}</pre>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Execution limits: 3000ms / 256MB</span>
                    <button
                      disabled={isRunningTests}
                      onClick={handleRunTests}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 inline mr-1" />
                      <span>{isRunningTests ? 'Executing...' : 'Run with Custom Stdin'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Test Cases Tab: Sample & Hidden Cases */}
              {activePlaygroundTab === 'testcases' && (
                <div className="p-4 sm:p-5 font-mono text-xs space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 text-[11px]">
                    <span className="text-slate-500 uppercase font-bold">Evaluation Suite</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">2 Sample + 2 Hidden Cases</span>
                  </div>

                  <div className="space-y-2">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="font-bold text-slate-800 dark:text-slate-200">Test Case 1 (Sample)</span>
                      </div>
                      <span className="text-slate-500 text-[10px]">arr=[10, 20, 30], target=20 &rarr; Output: 1</span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isDefectFixed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-500" />
                        )}
                        <span className="font-bold text-slate-800 dark:text-slate-200">Test Case 2 (Edge Case)</span>
                      </div>
                      <span className="text-slate-500 text-[10px]">arr=[50], target=99 &rarr; {isDefectFixed ? 'Output: -1' : 'IndexError'}</span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-800 flex items-center justify-center text-[9px] font-bold">H</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">Test Case 3 (Hidden)</span>
                      </div>
                      <span className="text-slate-400 text-[10px]">{isDefectFixed ? 'Passed (10/10 Marks)' : 'Failed (0/10 Marks)'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* STATS / TRUST PROOF STRIP                                 */}
        {/* ========================================================= */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">10,000+</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Debugging Solutions Evaluated</div>
          </div>
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 font-mono">50+</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">College Tech Fests &amp; Contests</div>
          </div>
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">&lt; 20ms</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Custom Stdin Test Response</div>
          </div>
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono">100%</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Offline Lab Crash Resilience</div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 4. DYNAMIC EVENT PIPELINE DESIGNER                        */}
        {/* ========================================================= */}
        <section id="dynamic-rounds" className="space-y-6 pt-4">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-mono text-xs font-bold">
              <Sliders className="w-3.5 h-3.5" />
              <span>DYNAMIC ROUND PIPELINE</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Configurable Rounds for Any Event Format
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              Not locked to fixed stages. Event creators customize exactly how many rounds to run, what type each round is, and automated advancement quotas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Round Type 1: MCQ Screening */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between font-mono">
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                    ROUND TYPE: MCQ
                  </span>
                  <span className="text-slate-400 text-xs flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Configurable Time
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Algorithmic &amp; Syntax MCQ Screening
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Screen registered teams with rapid multiple-choice questions focusing on code output prediction, pointer operations, time complexities, and subtle syntax bugs with optional negative marking.
                </p>
                <div className="pt-2 text-[11px] font-mono text-slate-500 space-y-1">
                  <div>• Question palette with Mark-for-Review</div>
                  <div>• Automated score tally &amp; cutoff calculation</div>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                Instant Automatic Grading &rarr;
              </div>
            </div>

            {/* Round Type 2: Hands-On Debugging */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#0d121f] border border-amber-300 dark:border-amber-500/40 shadow-sm flex flex-col justify-between space-y-4 relative overflow-hidden">
              <div className="space-y-3">
                <div className="flex items-center justify-between font-mono">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold text-xs">
                    ROUND TYPE: DEBUGGING
                  </span>
                  <span className="text-slate-400 text-xs flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Timed Coding
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Live Code Defect Diagnosis &amp; Patching
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Contestants receive broken starter code in Python, C, C++, Java, or JavaScript. They must diagnose errors, write patches, test using custom stdin, and pass sample and hidden test suites.
                </p>
                <div className="pt-2 text-[11px] font-mono text-slate-500 space-y-1">
                  <div>• Monaco code editor with multi-language support</div>
                  <div>• Real-time test output &amp; execution timer (ms)</div>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono text-amber-600 dark:text-amber-400 font-semibold">
                Multi-Language Execution Engine &rarr;
              </div>
            </div>

            {/* Round Type 3: Sudden-Death / Tiebreakers */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between font-mono">
                  <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-xs">
                    ADVANCEMENT &amp; FINALS
                  </span>
                  <span className="text-slate-400 text-xs flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5" /> Quota Engine
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Automated Advancement &amp; Tiebreakers
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Set advancement quotas (e.g. Round 1: Top 25 advance &rarr; Round 2: Top 8 &rarr; Finals). System locks eliminated participants and resolves ties using solve speed, earliest submit, or sudden-death rounds.
                </p>
                <div className="pt-2 text-[11px] font-mono text-slate-500 space-y-1">
                  <div>• Automatic qualification cutoffs</div>
                  <div>• Precision time-penalty tiebreaker logic</div>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono text-rose-600 dark:text-rose-400 font-semibold">
                Automated Stage Progression &rarr;
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 5. COLLEGE LAB ANTI-CHEAT & PROCTORING SHIELD             */}
        {/* ========================================================= */}
        <section id="kiosk-proctoring" className="space-y-6 pt-4">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-mono text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>LAB INTEGRITY SHIELD</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Engineered for College Computer Labs
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              Built to prevent cheating during departmental competitions, lab assessments, and inter-team contests.
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
                  Fullscreen Kiosk Lock
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Participants are locked in browser fullscreen upon joining. Tab switches, window minimization, and focus blur trigger immediate strikes.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-rose-600 dark:text-rose-400 font-semibold font-mono">
                <span>KIOSK SPECS</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Feature 2 */}
            <div
              onClick={() => openTopic('anti-cheat-guidelines')}
              className="p-6 rounded-3xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500/50 transition-all cursor-pointer group flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 dark:text-amber-400 mb-5 group-hover:scale-105 transition-transform">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
                  Server-Synced Timer
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Round countdowns synchronize directly with server timestamps. Prevents client clock tampering and triggers fair auto-submits when time expires.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-semibold font-mono">
                <span>FAIRNESS ENGINE</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Feature 3 */}
            <div
              onClick={() => openTopic('code-sandbox')}
              className="p-6 rounded-3xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/50 transition-all cursor-pointer group flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 dark:text-indigo-400 mb-5 group-hover:scale-105 transition-transform">
                  <Laptop className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                  Crash-Resilient Draft Sync
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Code and answers are continuously saved locally and synced to the backend every 1.5s. If a lab PC reboots or Wi-Fi drops, work is instantly recovered.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-semibold font-mono">
                <span>OFFLINE RECOVERY</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Feature 4 */}
            <div
              onClick={() => openTopic('organizer-dispatch')}
              className="p-6 rounded-3xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500/50 transition-all cursor-pointer group flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400 mb-5 group-hover:scale-105 transition-transform">
                  <Activity className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors">
                  Live Host Control Room
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Real-time Socket.io monitor for faculty conveners. Watch connected participants, live test pass rates, suspicious paste alerts, and round progression.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                <span>HOST MONITOR</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 6. REAL COLLEGE EVENT LEADERBOARD                         */}
        {/* ========================================================= */}
        <section id="event-leaderboard" className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-mono text-amber-600 dark:text-amber-400 font-bold uppercase mb-1">
                <Trophy className="w-3.5 h-3.5" />
                <span>Live Event Standings // College Symposium Finals</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Live Contest Leaderboard
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Official standings for registered teams/students ranked by total score, debugging solve time, and test pass counts.
              </p>
            </div>

            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-400 text-amber-600 dark:text-amber-400 text-xs font-bold transition-all cursor-pointer font-mono shadow-sm"
            >
              Enter Event with Code &rarr;
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d121f] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4 w-16 text-center">Rank</th>
                    <th className="py-3 px-4">Team / Candidate</th>
                    <th className="py-3 px-4">Roll No / Reg ID</th>
                    <th className="py-3 px-4 text-center">R1 (MCQ)</th>
                    <th className="py-3 px-4 text-center">R2 (Debug)</th>
                    <th className="py-3 px-4 text-center">Total Score</th>
                    <th className="py-3 px-4 text-center">Solve Time</th>
                    <th className="py-3 px-4 text-right">Official Certificate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {[
                    { rank: 1, team: 'Binary Beasts', reg: '22CS041 - Dept of CSE', r1: '95 pts', r2: '190 pts', total: '285 pts', time: '24m 12s', cert: 'CERT-DEBUG-2026-A1' },
                    { rank: 2, team: 'Null Pointers', reg: '22CS019 - Dept of CSE', r1: '90 pts', r2: '180 pts', total: '270 pts', time: '26m 45s', cert: 'CERT-DEBUG-2026-A2' },
                    { rank: 3, team: 'Stack Overflows', reg: '22IT008 - Dept of IT', r1: '85 pts', r2: '175 pts', total: '260 pts', time: '28m 10s', cert: 'CERT-DEBUG-2026-A3' },
                    { rank: 4, team: 'Byte Benders', reg: '22CS092 - Dept of CSE', r1: '80 pts', r2: '170 pts', total: '250 pts', time: '31m 02s', cert: 'CERT-DEBUG-2026-A4' },
                    { rank: 5, team: 'Logic Bombs', reg: '22EC014 - Dept of ECE', r1: '80 pts', r2: '160 pts', total: '240 pts', time: '33m 20s', cert: 'CERT-DEBUG-2026-A5' }
                  ].map((row) => (
                    <tr key={row.rank} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 px-4 text-center align-middle">
                        <span
                          className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-xs ${
                            row.rank === 1
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40'
                              : row.rank === 2
                              ? 'bg-slate-200 dark:bg-slate-300/20 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-400/40'
                              : row.rank === 3
                              ? 'bg-amber-700/20 text-amber-700 dark:text-amber-400 border border-amber-700/40'
                              : 'text-slate-400'
                          }`}
                        >
                          {row.rank}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white font-sans align-middle">
                        {row.team}
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 align-middle">
                        {row.reg}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-300 font-bold align-middle">
                        {row.r1}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-300 font-bold align-middle">
                        {row.r2}
                      </td>
                      <td className="py-3 px-4 text-center text-amber-600 dark:text-amber-400 font-bold align-middle">
                        {row.total}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500 dark:text-slate-400 align-middle">
                        {row.time}
                      </td>
                      <td className="py-3 px-4 text-right align-middle">
                        <button
                          type="button"
                          onClick={() => {
                            window.location.href = `/verify-cert/${encodeURIComponent(row.cert)}`;
                          }}
                          className="text-cyan-600 dark:text-cyan-400 hover:underline text-[11px] cursor-pointer font-bold inline-flex items-center gap-1"
                        >
                          <span>{row.cert}</span>
                          <ArrowRight className="w-3 h-3" />
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
        {/* 7. OFFICIAL COLLEGE CERTIFICATES & KIOSK INTEGRITY DEMO    */}
        {/* ========================================================= */}
        <section id="official-certificates" className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          {/* Certificate Authentication Portal Card */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-cyan-500" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Verify Event Credentials
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[10px] font-mono border border-cyan-500/30">
                HMAC-SHA256
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              College event organizers issue authentic parchment certificates featuring dynamic institution branding, official rosette seals, and instant public QR validation.
            </p>

            <form onSubmit={handleVerifyCert} className="flex gap-2 pt-1">
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
              <span>Sample Certificate:</span>
              <button
                type="button"
                onClick={() => setCertLookupId('CERT-DEBUG-2026-A1')}
                className="text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
              >
                CERT-DEBUG-2026-A1
              </button>
            </div>
          </div>

          {/* Interactive Kiosk Blur Trap Simulation */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-rose-500" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Interactive Kiosk Defense Demo
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-mono border border-rose-500/30">
                PROCTOR DEMO
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              Test how DebugArena's kiosk shield detects when a student alt-tabs or clicks outside the assessment window during a live lab contest.
            </p>

            {kioskAlert && (
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="font-mono">{kioskAlert}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1 text-xs font-mono">
              <span className="text-slate-500 dark:text-slate-400">
                Strikes: <strong className="text-slate-900 dark:text-white">{simulatedKioskStrikes} / 3</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSimulatedKioskStrikes(0);
                    setKioskAlert(null);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-[11px] font-bold cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 inline mr-1" />
                  <span>Reset</span>
                </button>
                <button
                  type="button"
                  onClick={handleSimulateKioskStrike}
                  className="px-3 py-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-300 border border-rose-500/30 text-[11px] font-bold cursor-pointer active:scale-95"
                >
                  Simulate Tab Blur
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 8. FAQ ACCORDION                                          */}
        {/* ========================================================= */}
        <section id="faq" className="space-y-6 pt-4">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold">
              <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>FREQUENTLY ASKED QUESTIONS</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Everything You Need to Know
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              Common questions from university conveners, lab assistants, and participating student developers.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {faqs.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d121f] overflow-hidden transition-all shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors"
                  >
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-amber-500' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-3">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================= */}
        {/* 9. BOTTOM CALL TO ACTION BANNER                           */}
        {/* ========================================================= */}
        <section className="rounded-3xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/30 p-8 sm:p-12 text-center space-y-6 relative overflow-hidden backdrop-blur-sm">
          <div className="max-w-2xl mx-auto space-y-3 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono text-xs font-bold border border-amber-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>COLLEGE HOST READY</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Ready to Host Your College's Next Debugging Championship?
            </h2>
            <p className="text-xs sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Launch dynamic rounds with automated grading, real-time lab anti-cheat proctoring, and instant cryptographic certificates in minutes.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 relative z-10">
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="w-full sm:w-auto h-11 px-6 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-amber-400 shadow-lg shadow-amber-500/25 transition-all inline-flex items-center justify-center gap-2 cursor-pointer active:scale-95 font-sans"
            >
              <Shield className="w-4 h-4 text-slate-950" />
              <span>Host College Event</span>
            </button>
            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="w-full sm:w-auto h-11 px-6 rounded-xl text-xs font-bold text-slate-800 dark:text-white bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-amber-400 transition-all inline-flex items-center justify-center gap-2 cursor-pointer active:scale-95 font-sans"
            >
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Enter Competition with Code</span>
            </button>
          </div>
        </section>
      </main>

      {/* ========================================================= */}
      {/* 10. LEETCODE CLEAN DEVELOPER FOOTER                       */}
      {/* ========================================================= */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#06080e] pt-10 pb-8 text-slate-500 dark:text-slate-400 text-xs mt-12 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Col 1: Platform Purpose */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-black">
                  <Bug className="w-3 h-3 text-slate-950 stroke-[2.5]" />
                </div>
                <span className="font-bold text-slate-900 dark:text-white text-sm">DebugArena</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                The dedicated coding and debugging competition platform for college symposiums, tech fests, and departmental contests.
              </p>
              <button
                type="button"
                onClick={() => openTopic('system-status')}
                className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer font-medium"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Event Assessment Engine Online</span>
              </button>
            </div>

            {/* Col 2: Platform Specs */}
            <div className="space-y-2">
              <div className="font-bold text-slate-900 dark:text-white uppercase text-[11px] font-mono">Platform Features</div>
              <ul className="space-y-1 text-[11px]">
                <li><button onClick={() => openTopic('multi-stage-rounds')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Dynamic Rounds Designer</button></li>
                <li><button onClick={() => openTopic('code-sandbox')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Code Debugging Engine</button></li>
                <li><button onClick={() => openTopic('kiosk-proctoring')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Fullscreen Kiosk Anti-Cheat</button></li>
                <li><button onClick={() => openTopic('question-bank')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Question Bank Studio</button></li>
                <li><button onClick={() => openTopic('cryptographic-credentials')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Official QR Certificates</button></li>
              </ul>
            </div>

            {/* Col 3: Portals & Actions */}
            <div className="space-y-2">
              <div className="font-bold text-slate-900 dark:text-white uppercase text-[11px] font-mono">Event Portals</div>
              <ul className="space-y-1 text-[11px]">
                <li><button onClick={() => setIsJoinModalOpen(true)} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer text-amber-600 dark:text-amber-400 font-semibold">Join with Event Code &rarr;</button></li>
                <li><button onClick={() => setIsAdminModalOpen(true)} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Host College Event / Login</button></li>
                <li><button onClick={() => openTopic('organizer-dispatch')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Organizer Operations Guide</button></li>
                <li><button onClick={() => scrollToSection('event-leaderboard')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">View Event Leaderboard</button></li>
                <li><button onClick={() => scrollToSection('official-certificates')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Public Certificate Lookup</button></li>
              </ul>
            </div>

            {/* Col 4: Integrity & Security */}
            <div className="space-y-2">
              <div className="font-bold text-slate-900 dark:text-white uppercase text-[11px] font-mono">Integrity &amp; Guidelines</div>
              <ul className="space-y-1 text-[11px]">
                <li><button onClick={() => openTopic('anti-cheat-guidelines')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Lab Anti-Cheat Rules</button></li>
                <li><button onClick={() => openTopic('academic-honor-code')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Collegiate Honor Code</button></li>
                <li><button onClick={() => openTopic('security-standards')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Security Standards</button></li>
                <li><button onClick={() => openTopic('privacy-policy')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Privacy Policy</button></li>
                <li><button onClick={() => openTopic('terms-of-service')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Terms of Assessment</button></li>
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 font-mono">
            <div>&copy; {new Date().getFullYear()} DebugArena. Dedicated to on-campus debugging competitions.</div>
            <div className="flex items-center gap-3">
              <button onClick={() => openTopic('academic-license')} className="hover:text-slate-700 dark:hover:text-slate-400">Academic License</button>
              <span>•</span>
              <button onClick={() => openTopic('system-status')} className="hover:text-slate-700 dark:hover:text-slate-400">System Readiness</button>
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
          if (type === 'verify') scrollToSection('official-certificates');
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
