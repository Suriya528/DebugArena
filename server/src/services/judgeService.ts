import axios from 'axios';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ENV } from '../config/env.js';
import { ITestCase } from '../models/Question.js';
import { IAttemptTestCaseResult } from '../models/Attempt.js';

/**
 * A participant-facing outcome for one program execution.  Keep this separate
 * from HTTP success: a 200 only means the judge completed its work, not that
 * the submitted program succeeded.
 */
export type JudgeVerdict =
  | 'accepted'
  | 'wrong_answer'
  | 'compilation_error'
  | 'syntax_error'
  | 'runtime_error'
  | 'time_limit_exceeded'
  | 'memory_limit_exceeded'
  | 'execution_error';

export interface JudgeExecutionResult {
  stdout: string;
  stderr: string;
  compileError?: string;
  /** Interpreter parse/indentation diagnostic; also mirrored in compileError for compatibility. */
  syntaxError?: string;
  runtimeError?: string;
  memoryError?: string;
  executionError?: string;
  timeout: boolean;
  runtimeMs: number;
  exitCode: number;
  verdict: JudgeVerdict;
}

type LocalExecutionResult = Omit<JudgeExecutionResult, 'runtimeMs'>;

interface ProcessResult {
  stdout: string;
  stderr: string;
  timedOut: boolean;
  exitCode: number;
  spawnError?: string;
  outputLimitExceeded: boolean;
}

const DEFAULT_MEMORY_LIMIT_MB = 256;
const COMPILATION_TIMEOUT_MS = 10_000;
const MAX_CAPTURED_STDOUT_BYTES = Math.max(32_768, Number.parseInt(process.env.JUDGE_MAX_STDOUT_BYTES || '1048576', 10) || 1_048_576);
const MAX_CAPTURED_STDERR_BYTES = Math.max(8_192, Number.parseInt(process.env.JUDGE_MAX_STDERR_BYTES || '65536', 10) || 65_536);
const MAX_PARTICIPANT_DIAGNOSTIC_CHARS = Math.max(4_096, Number.parseInt(process.env.JUDGE_MAX_DIAGNOSTIC_CHARS || '24000', 10) || 24_000);

// Augment process.env.PATH with installed compiler directories (MinGW g++, Tableau OpenJDK 17)
const EXTRA_COMPILER_PATHS = [
  'C:\\Users\\Admin\\AppData\\Local\\Microsoft\\WinGet\\Packages\\MartinStorsjo.LLVM-MinGW.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\\llvm-mingw-20260616-ucrt-x86_64\\bin',
  'C:\\Program Files\\Tableau\\Tableau Public 2025.3\\bin\\jre\\bin'
];

for (const p of EXTRA_COMPILER_PATHS) {
  if (fs.existsSync(p) && !process.env.PATH?.includes(p)) {
    process.env.PATH = `${p}${path.delimiter}${process.env.PATH || ''}`;
  }
}

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
  'c++': { language: 'c++', version: '10.2.0' },
  java: { language: 'java', version: '15.0.2' },
  python: { language: 'python', version: '3.10.0' },
  py: { language: 'python', version: '3.10.0' },
  javascript: { language: 'javascript', version: '18.15.0' },
  js: { language: 'javascript', version: '18.15.0' },
  sql: { language: 'sqlite3', version: '3.36.0' }
};

