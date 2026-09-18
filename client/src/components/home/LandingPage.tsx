import React, { useState } from 'react';
import {
  Shield,
  Layers,
  Building2,
  ShieldCheck,
  ArrowRight,
  Menu,
  X,
  ChevronDown,
  ExternalLink,
  GraduationCap,
  Code2,
  Clock,
  CheckCircle2,
  Lock,
  FileCode2,
  Terminal
} from 'lucide-react';
import { AdminAuthModal } from '../auth/AdminAuthModal.js';
import { FooterDetailModal, FooterTopicId } from './FooterDetailModal.js';
import { ThemeToggle } from '../common/ThemeToggle.js';

export const LandingPage: React.FC = () => {
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Footer modal for institutional docs/policies
  const [footerTopic, setFooterTopic] = useState<FooterTopicId | null>(null);
  const [isFooterModalOpen, setIsFooterModalOpen] = useState(false);

  // FAQ accordion state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const openFooterTopic = (topic: FooterTopicId) => {
    setFooterTopic(topic);
    setIsFooterModalOpen(true);
  };

  const scrollToSection = (id: string) => {
    setIsMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const faqs = [
    {
      question: 'How do students join a competition?',
      answer:
        'Students join competitions directly through the unique event link provided by their college or department (for example, /join/EVENT-CODE). No prior registration or global account creation is required.'
    },
    {
      question: 'What programming languages and problem types are supported?',
      answer:
        'Debug Arena supports Python, JavaScript, TypeScript, Java, C, and C++ across multiple-choice questions, syntax error correction, and algorithmic debugging challenges.'
    },
    {
      question: 'How does automated evaluation work?',
      answer:
        'Each challenge runs candidate submissions against dual test suites: public sample cases with diff outputs and weighted hidden evaluation test cases executed in isolated sandboxes.'
    },
    {
      question: 'How do organizers manage their competitions?',
      answer:
        'College administrators and faculty access the management dashboard through the Admin Portal using institutional credentials or their private tournament control link.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* -------------------- NAVBAR -------------------- */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo / Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-slate-800 border border-slate-700 text-white flex items-center justify-center shadow-sm">
              <Terminal className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Debug<span className="text-indigo-600 dark:text-indigo-400">Arena</span>
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                Collegiate
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-400">
            <button
              onClick={() => scrollToSection('about')}
              className="hover:text-indigo-600 dark:hover:text-white transition-colors cursor-pointer"
            >
              About
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-indigo-600 dark:hover:text-white transition-colors cursor-pointer"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className="hover:text-indigo-600 dark:hover:text-white transition-colors cursor-pointer"
            >
              FAQ
            </button>
          </nav>

          {/* Header Action Tools */}
          <div className="hidden sm:flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Portal</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex sm:hidden items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="sm:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 space-y-3">
            <button
              onClick={() => scrollToSection('about')}
              className="block w-full text-left py-2 text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              About
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="block w-full text-left py-2 text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className="block w-full text-left py-2 text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              FAQ
            </button>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsAdminModalOpen(true);
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4" />
                <span>Admin Portal</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* -------------------- HERO SECTION -------------------- */}
      <section className="py-16 sm:py-24 border-b border-slate-200 dark:border-slate-800/60 bg-gradient-to-b from-slate-100/60 via-slate-50 to-white dark:from-slate-900/40 dark:via-slate-950 dark:to-slate-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
          {/* Institutional Tag */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80">
            <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>University &amp; College Competition Platform</span>
          </div>

          {/* Primary Headline */}
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight sm:leading-tight">
            College Debugging Competitions, <br className="hidden sm:inline" />
            <span className="text-indigo-600 dark:text-indigo-400">Made Simple.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Host, manage, and evaluate university coding and debugging competitions with automated test verification, custom round workflows, and instant scoring.
          </p>

          {/* CTA Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Admin Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-sm font-semibold transition-all cursor-pointer"
            >
              How It Works
            </button>
          </div>

          {/* Participant Guidance Note */}
          <div className="pt-4 text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
            <span>Participants: use the direct event link provided by your college (e.g. /join/EVENT-CODE).</span>
          </div>

          {/* Simple Institutional Trust Bar */}
          <div className="pt-10 border-t border-slate-200 dark:border-slate-800/80 max-w-xl mx-auto flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Campus Hackathons
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Technical Symposiums
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Department Lab Contests
            </span>
          </div>
        </div>
      </section>

      {/* -------------------- SECTION: BUILT FOR COLLEGE COMPETITIONS -------------------- */}
      <section id="about" className="py-16 sm:py-20 border-b border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-950">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Built for College Competitions
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              Designed specifically for engineering departments, student developer clubs, and collegiate coding symposiums.
            </p>
          </div>

          {/* 3 Clean Institutional Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Custom Rounds */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Custom Rounds
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Configure multi-stage tournaments with multiple-choice questions, syntax error correction, and live algorithmic debugging challenges.
              </p>
            </div>

            {/* Card 2: Simple Event Management */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Simple Event Management
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Create private events, generate direct entry links, specify time limits, and configure automatic stage advancement quotas effortlessly.
              </p>
            </div>

            {/* Card 3: Secure Competition */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Secure Competition
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Enforce fullscreen kiosk mode, restrict clipboard pasting, track violation logs in real time, and evaluate code with hidden test suites.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- SECTION: HOW IT WORKS -------------------- */}
      <section id="how-it-works" className="py-16 sm:py-20 border-b border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              How Debug Arena Works
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              A straightforward three-step workflow to coordinate competitions from setup to finalized results.
            </p>
          </div>

          {/* 3 Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Step 01
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Create Event
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Organizers set up a private competition, configure multiple rounds, assign duration, and select questions with public and hidden test cases.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Step 02
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Share Direct Link
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Distribute the unique event link (/join/EVENT-CODE) to participating students. Candidates join immediately without creating global accounts.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Step 03
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Run &amp; Evaluate
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Candidates solve debugging problems under timed assessment. Isolated execution engines evaluate test passes and compute official standings upon round conclusion.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- SECTION: FAQ -------------------- */}
      <section id="faq" className="py-16 sm:py-20 border-b border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              Common questions about running and participating in Debug Arena tournaments.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-5 sm:px-5 sm:pb-5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-200 dark:border-slate-800/60 pt-3">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* -------------------- SECTION: FINAL CALL TO ACTION -------------------- */}
      <section className="py-16 sm:py-20 bg-slate-50 dark:bg-slate-900/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Ready to host your next competition?
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
            Set up your department's coding or debugging contest with automated test case evaluation in minutes.
          </p>
          <div>
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 inline-flex items-center gap-2 cursor-pointer transition-all"
            >
              <Shield className="w-4 h-4" />
              <span>Admin Portal</span>
            </button>
          </div>
        </div>
      </section>

      {/* -------------------- INSTITUTIONAL FOOTER -------------------- */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 text-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-500" />
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  DebugArena
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                College competition management and automated evaluation platform.
              </p>
            </div>

            {/* Quick Links */}
            <div className="flex flex-wrap items-center gap-6 text-xs">
              <button
                onClick={() => scrollToSection('about')}
                className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                About
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection('faq')}
                className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                FAQ
              </button>
              <button
                onClick={() => setIsAdminModalOpen(true)}
                className="hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold cursor-pointer"
              >
                Admin Portal
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 dark:text-slate-500 text-[11px]">
            <div>
              &copy; {new Date().getFullYear()} Debug Arena. Built for university coding competitions.
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => openFooterTopic('security-standards')}
                className="hover:underline cursor-pointer"
              >
                Security &amp; Kiosk
              </button>
              <span>•</span>
              <button
                onClick={() => openFooterTopic('privacy-policy')}
                className="hover:underline cursor-pointer"
              >
                Privacy Policy
              </button>
              <span>•</span>
              <button
                onClick={() => openFooterTopic('terms-of-service')}
                className="hover:underline cursor-pointer"
              >
                Terms of Service
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* -------------------- MODALS -------------------- */}
      <AdminAuthModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />

      {footerTopic && (
        <FooterDetailModal
          isOpen={isFooterModalOpen}
          topic={footerTopic}
          onSelectTopic={(t) => setFooterTopic(t)}
          onClose={() => {
            setIsFooterModalOpen(false);
            setFooterTopic(null);
          }}
        />
      )}
    </div>
  );
};
