import React, { useEffect } from 'react';
import {
  X,
  Shield,
  ShieldCheck,
  Terminal,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Award,
  FileText,
  Activity,
  Layers,
  Code2,
  Scale,
  Lock,
  Zap,
  Database,
  ArrowRight,
  Sparkles,
  ExternalLink,
  BookOpen,
  Server,
  Key,
  Flame
} from 'lucide-react';

export type FooterTopicId =
  | 'code-sandbox'
  | 'kiosk-proctoring'
  | 'multi-stage-rounds'
  | 'cryptographic-credentials'
  | 'question-bank'
  | 'system-status'
  | 'anti-cheat-guidelines'
  | 'academic-honor-code'
  | 'security-standards'
  | 'data-privacy'
  | 'privacy-policy'
  | 'terms-of-service'
  | 'academic-license'
  | 'organizer-dispatch';

interface FooterDetailModalProps {
  isOpen: boolean;
  topic: FooterTopicId | null;
  onClose: () => void;
  onSelectTopic: (topic: FooterTopicId) => void;
  onAction?: (actionType: 'join' | 'admin' | 'verify') => void;
}

interface TopicContent {
  title: string;
  category: string;
  badgeColor: string;
  icon: React.FC<{ className?: string }>;
  summary: string;
  sections: {
    heading: string;
    description: string;
    bullets?: string[];
    technicalDetails?: { label: string; value: string }[];
  }[];
  actionLabel?: string;
  actionType?: 'join' | 'admin' | 'verify';
}