// Concurrency limiter queue
class ExecutionQueue {
  private queue: Array<() => Promise<void>> = [];
  private activeCount = 0;
  private maxConcurrency = parseInt(process.env.JUDGE_MAX_CONCURRENCY || '15', 10);

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

// Static Code Security Validator (Protects against host compromise while permitting standard competitive coding I/O)
export function validateCodeSecurity(code: string, language: string): { safe: boolean; reason?: string } {
  const normLang = (language || '').toLowerCase().trim();

  if (normLang === 'python' || normLang === 'py') {
    const forbiddenPatterns = [
      /\bimport\s+os\b/,
      /\bfrom\s+os\s+import\b/,
      /\bimport\s+subprocess\b/,
      /\bfrom\s+subprocess\s+import\b/,
      /\bimport\s+shutil\b/,
      /\bfrom\s+shutil\s+import\b/,
      /\bimport\s+socket\b/,
      /\bfrom\s+socket\s+import\b/,
      /\bimport\s+pty\b/,
      /\bimport\s+ctypes\b/,
      /\bimport\s+multiprocessing\b/,
      /\b__import__\s*\(/,
      /\beval\s*\(/,
      /\bexec\s*\(/,
      /\bopen\s*\(/,
      /\bos\.system\b/,
      /\bos\.environ\b/,
      /\bos\.remove\b/,
      /\bos\.fork\b/
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(code)) {
        return { safe: false, reason: 'This submission uses an API that is not permitted by the execution environment.' };
      }
    }
  } else if (normLang === 'javascript' || normLang === 'js' || normLang === 'node') {
    const forbiddenPatterns = [
      /\bchild_process\b/,
      /\bnet\b/,
      /\bhttp\b/,
      /\bhttps\b/,
      /\bworker_threads\b/,
      /\bcluster\b/,
      /\bprocess\.exit\b/,
      /\bprocess\.kill\b/,
      /\bFunction\s*\(/,
      /\bfs\.(write|append|unlink|rm|mkdir|chmod|rename|chown)/
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(code)) {
        return { safe: false, reason: 'This submission uses an API that is not permitted by the execution environment.' };
      }
    }
  } else if (normLang === 'java') {
    const forbiddenPatterns = [
      /Runtime\.getRuntime\(\)\.exec/,
      /ProcessBuilder/,
      /System\.exit/
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(code)) {
        return { safe: false, reason: 'This submission uses an API that is not permitted by the execution environment.' };
      }
    }
  } else if (normLang === 'cpp' || normLang === 'c++' || normLang === 'c') {
    const forbiddenPatterns = [
      /#include\s*<windows\.h>/i,
      /#include\s*<sys\/socket\.h>/i,
      /\bsystem\s*\(/,
      /\bfork\s*\(/,
      /\bexec\w*\s*\(/
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(code)) {
        return { safe: false, reason: 'This submission uses an API that is not permitted by the execution environment.' };
      }
    }
  } else if (normLang === 'sql') {
    // Participant SQL is executed against a per-test in-memory database, but
    // it must still be a read-only query. The setup SQL belongs to the judge,
    // not to the participant. Require SELECT/WITH and reject every common DDL,
    // DML, administrative, or transaction-control operation (including one
    // nested in a CTE).
    const readQueryStart = /^\s*(?:(?:--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)\s*)*(?:SELECT|WITH)\b/i;
    const forbiddenPatterns = [
      /\b(?:INSERT|UPDATE|DELETE|REPLACE|MERGE|UPSERT|CREATE|ALTER|DROP|TRUNCATE|VACUUM|REINDEX|ANALYZE)\b/i,
      /\bATTACH\s+DATABASE\b/i,
      /\bDETACH\s+DATABASE\b/i,
      /\bPRAGMA\b/i,
      /\b(?:BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE)\b/i
    ];

    if (!readQueryStart.test(code)) {
      return { safe: false, reason: 'SQL submissions must be a read-only SELECT or WITH query.' };
    }

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(code)) {
        return { safe: false, reason: 'SQL submissions may not contain write or administrative commands.' };
      }
    }
  }

  return { safe: true };
}

// Low-level helper to execute a CLI process with stdin, bounded output, timeout,
// and cross-platform cleanup. The outcome deliberately records a spawn failure
// separately so a missing runtime is never presented as a participant syntax error.
function runCommand(
  cmd: string,
  args: string[],
  stdinText: string = '',
  timeoutMs: number = 3000,
  cwd?: string
): Promise<ProcessResult> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let outputLimitExceeded = false;
    let settled = false;
    let child: ReturnType<typeof spawn> | undefined;

    const finish = (result: ProcessResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    const append = (current: string, chunk: Buffer | string, limit: number, streamName: string): { value: string; exceeded: boolean } => {
      if (Buffer.byteLength(current, 'utf8') >= limit) {
        return { value: current, exceeded: true };
      }

      const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk;
      const remaining = limit - Buffer.byteLength(current, 'utf8');
      if (Buffer.byteLength(text, 'utf8') <= remaining) {
        return { value: current + text, exceeded: false };
      }

      const truncated = Buffer.from(text, 'utf8').subarray(0, remaining).toString('utf8');
      return {
        value: `${current}${truncated}\n[${streamName} output truncated by judge safety limit]`,
        exceeded: true
      };
    };

    const terminate = () => {
      if (!child) return;
      try {
        child.kill('SIGKILL');
      } catch {
        // The process can exit between the limit/timeout check and termination.
      }
      if (process.platform === 'win32' && child.pid) {
        const killer = spawn('taskkill', ['/F', '/T', '/PID', child.pid.toString()], { windowsHide: true });
        killer.on('error', () => {
          try {
            child?.kill('SIGKILL');
          } catch {
            // The direct kill above is already the primary cleanup path.
          }
        });
      }
    };

    const timer = setTimeout(() => {
      timedOut = true;
      terminate();
    }, Math.max(1, timeoutMs));

    try {
      child = spawn(cmd, args, {
        windowsHide: true,
        cwd: cwd || process.cwd(),
        env: process.env
      });
    } catch (error) {
      finish({
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        timedOut: false,
        exitCode: 1,
        spawnError: error instanceof Error ? error.message : String(error),
        outputLimitExceeded: false
      });
      return;
    }

    child.stdout?.on('data', (chunk: Buffer) => {
      const next = append(stdout, chunk, MAX_CAPTURED_STDOUT_BYTES, 'stdout');
      stdout = next.value;
      if (next.exceeded && !outputLimitExceeded) {
        outputLimitExceeded = true;
        terminate();
      }
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      const next = append(stderr, chunk, MAX_CAPTURED_STDERR_BYTES, 'stderr');
      stderr = next.value;
      if (next.exceeded && !outputLimitExceeded) {
        outputLimitExceeded = true;
        terminate();
      }
    });

    child.on('close', (code) => {
      finish({
        stdout,
        stderr,
        timedOut,
        exitCode: code ?? 1,
        outputLimitExceeded
      });
    });

    child.on('error', (error) => {
      finish({
        stdout,
        stderr: stderr || (error instanceof Error ? error.message : String(error)),
        timedOut: false,
        exitCode: 1,
        spawnError: error instanceof Error ? error.message : String(error),
        outputLimitExceeded
      });
    });

    // A process that exits before stdin is written can emit EPIPE. It is not a
    // separate judge failure; the process outcome above is authoritative.
    child.stdin?.on('error', () => {});
    try {
      if (stdinText && child.stdin) child.stdin.write(stdinText);
      child.stdin?.end();
    } catch {
      // The close/error handlers classify the process outcome.
    }
  });
}

function truncateParticipantDiagnostic(text: string): string {
  if (text.length <= MAX_PARTICIPANT_DIAGNOSTIC_CHARS) return text;
  return `${text.slice(0, MAX_PARTICIPANT_DIAGNOSTIC_CHARS)}\n[Diagnostic output truncated by judge safety limit]`;
}

// Sanitize compiler and runtime diagnostics without altering useful source
// locations, error messages, or caret context. Compiler output is untrusted:
// it can include temp paths, service URLs, or secrets injected by an execution
// environment, none of which belong in a participant response.
export function sanitizeDiagnostics(output?: string | null, tempDir?: string): string {
  if (!output) return '';
  let sanitized = String(output).replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  if (tempDir) {
    const paths = new Set([
      tempDir,
      tempDir.replace(/\\/g, '/'),
      tempDir.replace(/\//g, '\\')
    ]);
    for (const tempPath of paths) {
      sanitized = sanitized.split(tempPath).join('');
    }
  }

  // Preserve the participant-safe source filename while dropping every parent
  // component from Windows and POSIX source paths.
  sanitized = sanitized.replace(/[A-Za-z]:[\\/](?:[^:\n\r\\/]+[\\/])*([A-Za-z0-9_.-]+\.(?:py|java|cpp|c|cc|cxx|js|mjs|ts|sql))/gi, '$1');
  sanitized = sanitized.replace(/(?:\/(?:[^:\n\r\/]+))+\/([A-Za-z0-9_.-]+\.(?:py|java|cpp|c|cc|cxx|js|mjs|ts|sql))/gi, '$1');

  // Remaining absolute paths are infrastructure details rather than source
  // references that a participant can act on.
  sanitized = sanitized.replace(/\b[A-Za-z]:\\[^\n\r:]*/g, '[internal path]');
  sanitized = sanitized.replace(/\/(?:home|tmp|var|srv|opt|app|workspace|internal|usr)\/[\w@%+.,=~\-\/]*/gi, '[internal path]');

  // Do not return service endpoints or credentials should a tool echo its
  // environment. This intentionally leaves normal compiler text untouched.
  sanitized = sanitized.replace(/\b(?:mongodb(?:\+srv)?|postgres(?:ql)?|redis):\/\/[^\s'"`]+/gi, '[redacted connection string]');
  sanitized = sanitized.replace(/\bhttps?:\/\/[^\s'"`]+/gi, '[redacted URL]');
  sanitized = sanitized.replace(/\b(password|passwd|secret|token|api[_-]?key|authorization)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]');

  return truncateParticipantDiagnostic(sanitized.trim());
}

function diagnosticFromProcess(result: ProcessResult, tempDir?: string): string {
  const streams = [result.stderr, result.stdout].filter(Boolean);
  return sanitizeDiagnostics(streams.join(streams.length > 1 ? '\n' : ''), tempDir);
}

function isMemoryLimitDiagnostic(diagnostic: string): boolean {
  return /\b(?:out\s+of\s+memory|heap\s+out\s+of\s+memory|java\.lang\.outofmemoryerror|outofmemoryerror|memoryerror|std::bad_alloc|bad_alloc|cannot allocate memory|allocation failed|reached heap limit)\b/i.test(diagnostic);
}

function isPythonSyntaxDiagnostic(diagnostic: string): boolean {
  return /\b(?:syntaxerror|indentationerror|taberror)\b/i.test(diagnostic);
}

function isJavaScriptSyntaxDiagnostic(diagnostic: string): boolean {
  return /\bsyntaxerror\b/i.test(diagnostic);
}

function safeRemoveTempDir(tempDir: string): void {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // A failed best-effort cleanup must not replace an otherwise valid verdict.
  }
}

function executionEnvironmentError(message: string, exitCode = 1): LocalExecutionResult {
  const diagnostic = sanitizeDiagnostics(message) || 'The execution environment could not start the selected language runtime.';
  return {
    stdout: '',
    stderr: diagnostic,
    executionError: diagnostic,
    timeout: false,
    exitCode,
    verdict: 'execution_error'
  };
}

function resolvedMemoryLimitMb(memoryLimitMb?: number): number {
  const requested = Number(memoryLimitMb);
  if (!Number.isFinite(requested) || requested <= 0) return DEFAULT_MEMORY_LIMIT_MB;
  // Avoid an unusable Node/Java heap while honoring a question's configured cap.
  return Math.max(16, Math.floor(requested));
}

function runtimeOutcome(result: ProcessResult, tempDir?: string): LocalExecutionResult {
  const diagnostic = diagnosticFromProcess(result, tempDir);
  const stdout = result.stdout.trim();

  if (result.spawnError) {
    return executionEnvironmentError(diagnostic || 'The selected language runtime is unavailable.', result.exitCode);
  }
  if (result.timedOut) {
    return {
      stdout,
      stderr: diagnostic,
      timeout: true,
      exitCode: result.exitCode,
      verdict: 'time_limit_exceeded'
    };
  }
  if (result.outputLimitExceeded) {
    const message = diagnostic || 'Program output exceeded the judge safety limit.';
    return {
      stdout,
      stderr: message,
      executionError: message,
      timeout: false,
      exitCode: result.exitCode,
      verdict: 'execution_error'
    };
  }
  if (isMemoryLimitDiagnostic(diagnostic)) {
    const message = diagnostic || 'The program exceeded its configured memory limit.';
    return {
      stdout,
      stderr: message,
      memoryError: message,
      timeout: false,
      exitCode: result.exitCode,
      verdict: 'memory_limit_exceeded'
    };
  }
  if (result.exitCode !== 0) {
    const message = diagnostic || `Process exited with code ${result.exitCode}.`;
    return {
      stdout,
      stderr: message,
      runtimeError: message,
      timeout: false,
      exitCode: result.exitCode,
      verdict: 'runtime_error'
    };
  }

  return {
    stdout,
    stderr: diagnostic,
    timeout: false,
    exitCode: result.exitCode,
    verdict: 'accepted'
  };
}

function compilationOutcome(result: ProcessResult, languageLabel: string, tempDir?: string): LocalExecutionResult | null {
  if (result.exitCode === 0 && !result.timedOut && !result.spawnError && !result.outputLimitExceeded) {
    return null;
  }

  const diagnostic = diagnosticFromProcess(result, tempDir);
  if (result.spawnError) {
    return executionEnvironmentError(diagnostic || `The configured ${languageLabel} compiler is unavailable.`, result.exitCode);
  }
  if (result.timedOut || result.outputLimitExceeded) {
    const message = diagnostic || `${languageLabel} compilation could not complete within the judge safety limits.`;
    return {
      stdout: '',
      stderr: message,
      executionError: message,
      timeout: false,
      exitCode: result.exitCode,
      verdict: 'execution_error'
    };
  }

  const message = diagnostic || `${languageLabel} compiler exited with code ${result.exitCode} without emitting a diagnostic.`;
  return {
    stdout: '',
    stderr: message,
    compileError: message,
    timeout: false,
    exitCode: result.exitCode,
    verdict: 'compilation_error'
  };
}

function syntaxValidationOutcome(
  result: ProcessResult,
  languageLabel: string,
  isSyntaxDiagnostic: (diagnostic: string) => boolean,
  tempDir?: string
): LocalExecutionResult | null {
  if (result.exitCode === 0 && !result.timedOut && !result.spawnError && !result.outputLimitExceeded) {
    return null;
  }

  const diagnostic = diagnosticFromProcess(result, tempDir);
  if (result.spawnError) {
    return executionEnvironmentError(diagnostic || `The configured ${languageLabel} runtime is unavailable.`, result.exitCode);
  }
  if (result.timedOut || result.outputLimitExceeded || !isSyntaxDiagnostic(diagnostic)) {
    const message = diagnostic || `${languageLabel} syntax validation could not complete in the execution environment.`;
    return {
      stdout: '',
      stderr: message,
      executionError: message,
      timeout: false,
      exitCode: result.exitCode,
      verdict: 'execution_error'
    };
  }

  return {
    stdout: '',
    stderr: diagnostic,
    compileError: diagnostic,
    syntaxError: diagnostic,
    timeout: false,
    exitCode: result.exitCode,
    verdict: 'syntax_error'
  };
}

function cleanPythonStderr(stderr: string): string {
  return stderr
    .split('\n')
    .filter(line => !line.includes('Could not find platform independent libraries'))
    .join('\n')
    .trim();
}

// Multi-Language Native Local Runner
async function executeLocal(
  code: string,
  language: string,
  stdinText: string,
  timeoutMs: number,
  memoryLimitMb?: number
): Promise<LocalExecutionResult> {
  const norm = (language || '').toLowerCase().trim();

  try {

  // 1. Python: perform a genuine parser validation before execution.  Looking
  // only for "SyntaxError" in a runtime traceback would misclassify valid code
  // such as `raise SyntaxError(...)`.
  if (norm === 'python' || norm === 'py') {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'judge_py_'));
    const scriptFile = path.join(tempDir, 'solution.py');
    fs.writeFileSync(scriptFile, code, 'utf-8');

    try {
      const pyCmd = process.platform === 'win32' ? 'py' : 'python3';
      const prefixArgs = process.platform === 'win32' ? ['-3'] : [];
      const syntaxCheck = await runCommand(pyCmd, [...prefixArgs, '-m', 'py_compile', scriptFile], '', COMPILATION_TIMEOUT_MS, tempDir);
      syntaxCheck.stderr = cleanPythonStderr(syntaxCheck.stderr);
      const syntaxFailure = syntaxValidationOutcome(syntaxCheck, 'Python', isPythonSyntaxDiagnostic, tempDir);
      if (syntaxFailure) return syntaxFailure;

      const runResult = await runCommand(pyCmd, [...prefixArgs, scriptFile], stdinText, timeoutMs, tempDir);
      runResult.stderr = cleanPythonStderr(runResult.stderr);
      return runtimeOutcome(runResult, tempDir);
    } finally {
      safeRemoveTempDir(tempDir);
    }
  }

  // 2. JavaScript / Node.js: Node's --check runs the parser without executing
  // participant code, preserving the distinction between parse and runtime
  // SyntaxError instances.
  if (norm === 'javascript' || norm === 'js' || norm === 'node') {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'judge_js_'));
    const scriptFile = path.join(tempDir, 'solution.js');
    fs.writeFileSync(scriptFile, code, 'utf-8');

    try {
      const syntaxCheck = await runCommand('node', ['--check', scriptFile], '', COMPILATION_TIMEOUT_MS, tempDir);
      const syntaxFailure = syntaxValidationOutcome(syntaxCheck, 'JavaScript', isJavaScriptSyntaxDiagnostic, tempDir);
      if (syntaxFailure) return syntaxFailure;

      const memoryLimit = resolvedMemoryLimitMb(memoryLimitMb);
      const runResult = await runCommand('node', [`--max-old-space-size=${memoryLimit}`, scriptFile], stdinText, timeoutMs, tempDir);
      return runtimeOutcome(runResult, tempDir);
    } finally {
      safeRemoveTempDir(tempDir);
    }
  }

  // 3. Java Execution (javac + java)
  if (norm === 'java') {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'judge_java_'));

    // Extract class name (handles public class X or class X)
    let className = 'Solution';
    const pubMatch = code.match(/public\s+class\s+([A-Za-z0-9_]+)/);
    if (pubMatch) {
      className = pubMatch[1];
    } else {
      const anyMatch = code.match(/class\s+([A-Za-z0-9_]+)/);
      if (anyMatch) className = anyMatch[1];
    }

    const sourceFile = path.join(tempDir, `${className}.java`);
    fs.writeFileSync(sourceFile, code, 'utf-8');

    try {
      // Step A: Compilation
      const compileRes = await runCommand('javac', [sourceFile], '', COMPILATION_TIMEOUT_MS, tempDir);
      const compilationFailure = compilationOutcome(compileRes, 'Java', tempDir);
      if (compilationFailure) return compilationFailure;

      // Step B: Execution
      const memoryLimit = resolvedMemoryLimitMb(memoryLimitMb);
      const runRes = await runCommand('java', [`-Xmx${memoryLimit}m`, '-cp', tempDir, className], stdinText, timeoutMs, tempDir);
      return runtimeOutcome(runRes, tempDir);
    } finally {
      safeRemoveTempDir(tempDir);
    }
  }

