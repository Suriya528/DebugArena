import axios from 'axios';
import { spawn } from 'child_process';
import { ENV } from '../config/env.js';
import { ITestCase } from '../models/Question.js';
import { IAttemptTestCaseResult } from '../models/Attempt.js';

interface PistonRunResponse {
  language: string;
  version: string;
  run?: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
    output: string;
  };
  compile?: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
    output: string;
  };
  message?: string;
}

const LANGUAGE_MAP: Record<string, { language: string; version: string }> = {
  c: { language: 'c', version: '10.2.0' },
  cpp: { language: 'c++', version: '10.2.0' },
  java: { language: 'java', version: '15.0.2' },
  python: { language: 'python', version: '3.10.0' },
  javascript: { language: 'javascript', version: '18.15.0' },
  js: { language: 'javascript', version: '18.15.0' }
};

// Queue for limiting concurrency
class ExecutionQueue {
  private queue: Array<() => Promise<void>> = [];
  private activeCount = 0;
  private maxConcurrency = 5;

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const res = await fn();
          resolve(res);
        } catch (err) {
          reject(err);
        }
      });
      this.processNext();
    });
  }

  private processNext() {
    if (this.activeCount >= this.maxConcurrency || this.queue.length === 0) return;
    const task = this.queue.shift();
    if (!task) return;
    this.activeCount++;
    task().finally(() => {
      this.activeCount--;
      this.processNext();
    });
  }
}

const queue = new ExecutionQueue();

// Local Native Runner (used when external Piston is 401 whitelist-restricted or offline)
function executeLocal(
  code: string,
  language: string,
  stdinText: string,
  timeoutMs: number
): Promise<{ stdout: string; stderr: string; compileError?: string; runtimeError?: string; timeout: boolean; exitCode: number }> {
  return new Promise((resolve) => {
    let cmd = 'node';
    let args = ['-e', code];

    if (language === 'python' || language === 'py') {
      cmd = 'py';
      args = ['-3', '-c', code];
    }

    const child = spawn(cmd, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stdout.on('data', data => { stdout += data.toString(); });
    child.stderr.on('data', data => {
      const errStr = data.toString();
      if (!errStr.includes('Could not find platform independent libraries')) {
        stderr += errStr;
      }
    });

    child.on('close', code => {
      clearTimeout(timer);
      const isSyntaxError = stderr.includes('SyntaxError') || stderr.includes('IndentationError');
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        compileError: isSyntaxError ? stderr.trim() : undefined,
        runtimeError: !isSyntaxError && (code !== 0 || timedOut) ? (timedOut ? 'Execution Timed Out' : stderr.trim()) : undefined,
        timeout: timedOut,
        exitCode: code || 0
      });
    });

    child.on('error', err => {
      clearTimeout(timer);
      resolve({
        stdout: '',
        stderr: err.message,
        runtimeError: err.message,
        timeout: false,
        exitCode: 1
      });
    });

    if (stdinText) {
      child.stdin.write(stdinText);
    }
    child.stdin.end();
  });
}

