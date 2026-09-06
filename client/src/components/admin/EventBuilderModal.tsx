import React, { useState, useEffect, useRef } from 'react';
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
  ChevronUp,
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  AlertCircle
} from 'lucide-react';
import { College } from '../../types/index.js';
import { createEvent, createCollege } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';

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
  onEventCreated: (createdEvent?: any) => void;
  onCollegeCreated: () => void;
}

const ALL_LANGUAGES: { id: string; label: string; color: string }[] = [
  { id: 'python', label: 'Python 3', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  { id: 'cpp', label: 'C++ (GCC)', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 'java', label: 'Java 17', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { id: 'c', label: 'C (GCC)', color: 'bg-slate-500/20 text-slate-200 border-slate-500/40' },
  { id: 'javascript', label: 'JavaScript (Node)', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' },
  { id: 'sql', label: 'SQL (PostgreSQL/SQLite)', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' }
];

export const EventBuilderModal: React.FC<EventBuilderModalProps> = ({
  isOpen,
  onClose,
  colleges,
  onEventCreated,
  onCollegeCreated
}) => {
  const { user } = useAuth();
  const defaultColId = user?.collegeId || colleges[0]?._id || '';
  const [collegeId, setCollegeId] = useState<string>(defaultColId);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!collegeId) {
      const resolved = user?.collegeId || colleges[0]?._id || '';
      if (resolved) setCollegeId(resolved);
    }
  }, [colleges, user, collegeId]);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const handleGenerateCode = () => {
    const cleanName = (name.trim() || 'DEBUG').toUpperCase().replace(/[^A-Z0-9\s]/g, '');
    const words = cleanName.split(/\s+/).filter(Boolean);
    let prefix = 'DBG';
    if (words.length >= 2) {
      prefix = words.map(w => w[0]).join('').slice(0, 4);
    } else if (words.length === 1) {
      prefix = words[0].slice(0, 4);
    }
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setCode(`${prefix}${randomSuffix}`);
  };
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
  const [enableCertificates, setEnableCertificates] = useState(false);

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
  // CSV Rules Import & File Cleanup
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvNotification, setCsvNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isDraggingCsv, setIsDraggingCsv] = useState(false);

  useEffect(() => {
    if (csvNotification) {
      const timer = setTimeout(() => {
        setCsvNotification(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [csvNotification]);

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

  // Remove Round and re-index sequentially
  const handleRemoveRound = (idToRemove: string) => {
    if (rounds.length <= 1) {
      setErrorBanner('A tournament competition must have at least one round.');
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

  const handleAddRule = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const trimmed = newRule.trim();
    if (!trimmed) return;
    setRules(prev => [...prev, trimmed]);
    setNewRule('');
  };

  const handleRemoveRule = (index: number) => {
    setRules(prev => prev.filter((_, i) => i !== index));
  };



  const parseCsvLine = (text: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        if (inQuotes && text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const extractRulesFromCsv = (content: string): string[] => {
    const clean = content.replace(/^\uFEFF/, '').trim();
    if (!clean) return [];

    const rawLines = clean.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (rawLines.length === 0) return [];

    const firstLineCells = parseCsvLine(rawLines[0]);
    let ruleColIdx = 0;
    let startLine = 0;

    // Header detection
    const lowerHeader = firstLineCells.map(c => c.toLowerCase().trim());
    const exactMatch = lowerHeader.findIndex(h =>
      h === 'rule' || h === 'rules' || h === 'rule description' || h === 'description' || h === 'guideline' || h === 'guidelines'
    );

    if (exactMatch !== -1) {
      ruleColIdx = exactMatch;
      startLine = 1;
    } else if (lowerHeader.some(h => h.includes('rule') || h.includes('desc') || h.includes('guideline') || h.includes('instruction'))) {
      const match = lowerHeader.findIndex(h => h.includes('rule') || h.includes('desc') || h.includes('guideline') || h.includes('instruction'));
      ruleColIdx = match !== -1 ? match : 0;
      startLine = 1;
    } else if (firstLineCells.length > 1 && (/^(#|no\.?|id|s\.no\.?|sl\.?)$/i.test(firstLineCells[0]) || /^\d+$/.test(firstLineCells[0]))) {
      if (/^(#|no\.?|id|s\.no\.?|sl\.?)$/i.test(firstLineCells[0])) {
        startLine = 1;
      }
      ruleColIdx = 1;
    }

    const results: string[] = [];
    for (let i = startLine; i < rawLines.length; i++) {
      const cells = parseCsvLine(rawLines[i]);
      if (cells.length === 0) continue;

      let candidate = '';
      if (cells[ruleColIdx] !== undefined && cells[ruleColIdx].trim().length > 0) {
        candidate = cells[ruleColIdx];
      } else if (cells.length > 1 && /^\d+$/.test(cells[0])) {
        candidate = cells[1];
      } else {
        candidate = cells.reduce((longest, c) => (c.length > longest.length ? c : longest), '');
      }

      // Strip wrapping quotes
      candidate = candidate.replace(/^["']|["']$/g, '').trim();
      // Strip leading list enumerators e.g. "1. ", "Rule 1: ", "- "
      candidate = candidate.replace(/^(\d+[\.\)]\s*|rule\s*\d+[:\.\-]?\s*|[-•*]\s*)/i, '').trim();

      if (candidate.length >= 3) {
        results.push(candidate);
      }
    }

    return results;
  };

  const processCsvFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv') && file.type && !file.type.includes('csv') && !file.type.includes('text')) {
      setCsvNotification({
        type: 'error',
        message: `"${file.name}" is not a valid CSV file. Please upload a .csv document.`
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = (event.target?.result as string) || '';
        const extracted = extractRulesFromCsv(text);
        if (extracted.length === 0) {
          setCsvNotification({
            type: 'error',
            message: `No rules found in "${file.name}". Please ensure rows contain descriptive rule text.`
          });
          return;
        }

        let addedCount = 0;
        setRules(prev => {
          const existingSet = new Set(prev.map(r => r.toLowerCase().trim()));
          const newRulesToAdd = extracted.filter(r => !existingSet.has(r.toLowerCase().trim()));
          addedCount = newRulesToAdd.length;
          return [...prev, ...newRulesToAdd];
        });

        setCsvNotification({
          type: 'success',
          message: `Extracted ${extracted.length} rules (${addedCount} new added) from "${file.name}". File removed and cleared.`
        });
      } catch (err) {
        setCsvNotification({
          type: 'error',
          message: 'Error parsing CSV file contents. Please verify file formatting.'
        });
      } finally {
        // Remove file reference from DOM input and memory
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.onerror = () => {
      setCsvNotification({
        type: 'error',
        message: `Failed to read file "${file.name}".`
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processCsvFile(file);
    }
    e.target.value = '';
  };

  const handleDownloadSampleCsv = () => {
    const sampleCsv = `Rule\n"Full-screen proctoring is strictly enforced throughout the competition."\n"Zero negative marking on all debugging challenges."\n"Tab switching and window minimization incur escalated security strikes."\n"All code submissions are evaluated server-side against hidden test suites."\n"No external IDEs, secondary monitors, or browser tabs permitted."\n"Only proctor-approved scratchpad and calculators are allowed."`;
    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'debugarena_rules_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCreateCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollegeName.trim() || !newCollegeCode.trim()) {
      setErrorBanner('Please enter both College Name and College Code.');
      return;
    }
    try {
      const college = await createCollege({
        name: newCollegeName.trim(),
        code: newCollegeCode.trim().toUpperCase(),
        primaryColor: newCollegeColor
      });
      onCollegeCreated();
      setCollegeId(college._id);
      setShowNewCollegeForm(false);
      setNewCollegeName('');
      setNewCollegeCode('');
    } catch (err: any) {
      setErrorBanner(err.response?.data?.error || 'Failed to create college');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);

    const effectiveCollegeId = collegeId || user?.collegeId || colleges[0]?._id;
    if (!effectiveCollegeId) {
      setErrorBanner('Please select or bind a host college institution.');
      return;
    }
    if (!name.trim()) {
      setErrorBanner('Please provide a tournament event name.');
      return;
    }
    if (!code.trim()) {
      setErrorBanner('Please provide a unique tournament event code (e.g. DX26).');
      return;
    }

    if (rounds.length === 0) {
      setErrorBanner('Please configure at least one round in the tournament pipeline.');
      return;
    }

    // Validate languages for coding/debugging rounds
    for (const r of rounds) {
      if ((r.type === 'coding' || r.type === 'debugging') && (!r.allowedLanguages || r.allowedLanguages.length === 0)) {
        setErrorBanner(`Round ${r.roundNumber} (${r.title}) requires at least one allowed programming language.`);
        setExpandedRoundId(r.id);
        return;
      }
    }

    // Validate quota progression
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
      const res = await createEvent({
        collegeId: effectiveCollegeId,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim(),
        rules,
        scoringConfig: {
          negativeMarking,
          violationLimit: Math.max(1, violationLimit || 3),
          autoSubmitOnTimeUp: true,
          autoSubmitOnViolation: true,
          tieBreakerPriority: ['codingScore', 'debuggingScore', 'totalTime', 'earliestSubmit']
        },
        branding: {
          customTitle: customTitle.trim() || `${name.trim()} Live Championship`,
          certificateTitle: certificateTitle.trim() || `Certificate of Achievement — ${name.trim()}`,
          signatoryName: certSignatoryName.trim(),
          signatoryTitle: certSignatoryTitle.trim()
        },
        certificateConfig: {
          enabled: enableCertificates,
          useDefaultTemplate: useDefaultCertTemplate,
          customTemplateUrl: enableCertificates ? customCertTemplateUrl.trim() : '',
          textColorMode: certTextColorMode,
          issuerName: certSignatoryName.trim(),
          issuerTitle: certSignatoryTitle.trim(),
          primaryColor: '#f59e0b',
          includeQrVerification: enableCertificates
        },
        initialRounds: rounds.map((r, idx) => ({
          roundNumber: idx + 1,
          title: r.title?.trim() || `Round ${idx + 1}`,
          description: r.description?.trim() || '',
          type: r.type,
          durationMinutes: Math.max(1, parseInt(String(r.durationMinutes), 10) || 15),
          questionCount: Math.max(1, parseInt(String(r.questionCount), 10) || 5),
          totalMarks: Math.max(1, parseInt(String(r.totalMarks), 10) || 100),
          passingMarks: Math.max(0, parseInt(String(r.passingMarks), 10) || 0),
          negativeMarkValue: Math.max(0, parseFloat(String(r.negativeMarkValue)) || 0),
          allowedLanguages: (r.type === 'coding' || r.type === 'debugging')
            ? (r.allowedLanguages && r.allowedLanguages.length > 0 ? r.allowedLanguages : ['python', 'cpp', 'java', 'c', 'javascript'])
            : (r.type === 'sql' ? ['sql'] : []),
          advancementQuota: idx === rounds.length - 1 ? 0 : Math.max(0, parseInt(String(r.advancementQuota), 10) || 10),
          advancementRule: 'top_n',
          tieResolutionStrategy: r.tieResolutionStrategy || 'expand'
        }))
      });

      onEventCreated(res.event);
      onClose();
    } catch (err: any) {
      setErrorBanner(err.response?.data?.error || 'Failed to create tournament event');
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

        {/* Prominent Error Banner */}
        {errorBanner && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3 animate-in fade-in">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorBanner}</span>
          </div>
        )}

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
                {!showNewCollegeForm && (
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
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">No College Bound</div>
                      <div className="text-[11px] text-slate-400">Register your institution to host this tournament</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewCollegeForm(true)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Register College</span>
                  </button>
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300">Event Code</label>
                  <button
                    type="button"
                    onClick={handleGenerateCode}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Zap className="w-3 h-3" /> Auto
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. DX26"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono font-bold"
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
                                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                                      }`}
                                    >
                                      <Code2 className="w-3.5 h-3.5 opacity-70" />
                                      <span>{lang.label}</span>
                                      {isSelected && <Check className="w-3 h-3 ml-0.5" />}
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
          <div
            className={`p-5 rounded-3xl bg-slate-950/80 border transition-all space-y-4 ${
              isDraggingCsv
                ? 'border-indigo-500 bg-indigo-950/20 ring-2 ring-indigo-500/30'
                : 'border-slate-800'
            }`}
            onDragOver={e => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingCsv(true);
            }}
            onDragLeave={e => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingCsv(false);
            }}
            onDrop={e => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingCsv(false);
              const file = e.dataTransfer.files?.[0];
              if (file) {
                processCsvFile(file);
              }
            }}
          >
            {/* Hidden File Input (Immediately reset upon extraction) */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvFileUpload}
              className="hidden"
            />

            {/* Header with Title and CSV Import / Clear Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
                    3. Competition Rules & Proctoring Limits ({rules.length})
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Define tournament guidelines or upload rules via a CSV document
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {/* Upload Rules CSV Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  title="Upload rules from a CSV file (file is automatically removed after extraction)"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Upload Rules CSV</span>
                </button>

                {/* Sample CSV Template */}
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-[11px] font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Download sample CSV template for rules"
                >
                  <Download className="w-3 h-3 text-slate-400" />
                  <span className="hidden sm:inline">Sample CSV</span>
                </button>

                {/* Clear All */}
                {rules.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setRules([])}
                    className="text-[11px] text-slate-500 hover:text-rose-400 transition-colors cursor-pointer px-2 py-1"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* CSV Notification Banner */}
            {csvNotification && (
              <div
                className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-2 animate-in fade-in ${
                  csvNotification.type === 'success'
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {csvNotification.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{csvNotification.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCsvNotification(null)}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Drag & Drop Hint or Helper Notice */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/50 border border-slate-800/60 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Upload a <code>.csv</code> file with a <code>Rule</code> column. File is automatically cleared once extracted.</span>
              </span>
              <span className="hidden md:inline text-[10px] text-slate-500">Drag & drop supported</span>
            </div>

            {/* Quick Rule Presets */}
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] font-bold text-slate-500 self-center mr-1">Presets:</span>
              {[
                'Full-screen proctoring strictly enforced',
                'No external IDEs or editors permitted',
                'Window minimization triggers immediate strike',
                'Camera and microphone must stay active',
                'Submissions evaluated against hidden test suites',
                'Zero negative marking on all challenges'
              ].map(preset => {
                const isAdded = rules.includes(preset);
                return (
                  <button
                    key={preset}
                    type="button"
                    disabled={isAdded}
                    onClick={() => setRules(prev => [...prev, preset])}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all cursor-pointer ${
                      isAdded
                        ? 'bg-slate-900 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
                        : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20'
                    }`}
                  >
                    + {preset}
                  </button>
                );
              })}
            </div>

            {/* Rules List */}
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {rules.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-500 italic">
                  No rules configured yet. Click a preset above or type a custom rule below.
                </div>
              ) : (
                rules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300 group hover:border-slate-700 transition-colors"
                  >
                    <span className="truncate pr-2 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-slate-900 text-slate-400 font-mono text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span>{rule}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRule(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer shrink-0"
                      title="Delete Rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add Custom Rule Input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type a custom rule (e.g. Scratch paper allowed, no earphones)..."
                value={newRule}
                onChange={e => setNewRule(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddRule();
                  }
                }}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddRule}
                disabled={!newRule.trim()}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-bold text-white shadow-md shadow-indigo-600/30 cursor-pointer flex items-center gap-1.5 shrink-0 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Rule</span>
              </button>
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

          {/* SECTION 4: Certificate Generation & QR Verification (Optional) */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              enableCertificates
                ? 'bg-indigo-950/25 border-indigo-500/40 shadow-xl shadow-indigo-950/30'
                : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-750'
            }`}
          >
            {/* Header with Switch */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    enableCertificates
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-slate-900 text-slate-500 border border-slate-800'
                  }`}
                >
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-white">
                      4. Certificate Issuance & QR Verification
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        enableCertificates
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {enableCertificates ? 'Active' : 'Optional (Off)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {enableCertificates
                      ? 'Official tamper-proof certificates will be issued with cryptographic HMAC-SHA256 verification.'
                      : 'Certificates are disabled for this event. No certificates will be minted or issued.'}
                  </p>
                </div>
              </div>

              {/* Big Interactive Toggle Switch Button */}
              <button
                type="button"
                onClick={() => setEnableCertificates(!enableCertificates)}
                className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer border ${
                  enableCertificates
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30 shadow-md shadow-amber-500/10'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                }`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    enableCertificates ? 'bg-amber-400 shadow-sm shadow-amber-400' : 'bg-slate-600'
                  }`}
                />
                <span>{enableCertificates ? 'Certificates Enabled' : 'Enable Certificates'}</span>
              </button>
            </div>

            {/* Collapsible Certificate Settings */}
            {enableCertificates && (
              <div className="mt-4 pt-4 border-t border-indigo-500/20 space-y-4 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                      Official Standard Format
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      High-contrast parchment canvas with college color accents
                    </div>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Certificate Attestation Title
                    </label>
                    <input
                      type="text"
                      value={certificateTitle}
                      onChange={e => setCertificateTitle(e.target.value)}
                      placeholder="e.g. Certificate of Excellence"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Signatory Authority Name
                    </label>
                    <input
                      type="text"
                      value={certSignatoryName}
                      onChange={e => setCertSignatoryName(e.target.value)}
                      placeholder="e.g. Dr. A. Sakthivel"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>

                {!useDefaultCertTemplate && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        Custom Template Image URL
                      </label>
                      <input
                        type="text"
                        value={customCertTemplateUrl}
                        onChange={e => setCustomCertTemplateUrl(e.target.value)}
                        placeholder="https://example.com/certificates/custom_template.png"
                        className="w-full bg-slate-950 border border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                      />
                    </div>
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
                  </div>
                )}
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