  // 4. C++ Execution (g++)
  if (norm === 'cpp' || norm === 'c++') {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'judge_cpp_'));
    const sourceFile = path.join(tempDir, 'solution.cpp');
    const exeFile = path.join(tempDir, process.platform === 'win32' ? 'solution.exe' : 'solution');
    fs.writeFileSync(sourceFile, code, 'utf-8');

    try {
      // Step A: Compilation
      const compileRes = await runCommand('g++', ['-O2', sourceFile, '-o', exeFile], '', COMPILATION_TIMEOUT_MS, tempDir);
      const compilationFailure = compilationOutcome(compileRes, 'C++', tempDir);
      if (compilationFailure) return compilationFailure;

      // Step B: Execution
      const runRes = await runCommand(exeFile, [], stdinText, timeoutMs, tempDir);
      return runtimeOutcome(runRes, tempDir);
    } finally {
      safeRemoveTempDir(tempDir);
    }
  }

  // 5. C Execution (gcc)
  if (norm === 'c') {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'judge_c_'));
    const sourceFile = path.join(tempDir, 'solution.c');
    const exeFile = path.join(tempDir, process.platform === 'win32' ? 'solution.exe' : 'solution');
    fs.writeFileSync(sourceFile, code, 'utf-8');

    try {
      // Step A: Compilation
      const compileRes = await runCommand('gcc', ['-O2', sourceFile, '-o', exeFile], '', COMPILATION_TIMEOUT_MS, tempDir);
      const compilationFailure = compilationOutcome(compileRes, 'C', tempDir);
      if (compilationFailure) return compilationFailure;

      // Step B: Execution
      const runRes = await runCommand(exeFile, [], stdinText, timeoutMs, tempDir);
      return runtimeOutcome(runRes, tempDir);
    } finally {
      safeRemoveTempDir(tempDir);
    }
  }

  // 6. SQL Execution (In-Memory Isolated SQLite via Python)
  if (norm === 'sql') {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'judge_sql_'));
    const runnerScript = path.join(tempDir, 'sql_runner.py');

    // Python script running sqlite3 with complete memory isolation
    const pythonSqlRunner = `
import sqlite3
import sys

setup_sql = sys.stdin.read()
con = sqlite3.connect(':memory:')
cur = con.cursor()

try:
    if setup_sql.strip():
        cur.executescript(setup_sql)
except Exception as e:
    sys.stderr.write(f"Database Setup Error: {e}\\n")
    sys.exit(1)

query = """${code.replace(/\\/g, '\\\\').replace(/"""/g, '\\"\\"\\"')}"""

try:
    cur.execute(query)
    cols = [d[0] for d in cur.description] if cur.description else []
    rows = cur.fetchall()
    output_lines = []
    if cols:
        output_lines.append(", ".join(cols))
        for r in rows:
            row_strs = ['null' if v is None else str(v) for v in r]
            output_lines.append(", ".join(row_strs))
    print("\\n".join(output_lines))
except Exception as e:
    sys.stderr.write(f"SQL Error: {e}\\n")
    sys.exit(1)
`;
    fs.writeFileSync(runnerScript, pythonSqlRunner, 'utf-8');

    try {
      const pyCmd = process.platform === 'win32' ? 'py' : 'python3';
      const pyArgs = process.platform === 'win32' ? ['-3', runnerScript] : [runnerScript];
      const res = await runCommand(pyCmd, pyArgs, stdinText, timeoutMs, tempDir);
      res.stderr = cleanPythonStderr(res.stderr);
      return runtimeOutcome(res, tempDir);
    } finally {
      safeRemoveTempDir(tempDir);
    }
  }

    // Unsupported languages are configuration/execution failures, not a
    // participant compiler error.
    return executionEnvironmentError('The selected language is not configured for execution.');
  } catch (error) {
    return executionEnvironmentError(
      error instanceof Error ? `The execution environment could not prepare this submission: ${error.message}` : 'The execution environment could not prepare this submission.'
    );
  }
}