const TOPIC_REGISTRY: Record<FooterTopicId, TopicContent> = {
  'code-sandbox': {
    title: 'Isolated WebAssembly & Micro-Container Sandbox',
    category: 'RUNTIME ARCHITECTURE',
    badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    icon: Cpu,
    summary:
      'DebugArena leverages an in-browser WebWorker WebAssembly (Pyodide v314.0.6) execution engine combined with isolated server judge workers. Submissions run in real-time with zero cold starts, zero network socket access, and strict compute quotas.',
    sections: [
      {
        heading: 'Client-Side Pyodide WASM Isolation',
        description:
          'Student code execution executes inside a dedicated Web Worker running Python compiled to WebAssembly. This completely isolates code evaluation from the main browser UI thread, guaranteeing zero page freezing during heavy recursive calls or infinite loops.',
        bullets: [
          'Execution Time Cap: Hard limit of 2,000 milliseconds per test case.',
          'Memory Space Cap: 128 MB maximum heap allocation before automated termination.',
          'Network Socket Blocking: Complete denial of outbound TCP/UDP traffic from user scripts.',
          'Deterministic I/O: STDIN/STDOUT captured via custom virtual filesystem pipe with timestamping.'
        ],
        technicalDetails: [
          { label: 'WASM Compiler', value: 'Pyodide 314.0.6 (CPython 3.11)' },
          { label: 'Worker Pipeline', value: 'Dedicated SharedArrayBuffer & WebWorker' },
          { label: 'AST Inspection', value: 'Disallows os, sys.modules, subprocess, eval' },
          { label: 'Avg Latency', value: '< 25ms per test case' }
        ]
      },
      {
        heading: 'Automated Test Harness & Weighting',
        description:
          'Every challenge contains a dual test case suite: Public Test Cases (visible for student debugging with expected vs actual output diffs) and Hidden Evaluation Cases (weighted test cases for leaderboard scoring to prevent hardcoded print solutions).'
      }
    ],
    actionLabel: 'Launch Candidate Lobby',
    actionType: 'join'
  },

  'kiosk-proctoring': {
    title: 'Hardware-Enforced Focus-Lock Kiosk Engine',
    category: 'ANTI-CHEAT SYSTEM',
    badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    icon: ShieldCheck,
    summary:
      'Engineered for competition integrity during university tournaments. Enforces strict HTML5 Fullscreen lockdown, tracks tab switches, intercepts multi-screen setups, and records violation telemetry with configurable penalties.',
    sections: [
      {
        heading: 'Proctoring Event Traps',
        description:
          'The candidate portal binds directly to browser visibility and hardware window focus handlers to catch evasion attempts instantly:',
        bullets: [
          'Fullscreen Lock: Automatically flags escape key or window resize attempts.',
          'Visibility Change Interception: Captures document.visibilityState changes (switching tabs or windows).',
          'Window Blur Telemetry: Flags when user interacts with external applications or floating windows.',
          'Clipboard Guard: Disallows pasting external code into the editor to combat unauthorized copy-paste.',
          'DevTools Defense: Suppresses F12, Ctrl+Shift+I, and inspect shortcuts.'
        ]
      },
      {
        heading: 'Multi-Strike Escalation Ladder',
        description:
          'Organizers can configure violation limits per tournament. By default: Strike 1 issues an ambient alert; Strike 2 locks the screen with a required resume confirmation; Strike 3 automatically auto-submits current progress or disqualifies the candidate based on event rules.',
        technicalDetails: [
          { label: 'Heartbeat Rate', value: '2,000ms WebSocket Keep-Alive' },
          { label: 'State Authority', value: 'Server-side MongoDB RoundProgress' },
          { label: 'Crash Recovery', value: 'Zero time loss on accidental system reboot' }
        ]
      }
    ],
    actionLabel: 'Enter with Event Code',
    actionType: 'join'
  },

  'multi-stage-rounds': {
    title: 'Dynamic Multi-Stage Tournament Pipeline',
    category: 'EVENT ENGINE',
    badgeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    icon: Layers,
    summary:
      'Manage multi-stage collegiate tournaments seamlessly. Run preliminary MCQ screening rounds, algorithmic debugging sprints, and automated sudden-death tie-breakers with synchronized real-time countdown timers.',
    sections: [
      {
        heading: 'Three-Tier Tournament Pipeline',
        description:
          'Configurable rounds designed for engineering hackathons and campus recruitment screenings:',
        bullets: [
          'Round 1: Rapid MCQ Screening with negative marking, randomized question shuffling, and instant qualification cutoffs.',
          'Round 2: Algorithmic Debugging Sprint with broken starter code, real test suites, and multi-language support (Python, C++, Java, JS).',
          'Round 3: Sudden-Death Tie-Breakers with dynamic real-time timers and instant top-candidate qualification.'
        ]
      },
      {
        heading: 'Real-Time Synchronized Orchestration',
        description:
          'All round transitions, timer starts, auto-locks, and elimination broadcasts stream through Socket.IO rooms partitioned by event and college, ensuring zero network latency discrepancies between participants.'
      }
    ],
    actionLabel: 'Organizer Event Manager',
    actionType: 'admin'
  },

  'cryptographic-credentials': {
    title: 'SHA-256 Verifiable Achievement Credentials',
    category: 'CREDENTIAL SYSTEM',
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    icon: Award,
    summary:
      'Every issued tournament certificate is cryptographically anchored using SHA-256 hashing. Recruiters, academic boards, and LinkedIn viewers can publicly authenticate scores, ranks, and completion dates.',
    sections: [
      {
        heading: 'Cryptographic Signature Specification',
        description:
          'Certificates are stamped with a deterministic 64-character hex signature derived from the immutable tournament outcome:',
        bullets: [
          'Source Tuple: SHA-256(certificateId + studentRegNo + collegeId + eventCode + rank + finalScore + issuedAt).',
          'Tamper Evidence: Altering a student name, rank, or score invalidates the cryptographic hash immediately.',
          'Permanent Public URL: Each certificate has a public endpoint at /verify-cert/:id that never expires.',
          'Automated Vector PDF: High-fidelity certificate rendering with institutional crest, department seal, and QR code.'
        ],
        technicalDetails: [
          { label: 'Algorithm', value: 'SHA-256 (HMAC-backed)' },
          { label: 'Lookup Latency', value: '< 10ms Indexed Search' },
          { label: 'Verification Auth', value: 'Zero login required for public recruiters' }
        ]
      }
    ],
    actionLabel: 'Verify a Certificate',
    actionType: 'verify'
  },

  'question-bank': {
    title: 'Curated Question Repository & Test Case Builder',
    category: 'CURRICULUM TOOLS',
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    icon: Code2,
    summary:
      'Access an expanding library of algorithmic debugging challenges and MCQ topics, or author proprietary department questions with custom input/output test suites and weighted hidden cases.',
    sections: [
      {
        heading: 'Categorized Algorithmic Domains',
        description:
          'Pre-built challenges spanning core computer science problem domains:',
        bullets: [
          'Data Structures: Binary Trees, Linked Lists, Heaps, Stacks, Queues, Graphs.',
          'Algorithms: Dynamic Programming, Two Pointers, Divide & Conquer, Binary Search.',
          'Language Nuances: Memory leaks in C++, Python shallow vs deep copy traps, JS asynchronous promise hazards.',
          'Custom Authoring: Interactive test-case editor with input parameters, expected returns, and time limits.'
        ]
      }
    ],
    actionLabel: 'Explore Question Manager',
    actionType: 'admin'
  },

  'system-status': {
    title: 'Platform Telemetry & Operational Health',
    category: 'INFRASTRUCTURE STATUS',
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    icon: Activity,
    summary:
      'DebugArena runs on a distributed micro-architecture engineered for high concurrent student load during synchronized tournament start times.',
    sections: [
      {
        heading: 'Real-Time Service Clusters',
        description:
          'Current production operational status across all tournament subsystems:',
        bullets: [
          'WebSocket Real-Time Gateway: OPERATIONAL (99.98% uptime, avg latency 12ms)',
          'Pyodide WebAssembly Sandbox: ONLINE (Pre-warmed in-browser workers)',
          'MongoDB Primary Shard: HEALTHY (Cluster active, write latency 4ms)',
          'Anti-Cheat Proctor Watcher: ACTIVE (Zero false-positive reports logged)',
          'Passkey HMAC Auth Node: ARMED (Cryptographic blind indexing online)'
        ],
        technicalDetails: [
          { label: 'Global Availability', value: '99.98%' },
          { label: 'Active Region', value: 'APAC / Production Cluster' },
          { label: 'Concurrent Capacity', value: '10,000+ Synchronous Contestants' }
        ]
      }
    ]
  },

  'anti-cheat-guidelines': {
    title: 'Official Collegiate Tournament Anti-Cheat Policy',
    category: 'COMPLIANCE & INTEGRITY',
    badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    icon: Shield,
    summary:
      'To maintain fairness across competitive collegiate hackathons, all participants must strictly adhere to the tournament code of conduct during active rounds.',
    sections: [
      {
        heading: 'Permitted vs Strictly Prohibited Actions',
        description:
          'Participants must be aware of the following baseline rules enforced automatically by the arena:',
        bullets: [
          'PERMITTED: Built-in code editor, language documentation shortcuts, system scratchpad.',
          'STRICTLY PROHIBITED: Dual/secondary monitors, browser tab switching, external IDE copying.',
          'STRICTLY PROHIBITED: AI copilots, ChatGPT, Claude, external forum querying, or communication apps.',
          'STRICTLY PROHIBITED: Opening browser Developer Tools, inspecting DOM elements, or proxying requests.'
        ]
      },
      {
        heading: 'Incident Logging & Appeal Process',
        description:
          'Every violation event records a millisecond timestamp, violation type, and duration. Organizers maintain full administrative rights to inspect incident logs or pardon accidental system notifications.'
      }
    ],
    actionLabel: 'Review Portal Access',
    actionType: 'join'
  },

  'academic-honor-code': {
    title: 'Collegiate Academic Honor Code & Fair Play Pledge',
    category: 'ETHICS & STANDARDS',
    badgeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    icon: BookOpen,
    summary:
      'DebugArena champions ethical software craftsmanship. Every tournament participant signs a digital honor pledge upon entering the event code lobby.',
    sections: [
      {
        heading: 'The Student Fair-Play Pledge',
        description:
          'By logging in, each participant affirms: "I will write and debug my code independently without external assistance, artificial intelligence assistance, or unauthorized reference materials. I recognize that true engineering excellence requires intellectual honesty."'
      },
      {
        heading: 'Automated Plagiarism Cross-Check',
        description:
          'Upon round closure, organizer dashboards offer code comparison tools detecting structural AST similarities, token-frequency matching, and identical logic flow across submissions.'
      }
    ]
  },

  'security-standards': {
    title: 'Enterprise Security Architecture & Auth Protocol',
    category: 'SECURITY SPECIFICATION',
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    icon: Lock,
    summary:
      'DebugArena implements high-grade security protocols across authentication, rate limiting, and database access to safeguard collegiate tournaments.',
    sections: [
      {
        heading: 'Cryptographic Passkeys & Authentication',
        description:
          'Organizers authenticate through modern passwordless HMAC-SHA256 blind indexing with bcrypt salts, eliminating credential stuffing and cleartext password leaks. Google OAuth 2.0 uses FedCM security boundaries to avoid cross-site tracking vulnerabilities.',
        technicalDetails: [
          { label: 'Token Standard', value: 'JWT with 24-Hour Expiration' },
          { label: 'Passkey Blind Index', value: 'HMAC-SHA256 with Server Secret' },
          { label: 'Rate Limiting', value: 'Strict IP & Session Bucket Limiter' },
          { label: 'Data Encryption', value: 'TLS 1.3 in Transit, AES-256 at Rest' }
        ]
      },
      {
        heading: 'Injection & Collision Prevention',
        description:
          'All database queries use parameterized Mongoose schemas with explicit validation. Optional passkey emails use undefined values to avoid MongoDB sparse unique index collisions.'
      }
    ],
    actionLabel: 'Organizer Portal',
    actionType: 'admin'
  },

  'data-privacy': {
    title: 'Student Data Privacy & FERPA/GDPR Compliance',
    category: 'PRIVACY PROTOCOL',
    badgeColor: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
    icon: Scale,
    summary:
      'DebugArena treats collegiate participant data with strict minimal-footprint standards. We never sell, monetize, or track student data across external advertising networks.',
    sections: [
      {
        heading: 'Minimal Data Collection Principle',
        description:
          'Only essential competition parameters are recorded: Student Name, College Roll / Registration Number, and optional Department / Year. No phone numbers, home addresses, or payment information are ever requested.',
        bullets: [
          'Zero Ad Trackers: No third-party marketing pixels or invasive trackers are loaded.',
          'Departmental Isolation: Contestant records are strictly sandboxed under their specific college workspace.',
          'One-Click Tournament Purge: Organizers can completely delete events, participants, and attempts after the contest ends.'
        ]
      }
    ]
  },

  'privacy-policy': {
    title: 'Platform Privacy Policy for Universities',
    category: 'LEGAL AGREEMENT',
    badgeColor: 'text-slate-300 bg-slate-800 border-slate-700',
    icon: FileText,
    summary:
      'Comprehensive terms governing the collection, processing, and retention of academic contest data on the DebugArena tournament platform.',
    sections: [
      {
        heading: '1. Information Collected & Purpose',
        description:
          'DebugArena collects institutional emails for organizers and tournament participant identifiers solely for leaderboard computation, real-time proctoring monitoring, and certificate generation.'
      },
      {
        heading: '2. Data Retention & Erasure',
        description:
          'All event logs, code drafts, and test run records remain under the sovereign ownership of the organizing academic institution. Event organizers retain the right to export or permanently purge event data at any time.'
      },
      {
        heading: '3. Security & Access Control',
        description:
          'Access to student progress and tournament telemetry is restricted to authenticated college administrators using role-based access control (RBAC).'
      }
    ]
  },

  'terms-of-service': {
    title: 'DebugArena Terms of Service',
    category: 'LEGAL AGREEMENT',
    badgeColor: 'text-slate-300 bg-slate-800 border-slate-700',
    icon: Scale,
    summary:
      'Standard terms of use governing university tournament hosting, contestant conduct, and software service level expectations.',
    sections: [
      {
        heading: '1. Acceptance of Terms',
        description:
          'By accessing the DebugArena platform as an organizer, competitor, or certificate verifier, you agree to abide by these terms and the collegiate honor code.'
      },
      {
        heading: '2. Fair Competition & Non-Interference',
        description:
          'Contestants agree not to reverse-engineer, overload, or disrupt the competition platform or WebSocket event channels. Automated rate limits and DDoS protections are actively enforced.'
      },
      {
        heading: '3. Intellectual Property Rights',
        description:
          'Participants retain intellectual property rights to original solution code authored during competitions. Organizers retain rights to uploaded question bank challenges.'
      }
    ]
  },

  'academic-license': {
    title: 'Collegiate Free & Departmental Licensing',
    category: 'LICENSING',
    badgeColor: 'text-slate-300 bg-slate-800 border-slate-700',
    icon: Award,
    summary:
      'DebugArena is licensed for universities, student chapters (ACM, IEEE, CSI), and technical hackathons with unlimited free collegiate hosting.',
    sections: [
      {
        heading: 'Collegiate Community License',
        description:
          'Academic engineering departments and non-profit student tech organizations are granted unrestricted access to create tournament workspaces, host concurrent coding rounds, and issue verifiable digital certificates at zero institutional cost.',
        bullets: [
          'Unlimited events and participant enrollments.',
          'Full access to Pyodide sandbox and anti-cheat kiosk features.',
          'Automated SHA-256 certificate generation with lifelong public verification links.'
        ]
      }
    ],
    actionLabel: 'Launch Free College Workspace',
    actionType: 'admin'
  },

  'organizer-dispatch': {
    title: 'Campus Tournament Dispatch & Host Checklist',
    category: 'ORGANIZER GUIDE',
    badgeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    icon: Terminal,
    summary:
      'A practical operations manual for computer science professors, club presidents, and hackathon directors hosting live events on DebugArena.',
    sections: [
      {
        heading: 'Pre-Event Preparation Checklist',
        description:
          'Ensure a flawless tournament execution on contest day:',
        bullets: [
          'Bandwidth Requirement: Only ~50 kbps per contestant required since Python code executes locally inside the browser WebAssembly worker.',
          'Classroom Browser: Chrome, Edge, Firefox, or Safari (versions from 2022+ recommended with Fullscreen API support).',
          'Code Generation: Pre-generate your 6-digit Event Code in the Organizer Dashboard and distribute it on projector screens or campus notice boards.'
        ]
      },
      {
        heading: 'Live Proctoring Operations',
        description:
          'During active rounds, open the "Live Monitor" tab in your organizer portal. It streams connected participant counts, violation alerts, active code drafts, and real-time score updates with zero manual page refreshing required.'
      }
    ],
    actionLabel: 'Open Organizer Portal',
    actionType: 'admin'
  }
};