export async function executeSingleTestCase(
  code: string,
  langKey: string,
  input: string,
  timeLimitMs: number = 3000
): Promise<{
  stdout: string;
  stderr: string;
  compileError?: string;
  runtimeError?: string;
  timeout: boolean;
  runtimeMs: number;
  exitCode: number;
}> {
  const normLang = langKey.toLowerCase();
  const langConfig = LANGUAGE_MAP[normLang] || { language: normLang, version: '*' };

  return queue.enqueue(async () => {
    const startTime = Date.now();

    // 1. Try external Piston judge first (if configured with custom URL)
    if (ENV.PISTON_URL && !ENV.PISTON_URL.includes('emkc.org')) {
      try {
        const payload = {
          language: langConfig.language,
          version: langConfig.version,
          files: [{ name: normLang === 'java' ? 'Solution.java' : undefined, content: code }],
          stdin: input,
          run_timeout: Math.max(1000, timeLimitMs)
        };

        const response = await axios.post<PistonRunResponse>(
          `${ENV.PISTON_URL}/execute`,
          payload,
          { timeout: timeLimitMs + 5000 }
        );

        const elapsed = Date.now() - startTime;
        const data = response.data;

        if (data.compile && data.compile.code !== 0) {
          return {
            stdout: '',
            stderr: data.compile.stderr || data.compile.output || 'Compilation failed',
            compileError: data.compile.stderr || data.compile.output || 'Compilation error',
            timeout: false,
            runtimeMs: elapsed,
            exitCode: data.compile.code
          };
        }

        const run = data.run;
        if (run) {
          const timeout = run.signal === 'SIGKILL' || run.signal === 'SIGTERM';
          const isRuntimeError = run.code !== 0 && !timeout;
          return {
            stdout: (run.stdout || '').trim(),
            stderr: (run.stderr || '').trim(),
            runtimeError: isRuntimeError ? run.stderr || `Exited with code ${run.code}` : undefined,
            timeout,
            runtimeMs: elapsed,
            exitCode: run.code
          };
        }
      } catch (err: any) {
        console.warn('External judge returned error, falling back to local runner:', err.message);
      }
    }

    // 2. Native Local Runner Fallback (Python 3.14 + Node.js)
    const localRes = await executeLocal(code, normLang, input, timeLimitMs);
    const elapsed = Date.now() - startTime;

    return {
      stdout: localRes.stdout,
      stderr: localRes.stderr,
      compileError: localRes.compileError,
      runtimeError: localRes.runtimeError,
      timeout: localRes.timeout,
      runtimeMs: elapsed,
      exitCode: localRes.exitCode
    };
  });
}

function normalizeOutput(str: string): string {
  return (str || '')
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

export async function runTestCases(
  code: string,
  language: string,
  testCases: ITestCase[],
  timeLimitMs: number = 3000
): Promise<IAttemptTestCaseResult[]> {
  const results: IAttemptTestCaseResult[] = [];

  for (const tc of testCases) {
    const execRes = await executeSingleTestCase(code, language, tc.input, timeLimitMs);
    const actualNorm = normalizeOutput(execRes.stdout);
    const expectedNorm = normalizeOutput(tc.expectedOutput);

    let status: IAttemptTestCaseResult['status'] = 'failed';
    let passed = false;

    if (execRes.compileError) {
      status = 'compile_error';
    } else if (execRes.timeout) {
      status = 'timeout';
    } else if (execRes.runtimeError) {
      status = 'runtime_error';
    } else if (actualNorm === expectedNorm) {
      status = 'passed';
      passed = true;
    } else {
      status = 'failed';
    }

    results.push({
      passed,
      status,
      runtimeMs: execRes.runtimeMs,
      stdout: execRes.stdout,
      stderr: execRes.stderr,
      compileError: execRes.compileError,
      runtimeError: execRes.runtimeError,
      timeout: execRes.timeout,
      isHidden: tc.isHidden,
      input: tc.isHidden ? undefined : tc.input,
      expected: tc.isHidden ? undefined : tc.expectedOutput,
      actual: tc.isHidden ? undefined : execRes.stdout
    });
  }

  return results;
}

export function sanitizeResultsForParticipant(
  results: IAttemptTestCaseResult[]
): Array<Partial<IAttemptTestCaseResult> & { testNumber: number }> {
  return results.map((r, idx) => {
    if (r.isHidden) {
      return {
        testNumber: idx + 1,
        passed: r.passed,
        status: r.status,
        runtimeMs: r.runtimeMs,
        isHidden: true
      };
    }
    return {
      testNumber: idx + 1,
      passed: r.passed,
      status: r.status,
      runtimeMs: r.runtimeMs,
      isHidden: false,
      input: r.input,
      expected: r.expected,
      actual: r.actual,
      compileError: r.compileError,
      runtimeError: r.runtimeError
    };
  });
}