export async function executeSingleTestCase(
  code: string,
  langKey: string,
  input: string,
  timeLimitMs: number = 3000,
  memoryLimitMb?: number
): Promise<JudgeExecutionResult> {
  const normLang = (langKey || '').toLowerCase().trim();
  const langConfig = LANGUAGE_MAP[normLang] || { language: normLang, version: '*' };

  // A security-policy rejection is neither a compiler nor a runtime failure in
  // participant code. Keep it in the explicit Execution Error category.
  const securityCheck = validateCodeSecurity(code, normLang);
  if (!securityCheck.safe) {
    const diagnostic = sanitizeDiagnostics(securityCheck.reason || 'This submission cannot be executed by the configured judge policy.');
    return {
      stdout: '',
      stderr: diagnostic,
      executionError: diagnostic,
      timeout: false,
      runtimeMs: 0,
      exitCode: 1,
      verdict: 'execution_error'
    };
  }

  return queue.enqueue(async () => {
    const startTime = Date.now();
    const memoryLimit = resolvedMemoryLimitMb(memoryLimitMb);

    // 1. Try external Piston judge first (if configured with custom non-emkc URL)
    if (ENV.PISTON_URL && !ENV.PISTON_URL.includes('emkc.org')) {
      try {
        const payload = {
          language: langConfig.language,
          version: langConfig.version,
          files: [{ name: normLang === 'java' ? 'Solution.java' : undefined, content: code }],
          stdin: input,
          compile_timeout: COMPILATION_TIMEOUT_MS,
          run_timeout: Math.max(1000, timeLimitMs),
          run_memory_limit: memoryLimit * 1024 * 1024
        };

        const response = await axios.post<PistonRunResponse>(
          `${ENV.PISTON_URL}/execute`,
          payload,
          { timeout: timeLimitMs + 5000 }
        );

        const elapsed = Date.now() - startTime;
        const data = response.data;

        if (data.compile && data.compile.code !== 0) {
          const diagnostic = sanitizeDiagnostics(data.compile.stderr || data.compile.stdout || data.compile.output);
          const isInterpretedSyntax = (normLang === 'python' || normLang === 'py')
            ? isPythonSyntaxDiagnostic(diagnostic)
            : (normLang === 'javascript' || normLang === 'js' || normLang === 'node') && isJavaScriptSyntaxDiagnostic(diagnostic);
          return {
            stdout: '',
            stderr: diagnostic || `The configured compiler exited with code ${data.compile.code} without emitting a diagnostic.`,
            compileError: diagnostic || `The configured compiler exited with code ${data.compile.code} without emitting a diagnostic.`,
            ...(isInterpretedSyntax ? { syntaxError: diagnostic || `The configured interpreter reported a syntax error.` } : {}),
            timeout: false,
            runtimeMs: elapsed,
            exitCode: data.compile.code,
            verdict: isInterpretedSyntax ? 'syntax_error' : 'compilation_error'
          };
        }

        const run = data.run;
        if (run) {
          // A Piston run-stage exception is runtime by definition. In
          // particular, a program which throws SyntaxError must not be called a
          // parser error merely because that word appears in its stack trace.
          const remoteOutcome = runtimeOutcome({
            stdout: run.stdout || '',
            stderr: run.stderr || run.output || '',
            timedOut: run.signal === 'SIGKILL' || run.signal === 'SIGTERM',
            exitCode: typeof run.code === 'number' ? run.code : 1,
            outputLimitExceeded: false
          });
          return {
            ...remoteOutcome,
            runtimeMs: elapsed,
          };
        }

        const diagnostic = sanitizeDiagnostics(data.message || 'The configured execution service returned no program result.');
        return {
          stdout: '',
          stderr: diagnostic,
          executionError: diagnostic,
          timeout: false,
          runtimeMs: elapsed,
          exitCode: 1,
          verdict: 'execution_error'
        };
      } catch (err: any) {
        console.warn('External judge returned error, falling back to local runner:', err.message);
      }
    }

    // 2. Native Multi-Language Local Runner (Python, Node.js, Java, C++, C, SQL)
    const localRes = await executeLocal(code, normLang, input, timeLimitMs, memoryLimit);
    const elapsed = Date.now() - startTime;

    return {
      stdout: localRes.stdout,
      stderr: localRes.stderr,
      compileError: localRes.compileError,
      syntaxError: localRes.syntaxError,
      runtimeError: localRes.runtimeError,
      memoryError: localRes.memoryError,
      executionError: localRes.executionError,
      timeout: localRes.timeout,
      runtimeMs: elapsed,
      exitCode: localRes.exitCode,
      verdict: localRes.verdict
    };
  });
}