export const FooterDetailModal: React.FC<FooterDetailModalProps> = ({
  isOpen,
  topic,
  onClose,
  onSelectTopic,
  onAction
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !topic) return null;

  const content = TOPIC_REGISTRY[topic] || TOPIC_REGISTRY['code-sandbox'];
  const IconComponent = content.icon;

  const handleActionClick = () => {
    if (content.actionType && onAction) {
      onClose();
      onAction(content.actionType);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-3xl bg-[#080d17] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-1/4 -mt-20 w-96 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Top Header */}
        <div className="px-6 py-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-800/90 border border-slate-700 flex items-center justify-center text-white shadow-inner">
              <IconComponent className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${content.badgeColor}`}
                >
                  {content.category}
                </span>
                <span className="text-[11px] font-mono text-slate-500">DEBUGARENA_SPEC</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5">
                {content.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Topic Switcher Bar */}
        <div className="px-6 py-2.5 bg-slate-950/80 border-b border-slate-800/60 flex items-center gap-1.5 overflow-x-auto text-[11px] font-medium shrink-0 scrollbar-none">
          <span className="text-slate-500 text-[10px] uppercase tracking-wider font-mono mr-1 shrink-0">
            Explore:
          </span>
          {[
            { id: 'code-sandbox', label: 'WASM Sandbox' },
            { id: 'kiosk-proctoring', label: 'Anti-Cheat Kiosk' },
            { id: 'multi-stage-rounds', label: '3-Round Engine' },
            { id: 'cryptographic-credentials', label: 'SHA-256 Certs' },
            { id: 'system-status', label: 'Platform Status' },
            { id: 'security-standards', label: 'Security Specs' },
            { id: 'anti-cheat-guidelines', label: 'Honor Code' },
            { id: 'terms-of-service', label: 'Terms' },
            { id: 'privacy-policy', label: 'Privacy' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectTopic(item.id as FooterTopicId)}
              className={`px-2.5 py-1 rounded-lg transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                topic === item.id
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-300 text-xs sm:text-sm leading-relaxed">
          {/* Executive Summary Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-inner space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold block">
              Architectural Overview
            </span>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
              {content.summary}
            </p>
          </div>

          {/* Sections */}
          {content.sections.map((sec, idx) => (
            <div key={idx} className="space-y-3">
              <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
                <span>{sec.heading}</span>
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {sec.description}
              </p>

              {/* Bullet points */}
              {sec.bullets && sec.bullets.length > 0 && (
                <ul className="space-y-2 pt-1">
                  {sec.bullets.map((bullet, bIdx) => (
                    <li key={bIdx} className="flex items-start gap-2.5 text-xs text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Technical Specifications Grid */}
              {sec.technicalDetails && sec.technicalDetails.length > 0 && (
                <div className="mt-4 p-4 rounded-2xl bg-slate-950/90 border border-slate-800/90 grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[11px]">
                  {sec.technicalDetails.map((td, tIdx) => (
                    <div key={tIdx} className="flex flex-col p-2 rounded-xl bg-slate-900/60 border border-slate-800/50">
                      <span className="text-slate-500 uppercase tracking-wider text-[10px]">{td.label}</span>
                      <span className="text-cyan-300 font-semibold mt-0.5 truncate">{td.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Modal Footer Bar */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/90 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 font-mono">
            DebugArena Enterprise Tournament Specification • v2.4.0
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
            {content.actionLabel && (
              <button
                onClick={handleActionClick}
                className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-600 hover:from-cyan-300 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <span>{content.actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
