import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import {
  Play,
  Send,
  Code2,
  Terminal,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  AlertOctagon,
  RotateCcw,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles
} from 'lucide-react';
import { Question, Attempt, TestCaseResult } from '../../types/index.js';
import { api, queueOfflineUpdate, generateOperationId, getNextSeqId } from '../../services/api.js';
import { useDebouncedCallback } from '../../hooks/useDebounce.js';
import { useTheme } from '../../context/ThemeContext.js';
import { CodingProblemDetails } from '../common/CodingProblemDetails.js';

export interface SubmissionFeedbackData {
  status: string;
  message: string;
  score?: number;
  submissionScore?: number;
  language?: string;
  passedCount?: number;
  totalCount?: number;
  failedCount?: number;
  hiddenTotalCount?: number;
  hiddenFailedCount?: number;
  hiddenPassedCount?: number;
  failedHiddenIndices?: number[];
  avgRuntimeMs?: number;
  maxRuntimeMs?: number;
  timeLimitMs?: number;
  compileOutput?: string | null;
  runtimeOutput?: string | null;
}

interface CodingShellProps {
  questions: Question[];
  roundNumber: number;
  initialAttempts: Attempt[];
  onSubmitRound: () => void;
  isSubmittingRound?: boolean;
}

export const CodingShell: React.FC<CodingShellProps> = ({
  questions,
  roundNumber,
  initialAttempts,
  onSubmitRound,
  isSubmittingRound
}) => {
  const { isDark } = useTheme();
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const currentQ = questions[currentQIndex];

  // Ref to the live Monaco editor instance to guarantee current code is always executed
  const editorRef = useRef<any>(null);
  // Ref to the left problem description panel for scroll management
  const leftPanelRef = useRef<HTMLDivElement>(null);

  // Map of questionId -> language
  const [selectedLanguages, setSelectedLanguages] = useState<Record<string, string>>({});
  // Map of `${questionId}_${language}` -> code (per-language buffer prevents cross-language overwrites)
  const [codeBuffers, setCodeBuffers] = useState<Record<string, string>>({});
  // Map of questionId -> best score
  const [scores, setScores] = useState<Record<string, number>>({});

  // Reset left panel scroll position to top whenever active question changes
  useEffect(() => {
    if (leftPanelRef.current) {
      leftPanelRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [currentQIndex]);

  // Execution states
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSubmittingCode, setIsSubmittingCode] = useState<boolean>(false);
  const [runResults, setRunResults] = useState<Record<string, TestCaseResult[]>>({});
  const [activeTab, setActiveTab] = useState<'cases' | 'custom' | 'results'>('cases');
  const [selectedCaseIdx, setSelectedCaseIdx] = useState<number>(0);
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [customOutputs, setCustomOutputs] = useState<Record<string, {
    input: string;
    actualOutput: string;
    runtimeMs: number;
    status: string;
    compileError?: string;
    runtimeError?: string;
  } | null>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, 'saved' | 'saving' | 'offline'>>({});
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [mobileView, setMobileView] = useState<'problem' | 'code' | 'results'>('problem');
  const [submissionFeedback, setSubmissionFeedback] = useState<Record<string, SubmissionFeedbackData>>({});

  // Initialize from attempts or default starter code
  useEffect(() => {
    const langs: Record<string, string> = {};
    const codes: Record<string, string> = {};
    const bestScores: Record<string, number> = {};
    const existingResults: Record<string, TestCaseResult[]> = {};

    questions.forEach(q => {
      const existingAttempt = initialAttempts.find(a => a.questionId === q._id);
      const defaultLang = (q.allowedLanguages && q.allowedLanguages[0]) || 'python';
      const localLang = localStorage.getItem(`debugarena_lang_draft_${roundNumber}_${q._id}`);
      const chosenLang = localLang || existingAttempt?.language || defaultLang;
      langs[q._id] = chosenLang;

      const allowed = q.allowedLanguages && q.allowedLanguages.length > 0
        ? q.allowedLanguages
        : ['python', 'cpp', 'java', 'c', 'javascript'];

      allowed.forEach(l => {
        const bufferKey = `${q._id}_${l}`;
        const localDraft = localStorage.getItem(`debugarena_code_draft_${roundNumber}_${bufferKey}`);
        if (localDraft) {
          codes[bufferKey] = localDraft;
        } else if (existingAttempt && existingAttempt.language === l && existingAttempt.code) {
          codes[bufferKey] = existingAttempt.code;
        } else {
          const starter = (q.starterCode && (q.starterCode as any)[l]) || '// Write your solution here';
          codes[bufferKey] = starter;
        }
      });

      // Backward compatibility for legacy drafts saved without language suffix
      const legacyDraft = localStorage.getItem(`debugarena_code_draft_${roundNumber}_${q._id}`);
      if (legacyDraft && !codes[`${q._id}_${chosenLang}`]) {
        codes[`${q._id}_${chosenLang}`] = legacyDraft;
      }

      bestScores[q._id] = existingAttempt?.score || 0;
      if (existingAttempt?.testCaseResults) {
        existingResults[q._id] = existingAttempt.testCaseResults;
      }
    });

    setSelectedLanguages(langs);
    setCodeBuffers(codes);
    setScores(bestScores);
    setRunResults(existingResults);
  }, [questions, initialAttempts, roundNumber]);

  // Debounced save with idempotent operation tracking
  const debouncedSaveCode = useDebouncedCallback(
    async (questionId: string, codeText: string, lang: string) => {
      setSaveStatus(prev => ({ ...prev, [questionId]: 'saving' }));
      const opId = generateOperationId();
      const seq = getNextSeqId();
      try {
        await api.post('/participant/save-answer', {
          questionId,
          roundNumber,
          code: codeText,
          language: lang,
          operationId: opId,
          seqId: seq,
          clientTimestamp: Date.now()
        });
        setSaveStatus(prev => ({ ...prev, [questionId]: 'saved' }));
      } catch (err) {
        queueOfflineUpdate({
          questionId,
          roundNumber,
          code: codeText,
          language: lang,
          timestamp: Date.now(),
          operationId: opId,
          seqId: seq
        });
        setSaveStatus(prev => ({ ...prev, [questionId]: 'offline' }));
      }
    },
    1500
  );

  const handleCodeChange = (newCode: string | undefined) => {
    if (!currentQ || newCode === undefined) return;
    const qId = currentQ._id;
    const lang = selectedLanguages[qId] || (currentQ.allowedLanguages && currentQ.allowedLanguages[0]) || 'python';
    const bufferKey = `${qId}_${lang}`;
    setCodeBuffers(prev => ({ ...prev, [bufferKey]: newCode }));
    try {
      localStorage.setItem(`debugarena_code_draft_${roundNumber}_${bufferKey}`, newCode);
    } catch {}
    debouncedSaveCode(qId, newCode, lang);
  };

  const handleLanguageChange = (newLang: string) => {
    if (!currentQ) return;
    const qId = currentQ._id;
    setSelectedLanguages(prev => ({ ...prev, [qId]: newLang }));
    try {
      localStorage.setItem(`debugarena_lang_draft_${roundNumber}_${qId}`, newLang);
    } catch {}

    const bufferKey = `${qId}_${newLang}`;
    let langCode = codeBuffers[bufferKey];
    if (langCode === undefined) {
      langCode = (currentQ.starterCode && (currentQ.starterCode as any)[newLang]) || '// Write your solution here';
      setCodeBuffers(prev => ({ ...prev, [bufferKey]: langCode }));
    }
    debouncedSaveCode(qId, langCode, newLang);
  };

  const handleResetToStarter = () => {
    if (!currentQ) return;
    const qId = currentQ._id;
    const lang = selectedLanguages[qId] || (currentQ.allowedLanguages && currentQ.allowedLanguages[0]) || 'python';
    const starter = (currentQ.starterCode && (currentQ.starterCode as any)[lang]) || '';
    const bufferKey = `${qId}_${lang}`;
    setCodeBuffers(prev => ({ ...prev, [bufferKey]: starter }));
    try {
      localStorage.setItem(`debugarena_code_draft_${roundNumber}_${bufferKey}`, starter);
    } catch {}
    debouncedSaveCode(qId, starter, lang);
  };

  // Helper to ensure current live Monaco content is always read
  const getCurrentLiveCode = (qId: string, lang: string): string => {
    if (currentQ && currentQ._id === qId && (selectedLanguages[qId] || 'python') === lang && editorRef.current) {
      try {
        const liveVal = editorRef.current.getValue();
        if (typeof liveVal === 'string') return liveVal;
      } catch {}
    }
    return codeBuffers[`${qId}_${lang}`] || '';
  };

  // Run Code: against visible sample test cases OR arbitrary custom input
  const handleRunCode = async () => {
    if (!currentQ || isRunning || isSubmittingCode) return;
    const qId = currentQ._id;
    const lang = selectedLanguages[qId] || (currentQ.allowedLanguages && currentQ.allowedLanguages[0]) || 'python';
    const code = getCurrentLiveCode(qId, lang);

    setIsRunning(true);

    try {
      const payload: any = {
        questionId: qId,
        code,
        language: lang,
        roundNumber
      };

      if (activeTab === 'custom') {
        payload.customInput = customInputs[qId] ?? (currentQ.testCases?.find(tc => !tc.isHidden)?.input || '');
      }

      const res = await api.post('/participant/run-code', payload);
      if (res.data.success) {
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
          setMobileView('results');
        }
        if (res.data.isCustom) {
          setCustomOutputs(prev => ({ ...prev, [qId]: res.data.customResult }));
          setActiveTab('custom');
        } else {
          setRunResults(prev => ({ ...prev, [qId]: res.data.results }));
          setActiveTab('cases');
          if (Array.isArray(res.data.results)) {
            const firstFail = res.data.results.findIndex((r: any) => !r.passed);
            if (firstFail !== -1) {
              setSelectedCaseIdx(firstFail);
            }
          }
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to run code.');
    } finally {
      setIsRunning(false);
    }
  };

  // Submit Code: against all test cases (visible + hidden)
  const handleSubmitCode = async () => {
    if (!currentQ || isRunning || isSubmittingCode) return;
    const qId = currentQ._id;
    const lang = selectedLanguages[qId] || (currentQ.allowedLanguages && currentQ.allowedLanguages[0]) || 'python';
    const code = getCurrentLiveCode(qId, lang);

    setIsSubmittingCode(true);
    setActiveTab('results');
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobileView('results');
    }

    try {
      const res = await api.post('/participant/submit-code', {
        questionId: qId,
        code,
        language: lang,
        roundNumber,
        operationId: generateOperationId(),
        seqId: getNextSeqId(),
        clientTimestamp: Date.now()
      });
      if (res.data.success) {
        setRunResults(prev => ({ ...prev, [qId]: res.data.results }));
        setScores(prev => ({ ...prev, [qId]: res.data.score }));
        if (res.data.status) {
          setSubmissionFeedback(prev => ({
            ...prev,
            [qId]: {
              status: res.data.status,
              message: res.data.message || '',
              score: res.data.score,
              submissionScore: res.data.submissionScore,
              language: res.data.language || lang,
              passedCount: res.data.passedCount ?? res.data.results?.filter((r: any) => r.passed).length ?? 0,
              totalCount: res.data.totalCount ?? res.data.results?.length ?? 0,
              failedCount: res.data.failedCount ?? 0,
              hiddenTotalCount: res.data.hiddenTotalCount ?? 0,
              hiddenFailedCount: res.data.hiddenFailedCount ?? 0,
              hiddenPassedCount: res.data.hiddenPassedCount ?? 0,
              failedHiddenIndices: res.data.failedHiddenIndices ?? [],
              avgRuntimeMs: res.data.avgRuntimeMs ?? 0,
              maxRuntimeMs: res.data.maxRuntimeMs ?? 0,
              timeLimitMs: res.data.timeLimitMs ?? (currentQ.timeLimitMs || 3000),
              compileOutput: res.data.compileOutput ?? null,
              runtimeOutput: res.data.runtimeOutput ?? null
            }
          }));
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit code.');
    } finally {
      setIsSubmittingCode(false);
    }
  };

  if (!currentQ) {
    return (
      <div className="text-center py-20 text-slate-400">
        No coding questions available for this round.
      </div>
    );
  }

  const currentLang = selectedLanguages[currentQ._id] || (currentQ.allowedLanguages && currentQ.allowedLanguages[0]) || 'python';
  const currentCode = codeBuffers[`${currentQ._id}_${currentLang}`] ?? '';
  const currentResults = runResults[currentQ._id] || [];
  const currentScore = scores[currentQ._id] || 0;

  const currentSampleCases = (currentQ.testCases || []).filter(tc => !tc.isHidden);
  const safeCaseIdx = selectedCaseIdx < currentSampleCases.length ? selectedCaseIdx : 0;
  const visibleCases = currentResults.filter(r => !r.isHidden);
  const totalScoreAcrossQuestions = Object.values(scores).reduce((sum, s) => sum + s, 0);

  // Map language key to Monaco editor language
  const getMonacoLang = (lang: string) => {
    if (lang === 'c' || lang === 'cpp') return 'cpp';
    if (lang === 'js') return 'javascript';
    return lang;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Top Question Switcher & Round Score Bar */}
      <div className="h-12 border-b border-slate-800 bg-slate-950/80 px-3 sm:px-4 flex items-center justify-between shrink-0 gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none py-1 max-w-[65vw] sm:max-w-none">
          {questions.map((q, idx) => {
            const isCurrent = idx === currentQIndex;
            return (
              <button
                key={q._id}
                onClick={() => {
                  debouncedSaveCode.flush();
                  setSelectedCaseIdx(0);
                  setCurrentQIndex(idx);
                }}
                className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 sm:gap-2 whitespace-nowrap transition-all cursor-pointer border ${
                  isCurrent
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>P{idx + 1}</span>
                <span className="hidden sm:inline">Problem</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden sm:flex text-xs text-slate-400 font-mono items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Problem {currentQIndex + 1} of {questions.length}</span>
          </div>

          <button
            onClick={() => {
              debouncedSaveCode.flush();
              setShowSubmitModal(true);
            }}
            className="px-3 sm:px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer whitespace-nowrap"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Finish Round</span>
            <span className="sm:hidden">Finish</span>
          </button>
        </div>
      </div>

      {/* Mobile Segmented View Switcher (< lg only) */}
      <div className="lg:hidden flex items-center bg-slate-900/95 border-b border-slate-800 p-1 shrink-0 gap-1">
        <button
          type="button"
          onClick={() => setMobileView('problem')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center ${
            mobileView === 'problem'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Problem
        </button>
        <button
          type="button"
          onClick={() => setMobileView('code')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center ${
            mobileView === 'code'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Code
        </button>
        <button
          type="button"
          onClick={() => setMobileView('results')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
            mobileView === 'results'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>Results</span>
          {currentScore > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 font-mono font-normal">
              {currentScore}p
            </span>
          )}
        </button>
      </div>

      {/* Main Split-Pane Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Pane: Problem Statement */}
        <div
          ref={leftPanelRef}
          className={`lg:col-span-5 border-r border-slate-800/80 bg-slate-900/50 flex flex-col h-full min-h-0 overflow-y-auto overscroll-contain ${
            mobileView === 'problem' ? 'flex flex-1' : 'hidden lg:flex'
          }`}
        >
          <div className="p-4 sm:p-6 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Question {currentQIndex + 1} of {questions.length}
                </span>
                <span className="text-xs font-mono text-slate-500">
                  {currentQ.timeLimitMs}ms limit
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                {currentQ.title}
              </h1>
            </div>

            {/* Structured Problem Breakdown: Scenario, Input, Output, Error Code, Constraints */}
            <CodingProblemDetails
              question={currentQ}
              activeLanguage={currentLang}
              onLanguageChange={handleLanguageChange}
              onResetToErrorCode={handleResetToStarter}
              showSampleCases={false}
            />
          </div>
        </div>

        {/* Right Pane: Monaco Editor & Output Terminal */}
        <div className={`lg:col-span-7 flex flex-col overflow-hidden bg-[#1e1e1e] ${mobileView !== 'problem' ? 'flex flex-1' : 'hidden lg:flex'}`}>
          {/* Editor Header Toolbar */}
          <div className="h-11 sm:h-12 border-b border-slate-800 bg-slate-950 px-3 sm:px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <Code2 className="w-4 h-4 text-indigo-400 shrink-0" />
              {/* Language Switcher */}
              <select
                value={currentLang}
                onChange={e => handleLanguageChange(e.target.value)}
                className="bg-slate-900 text-white text-xs font-semibold rounded-lg px-2 sm:px-2.5 py-1 sm:py-1.5 border border-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {(currentQ.allowedLanguages || ['python', 'cpp', 'java', 'c', 'javascript']).map(
                  l => (
                    <option key={l} value={l}>
                      {l.toUpperCase()}
                    </option>
                  )
                )}
              </select>

              <button
                onClick={handleResetToStarter}
                title="Reset to buggy starter code"
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 text-xs flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>

            {/* Autosave & Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="text-[11px] font-mono text-slate-400">
                {saveStatus[currentQ._id] === 'saving' && (
                  <span className="text-amber-400 animate-pulse">Saving...</span>
                )}
                {saveStatus[currentQ._id] === 'saved' && (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Saved
                  </span>
                )}
              </div>

              {/* Run Code */}
              <button
                onClick={handleRunCode}
                disabled={isRunning || isSubmittingCode}
                className="hidden sm:flex px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isRunning ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-slate-300" />
                )}
                <span>Run Sample</span>
              </button>

              {/* Submit Code */}
              <button
                onClick={handleSubmitCode}
                disabled={isRunning || isSubmittingCode}
                className="hidden sm:flex px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmittingCode ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Submit Code</span>
              </button>
            </div>
          </div>

          {/* Monaco Editor Component */}
          <div className={`${mobileView === 'code' ? 'flex-1' : 'hidden lg:block lg:flex-1'} min-h-[300px]`}>
            <Editor
              height="100%"
              language={getMonacoLang(currentLang)}
              theme={isDark ? "vs-dark" : "light"}
              value={currentCode}
              onChange={handleCodeChange}
              onMount={(editor) => { editorRef.current = editor; }}
              options={{
                fontSize: 13,
                fontFamily: "'JetBrains Mono', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                automaticLayout: true,
                tabSize: 4
              }}
            />
          </div>

          {/* Bottom Execution & Results Terminal */}
          <div className={`${mobileView === 'results' ? 'flex-1' : 'hidden lg:flex'} lg:min-h-[14rem] lg:max-h-[50vh] lg:flex-1 border-t border-slate-800 bg-slate-950 flex flex-col shrink-0 overflow-hidden`}>
            {/* Terminal Header */}
            <div className="h-10 px-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60 shrink-0">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('cases')}
                  className={`text-xs font-bold pb-2 pt-2 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
                    activeTab === 'cases'
                      ? 'border-indigo-500 text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Test Cases</span>
                  {currentSampleCases.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
                      {currentSampleCases.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('custom')}
                  className={`text-xs font-bold pb-2 pt-2 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
                    activeTab === 'custom'
                      ? 'border-indigo-500 text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Custom Input</span>
                </button>

                {(currentResults.length > 0 || submissionFeedback[currentQ._id]) && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('results')}
                    className={`text-xs font-bold pb-2 pt-2 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
                      activeTab === 'results'
                        ? 'border-indigo-500 text-white'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {submissionFeedback[currentQ._id] ? (
                      <>
                        <span className={`w-2 h-2 rounded-full ${
                          submissionFeedback[currentQ._id].status === 'Accepted'
                            ? 'bg-emerald-400 animate-pulse'
                            : submissionFeedback[currentQ._id].status === 'Wrong Answer'
                            ? 'bg-amber-400'
                            : 'bg-rose-400'
                        }`} />
                        <span>Submission ({submissionFeedback[currentQ._id].status})</span>
                      </>
                    ) : (
                      <span>Summary ({visibleCases.filter(c => c.passed).length}/{visibleCases.length})</span>
                    )}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {currentResults.length > 0 && (
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-slate-400">Score:</span>
                    <span className="font-bold text-emerald-400">{currentScore} pts</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleRunCode}
                  disabled={isRunning || isSubmittingCode}
                  className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
                  title="Run current editor code against sample cases"
                >
                  {isRunning ? (
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Play className="w-3 h-3 fill-slate-300" />
                  )}
                  <span>Run Sample</span>
                </button>
              </div>
            </div>

            {/* Terminal Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 font-mono text-xs select-text">
              {isRunning && (
                <div className="flex items-center justify-center gap-2 text-indigo-400 py-8">
                  <span className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                  <span>Executing current editor code against sample test cases...</span>
                </div>
              )}

              {isSubmittingCode && (
                <div className="flex items-center justify-center gap-2 text-cyan-400 py-8">
                  <span className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                  <span>Evaluating code submission against test suite...</span>
                </div>
              )}

              {/* 1. TEST CASES TAB (INPUT / EXPECTED / ACTUAL PER SAMPLE CASE) */}
              {!isRunning && !isSubmittingCode && activeTab === 'cases' && (
                <div className="space-y-3">
                  {/* Case Pills */}
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80 overflow-x-auto">
                    {currentSampleCases.map((tc, idx) => {
                      const caseResult = visibleCases[idx];
                      const isSelected = idx === safeCaseIdx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedCaseIdx(idx)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          {caseResult ? (
                            caseResult.passed ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-rose-400" />
                            )
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                          )}
                          <span>Case {idx + 1}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Case Details */}
                  {currentSampleCases.length > 0 ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                            Input (stdin):
                          </span>
                          <pre className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg text-slate-200 text-xs overflow-x-auto whitespace-pre">
                            {currentSampleCases[safeCaseIdx]?.input || '(no input)'}
                          </pre>
                        </div>

                        <div className="space-y-1">
                          <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                            Expected Output:
                          </span>
                          <pre className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg text-emerald-400 text-xs font-bold overflow-x-auto whitespace-pre">
                            {currentSampleCases[safeCaseIdx]?.expectedOutput || '(empty output)'}
                          </pre>
                        </div>
                      </div>

                      {/* Actual Output if executed */}
                      {visibleCases[safeCaseIdx] ? (
                        <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-300 text-[11px] font-bold flex items-center gap-1.5">
                              {visibleCases[safeCaseIdx].passed ? (
                                <span className="text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Passed
                                </span>
                              ) : (
                                <span className="text-rose-400 flex items-center gap-1">
                                  <XCircle className="w-3.5 h-3.5" /> {visibleCases[safeCaseIdx].status?.toUpperCase() || 'FAILED'}
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Wall time: {visibleCases[safeCaseIdx].runtimeMs}ms
                            </span>
                          </div>

                          {visibleCases[safeCaseIdx].compileError && (
                            <div className="space-y-1 pt-1">
                              <div className="text-[11px] font-bold text-rose-400 flex items-center gap-1.5 uppercase font-mono">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                                <span>Compilation Error ({currentLang})</span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">Compiler diagnostics (stderr):</div>
                              <pre className="text-rose-300 bg-black/60 border border-rose-900/60 p-3 rounded-lg text-xs font-mono whitespace-pre-wrap break-words overflow-x-auto select-text shadow-inner">
                                {visibleCases[safeCaseIdx].compileError}
                              </pre>
                            </div>
                          )}

                          {visibleCases[safeCaseIdx].runtimeError && (
                            <div className="space-y-1 pt-1">
                              <div className="text-[11px] font-bold text-rose-400 flex items-center gap-1.5 uppercase font-mono">
                                <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                                <span>Runtime Error ({currentLang})</span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">Runtime error trace (stderr):</div>
                              <pre className="text-rose-300 bg-black/60 border border-rose-900/60 p-3 rounded-lg text-xs font-mono whitespace-pre-wrap break-words overflow-x-auto select-text shadow-inner">
                                {visibleCases[safeCaseIdx].runtimeError}
                              </pre>
                            </div>
                          )}

                          {!visibleCases[safeCaseIdx].compileError && !visibleCases[safeCaseIdx].runtimeError && (
                            <div className="space-y-1">
                              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                                Actual Output:
                              </span>
                              <pre className={`p-2.5 rounded-lg text-xs overflow-x-auto whitespace-pre border select-text ${
                                visibleCases[safeCaseIdx].passed
                                  ? 'bg-emerald-950/20 text-emerald-300 border-emerald-800/40'
                                  : 'bg-rose-950/20 text-rose-300 border-rose-800/40'
                              }`}>
                                {visibleCases[safeCaseIdx].actual || '(no stdout output)'}
                              </pre>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="py-2 text-center text-slate-500 text-xs">
                          Click <strong className="text-slate-400">Run</strong> to execute your current editor code against this sample case.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-slate-500 py-6 text-center">
                      No sample test cases defined for this problem.
                    </div>
                  )}
                </div>
              )}

              {/* 2. RESULTS / SUBMISSION SUMMARY VIEW (OA Grade Assessment) */}
              {!isRunning && !isSubmittingCode && activeTab === 'results' && (
                <div className="space-y-4">
                  {/* Submission Overall Status Banner */}
                  {submissionFeedback[currentQ._id] ? (
                    (() => {
                      const fb = submissionFeedback[currentQ._id];
                      const isAccepted = fb.status === 'Accepted';
                      const isCompileError = fb.status === 'Compilation Error';
                      const isRuntimeError = fb.status === 'Runtime Error';
                      const isTimeLimit = fb.status === 'Time Limit Exceeded';
                      const isMemoryLimit = fb.status === 'Memory Limit Exceeded';

                      return (
                        <div className="space-y-4">
                          {/* OA Header Card */}
                          <div className={`p-4 sm:p-5 rounded-2xl border ${
                            isAccepted
                              ? 'bg-emerald-950/40 border-emerald-500/50 shadow-lg shadow-emerald-950/30'
                              : isCompileError || isRuntimeError
                              ? 'bg-rose-950/40 border-rose-500/50 shadow-lg shadow-rose-950/30'
                              : isTimeLimit || isMemoryLimit
                              ? 'bg-amber-950/40 border-amber-500/50 shadow-lg shadow-amber-950/30'
                              : 'bg-slate-900/90 border-slate-700/80 shadow-lg'
                          }`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                  isAccepted
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : isCompileError || isRuntimeError
                                    ? 'bg-rose-500/20 text-rose-400'
                                    : 'bg-amber-500/20 text-amber-400'
                                }`}>
                                  {isAccepted ? (
                                    <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                                  ) : isCompileError ? (
                                    <Code2 className="w-6 h-6 stroke-[2.5]" />
                                  ) : isTimeLimit ? (
                                    <Clock className="w-6 h-6 stroke-[2.5]" />
                                  ) : isRuntimeError ? (
                                    <AlertOctagon className="w-6 h-6 stroke-[2.5]" />
                                  ) : (
                                    <XCircle className="w-6 h-6 stroke-[2.5]" />
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className={`text-base sm:text-lg font-black tracking-tight uppercase ${
                                      isAccepted
                                        ? 'text-emerald-400'
                                        : isCompileError || isRuntimeError
                                        ? 'text-rose-400'
                                        : isTimeLimit || isMemoryLimit
                                        ? 'text-amber-400'
                                        : 'text-rose-400'
                                    }`}>
                                      {fb.status}
                                    </h3>
                                    {isAccepted && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                        All Tests Passed
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-300 font-sans mt-0.5">
                                    {fb.message}
                                  </p>
                                </div>
                              </div>

                              {/* Badges / Language Pill */}
                              <div className="flex items-center gap-2 font-mono text-xs">
                                <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300">
                                  Language: <strong className="text-white uppercase">{fb.language || currentLang}</strong>
                                </span>
                                {fb.score !== undefined && (
                                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
                                    Score: {fb.score} pts
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Execution Metrics Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 font-mono text-xs">
                              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Tests Passed</div>
                                <div className="text-sm font-bold text-white mt-0.5">
                                  <span className={isAccepted ? 'text-emerald-400' : 'text-slate-200'}>
                                    {fb.passedCount ?? visibleCases.filter(c => c.passed).length}
                                  </span>
                                  <span className="text-slate-500"> / {fb.totalCount ?? visibleCases.length}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  {isAccepted ? '100% Passed' : `${fb.failedCount ?? 0} Failed`}
                                </div>
                              </div>

                              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Execution Time</div>
                                <div className="text-sm font-bold text-slate-200 mt-0.5">
                                  {fb.avgRuntimeMs !== undefined ? `${fb.avgRuntimeMs} ms` : '—'}
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  Avg per test case
                                </div>
                              </div>

                              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Time Limit</div>
                                <div className="text-sm font-bold text-slate-200 mt-0.5">
                                  {fb.timeLimitMs ? `${(fb.timeLimitMs / 1000).toFixed(1)}s` : '3.0s'}
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  Configured ceiling
                                </div>
                              </div>

                              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Memory</div>
                                <div className="text-sm font-bold text-slate-200 mt-0.5">
                                  256 MB
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  Execution limit
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Dedicated Compiler Error Diagnostics */}
                          {isCompileError && (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                  <Terminal className="w-3.5 h-3.5 text-rose-400" />
                                  Compiler Output &amp; Diagnostics (stderr)
                                </span>
                                <span className="text-slate-500 text-[10px] font-mono">
                                  Language: {fb.language || currentLang}
                                </span>
                              </div>
                              <pre className="bg-slate-950 border border-rose-900/60 p-3.5 rounded-xl font-mono text-xs text-rose-300 whitespace-pre-wrap break-words overflow-x-auto select-text shadow-inner max-h-60 overflow-y-auto">
                                {fb.compileOutput || visibleCases[0]?.compileError || 'Compilation failed with non-zero exit code'}
                              </pre>
                            </div>
                          )}

                          {/* Dedicated Runtime Error Diagnostics */}
                          {isRuntimeError && (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                  <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                                  Runtime Error Output &amp; Stack Trace (stderr)
                                </span>
                                <span className="text-slate-500 text-[10px] font-mono">
                                  Language: {fb.language || currentLang}
                                </span>
                              </div>
                              <pre className="bg-slate-950 border border-rose-900/60 p-3.5 rounded-xl font-mono text-xs text-rose-300 whitespace-pre-wrap break-words overflow-x-auto select-text shadow-inner max-h-60 overflow-y-auto">
                                {fb.runtimeOutput || visibleCases.find(c => c.runtimeError)?.runtimeError || 'Runtime exception caught'}
                              </pre>
                            </div>
                          )}

                          {/* Safe Hidden Test Failure Summary (Never expose confidential test data) */}
                          {(fb.hiddenFailedCount ?? 0) > 0 && (
                            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-amber-800/40 text-xs">
                              <div className="font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Private Test Cases Evaluation</span>
                              </div>
                              <p className="text-slate-400 leading-relaxed mb-2.5">
                                Your submission failed <strong className="text-amber-300">{fb.hiddenFailedCount}</strong> private test case{fb.hiddenFailedCount === 1 ? '' : 's'}. Hidden test inputs and expected outputs are confidential to preserve assessment integrity.
                              </p>
                              {fb.failedHiddenIndices && fb.failedHiddenIndices.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {fb.failedHiddenIndices.map(idx => (
                                    <span
                                      key={idx}
                                      className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-mono"
                                    >
                                      Hidden Test #{idx} Failed
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    /* Sample Run Summary (when Run Sample was clicked without full Submit) */
                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs flex items-center justify-between font-mono">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">Sample Execution Summary</span>
                        <span className="text-slate-400">
                          — {visibleCases.filter(c => c.passed).length} of {visibleCases.length} sample cases passed
                        </span>
                      </div>
                      <span className="text-slate-500 text-[10px]">
                        Click "Submit" to evaluate all test cases
                      </span>
                    </div>
                  )}

                  {/* Sample Test Cases Breakdown List (Visible Cases) */}
                  {visibleCases.length > 0 && (
                    <div className="space-y-2.5 pt-2">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <span>Sample Test Cases Details</span>
                        <span className="text-[10px] text-slate-500 font-mono font-normal">
                          ({visibleCases.filter(c => c.passed).length}/{visibleCases.length} passed)
                        </span>
                      </div>

                      {visibleCases.map(r => (
                        <div
                          key={r.testNumber}
                          className={`p-3 rounded-xl border ${
                            r.passed
                              ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                              : 'bg-rose-950/20 border-rose-800/40 text-rose-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2 font-bold">
                              {r.passed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-400" />
                              )}
                              <span>Sample Case #{r.testNumber}</span>
                              <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                                r.passed
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                              }`}>
                                {r.status}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">{r.runtimeMs}ms</span>
                          </div>

                          {r.compileError && (
                            <div className="mt-2 text-rose-300 bg-black/60 border border-rose-900/50 p-2.5 rounded-lg text-xs font-mono whitespace-pre-wrap break-words select-text">
                              {r.compileError}
                            </div>
                          )}
                          {r.runtimeError && (
                            <div className="mt-2 text-rose-300 bg-black/60 border border-rose-900/50 p-2.5 rounded-lg text-xs font-mono whitespace-pre-wrap break-words select-text">
                              {r.runtimeError}
                            </div>
                          )}

                          {!r.compileError && !r.runtimeError && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 text-[11px] font-mono">
                              <div>
                                <span className="text-slate-400 block mb-1">Expected Output:</span>
                                <pre className="bg-black/50 border border-slate-800/80 p-2 rounded-lg text-emerald-400 whitespace-pre overflow-x-auto select-text">
                                  {r.expected}
                                </pre>
                              </div>
                              <div>
                                <span className="text-slate-400 block mb-1">Actual Output:</span>
                                <pre className={`border p-2 rounded-lg whitespace-pre overflow-x-auto select-text ${
                                  r.passed
                                    ? 'bg-emerald-950/30 border-emerald-900/40 text-emerald-300'
                                    : 'bg-rose-950/30 border-rose-900/40 text-rose-300'
                                }`}>
                                  {r.actual || '(no stdout output)'}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {visibleCases.length === 0 && !submissionFeedback[currentQ._id] && (
                    <div className="text-slate-500 py-6 text-center font-sans text-xs">
                      Click <strong className="text-slate-400">Run</strong> or <strong className="text-slate-400">Submit Code</strong> to evaluate your solution.
                    </div>
                  )}
                </div>
              )}

            {/* Terminal Content - LeetCode-style Arbitrary Custom Testcase Panel */}
            {activeTab === 'custom' && (
              <div className="flex-1 p-3 grid grid-cols-1 md:grid-cols-2 gap-3 overflow-hidden">
                {/* Left: Input Textarea */}
                <div className="flex flex-col h-full bg-slate-900/60 rounded-xl border border-slate-800 p-2.5 overflow-hidden">
                  <div className="flex items-center justify-between mb-1.5 shrink-0">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                      Standard Input (stdin)
                    </span>
                    <span className="text-[10px] text-slate-500">Arbitrary stdin payload</span>
                  </div>
                  <textarea
                    value={customInputs[currentQ._id] ?? (currentQ.testCases?.[0]?.input || '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomInputs(prev => ({ ...prev, [currentQ._id]: val }));
                    }}
                    placeholder="Enter custom stdin here..."
                    className="flex-1 w-full bg-slate-950 text-slate-200 border border-slate-800/80 rounded-lg p-2 font-mono text-xs focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                {/* Right: Output Panel */}
                <div className="flex flex-col h-full bg-slate-900/60 rounded-xl border border-slate-800 p-2.5 overflow-hidden">
                  <div className="flex items-center justify-between mb-1.5 shrink-0">
                    <span className="text-[11px] font-bold text-slate-300">Execution Output (stdout)</span>
                    {customOutputs[currentQ._id] && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        Wall clock: {customOutputs[currentQ._id]?.runtimeMs}ms
                      </span>
                    )}
                  </div>

                  <div className="flex-1 bg-slate-950 border border-slate-800/80 rounded-lg p-2 font-mono text-xs overflow-y-auto">
                    {isRunning ? (
                      <div className="flex items-center gap-2 text-indigo-400 py-6 justify-center">
                        <span className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                        <span>Running code with custom stdin...</span>
                      </div>
                    ) : customOutputs[currentQ._id] ? (
                      <div className="space-y-2">
                        {customOutputs[currentQ._id]?.compileError && (
                          <div>
                            <div className="text-[10px] uppercase font-bold text-rose-400 mb-1">Compilation Error:</div>
                            <pre className="text-rose-400 bg-rose-950/30 border border-rose-900/40 p-2 rounded whitespace-pre-wrap">
                              {customOutputs[currentQ._id]?.compileError}
                            </pre>
                          </div>
                        )}
                        {customOutputs[currentQ._id]?.runtimeError && (
                          <div>
                            <div className="text-[10px] uppercase font-bold text-rose-400 mb-1">Runtime Error:</div>
                            <pre className="text-rose-400 bg-rose-950/30 border border-rose-900/40 p-2 rounded whitespace-pre-wrap">
                              {customOutputs[currentQ._id]?.runtimeError}
                            </pre>
                          </div>
                        )}
                        {!customOutputs[currentQ._id]?.compileError && !customOutputs[currentQ._id]?.runtimeError && (
                          <div>
                            <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Program Output:</div>
                            <pre className="text-emerald-400 whitespace-pre font-mono">
                              {customOutputs[currentQ._id]?.actualOutput || (
                                <span className="text-slate-500 italic">(Process completed with zero stdout output)</span>
                              )}
                            </pre>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-slate-500 py-6 text-center">
                        Provide custom input on the left and click <strong>Run</strong> to test your code.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Quick Navigation & Action Dock */}
      <div className="lg:hidden border-t border-slate-800 bg-slate-950 px-3 py-2 flex items-center justify-between gap-2 shrink-0 z-20">
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (currentQIndex > 0) {
                debouncedSaveCode.flush();
                setCurrentQIndex(currentQIndex - 1);
              }
            }}
            disabled={currentQIndex === 0}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-800 active:scale-95 transition-all"
            title="Previous Question"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-mono text-slate-400 px-1">
            {currentQIndex + 1}/{questions.length}
          </span>
          <button
            onClick={() => {
              if (currentQIndex < questions.length - 1) {
                debouncedSaveCode.flush();
                setCurrentQIndex(currentQIndex + 1);
              }
            }}
            disabled={currentQIndex === questions.length - 1}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-800 active:scale-95 transition-all"
            title="Next Question"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              handleRunCode();
              setMobileView('results');
            }}
            disabled={isRunning || isSubmittingCode}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            {isRunning ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-slate-300" />
            )}
            <span>Run</span>
          </button>
          <button
            onClick={() => {
              handleSubmitCode();
              setMobileView('results');
            }}
            disabled={isRunning || isSubmittingCode}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmittingCode ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Submit</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal to finish round */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Finish Round {roundNumber}?</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              All your code solutions will be finalized and locked on the server. Are you ready to submit this round?
            </p>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono mb-6 space-y-1.5">
              {questions.map((q, i) => (
                <div key={q._id} className="flex justify-between text-slate-300">
                  <span>Problem {i + 1}:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Ready for Evaluation
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmittingRound}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Keep Coding
              </button>
              <button
                onClick={() => {
                  debouncedSaveCode.flush();
                  setShowSubmitModal(false);
                  onSubmitRound();
                }}
                disabled={isSubmittingRound}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {isSubmittingRound ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Yes, Submit Round</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