export function normalizeOutput(str: string): string {
  return (str || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trim();
}

// Robust Output Comparison: Prevents harmless trailing whitespace / formatting discrepancies from failing correct solutions
export function compareOutputs(actual: string, expected: string): boolean {
  const aNorm = normalizeOutput(actual);
  const eNorm = normalizeOutput(expected);
  if (aNorm === eNorm) return true;

  // Case-insensitive direct comparison
  if (aNorm.toLowerCase() === eNorm.toLowerCase()) {
    return true;
  }

  // Token-by-token comparison (handles multiple whitespace or brackets)
  const aTokens = aNorm.split(/\s+/).filter(Boolean);
  const eTokens = eNorm.split(/\s+/).filter(Boolean);
  if (aTokens.length > 0 && aTokens.length === eTokens.length) {
    const allTokensMatch = aTokens.every((tok, idx) => {
      const eTok = eTokens[idx];
      if (tok === eTok || tok.toLowerCase() === eTok.toLowerCase()) return true;
      const numA = Number(tok);
      const numB = Number(eTok);
      if (!isNaN(numA) && !isNaN(numB) && Math.abs(numA - numB) < 1e-6) {
        return true;
      }
      return false;
    });
    if (allTokensMatch) return true;
  }

  // Line-by-line comparison ignoring trailing line spaces
  const aLines = aNorm.split('\n').map(l => l.trim()).filter(Boolean);
  const eLines = eNorm.split('\n').map(l => l.trim()).filter(Boolean);
  if (aLines.length > 0 && aLines.length === eLines.length) {
    const linesMatch = aLines.every((l, idx) => l === eLines[idx] || l.toLowerCase() === eLines[idx].toLowerCase());
    if (linesMatch) return true;
  }

  // Handle SQL colon vs newline format differences (e.g. "SecondHighestSalary: 200" vs "SecondHighestSalary\n200")
  const aCleanColon = aNorm.replace(/:\s+/g, '\n').replace(/:\n/g, '\n');
  const eCleanColon = eNorm.replace(/:\s+/g, '\n').replace(/:\n/g, '\n');
  if (aCleanColon === eCleanColon || aCleanColon.toLowerCase() === eCleanColon.toLowerCase()) {
    return true;
  }

  // If actual has headers + rows, check if rows alone match expected (or vice versa)
  if (aLines.length > 1) {
    const aRowsOnly = aLines.slice(1).join('\n');
    if (aRowsOnly === eNorm || aRowsOnly.toLowerCase() === eNorm.toLowerCase()) {
      return true;
    }
  }
  if (eLines.length > 1) {
    const eRowsOnly = eLines.slice(1).join('\n');
    if (eRowsOnly === aNorm || eRowsOnly.toLowerCase() === aNorm.toLowerCase()) {
      return true;
    }
  }

  return false;
}

export async function runTestCases(
  code: string,
  language: string,
  testCases: ITestCase[],
  timeLimitMs: number = 3000,
  memoryLimitMb?: number
): Promise<IAttemptTestCaseResult[]> {
  const results: IAttemptTestCaseResult[] = [];
  let earlyPreparationFailure: Pick<IAttemptTestCaseResult, 'status' | 'stderr' | 'compileError' | 'syntaxError' | 'executionError'> | undefined;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];

    if (earlyPreparationFailure) {
      results.push({
        passed: false,
        status: earlyPreparationFailure.status,
        runtimeMs: 0,
        stdout: '',
        stderr: earlyPreparationFailure.stderr,
        compileError: earlyPreparationFailure.compileError,
        syntaxError: earlyPreparationFailure.syntaxError,
        executionError: earlyPreparationFailure.executionError,
        timeout: false,
        isHidden: tc.isHidden,
        input: tc.isHidden ? undefined : tc.input,
        expected: tc.isHidden ? undefined : tc.expectedOutput,
        actual: ''
      });
      continue;
    }

    const execRes = await executeSingleTestCase(code, language, tc.input, timeLimitMs, memoryLimitMb);
    const passed = compareOutputs(execRes.stdout, tc.expectedOutput);

    let status: IAttemptTestCaseResult['status'] = 'failed';

    switch (execRes.verdict) {
      case 'compilation_error':
        status = 'compile_error';
        earlyPreparationFailure = {
          status,
          stderr: execRes.stderr,
          compileError: execRes.compileError
        };
        break;
      case 'syntax_error':
        status = 'syntax_error';
        earlyPreparationFailure = {
          status,
          stderr: execRes.stderr,
          compileError: execRes.compileError,
          syntaxError: execRes.syntaxError || execRes.compileError
        };
        break;
      case 'time_limit_exceeded':
        status = 'timeout';
        break;
      case 'memory_limit_exceeded':
        status = 'memory_limit';
        break;
      case 'execution_error':
        status = 'execution_error';
        earlyPreparationFailure = {
          status,
          stderr: execRes.stderr,
          executionError: execRes.executionError
        };
        break;
      case 'runtime_error':
        status = 'runtime_error';
        break;
      case 'accepted':
        status = passed ? 'passed' : 'failed';
        break;
      default:
        status = 'failed';
    }

    results.push({
      passed: status === 'passed',
      status,
      runtimeMs: execRes.runtimeMs,
      stdout: execRes.stdout,
      stderr: execRes.stderr,
      compileError: execRes.compileError,
      syntaxError: execRes.syntaxError,
      runtimeError: execRes.runtimeError,
      memoryError: execRes.memoryError,
      executionError: execRes.executionError,
      timeout: execRes.timeout,
      isHidden: tc.isHidden,
      input: tc.isHidden ? undefined : tc.input,
      expected: tc.isHidden ? undefined : tc.expectedOutput,
      actual: tc.isHidden ? undefined : execRes.stdout
    });
  }

  return results;
}

