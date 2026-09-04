import React, { useState, useEffect } from 'react';
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
  RotateCcw,
  Check,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { Question, Attempt, TestCaseResult } from '../../types/index.js';
import { api, queueOfflineUpdate } from '../../services/api.js';
import { useDebouncedCallback } from '../../hooks/useDebounce.js';

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
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const currentQ = questions[currentQIndex];

  // Map of questionId -> language
  const [selectedLanguages, setSelectedLanguages] = useState<Record<string, string>>({});
  // Map of questionId -> code
  const [codeBuffers, setCodeBuffers] = useState<Record<string, string>>({});
  // Map of questionId -> best score
  const [scores, setScores] = useState<Record<string, number>>({});

  // Execution states
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSubmittingCode, setIsSubmittingCode] = useState<boolean>(false);
  const [runResults, setRunResults] = useState<Record<string, TestCaseResult[]>>({});
  const [activeTab, setActiveTab] = useState<'tests' | 'output'>('tests');
  const [saveStatus, setSaveStatus] = useState<Record<string, 'saved' | 'saving' | 'offline'>>({});
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);

  // Initialize from attempts or default starter code
  useEffect(() => {
    const langs: Record<string, string> = {};
    const codes: Record<string, string> = {};
    const bestScores: Record<string, number> = {};
    const existingResults: Record<string, TestCaseResult[]> = {};

    questions.forEach(q => {
      const existingAttempt = initialAttempts.find(a => a.questionId === q._id);
      const defaultLang = (q.allowedLanguages && q.allowedLanguages[0]) || 'python';

      if (existingAttempt && existingAttempt.code) {
        langs[q._id] = existingAttempt.language || defaultLang;
        codes[q._id] = existingAttempt.code;
        bestScores[q._id] = existingAttempt.score || 0;
        if (existingAttempt.testCaseResults) {
          existingResults[q._id] = existingAttempt.testCaseResults;
        }
      } else {
        langs[q._id] = defaultLang;
        const starter = (q.starterCode && (q.starterCode as any)[defaultLang]) || '// Write your solution here';
        codes[q._id] = starter;
        bestScores[q._id] = 0;
      }
    });

    setSelectedLanguages(langs);
    setCodeBuffers(codes);
    setScores(bestScores);
    setRunResults(existingResults);
  }, [questions, initialAttempts]);

  // Debounced save
  const debouncedSaveCode = useDebouncedCallback(
    async (questionId: string, codeText: string, lang: string) => {
      setSaveStatus(prev => ({ ...prev, [questionId]: 'saving' }));
      try {
        await api.post('/participant/save-answer', {
          questionId,
          roundNumber,
          code: codeText,
          language: lang
        });
        setSaveStatus(prev => ({ ...prev, [questionId]: 'saved' }));
      } catch (err) {
        queueOfflineUpdate({
          questionId,
          roundNumber,
          code: codeText,
          language: lang,
          timestamp: Date.now()
        });
        setSaveStatus(prev => ({ ...prev, [questionId]: 'offline' }));
      }
    },
    1500
  );

  const handleCodeChange = (newCode: string | undefined) => {
    if (!currentQ || newCode === undefined) return;
    const qId = currentQ._id;
    setCodeBuffers(prev => ({ ...prev, [qId]: newCode }));
    debouncedSaveCode(qId, newCode, selectedLanguages[qId] || 'python');
  };

  const handleLanguageChange = (newLang: string) => {
    if (!currentQ) return;
    const qId = currentQ._id;
    setSelectedLanguages(prev => ({ ...prev, [qId]: newLang }));

    // If current code equals starter code of previous language or is empty, switch to new language starter code
    const currentCode = codeBuffers[qId];
    const prevLang = selectedLanguages[qId] || 'python';
    const prevStarter = (currentQ.starterCode && (currentQ.starterCode as any)[prevLang]) || '';
    const newStarter = (currentQ.starterCode && (currentQ.starterCode as any)[newLang]) || '';

    if (!currentCode || currentCode === prevStarter) {
      setCodeBuffers(prev => ({ ...prev, [qId]: newStarter }));
      debouncedSaveCode(qId, newStarter, newLang);
    } else {
      debouncedSaveCode(qId, currentCode, newLang);
    }
  };

  const handleResetToStarter = () => {
    if (!currentQ) return;
    const qId = currentQ._id;
    const lang = selectedLanguages[qId] || 'python';
    const starter = (currentQ.starterCode && (currentQ.starterCode as any)[lang]) || '';
    setCodeBuffers(prev => ({ ...prev, [qId]: starter }));
    debouncedSaveCode(qId, starter, lang);
  };

  // Run Code: against visible sample test cases only
  const handleRunCode = async () => {
    if (!currentQ || isRunning || isSubmittingCode) return;
    const qId = currentQ._id;
    const code = codeBuffers[qId] || '';
    const lang = selectedLanguages[qId] || 'python';

    setIsRunning(true);
    setActiveTab('tests');

    try {
      const res = await api.post('/participant/run-code', {
        questionId: qId,
        code,
        language: lang
      });
      if (res.data.success) {
        setRunResults(prev => ({ ...prev, [qId]: res.data.results }));
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
    const code = codeBuffers[qId] || '';
    const lang = selectedLanguages[qId] || 'python';

    setIsSubmittingCode(true);
    setActiveTab('tests');

    try {
      const res = await api.post('/participant/submit-code', {
        questionId: qId,
        code,
        language: lang,
        roundNumber
      });
      if (res.data.success) {
        setRunResults(prev => ({ ...prev, [qId]: res.data.results }));
        setScores(prev => ({ ...prev, [qId]: res.data.score }));
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

  const currentLang = selectedLanguages[currentQ._id] || 'python';
  const currentCode = codeBuffers[currentQ._id] || '';
  const currentResults = runResults[currentQ._id] || [];
  const currentScore = scores[currentQ._id] || 0;

  const visibleCases = currentResults.filter(r => !r.isHidden);
  const hiddenCases = currentResults.filter(r => r.isHidden);
  const hiddenPassed = hiddenCases.filter(r => r.passed).length;
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
      <div className="h-12 border-b border-slate-800 bg-slate-950/80 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          {questions.map((q, idx) => {
            const isCurrent = idx === currentQIndex;
            const qScore = scores[q._id] || 0;
            return (
              <button
                key={q._id}
                onClick={() => setCurrentQIndex(idx)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                  isCurrent
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>Problem {idx + 1}</span>
                {qScore > 0 && (
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
                    {qScore}/{q.marks} pts
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-300 font-mono">
            Round Score:{' '}
            <span className="font-bold text-emerald-400 text-sm">
              {totalScoreAcrossQuestions} pts
            </span>
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Finish Round</span>
          </button>
        </div>
      </div>

      {/* Main Split-Pane Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Pane: Problem Statement & Test Cases */}
        <div className="lg:col-span-5 border-r border-slate-800/80 bg-slate-900/50 flex flex-col overflow-y-auto">
          <div className="p-6 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Question {currentQIndex + 1} of {questions.length}
                </span>
                <span className="text-xs font-mono text-slate-400 font-bold">
                  Weight: {currentQ.marks} Marks
                </span>
              </div>
              <h1 className="text-xl font-extrabold text-white tracking-tight">
                {currentQ.title}
              </h1>
            </div>

            {/* Markdown / Prompt Body */}
            <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans space-y-3">
              {currentQ.prompt}
            </div>

            {/* Sample Test Cases (Visible) */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                Sample Test Cases
              </h3>
              <div className="space-y-3">
                {(currentQ.testCases || [])
                  .filter(tc => !tc.isHidden)
                  .map((tc, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono space-y-2"
                    >
                      <div className="text-slate-400 font-semibold flex justify-between">
                        <span>Sample Case #{idx + 1}</span>
                        <span className="text-slate-500 font-normal">Weight: {tc.weight} pts</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Input:</span>
                        <pre className="bg-slate-900 p-2 rounded text-slate-200 overflow-x-auto whitespace-pre">
                          {tc.input || '(no input)'}
                        </pre>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Expected Output:</span>
                        <pre className="bg-slate-900 p-2 rounded text-emerald-400 overflow-x-auto whitespace-pre">
                          {tc.expectedOutput}
                        </pre>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Pane: Monaco Editor & Output Terminal */}
        <div className="lg:col-span-7 flex flex-col overflow-hidden bg-[#1e1e1e]">
          {/* Editor Header Toolbar */}
          <div className="h-12 border-b border-slate-800 bg-slate-950 px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <Code2 className="w-4 h-4 text-indigo-400" />
              {/* Language Switcher */}
              <select
                value={currentLang}
                onChange={e => handleLanguageChange(e.target.value)}
                className="bg-slate-900 text-white text-xs font-semibold rounded-lg px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
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
            <div className="flex items-center gap-3">
              <div className="text-[11px] font-mono text-slate-400">
                {saveStatus[currentQ._id] === 'saving' && (
                  <span className="text-amber-400 animate-pulse">Saving code...</span>
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
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isRunning ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-slate-300" />
                )}
                <span>Run</span>
              </button>

              {/* Submit Code */}
              <button
                onClick={handleSubmitCode}
                disabled={isRunning || isSubmittingCode}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
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
          <div className="flex-1 min-h-[300px]">
            <Editor
              height="100%"
              language={getMonacoLang(currentLang)}
              theme="vs-dark"
              value={currentCode}
              onChange={handleCodeChange}
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
          <div className="h-56 border-t border-slate-800 bg-slate-950 flex flex-col shrink-0">
            {/* Terminal Header */}
            <div className="h-9 px-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('tests')}
                  className={`text-xs font-bold pb-1 pt-1.5 border-b-2 cursor-pointer transition-colors ${
                    activeTab === 'tests'
                      ? 'border-indigo-500 text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Test Results
                </button>
              </div>

              {currentResults.length > 0 && (
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-slate-400">Score:</span>
                  <span className="font-bold text-emerald-400">{currentScore} pts</span>
                  {hiddenCases.length > 0 && (
                    <span className="text-slate-500 text-[11px]">
                      ({hiddenPassed}/{hiddenCases.length} hidden tests passed)
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Terminal Content */}
            <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-3">
              {isRunning && (
                <div className="flex items-center gap-2 text-indigo-400">
                  <span className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                  <span>Executing code against sample test cases...</span>
                </div>
              )}

              {isSubmittingCode && (
                <div className="flex items-center gap-2 text-cyan-400">
                  <span className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                  <span>Evaluating code against all visible and hidden test cases...</span>
                </div>
              )}

              {!isRunning && !isSubmittingCode && currentResults.length === 0 && (
                <div className="text-slate-500 py-6 text-center">
                  Click <strong>Run</strong> to execute sample tests or <strong>Submit Code</strong> to evaluate against all test cases.
                </div>
              )}

              {/* Display Test Case Results */}
              {!isRunning &&
                !isSubmittingCode &&
                currentResults.length > 0 && (
                  <div className="space-y-3">
                    {/* Visible Results */}
                    {visibleCases.map(r => (
                      <div
                        key={r.testNumber}
                        className={`p-3 rounded-xl border ${
                          r.passed
                            ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                            : 'bg-rose-950/20 border-rose-800/40 text-rose-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 font-bold">
                            {r.passed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-400" />
                            )}
                            <span>Sample Case #{r.testNumber}</span>
                            <span className="text-[11px] font-normal uppercase px-1.5 rounded bg-slate-800">
                              {r.status}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">{r.runtimeMs}ms</span>
                        </div>

                        {r.compileError && (
                          <div className="mt-2 text-rose-400 bg-black/40 p-2 rounded whitespace-pre-wrap">
                            {r.compileError}
                          </div>
                        )}
                        {r.runtimeError && (
                          <div className="mt-2 text-rose-400 bg-black/40 p-2 rounded whitespace-pre-wrap">
                            {r.runtimeError}
                          </div>
                        )}

                        {!r.passed && !r.compileError && !r.runtimeError && (
                          <div className="grid grid-cols-2 gap-2 mt-2 text-[11px]">
                            <div>
                              <span className="text-slate-400 block">Expected:</span>
                              <pre className="bg-black/30 p-1 rounded text-emerald-400 whitespace-pre">
                                {r.expected}
                              </pre>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Actual:</span>
                              <pre className="bg-black/30 p-1 rounded text-rose-400 whitespace-pre">
                                {r.actual}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Hidden Results Summary Badge */}
                    {hiddenCases.length > 0 && (
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-white">
                          <span>Hidden Test Cases:</span>
                          <span
                            className={
                              hiddenPassed === hiddenCases.length
                                ? 'text-emerald-400'
                                : 'text-amber-400'
                            }
                          >
                            {hiddenPassed} of {hiddenCases.length} passed
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          (Inputs & outputs hidden for test security)
                        </span>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal to finish round */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Finish Round {roundNumber}?</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Your highest-scoring submissions will be locked and ranked. Are you ready to finish this round?
            </p>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono mb-6 space-y-1">
              {questions.map((q, i) => (
                <div key={q._id} className="flex justify-between text-slate-300">
                  <span>Problem {i + 1}:</span>
                  <span className="font-bold text-emerald-400">{scores[q._id] || 0} pts</span>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-white">
                <span>Total Round Score:</span>
                <span className="text-emerald-400">{totalScoreAcrossQuestions} pts</span>
              </div>
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
