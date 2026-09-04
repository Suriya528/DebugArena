import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Send, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Question, Attempt, TestCaseResult } from '../../types/index.js';
import { api } from '../../services/api.js';

interface TieBreakShellProps {
  question: Question;
  attempt?: Attempt | null;
  tieBreakId: string;
  onCompleted: () => void;
}

export const TieBreakShell: React.FC<TieBreakShellProps> = ({
  question,
  attempt,
  tieBreakId,
  onCompleted
}) => {
  const defaultLang = (question.allowedLanguages && question.allowedLanguages[0]) || 'python';
  const [language, setLanguage] = useState<string>(attempt?.language || defaultLang);
  const [code, setCode] = useState<string>(
    attempt?.code || (question.starterCode && (question.starterCode as any)[defaultLang]) || ''
  );
  const [results, setResults] = useState<TestCaseResult[]>(attempt?.testCaseResults || []);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [score, setScore] = useState<number>(attempt?.score || 0);

  const handleRun = async () => {
    setIsRunning(true);
    try {
      const res = await api.post('/participant/run-code', {
        questionId: question._id,
        code,
        language
      });
      if (res.data.success) {
        setResults(res.data.results);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Run code failed');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await api.post('/participant/submit-code', {
        questionId: question._id,
        code,
        language,
        roundNumber: 99
      });
      if (res.data.success) {
        setResults(res.data.results);
        setScore(res.data.score);
        alert(`Tie-break submitted! Final score: ${res.data.score} pts`);
        onCompleted();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <h2 className="text-sm font-bold text-white">Sudden-Death Tie-Breaker</h2>
            <p className="text-xs text-amber-300">
              You are tied with another competitor on both score and time. Your result here will resolve the final ranking.
            </p>
          </div>
        </div>
        <div className="text-xs font-mono font-bold text-amber-400 bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-500/30">
          Score: {score} pts
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-16rem)]">
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 overflow-y-auto space-y-4">
          <h1 className="text-xl font-bold text-white">{question.title}</h1>
          <div className="text-sm text-slate-300 whitespace-pre-wrap font-sans">
            {question.prompt}
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Sample Cases
            </h3>
            {(question.testCases || []).map((tc, idx) => (
              <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono mb-2">
                <div className="text-slate-400 mb-1">Sample #{idx + 1}</div>
                <div>Input: <span className="text-slate-200">{tc.input}</span></div>
                <div>Expected: <span className="text-emerald-400">{tc.expectedOutput}</span></div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col bg-[#1e1e1e] border border-slate-800 rounded-2xl overflow-hidden">
          <div className="h-12 bg-slate-950 px-4 border-b border-slate-800 flex items-center justify-between">
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="bg-slate-900 text-white text-xs font-semibold rounded-lg px-2.5 py-1.5 border border-slate-700"
            >
              {(question.allowedLanguages || ['python', 'javascript', 'cpp', 'java']).map(l => (
                <option key={l} value={l}>{l.toUpperCase()}</option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRun}
                disabled={isRunning || isSubmitting}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Run</span>
              </button>
              <button
                onClick={handleSubmit}
                disabled={isRunning || isSubmitting}
                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Final Tie-Break</span>
              </button>
            </div>
          </div>

          <div className="flex-1">
            <Editor
              height="100%"
              language={language === 'c' || language === 'cpp' ? 'cpp' : language === 'js' ? 'javascript' : language}
              theme="vs-dark"
              value={code}
              onChange={val => setCode(val || '')}
              options={{ fontSize: 13, minimap: { enabled: false } }}
            />
          </div>

          <div className="h-44 bg-slate-950 p-4 border-t border-slate-800 overflow-y-auto text-xs font-mono space-y-2">
            <div className="text-slate-400 font-bold uppercase text-[11px]">Execution Output</div>
            {results.map(r => (
              <div key={r.testNumber} className="flex items-center gap-2">
                {r.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400" />
                )}
                <span className="text-white">Case #{r.testNumber}:</span>
                <span className={r.passed ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {r.status.toUpperCase()} ({r.runtimeMs}ms)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