export type ParticipantExecutionStatus =
  | 'Accepted'
  | 'Wrong Answer'
  | 'Compilation Error'
  | 'Syntax Error'
  | 'Runtime Error'
  | 'Time Limit Exceeded'
  | 'Memory Limit Exceeded'
  | 'Execution Error';

/**
 * Convert low-level per-test outcomes into the single participant verdict used
 * by both Run and Submit. Hidden-test privacy remains the route's policy; this
 * helper intentionally receives no question, expected output, or source code.
 */
export function summarizeTestResults(
  results: IAttemptTestCaseResult[],
  timeLimitMs: number = 3000
): {
  status: ParticipantExecutionStatus;
  message: string;
  compileOutput: string | null;
  runtimeOutput: string | null;
  executionOutput: string | null;
} {
  const visibleResults = results.filter(result => !result.isHidden);
  // Compile/parser diagnostics are generated before stdin is supplied, so they
  // remain safe even if the first configured case is hidden. Runtime and
  // execution diagnostics can contain participant-controlled echoes of stdin;
  // only return those when they came from a visible case.
  const compileOutput = results.find(result => result.compileError)?.compileError
    || results.find(result => result.syntaxError)?.syntaxError
    || null;
  const runtimeOutput = visibleResults.find(result => result.runtimeError)?.runtimeError
    || visibleResults.find(result => result.memoryError)?.memoryError
    || null;
  const executionOutput = visibleResults.find(result => result.executionError)?.executionError || null;

  // Judge setup/parse failures are global to a submission, so they take
  // precedence over per-test outcomes. The rest use a deterministic severity
  // order rather than test-case order.
  if (results.some(result => result.status === 'syntax_error')) {
      return {
        status: 'Syntax Error',
        message: 'The interpreter could not parse this submission. Inspect the diagnostic below.',
        compileOutput: compileOutput ? sanitizeDiagnostics(compileOutput) : null,
        runtimeOutput: null,
        executionOutput: null
      };
  }
  if (results.some(result => result.status === 'compile_error')) {
      return {
        status: 'Compilation Error',
        message: 'Compilation failed. Inspect the compiler diagnostic below.',
        compileOutput: compileOutput ? sanitizeDiagnostics(compileOutput) : null,
        runtimeOutput: null,
        executionOutput: null
      };
  }
  if (results.some(result => result.status === 'execution_error')) {
      return {
        status: 'Execution Error',
        message: 'The judge could not complete this execution.',
        compileOutput: null,
        runtimeOutput: null,
        executionOutput: executionOutput ? sanitizeDiagnostics(executionOutput) : null
      };
  }
  if (results.some(result => result.status === 'memory_limit')) {
      return {
        status: 'Memory Limit Exceeded',
        message: 'Execution exceeded the configured memory limit.',
        compileOutput: null,
        runtimeOutput: runtimeOutput ? sanitizeDiagnostics(runtimeOutput) : null,
        executionOutput: null
      };
  }
  if (results.some(result => result.status === 'timeout')) {
      return {
        status: 'Time Limit Exceeded',
        message: `Execution exceeded the ${timeLimitMs}ms time limit.`,
        compileOutput: null,
        runtimeOutput: null,
        executionOutput: null
      };
  }
  if (results.some(result => result.status === 'runtime_error')) {
      return {
        status: 'Runtime Error',
        message: 'Program terminated during execution. Inspect the runtime diagnostic below.',
        compileOutput: null,
        runtimeOutput: runtimeOutput ? sanitizeDiagnostics(runtimeOutput) : null,
        executionOutput: null
      };
  }

  if (results.length > 0 && results.every(result => result.passed)) {
    return {
      status: 'Accepted',
      message: 'Accepted! All evaluated test cases passed.',
      compileOutput: null,
      runtimeOutput: null,
      executionOutput: null
    };
  }

  return {
    status: 'Wrong Answer',
    message: 'One or more evaluated test cases produced different output.',
    compileOutput: null,
    runtimeOutput: null,
    executionOutput: null
  };
}

export function sanitizeResultsForParticipant(
  results: IAttemptTestCaseResult[]
): Array<Partial<IAttemptTestCaseResult> & { testNumber: number }> {
  // CRITICAL SECURITY RULE: Hidden test cases must never be returned to participants.
  // Filter out any hidden test case result so zero hidden test data exists in the client response.
  return results
    .filter(r => !r.isHidden)
    .map((r, idx) => ({
      testNumber: idx + 1,
      passed: r.passed,
      status: r.status,
      runtimeMs: r.runtimeMs,
      isHidden: false,
      input: r.input,
      expected: r.expected,
      actual: r.actual,
      compileError: r.compileError ? sanitizeDiagnostics(r.compileError) : undefined,
      syntaxError: r.syntaxError ? sanitizeDiagnostics(r.syntaxError) : undefined,
      runtimeError: r.runtimeError ? sanitizeDiagnostics(r.runtimeError) : undefined,
      memoryError: r.memoryError ? sanitizeDiagnostics(r.memoryError) : undefined,
      executionError: r.executionError ? sanitizeDiagnostics(r.executionError) : undefined
    }));
}
