import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import {
  X,
  Play,
  Terminal,
  Shield,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Code2,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Zap,
  Info
} from 'lucide-react';
import { api } from '../../services/api.js';

interface AdminTestSandboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
}

export const AdminTestSandboxModal: React.FC<AdminTestSandboxModalProps> = ({
  isOpen,
  onClose,
  eventId
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventData, setEventData] = useState<any>(null);
  const [selectedRoundIndex, setSelectedRoundIndex] = useState(0);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);

  // Coding Sandbox State
  const [currentCode, setCurrentCode] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [activeTab, setActiveTab] = useState<'tests' | 'stdin'>('tests');
  const [customStdin, setCustomStdin] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [runResults, setRunResults] = useState<any>(null);

  useEffect(() => {
    if (!isOpen || !eventId) return;

    const loadSandboxData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/admin/events/${eventId}/sandbox-preview`);
        setEventData(res.data);
        setSelectedRoundIndex(0);
        setSelectedQuestionIndex(0);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load event sandbox preview');
      } finally {
        setLoading(false);
      }
    };

    loadSandboxData();
  }, [isOpen, eventId]);

  const activeRound = eventData?.rounds?.[selectedRoundIndex];
  const roundQuestions = (eventData?.questions || []).filter(
    (q: any) => q.roundNumber === (activeRound?.roundNumber || selectedRoundIndex + 1)
  );
  const currentQuestion = roundQuestions[selectedQuestionIndex];

  // Sync starter code when question or language changes
  useEffect(() => {
    if (currentQuestion && currentQuestion.type === 'coding') {
      const lang = (currentQuestion.allowedLanguages && currentQuestion.allowedLanguages[0]) || 'python';
      setSelectedLanguage(lang);
      const starter = (currentQuestion.starterCode && (currentQuestion.starterCode as any)[lang]) || '// Write your solution here';
      setCurrentCode(starter);
      setRunResults(null);
    }
  }, [currentQuestion]);

  if (!isOpen) return null;

  const handleLanguageChange = (newLang: string) => {
    setSelectedLanguage(newLang);
    if (currentQuestion?.starterCode && currentQuestion.starterCode[newLang]) {
      setCurrentCode(currentQuestion.starterCode[newLang]);
    }
  };

  const handleRunExecution = async () => {
    if (!currentQuestion) return;
    try {
      setIsExecuting(true);
      const payload: any = {
        questionId: currentQuestion._id,
        code: currentCode,
        language: selectedLanguage
      };

      if (activeTab === 'stdin') {
        payload.customStdin = customStdin;
      }

      const res = await api.post('/admin/events/sandbox-run', payload);
      setRunResults(res.data);
    } catch (err: any) {
      setRunResults({
        error: err.response?.data?.error || 'Execution failed'
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl h-[90vh] bg-[#0c101b] border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Top Sandbox Bar */}
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 font-black">
              <Code2 className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Candidate Sandbox Preview
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  DRY-RUN BENCH
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {eventData?.event?.name} ({eventData?.event?.code}) • Zero database score pollution
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 text-[11px] font-mono text-slate-400">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Fullscreen &amp; Timers Bypassed</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center font-mono text-xs text-slate-400">
            Loading dry-run event questions...
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center p-6 text-center text-rose-400 font-mono text-xs">
            {error}
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Round & Question Selectors */}
            <div className="px-6 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Round:</span>
                <select
                  value={selectedRoundIndex}
                  onChange={(e) => {
                    setSelectedRoundIndex(Number(e.target.value));
                    setSelectedQuestionIndex(0);
                    setRunResults(null);
                  }}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {(eventData?.rounds || []).map((r: any, idx: number) => (
                    <option key={r._id || idx} value={idx}>
                      Round {r.roundNumber}: {r.title} ({r.type.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Question Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <span className="text-slate-500 font-bold uppercase text-[10px] mr-1">Questions:</span>
                {roundQuestions.map((q: any, idx: number) => (
                  <button
                    key={q._id || idx}
                    onClick={() => {
                      setSelectedQuestionIndex(idx);
                      setRunResults(null);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedQuestionIndex === idx
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    Q{idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Split Screen Workspace */}
            {!currentQuestion ? (
              <div className="flex-1 flex items-center justify-center text-slate-500 font-mono text-xs">
                No questions configured for this round.
              </div>
            ) : currentQuestion.type === 'mcq' ? (
              /* MCQ Preview View */
              <div className="flex-1 p-6 sm:p-8 overflow-y-auto max-w-4xl mx-auto w-full space-y-6">
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-indigo-400 font-bold uppercase">Multiple Choice Question</span>
                    <span className="text-amber-400 font-bold">{currentQuestion.marks} Marks</span>
                  </div>
                  <h4 className="text-base font-bold text-white">{currentQuestion.title}</h4>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {currentQuestion.prompt}
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="text-xs font-mono text-slate-400 font-bold uppercase">
                    Configured Options &amp; Answer Key:
                  </div>
                  {(currentQuestion.options || []).map((opt: string, idx: number) => {
                    const isCorrect = currentQuestion.correctOptionIndex === idx;
                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-mono ${
                          isCorrect
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold ${
                              isCorrect ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span>{opt}</span>
                        </div>
                        {isCorrect && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                            CORRECT ANSWER
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {currentQuestion.explanation && (
                  <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 text-xs text-indigo-200 font-mono space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Answer Explanation:</span>
                    </div>
                    <p className="text-slate-300">{currentQuestion.explanation}</p>
                  </div>
                )}
              </div>
            ) : (
              /* Coding Challenge Split View */
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
                {/* Left Col: Prompt & Testcases */}
                <div className="lg:col-span-5 p-5 border-r border-slate-800 overflow-y-auto space-y-4 bg-slate-950/40">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30">
                        {currentQuestion.marks} MARKS
                      </span>
                      <span className="text-slate-400">
                        Time Limit: {currentQuestion.timeLimitMs || 3000}ms
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-white">{currentQuestion.title}</h4>
                    <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {currentQuestion.prompt}
                    </p>
                  </div>

                  {/* Tabs: Testcases vs Stdin */}
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <button
                        onClick={() => setActiveTab('tests')}
                        className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                          activeTab === 'tests'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Official Test Cases ({(currentQuestion.testCases || []).length})
                      </button>
                      <button
                        onClick={() => setActiveTab('stdin')}
                        className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                          activeTab === 'stdin'
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Custom Stdin
                      </button>
                    </div>

                    {activeTab === 'tests' ? (
                      <div className="space-y-2 text-xs font-mono">
                        {(currentQuestion.testCases || []).map((tc: any, idx: number) => (
                          <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-300">
                                Case #{idx + 1} {tc.isHidden ? '(Hidden Suite)' : '(Sample)'}
                              </span>
                              <span className="text-slate-500">Weight: {tc.weight || 10}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              <div>Input: <code className="text-slate-200">{tc.input || '(empty)'}</code></div>
                              <div>Expected: <code className="text-emerald-400">{tc.expectedOutput}</code></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2 text-xs font-mono">
                        <textarea
                          rows={4}
                          value={customStdin}
                          onChange={(e) => setCustomStdin(e.target.value)}
                          placeholder="Provide arbitrary stdin lines to test..."
                          className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Col: Editor & Live Results */}
                <div className="lg:col-span-7 flex flex-col overflow-hidden bg-[#0a0d16]">
                  {/* Editor Header Bar */}
                  <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-xs font-mono">Language:</span>
                      <select
                        value={selectedLanguage}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-white focus:outline-none"
                      >
                        {(currentQuestion.allowedLanguages || ['python', 'cpp', 'java', 'c', 'javascript']).map((lang: string) => (
                          <option key={lang} value={lang}>
                            {lang.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      disabled={isExecuting}
                      onClick={handleRunExecution}
                      className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold font-mono transition-all flex items-center gap-1.5 active:scale-95 shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5 text-slate-950" />
                      <span>{isExecuting ? 'Executing...' : 'Run Test Cases'}</span>
                    </button>
                  </div>

                  {/* Monaco Code Editor */}
                  <div className="flex-1 min-h-[220px]">
                    <Editor
                      height="100%"
                      theme="vs-dark"
                      language={selectedLanguage === 'cpp' || selectedLanguage === 'c' ? 'cpp' : selectedLanguage}
                      value={currentCode}
                      onChange={(val) => setCurrentCode(val || '')}
                      options={{
                        fontSize: 13,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        automaticLayout: true
                      }}
                    />
                  </div>

                  {/* Execution Diagnostics Strip */}
                  {runResults && (
                    <div className="p-4 bg-slate-950 border-t border-slate-800 max-h-48 overflow-y-auto font-mono text-xs space-y-2">
                      <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-800">
                        <span className="text-slate-400 uppercase font-bold">Execution Output:</span>
                        {runResults.allPassed !== undefined && (
                          <span
                            className={`font-bold ${
                              runResults.allPassed ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {runResults.passedTestCases} / {runResults.totalTestCases} Test Cases Passed
                          </span>
                        )}
                      </div>

                      {runResults.error && (
                        <div className="text-rose-400">{runResults.error}</div>
                      )}

                      {runResults.type === 'custom_stdin' && (
                        <div className="space-y-1 text-slate-300">
                          <div>Status: <span className="text-emerald-400">{runResults.result?.status}</span> ({runResults.result?.runtimeMs}ms)</div>
                          {runResults.result?.stdout && (
                            <pre className="p-2 rounded bg-slate-900 text-slate-200">{runResults.result.stdout}</pre>
                          )}
                          {runResults.result?.stderr && (
                            <pre className="p-2 rounded bg-rose-950/40 text-rose-300">{runResults.result.stderr}</pre>
                          )}
                        </div>
                      )}

                      {runResults.type === 'test_cases' && (
                        <div className="space-y-1.5">
                          {runResults.results?.map((res: any, idx: number) => (
                            <div
                              key={idx}
                              className={`p-2 rounded-lg border text-[11px] flex items-center justify-between ${
                                res.passed
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                              }`}
                            >
                              <span>Case #{idx + 1}: {res.status.toUpperCase()} ({res.runtimeMs}ms)</span>
                              <span>{res.passed ? 'PASSED' : 'FAILED'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
