import React, { useState } from 'react';
import {
  FileText,
  Terminal,
  CheckCircle2,
  Bug,
  Copy,
  Check,
  RotateCcw,
  AlertTriangle,
  Code2
} from 'lucide-react';
import { parseCodingQuestion } from '../../utils/codingQuestionParser.js';

export interface CodingProblemDetailsProps {
  question: {
    _id?: string;
    title?: string;
    prompt?: string;
    starterCode?: Record<string, string> | any;
    errorCode?: Record<string, string> | any;
    testCases?: Array<{
      input?: string;
      expectedOutput?: string;
      output?: string;
      isHidden?: boolean;
      weight?: number;
    }>;
    allowedLanguages?: string[];
    timeLimitMs?: number;
  };
  activeLanguage?: string;
  onLanguageChange?: (lang: string) => void;
  onResetToErrorCode?: () => void;
  showSampleCases?: boolean;
  className?: string;
}

export const CodingProblemDetails: React.FC<CodingProblemDetailsProps> = ({
  question,
  activeLanguage = 'python',
  onLanguageChange,
  onResetToErrorCode,
  showSampleCases = true,
  className = ''
}) => {
  const [copied, setCopied] = useState(false);
  const parsed = parseCodingQuestion(question, activeLanguage);

  const handleCopyCode = async () => {
    if (!parsed.errorCode) return;
    try {
      await navigator.clipboard.writeText(parsed.errorCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const allowedLanguages = question.allowedLanguages && question.allowedLanguages.length > 0
    ? question.allowedLanguages
    : ['python', 'cpp', 'java', 'javascript', 'c'];

  return (
    <div className={`space-y-5 text-xs font-sans ${className}`}>
      {/* 1. SCENARIO SECTION */}
      <div className="rounded-2xl bg-slate-900/90 dark:bg-slate-900/90 border border-slate-800 p-4 sm:p-5 shadow-lg shadow-black/20 space-y-2.5">
        <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-wider text-[11px]">
          <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>Scenario</span>
        </div>
        <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-sans">
          {parsed.scenario}
        </div>
      </div>

      {/* 2. INPUT SPECIFICATION SECTION */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 sm:p-5 shadow-lg shadow-black/20 space-y-2.5">
        <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-wider text-[11px]">
          <Terminal className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>Input Format</span>
        </div>
        <div className="text-slate-300 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
          {parsed.inputFormat || 'Standard input (stdin) formatted as demonstrated in the test cases.'}
        </div>
      </div>

      {/* 3. EXPECTED OUTPUT SPECIFICATION SECTION */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 sm:p-5 shadow-lg shadow-black/20 space-y-2.5">
        <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Expected Output</span>
        </div>
        <div className="text-slate-300 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
          {parsed.outputFormat || 'Standard output (stdout) matching the required test case outputs.'}
        </div>
      </div>

      {/* 4. ERROR CODE SECTION (NEEDS DEBUGGING) */}
      <div className="rounded-2xl bg-gradient-to-b from-rose-950/30 to-slate-950 border border-rose-500/30 p-4 sm:p-5 shadow-xl shadow-rose-950/20 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-500/20 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Bug className="w-4 h-4 text-rose-400" />
            </span>
            <div>
              <span className="font-extrabold uppercase tracking-wider text-[11px] text-rose-300 block">
                Error Code (Participant Needs to Debug)
              </span>
              <span className="text-[10px] text-slate-400">
                Flawed starter logic loaded into editor
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Selector / Indicator */}
            {onLanguageChange ? (
              <select
                value={activeLanguage}
                onChange={e => onLanguageChange(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-rose-300 text-[11px] font-mono font-bold rounded-lg px-2.5 py-1 focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                {allowedLanguages.map(l => (
                  <option key={l} value={l}>
                    {l.toUpperCase()}
                  </option>
                ))}
              </select>
            ) : (
              <span className="px-2.5 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-rose-300 text-[10px] font-mono font-bold">
                {activeLanguage.toUpperCase()}
              </span>
            )}

            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopyCode}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
              title="Copy Error Code"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 text-[10px] font-bold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[10px]">Copy</span>
                </>
              )}
            </button>

            {/* Reset Editor Button if handler is supplied */}
            {onResetToErrorCode && (
              <button
                type="button"
                onClick={onResetToErrorCode}
                className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 hover:text-white border border-rose-500/40 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                title="Reset editor buffer back to this original error code"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-[10px]">Reset Editor</span>
              </button>
            )}
          </div>
        </div>

        {/* Diagnostic Bug Clue if available */}
        {parsed.bugClue && (
          <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-start gap-2.5 text-amber-200/90 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-amber-300 font-semibold">Bug Diagnostic: </strong>
              <span>{parsed.bugClue}</span>
            </div>
          </div>
        )}

        {/* Error Code Snippet Display */}
        <div className="relative rounded-xl bg-slate-950 border border-slate-800/90 overflow-hidden">
          <div className="bg-slate-900/70 px-3 py-1.5 border-b border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <Code2 className="w-3 h-3 text-rose-400" />
              <span>defective_starter.{activeLanguage === 'python' ? 'py' : activeLanguage === 'javascript' ? 'js' : activeLanguage === 'cpp' ? 'cpp' : activeLanguage === 'c' ? 'c' : 'java'}</span>
            </span>
            <span className="text-rose-400/80">Contains Defect</span>
          </div>
          <pre className="p-3.5 text-xs text-rose-200/90 font-mono overflow-x-auto whitespace-pre leading-relaxed max-h-72 scrollbar-thin">
            {parsed.errorCode || '// No error code provided for this language'}
          </pre>
        </div>
      </div>

      {/* 5. SAMPLE TEST CASES (VISIBLE) */}
      {showSampleCases && parsed.sampleCases.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sample Evaluation Cases ({parsed.sampleCases.length})</span>
          </div>

          <div className="space-y-3">
            {parsed.sampleCases.map((tc, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs font-mono space-y-2.5 shadow-sm"
              >
                <div className="text-slate-400 font-semibold flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 text-[11px]">
                    Sample Case #{idx + 1}
                  </span>
                  {tc.weight !== undefined && (
                    <span className="text-slate-500 font-normal text-[11px]">
                      Weight: {tc.weight} pts
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                    Input:
                  </span>
                  <pre className="bg-slate-900 p-2.5 rounded-xl text-slate-200 overflow-x-auto whitespace-pre">
                    {tc.input || '(no input)'}
                  </pre>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                    Expected Output:
                  </span>
                  <pre className="bg-slate-900 p-2.5 rounded-xl text-emerald-400 font-bold overflow-x-auto whitespace-pre">
                    {tc.expectedOutput || '(empty output)'}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
