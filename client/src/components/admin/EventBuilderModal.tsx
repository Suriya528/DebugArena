import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Calendar,
  ShieldCheck,
  Plus,
  Trash2,
  CheckCircle2,
  Award,
  Zap,
  Image,
  Clock,
  Code2,
  Layers,
  AlertTriangle,
  HelpCircle,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { College } from '../../types/index.js';
import { createEvent, createCollege } from '../../services/api.js';

interface PipelineRoundConfig {
  id: string;
  roundNumber: number;
  title: string;
  description: string;
  type: 'mcq' | 'debugging' | 'coding' | 'sql' | 'aptitude';
  durationMinutes: number;
  questionCount: number;
  totalMarks: number;
  passingMarks: number;
  negativeMarkValue: number;
  allowedLanguages: string[];
  advancementQuota: number;
  tieResolutionStrategy: 'expand' | 'strict' | 'manual';
}

interface EventBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  colleges: College[];
  onEventCreated: () => void;
  onCollegeCreated: () => void;
}

const ALL_LANGUAGES: { id: string; label: string; badge: string; color: string }[] = [
  { id: 'python', label: 'Python 3', badge: 'PY', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { id: 'cpp', label: 'C++ (GCC)', badge: 'C++', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { id: 'java', label: 'Java 17', badge: 'JAVA', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { id: 'c', label: 'C (GCC)', badge: 'C', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  { id: 'javascript', label: 'JavaScript (Node)', badge: 'JS', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { id: 'sql', label: 'SQL (SQLite/Postgres)', badge: 'SQL', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' }
];

export const EventBuilderModal: React.FC<EventBuilderModalProps> = ({
  isOpen,
  onClose,
  colleges,
  onEventCreated,
  onCollegeCreated
}) => {
  const [collegeId, setCollegeId] = useState<string>(colleges[0]?._id || '');

  useEffect(() => {
    if (!collegeId && colleges.length > 0) {
      setCollegeId(colleges[0]._id);
    }
  }, [colleges, collegeId]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [violationLimit, setViolationLimit] = useState(3);
  const [customTitle, setCustomTitle] = useState('');
  const [certificateTitle, setCertificateTitle] = useState('');
  const [useDefaultCertTemplate, setUseDefaultCertTemplate] = useState(true);
  const [customCertTemplateUrl, setCustomCertTemplateUrl] = useState('');
  const [certTextColorMode, setCertTextColorMode] = useState<'auto' | 'light' | 'dark'>('auto');
  const [certSignatoryName, setCertSignatoryName] = useState('Head of Department');
  const [certSignatoryTitle, setCertSignatoryTitle] = useState('DebugArena Organizing Committee');

  // Dynamic Round Pipeline State
  const [rounds, setRounds] = useState<PipelineRoundConfig[]>([
    {
      id: 'round-1',
      roundNumber: 1,
      title: 'Round 1: Rapid-Fire Debugging MCQs',
      description: 'Quick conceptual questions to test debugging and syntax comprehension under time pressure.',
      type: 'mcq',
      durationMinutes: 15,
      questionCount: 10,
      totalMarks: 100,
      passingMarks: 0,
      negativeMarkValue: 0,
      allowedLanguages: [],
      advancementQuota: 15,
      tieResolutionStrategy: 'expand'
    },
    {
      id: 'round-2',
      roundNumber: 2,
      title: 'Round 2: Core Bug Hunting',
      description: 'Identify and repair logical, boundary, and memory defects across algorithmic snippets.',
      type: 'debugging',
      durationMinutes: 30,
      questionCount: 3,
      totalMarks: 100,
      passingMarks: 0,
      negativeMarkValue: 0,
      allowedLanguages: ['python', 'cpp', 'java', 'c', 'javascript'],
      advancementQuota: 10,
      tieResolutionStrategy: 'expand'
    },
    {
      id: 'round-3',
      roundNumber: 3,
      title: 'Round 3: Advanced Algorithmic Coding',
      description: 'Grand final competitive programming round testing algorithms, complexity, and edge cases.',
      type: 'coding',
      durationMinutes: 45,
      questionCount: 2,
      totalMarks: 100,
      passingMarks: 0,
      negativeMarkValue: 0,
      allowedLanguages: ['python', 'cpp', 'java', 'c', 'javascript'],
      advancementQuota: 0, // Finals: winner determination stage
      tieResolutionStrategy: 'expand'
    }
  ]);

  const [expandedRoundId, setExpandedRoundId] = useState<string>('round-1');

  const [rules, setRules] = useState<string[]>([
    'Full-screen proctoring is strictly enforced throughout the competition.',
    'Zero negative marking on all debugging challenges.',
    'Tab switching and window minimization incur escalated security strikes.',
    'All code submissions are evaluated server-side.'
  ]);
  const [newRule, setNewRule] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewCollegeForm, setShowNewCollegeForm] = useState(false);

  // New College sub-form state
  const [newCollegeName, setNewCollegeName] = useState('');
  const [newCollegeCode, setNewCollegeCode] = useState('');
  const [newCollegeColor, setNewCollegeColor] = useState('#6366f1');

  if (!isOpen) return null;

  // Safe dismiss with dirty checking
  const handleSafeClose = () => {
    if (name.trim() || code.trim()) {
      if (window.confirm('You have unsaved event configurations. Discard changes?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Preset Pipeline Loaders
  const applyPreset = (presetKey: '3_stage_classic' | '2_stage_duel' | '2_stage_aptitude' | '1_stage_sprint') => {
    if (presetKey === '3_stage_classic') {
      setRounds([
        {
          id: `r-${Date.now()}-1`,
          roundNumber: 1,
          title: 'Round 1: Rapid-Fire Debugging MCQs',
          description: 'Aptitude and quick-fire syntax error identification.',
          type: 'mcq',
          durationMinutes: 15,
          questionCount: 10,
          totalMarks: 100,
          passingMarks: 0,
          negativeMarkValue: 0,
          allowedLanguages: [],
          advancementQuota: 15,
          tieResolutionStrategy: 'expand'
        },
        {
          id: `r-${Date.now()}-2`,
          roundNumber: 2,
          title: 'Round 2: Core Bug Hunting',
          description: 'Fix buggy code across test cases under proctored execution.',
          type: 'debugging',
          durationMinutes: 30,
          questionCount: 3,
          totalMarks: 100,
          passingMarks: 0,
          negativeMarkValue: 0,
          allowedLanguages: ['python', 'cpp', 'java', 'c', 'javascript'],
          advancementQuota: 10,
          tieResolutionStrategy: 'expand'
        },
        {
          id: `r-${Date.now()}-3`,
          roundNumber: 3,
          title: 'Round 3: Advanced Algorithmic Coding',
          description: 'Grand final problem solving and full algorithmic coding challenge.',
          type: 'coding',
          durationMinutes: 45,
          questionCount: 2,
          totalMarks: 100,
          passingMarks: 0,
          negativeMarkValue: 0,
          allowedLanguages: ['python', 'cpp', 'java', 'c', 'javascript'],
          advancementQuota: 0,
          tieResolutionStrategy: 'expand'
        }
      ]);
    } else if (presetKey === '2_stage_duel') {
      setRounds([
        {
          id: `r-${Date.now()}-1`,
          roundNumber: 1,
          title: 'Round 1: Fast-Paced Bug Hunt',
          description: 'Rapid elimination debugging challenge.',
          type: 'debugging',
          durationMinutes: 30,
          questionCount: 3,
          totalMarks: 100,
          passingMarks: 0,
          negativeMarkValue: 0,
          allowedLanguages: ['python', 'cpp', 'java', 'c', 'javascript'],
          advancementQuota: 10,
          tieResolutionStrategy: 'expand'
        },
        {
          id: `r-${Date.now()}-2`,
          roundNumber: 2,
          title: 'Round 2: Algorithmic Showdown',
          description: 'Final algorithmic contest determining tournament winners.',
          type: 'coding',
          durationMinutes: 45,
          questionCount: 2,
          totalMarks: 100,
          passingMarks: 0,
          negativeMarkValue: 0,
          allowedLanguages: ['python', 'cpp', 'java', 'c', 'javascript'],
          advancementQuota: 0,
          tieResolutionStrategy: 'expand'
        }
      ]);
    } else if (presetKey === '2_stage_aptitude') {
      setRounds([
        {
          id: `r-${Date.now()}-1`,
          roundNumber: 1,
          title: 'Round 1: Aptitude & Logic Qualifier',
          description: 'Logical reasoning, analytical puzzles, and mathematical aptitude.',
          type: 'aptitude',
          durationMinutes: 20,
          questionCount: 15,
          totalMarks: 100,
          passingMarks: 0,
          negativeMarkValue: 0.25,
          allowedLanguages: [],
          advancementQuota: 20,
          tieResolutionStrategy: 'expand'
        },
        {
          id: `r-${Date.now()}-2`,
          roundNumber: 2,
          title: 'Round 2: Core CS & Debugging MCQs',
          description: 'Computer science fundamentals, pointers, memory, and code analysis.',
          type: 'mcq',
          durationMinutes: 25,
          questionCount: 20,
          totalMarks: 100,
          passingMarks: 0,
          negativeMarkValue: 0,
          allowedLanguages: [],
          advancementQuota: 0,
          tieResolutionStrategy: 'expand'
        }
      ]);
    } else if (presetKey === '1_stage_sprint') {
      setRounds([
        {
          id: `r-${Date.now()}-1`,
          roundNumber: 1,
          title: 'Comprehensive Coding & Debugging Sprint',
          description: 'Single-round intense assessment deciding champions directly.',
          type: 'coding',
          durationMinutes: 60,
          questionCount: 4,
          totalMarks: 150,
          passingMarks: 0,
          negativeMarkValue: 0,
          allowedLanguages: ['python', 'cpp', 'java', 'c', 'javascript'],
          advancementQuota: 0,
          tieResolutionStrategy: 'expand'
        }
      ]);
    }
  };

  // Add Round to Pipeline
  const handleAddRound = () => {
    const nextRoundNum = rounds.length + 1;
    const newRound: PipelineRoundConfig = {
      id: `round-${Date.now()}`,
      roundNumber: nextRoundNum,
      title: `Round ${nextRoundNum}: Technical Challenge`,
      description: 'Competitive programming and problem solving stage.',
      type: 'coding',
      durationMinutes: 30,
      questionCount: 3,
      totalMarks: 100,
      passingMarks: 0,
      negativeMarkValue: 0,
      allowedLanguages: ['python', 'cpp', 'java', 'c', 'javascript'],
      advancementQuota: 0,
      tieResolutionStrategy: 'expand'
    };

    // If previous last round had quota 0, set reasonable default (e.g. 10)
    const updated = rounds.map((r, i) => {
      if (i === rounds.length - 1 && r.advancementQuota === 0) {
        return { ...r, advancementQuota: 10 };
      }
      return r;
    });

    setRounds([...updated, newRound]);
    setExpandedRoundId(newRound.id);
  };

  // Remove Round and re-index sequentially (Flaw 4 fix)
  const handleRemoveRound = (idToRemove: string) => {
    if (rounds.length <= 1) {
      alert('A competition must have at least one round.');
      return;
    }

    const filtered = rounds.filter(r => r.id !== idToRemove);
    // Sequential re-indexing
    const reindexed = filtered.map((r, idx) => ({
      ...r,
      roundNumber: idx + 1,
      // Final round always gets quota 0
      advancementQuota: idx === filtered.length - 1 ? 0 : (r.advancementQuota || 10)
    }));

    setRounds(reindexed);
    if (expandedRoundId === idToRemove) {
      setExpandedRoundId(reindexed[0].id);
    }
  };

  // Update specific round field
  const updateRound = (id: string, updates: Partial<PipelineRoundConfig>) => {
    setRounds(rounds.map(r => (r.id === id ? { ...r, ...updates } : r)));
  };

  // Toggle Language in a round
  const toggleRoundLanguage = (roundId: string, langId: string) => {
    const round = rounds.find(r => r.id === roundId);
    if (!round) return;

    const currentLangs = round.allowedLanguages || [];
    let updatedLangs: string[];
    if (currentLangs.includes(langId)) {
      updatedLangs = currentLangs.filter(l => l !== langId);
    } else {
      updatedLangs = [...currentLangs, langId];
    }
    updateRound(roundId, { allowedLanguages: updatedLangs });
  };

  // Select all coding languages
  const selectAllLanguages = (roundId: string) => {
    updateRound(roundId, { allowedLanguages: ['python', 'cpp', 'java', 'c', 'javascript'] });
  };

  const handleAddRule = () => {
    if (!newRule.trim()) return;
    setRules([...rules, newRule.trim()]);
    setNewRule('');
  };

  const handleRemoveRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleCreateCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollegeName || !newCollegeCode) return;
    try {
      const college = await createCollege({
        name: newCollegeName,
        code: newCollegeCode,
        primaryColor: newCollegeColor
      });
      onCollegeCreated();
      setCollegeId(college._id);
      setShowNewCollegeForm(false);
      setNewCollegeName('');
      setNewCollegeCode('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create college');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collegeId || !name || !code) {
      alert('Please fill in College, Event Name, and Event Code');
      return;
    }

    if (rounds.length === 0) {
      alert('Please configure at least one round in the tournament pipeline');
      return;
    }

    // Validate languages for coding/debugging rounds (Flaw 5 fix)
    for (const r of rounds) {
      if ((r.type === 'coding' || r.type === 'debugging') && (!r.allowedLanguages || r.allowedLanguages.length === 0)) {
        alert(`Round ${r.roundNumber} (${r.title}) requires at least one allowed programming language.`);
        setExpandedRoundId(r.id);
        return;
      }
    }

    // Validate quota progression (Flaw 2 fix)
    for (let i = 0; i < rounds.length - 1; i++) {
      const currentQuota = rounds[i].advancementQuota;
      const nextQuota = rounds[i + 1].advancementQuota;
      if (i < rounds.length - 2 && nextQuota >= currentQuota && currentQuota > 0) {
        if (!window.confirm(
          `Warning: Round ${i + 1} quota is ${currentQuota}, but Round ${i + 2} quota is ${nextQuota}. Round ${i + 2} cannot advance more teams than were in it. Proceed anyway?`
        )) {
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      await createEvent({
        collegeId,
        name,
        code,
        description,
        rules,
        scoringConfig: {
          negativeMarking,
          violationLimit,
          autoSubmitOnTimeUp: true,
          autoSubmitOnViolation: true,
          tieBreakerPriority: ['codingScore', 'debuggingScore', 'totalTime', 'earliestSubmit']
        },
        branding: {
          customTitle: customTitle || `${name} Live Championship`,
          certificateTitle: certificateTitle || `Certificate of Achievement — ${name}`,
          signatoryName: certSignatoryName,
          signatoryTitle: certSignatoryTitle
        },
        certificateConfig: {
          useDefaultTemplate: useDefaultCertTemplate,
          customTemplateUrl: customCertTemplateUrl,
          textColorMode: certTextColorMode,
          issuerName: certSignatoryName,
          issuerTitle: certSignatoryTitle,
          primaryColor: '#f59e0b',
          includeQrVerification: true
        },
        initialRounds: rounds.map((r, idx) => ({
          roundNumber: idx + 1,
          title: r.title,
          description: r.description,
          type: r.type,
          durationMinutes: r.durationMinutes,
          questionCount: r.questionCount,
          totalMarks: r.totalMarks,
          passingMarks: r.passingMarks,
          negativeMarkValue: r.negativeMarkValue,
          allowedLanguages: (r.type === 'coding' || r.type === 'debugging')
            ? r.allowedLanguages
            : (r.type === 'sql' ? ['sql'] : []),
          advancementQuota: idx === rounds.length - 1 ? 0 : r.advancementQuota,
          advancementRule: 'top_n',
          tieResolutionStrategy: r.tieResolutionStrategy
        }))
      });

      onEventCreated();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create event');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto"
      onClick={e => {
        if (e.target === e.currentTarget) handleSafeClose();
      }}
    >
      <div className="relative w-full max-w-3xl rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl text-left my-8 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Dynamic Event & Round Pipeline Builder</h2>
              <p className="text-xs text-slate-400">
                Configure stages, round types, allowed languages, and tournament progression
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSafeClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inline New College Creation */}
        {showNewCollegeForm && colleges.length > 1 ? (
          <div className="mb-6 p-4 rounded-2xl bg-slate-950 border border-indigo-500/40 animate-in fade-in">
            <h3 className="text-sm font-bold text-indigo-400 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Add New College Organization
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">College Name</label>
                <input
                  type="text"
                  placeholder="e.g. Stanford Engineering"
                  value={newCollegeName}
                  onChange={e => setNewCollegeName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">College Code</label>
                <input
                  type="text"
                  placeholder="e.g. STAN-ENG"
                  value={newCollegeCode}
                  onChange={e => setNewCollegeCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Primary Color</label>
                <input
                  type="color"
                  value={newCollegeColor}
                  onChange={e => setNewCollegeColor(e.target.value)}
                  className="w-full h-9 bg-slate-900 border border-slate-800 rounded-xl px-1 py-1 cursor-pointer"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowNewCollegeForm(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateCollege}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
              >
                Save College
              </button>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: Event Identity */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              1. Event Identity & College
            </h3>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-300">Host College / Institution</label>
                {!showNewCollegeForm && colleges.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setShowNewCollegeForm(true)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> New College
                  </button>
                )}
              </div>
              {colleges.length > 1 ? (
                <select
                  value={collegeId}
                  onChange={e => setCollegeId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                >
                  {colleges.map(col => (
                    <option key={col._id} value={col._id}>
                      {col.name} ({col.code})
                    </option>
                  ))}
                </select>
              ) : colleges.length === 1 ? (
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{colleges[0].name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">Code: {colleges[0].code}</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Verified Host
                  </span>
                </div>
              ) : (
                <div className="p-3.5 text-xs text-slate-400 italic bg-slate-950 rounded-2xl border border-slate-800">
                  No institutional profile bound.
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Event Name</label>
                <input
                  type="text"
                  placeholder="e.g. DebugX 2026 or Inter-College Code Battle"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Event Code</label>
                <input
                  type="text"
                  placeholder="e.g. DX26"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Event Description</label>
              <textarea
                rows={2}
                placeholder="State the objective, prize pool, or eligibility requirements..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>
          </div>

          {/* SECTION 2: Dynamic Round Pipeline Designer */}
          <div className="p-5 rounded-3xl bg-slate-950/80 border border-cyan-500/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-400">
                    <Layers className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-black text-white tracking-tight">
                    2. Tournament Round Pipeline ({rounds.length} Stages)
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Configure stages, challenges, programming languages, and auto-progression
                </p>
              </div>

              {/* Add Stage Button */}
              <button
                type="button"
                onClick={handleAddRound}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-cyan-600/30 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Stage</span>
              </button>
            </div>

            {/* Pipeline Presets */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1.5">
                Load Architecture Preset:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('3_stage_classic')}
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/60 text-left transition-all group cursor-pointer"
                >
                  <div className="text-[11px] font-black text-white group-hover:text-cyan-400 flex items-center gap-1">
                    🏆 3-Stage Classic
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5 truncate">MCQ &rarr; Debug &rarr; Coding</div>
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset('2_stage_duel')}
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/60 text-left transition-all group cursor-pointer"
                >
                  <div className="text-[11px] font-black text-white group-hover:text-cyan-400 flex items-center gap-1">
                    ⚔️ 2-Stage Duel
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5 truncate">Bug Hunt &rarr; Algorithmic</div>
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset('2_stage_aptitude')}
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/60 text-left transition-all group cursor-pointer"
                >
                  <div className="text-[11px] font-black text-white group-hover:text-cyan-400 flex items-center gap-1">
                    🧠 Aptitude + Tech
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5 truncate">Logic &rarr; CS Fundamentals</div>
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset('1_stage_sprint')}
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/60 text-left transition-all group cursor-pointer"
                >
                  <div className="text-[11px] font-black text-white group-hover:text-cyan-400 flex items-center gap-1">
                    🎯 1-Stage Sprint
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5 truncate">Direct Coding Final</div>
                </button>
              </div>
            </div>

            {/* Dynamic Rounds List */}
            <div className="space-y-3 pt-2">
              {rounds.map((round, idx) => {
                const isExpanded = expandedRoundId === round.id;
                const isFinal = idx === rounds.length - 1;

                return (
                  <div
                    key={round.id}
                    className={`rounded-2xl border transition-all ${
                      isExpanded
                        ? 'bg-slate-900 border-cyan-500/50 shadow-lg shadow-cyan-950/30'
                        : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Header bar of Round Card */}
                    <div
                      className="p-3.5 flex items-center justify-between cursor-pointer select-none"
                      onClick={() => setExpandedRoundId(isExpanded ? '' : round.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center font-mono font-black text-cyan-400 text-xs">
                          R{round.roundNumber}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white tracking-tight">
                              {round.title || `Round ${round.roundNumber}`}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-cyan-400 border border-slate-700">
                              {round.type}
                            </span>
                            {isFinal ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                🏆 Championship Final
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                                Top {round.advancementQuota} Advance &rarr;
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono mt-0.5">
                            <span>⏱️ {round.durationMinutes}m</span>
                            <span>•</span>
                            <span>📋 {round.questionCount} Questions</span>
                            <span>•</span>
                            <span>🎯 {round.totalMarks} Pts</span>
                            {(round.type === 'coding' || round.type === 'debugging') && (
                              <>
                                <span>•</span>
                                <span className="text-cyan-300">
                                  {round.allowedLanguages.length} Langs ({round.allowedLanguages.join(', ') || 'none'})
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        {rounds.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRound(round.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Remove Stage"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setExpandedRoundId(isExpanded ? '' : round.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Collapsible Body of Round Card */}
                    {isExpanded && (
                      <div className="p-4 pt-0 border-t border-slate-800/80 mt-2 space-y-4 animate-in fade-in duration-150">
                        {/* Title & Type */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                          <div className="sm:col-span-2">
                            <label className="text-[11px] font-bold text-slate-300 block mb-1">
                              Stage Title
                            </label>
                            <input
                              type="text"
                              value={round.title}
                              onChange={e => updateRound(round.id, { title: e.target.value })}
                              placeholder={`Round ${round.roundNumber} Title`}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-300 block mb-1">
                              Challenge Format / Type
                            </label>
                            <select
                              value={round.type}
                              onChange={e => {
                                const newType = e.target.value as any;
                                let defaultLangs = round.allowedLanguages;
                                if (newType === 'sql') defaultLangs = ['sql'];
                                else if (newType === 'coding' || newType === 'debugging') {
                                  if (defaultLangs.length === 0 || defaultLangs.includes('sql')) {
                                    defaultLangs = ['python', 'cpp', 'java', 'c', 'javascript'];
                                  }
                                } else {
                                  defaultLangs = [];
                                }
                                updateRound(round.id, { type: newType, allowedLanguages: defaultLangs });
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                            >
                              <option value="mcq">MCQ Quiz (Multiple Choice)</option>
                              <option value="debugging">Bug Hunting (Code Repair)</option>
                              <option value="coding">Algorithmic Coding (Full Solution)</option>
                              <option value="sql">SQL Query Challenge</option>
                              <option value="aptitude">Aptitude & Analytical Reasoning</option>
                            </select>
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-300 block mb-1">
                            Round Instructions / Objective
                          </label>
                          <input
                            type="text"
                            value={round.description}
                            onChange={e => updateRound(round.id, { description: e.target.value })}
                            placeholder="Explain what candidates will face in this round..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>

                        {/* ALLOWED LANGUAGES (For coding, debugging, sql) */}
                        {(round.type === 'coding' || round.type === 'debugging' || round.type === 'sql') && (
                          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                                <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                                Permitted Programming Languages
                              </label>
                              {round.type !== 'sql' && (
                                <button
                                  type="button"
                                  onClick={() => selectAllLanguages(round.id)}
                                  className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer"
                                >
                                  Select Standard Stack (All 5)
                                </button>
                              )}
                            </div>

                            {round.type === 'sql' ? (
                              <div className="text-xs text-purple-400 font-mono bg-purple-500/10 border border-purple-500/20 px-3 py-2 rounded-xl">
                                SQL Engine: SQLite / PostgreSQL dialect active for database queries.
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-2 pt-1">
                                {ALL_LANGUAGES.filter(l => l.id !== 'sql').map(lang => {
                                  const isSelected = round.allowedLanguages.includes(lang.id);
                                  return (
                                    <button
                                      key={lang.id}
                                      type="button"
                                      onClick={() => toggleRoundLanguage(round.id, lang.id)}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                                        isSelected
                                          ? `${lang.color} shadow-sm`
                                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                                      }`}
                                    >
                                      <span className="font-mono text-[10px] uppercase font-black">{lang.badge}</span>
                                      <span>{lang.label}</span>
                                      {isSelected && <Check className="w-3 h-3" />}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {round.allowedLanguages.length === 0 && round.type !== 'sql' && (
                              <div className="text-[10px] text-rose-400 flex items-center gap-1 pt-1 font-bold">
                                <AlertTriangle className="w-3 h-3" />
                                Please select at least one language for this coding/debugging stage.
                              </div>
                            )}
                          </div>
                        )}

                        {/* Timing, Count, Marks, Negative Marking */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">
                              Duration (Minutes)
                            </label>
                            <input
                              type="number"
                              min={5}
                              max={180}
                              value={round.durationMinutes}
                              onChange={e =>
                                updateRound(round.id, { durationMinutes: parseInt(e.target.value, 10) || 15 })
                              }
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">
                              Question Pool Count
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={50}
                              value={round.questionCount}
                              onChange={e =>
                                updateRound(round.id, { questionCount: parseInt(e.target.value, 10) || 5 })
                              }
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">
                              Total Marks
                            </label>
                            <input
                              type="number"
                              min={10}
                              max={1000}
                              value={round.totalMarks}
                              onChange={e =>
                                updateRound(round.id, { totalMarks: parseInt(e.target.value, 10) || 100 })
                              }
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">
                              Negative Mark / Deduct
                            </label>
                            <input
                              type="number"
                              min={0}
                              step={0.25}
                              value={round.negativeMarkValue}
                              onChange={e =>
                                updateRound(round.id, { negativeMarkValue: parseFloat(e.target.value) || 0 })
                              }
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                            />
                          </div>
                        </div>

                        {/* Advancement Quota & Tie Policy */}
                        <div className="p-3 rounded-2xl bg-cyan-950/20 border border-cyan-500/30">
                          {isFinal ? (
                            <div className="flex items-center gap-2 text-xs text-amber-300 font-bold py-1">
                              <Award className="w-4 h-4 text-amber-400" />
                              <span>
                                🏆 Grand Championship Stage — Final results determine 1st, 2nd, and 3rd place winners. No further advancement quota needed.
                              </span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                                  Advancement Quota (Top N Teams Advance)
                                </label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min={1}
                                    max={500}
                                    value={round.advancementQuota}
                                    onChange={e =>
                                      updateRound(round.id, { advancementQuota: parseInt(e.target.value, 10) || 1 })
                                    }
                                    className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:border-cyan-400 focus:outline-none"
                                  />
                                  <span className="text-[11px] text-cyan-400 whitespace-nowrap font-mono">
                                    &rarr; Round {round.roundNumber + 1}
                                  </span>
                                </div>
                              </div>

                              <div>
                                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                                  Cutoff Boundary Tie Strategy
                                </label>
                                <select
                                  value={round.tieResolutionStrategy}
                                  onChange={e =>
                                    updateRound(round.id, { tieResolutionStrategy: e.target.value as any })
                                  }
                                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
                                >
                                  <option value="expand">Academic Fairness (Expand Cutoff for Ties)</option>
                                  <option value="strict">Strict Slicing (Top N Only)</option>
                                  <option value="manual">Manual Admin Review Flag</option>
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: Proctoring & Rules */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              3. Competition Rules & Proctoring Limits
            </h3>

            {/* Rules List */}
            <div>
              <div className="space-y-2 mb-2 max-h-32 overflow-y-auto">
                {rules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300"
                  >
                    <span className="truncate pr-2">
                      {idx + 1}. {rule}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRule(idx)}
                      className="text-slate-500 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add custom rule..."
                  value={newRule}
                  onChange={e => setNewRule(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddRule();
                    }
                  }}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddRule}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Proctoring Settings */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Max Security Strikes (Violations)</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={violationLimit}
                  onChange={e => setViolationLimit(parseInt(e.target.value, 10) || 3)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
              <div className="flex flex-col justify-center">
                <label className="text-xs font-bold text-slate-300 mb-1">Negative Marking Deductions</label>
                <label className="inline-flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={negativeMarking}
                    onChange={e => setNegativeMarking(e.target.checked)}
                    className="rounded border-slate-800 bg-slate-900 text-indigo-600 focus:ring-0"
                  />
                  <span>Enable deductions across event</span>
                </label>
              </div>
            </div>
          </div>

          {/* SECTION 4: Certificate Template & QR Verification */}
          <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-indigo-400" />
                4. Certificate Template & QR Verification (Optional)
              </span>
              <span className="text-[11px] text-indigo-400 font-mono">HMAC-SHA256</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Issue DebugArena's default Luxury Dark/Gold verifiable certificate, or provide your college's custom certificate template image.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setUseDefaultCertTemplate(true)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  useDefaultCertTemplate
                    ? 'bg-amber-500/20 border-amber-500 text-amber-200 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  Default Luxury Gold Theme
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Platform Dark/Gold security certificate</div>
              </button>

              <button
                type="button"
                onClick={() => setUseDefaultCertTemplate(false)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  !useDefaultCertTemplate
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-200 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <Image className="w-3.5 h-3.5 text-indigo-400" />
                  Custom College Template
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Upload or link university template image</div>
              </button>
            </div>

            {!useDefaultCertTemplate && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    College Certificate Template Image / Banner URL
                  </label>
                  <input
                    type="text"
                    value={customCertTemplateUrl}
                    onChange={e => setCustomCertTemplateUrl(e.target.value)}
                    placeholder="https://example.com/certificates/university_template.png"
                    className="w-full bg-slate-950 border border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Text Contrast Mode
                    </label>
                    <select
                      value={certTextColorMode}
                      onChange={e => setCertTextColorMode(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="auto">Adaptive Glass Contrast (Recommended)</option>
                      <option value="light">Light Text (For Dark Templates)</option>
                      <option value="dark">Dark Text (For Light Templates)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Signatory / Authority Name
                    </label>
                    <input
                      type="text"
                      value={certSignatoryName}
                      onChange={e => setCertSignatoryName(e.target.value)}
                      placeholder="e.g. Dean of Academics"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={handleSafeClose}
              className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-extrabold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Building Event & Pipeline...' : 'Initialize Event & Pipeline'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
