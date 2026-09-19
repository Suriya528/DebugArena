import axios from 'axios';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ENV } from '../config/env.js';
import { ITestCase } from '../models/Question.js';
import { IAttemptTestCaseResult } from '../models/Attempt.js';

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
        return { safe: false, reason: `Security Restriction: Disallowed Python system module or API call (${pattern.source})` };
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
        return { safe: false, reason: `Security Restriction: Disallowed Node.js system API call (${pattern.source})` };
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
        return { safe: false, reason: `Security Restriction: Disallowed Java system execution (${pattern.source})` };
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
        return { safe: false, reason: `Security Restriction: Disallowed C/C++ system call (${pattern.source})` };
      }
    }
  } else if (normLang === 'sql') {
    const forbiddenPatterns = [
      /\bATTACH\s+DATABASE\b/i,
      /\bPRAGMA\s+writable_schema\b/i
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(code)) {
        return { safe: false, reason: `Security Restriction: Disallowed SQL administrative command (${pattern.source})` };
      }
    }
  }

  return { safe: true };
}

// Low-level helper to execute a CLI process with stdin, timeout, and process cleanup
function runCommand(
  cmd: string,
  args: string[],
  stdinText: string = '',
  timeoutMs: number = 3000,
  cwd?: string
): Promise<{ stdout: string; stderr: string; timedOut: boolean; exitCode: number }> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const child = spawn(cmd, args, {
      windowsHide: true,
      cwd: cwd || process.cwd(),
      env: process.env
    });

    const timer = setTimeout(() => {
      timedOut = true;
      if (process.platform === 'win32' && child.pid) {
        spawn('taskkill', ['/F', '/T', '/PID', child.pid.toString()], { windowsHide: true });
      } else {
        child.kill('SIGKILL');
      }
    }, timeoutMs);

    child.stdout?.on('data', (d) => { stdout += d.toString(); });
    child.stderr?.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, timedOut, exitCode: code ?? 0 });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ stdout: '', stderr: err.message, timedOut: false, exitCode: 1 });
    });

    if (stdinText && child.stdin) {
      child.stdin.write(stdinText);
    }
    child.stdin?.end();
  });
}

// Multi-Language Native Local Runner
async function executeLocal(
  code: string,
  language: string,
  stdinText: string,
  timeoutMs: number
): Promise<{ stdout: string; stderr: string; compileError?: string; runtimeError?: string; timeout: boolean; exitCode: number }> {
  const norm = (language || '').toLowerCase().trim();

  // 1. Python Execution
  if (norm === 'python' || norm === 'py') {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'judge_py_'));
    const scriptFile = path.join(tempDir, 'solution.py');
    fs.writeFileSync(scriptFile, code, 'utf-8');

    try {
      const res = await runCommand('py', ['-3', scriptFile], stdinText, timeoutMs, tempDir);
      // Filter out benign Windows Python initialization messages
      const cleanStderr = res.stderr
        .split('\n')
        .filter(line => !line.includes('Could not find platform independent libraries'))
        .join('\n')
        .trim();

      const isSyntaxError = cleanStderr.includes('SyntaxError') || cleanStderr.includes('IndentationError');
      const isRuntimeError = !isSyntaxError && (res.exitCode !== 0 || res.timedOut);

      return {
        stdout: res.stdout.trim(),
        stderr: cleanStderr,
        compileError: isSyntaxError ? cleanStderr : undefined,
        runtimeError: isRuntimeError ? (res.timedOut ? 'Time Limit Exceeded' : cleanStderr || `Process exited with code ${res.exitCode}`) : undefined,
        timeout: res.timedOut,
        exitCode: res.exitCode
      };
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  // 2. JavaScript / Node.js Execution
  if (norm === 'javascript' || norm === 'js' || norm === 'node') {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'judge_js_'));
    const scriptFile = path.join(tempDir, 'solution.js');
    fs.writeFileSync(scriptFile, code, 'utf-8');

    try {
      const res = await runCommand('node', [scriptFile], stdinText, timeoutMs, tempDir);
      const cleanStderr = res.stderr.trim();
      const isSyntaxError = cleanStderr.includes('SyntaxError');
      const isRuntimeError = !isSyntaxError && (res.exitCode !== 0 || res.timedOut);

      return {
        stdout: res.stdout.trim(),
        stderr: cleanStderr,
        compileError: isSyntaxError ? cleanStderr : undefined,
        runtimeError: isRuntimeError ? (res.timedOut ? 'Time Limit Exceeded' : cleanStderr || `Process exited with code ${res.exitCode}`) : undefined,
        timeout: res.timedOut,
        exitCode: res.exitCode
      };
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
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
      const compileRes = await runCommand('javac', [sourceFile], '', 10000, tempDir);
      if (compileRes.exitCode !== 0) {
        return {
          stdout: '',
          stderr: compileRes.stderr.trim(),
          compileError: compileRes.stderr.trim() || 'Java compilation failed',
          timeout: false,
          exitCode: compileRes.exitCode
        };
      }

      // Step B: Execution
      const runRes = await runCommand('java', ['-Xmx256m', '-cp', tempDir, className], stdinText, timeoutMs, tempDir);
      const isRuntimeError = runRes.exitCode !== 0 || runRes.timedOut;

      return {
        stdout: runRes.stdout.trim(),
        stderr: runRes.stderr.trim(),
        compileError: undefined,
        runtimeError: isRuntimeError ? (runRes.timedOut ? 'Time Limit Exceeded' : runRes.stderr.trim() || `Process exited with code ${runRes.exitCode}`) : undefined,
        timeout: runRes.timedOut,
        exitCode: runRes.exitCode
      };
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  // 4. C++ Execution (g++)
  if (norm === 'cpp' || norm === 'c++') {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'judge_cpp_'));
    const sourceFile = path.join(tempDir, 'solution.cpp');
    const exeFile = path.join(tempDir, 'solution.exe');
    fs.writeFileSync(sourceFile, code, 'utf-8');

    try {
      // Step A: Compilation
      const compileRes = await runCommand('g++', ['-O2', sourceFile, '-o', exeFile], '', 10000, tempDir);
      if (compileRes.exitCode !== 0) {
        return {
          stdout: '',
          stderr: compileRes.stderr.trim(),
          compileError: compileRes.stderr.trim() || 'C++ compilation failed',
          timeout: false,
          exitCode: compileRes.exitCode
        };
      }

      // Step B: Execution
      const runRes = await runCommand(exeFile, [], stdinText, timeoutMs, tempDir);
      const isRuntimeError = runRes.exitCode !== 0 || runRes.timedOut;

      return {
        stdout: runRes.stdout.trim(),
        stderr: runRes.stderr.trim(),
        compileError: undefined,
        runtimeError: isRuntimeError ? (runRes.timedOut ? 'Time Limit Exceeded' : runRes.stderr.trim() || `Process exited with code ${runRes.exitCode}`) : undefined,
        timeout: runRes.timedOut,
        exitCode: runRes.exitCode
      };
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  // 5. C Execution (gcc)
  if (norm === 'c') {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'judge_c_'));
    const sourceFile = path.join(tempDir, 'solution.c');
    const exeFile = path.join(tempDir, 'solution.exe');
    fs.writeFileSync(sourceFile, code, 'utf-8');

    try {
      // Step A: Compilation
      const compileRes = await runCommand('gcc', ['-O2', sourceFile, '-o', exeFile], '', 10000, tempDir);
      if (compileRes.exitCode !== 0) {
        return {
          stdout: '',
          stderr: compileRes.stderr.trim(),
          compileError: compileRes.stderr.trim() || 'C compilation failed',
          timeout: false,
          exitCode: compileRes.exitCode
        };
      }

      // Step B: Execution
      const runRes = await runCommand(exeFile, [], stdinText, timeoutMs, tempDir);
      const isRuntimeError = runRes.exitCode !== 0 || runRes.timedOut;

      return {
        stdout: runRes.stdout.trim(),
        stderr: runRes.stderr.trim(),
        compileError: undefined,
        runtimeError: isRuntimeError ? (runRes.timedOut ? 'Time Limit Exceeded' : runRes.stderr.trim() || `Process exited with code ${runRes.exitCode}`) : undefined,
        timeout: runRes.timedOut,
        exitCode: runRes.exitCode
      };
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
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
      const res = await runCommand('py', ['-3', runnerScript], stdinText, timeoutMs, tempDir);
      const cleanStderr = res.stderr
        .split('\n')
        .filter(line => !line.includes('Could not find platform independent libraries'))
        .join('\n')
        .trim();

      const isSqlError = res.exitCode !== 0 || res.timedOut;

      return {
        stdout: res.stdout.trim(),
        stderr: cleanStderr,
        compileError: undefined,
        runtimeError: isSqlError ? (res.timedOut ? 'Time Limit Exceeded' : cleanStderr || `SQL execution failed`) : undefined,
        timeout: res.timedOut,
        exitCode: res.exitCode
      };
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  // Unsupported Language
  return {
    stdout: '',
    stderr: `Unsupported language: '${language}'`,
    compileError: `Unsupported language: '${language}'`,
    timeout: false,
    exitCode: 1
  };
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
  const normLang = (langKey || '').toLowerCase().trim();
  const langConfig = LANGUAGE_MAP[normLang] || { language: normLang, version: '*' };

  // Enforce pre-execution AST & regex security scan
  const securityCheck = validateCodeSecurity(code, normLang);
  if (!securityCheck.safe) {
    return {
      stdout: '',
      stderr: securityCheck.reason || 'Restricted code execution blocked by security policy',
      compileError: securityCheck.reason || 'Restricted code execution blocked by security policy',
      timeout: false,
      runtimeMs: 0,
      exitCode: 1
    };
  }

  return queue.enqueue(async () => {
    const startTime = Date.now();

    // 1. Try external Piston judge first (if configured with custom non-emkc URL)
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

    // 2. Native Multi-Language Local Runner (Python, Node.js, Java, C++, C, SQL)
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
  timeLimitMs: number = 3000
): Promise<IAttemptTestCaseResult[]> {
  const results: IAttemptTestCaseResult[] = [];
  let earlyCompileError: string | undefined;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];

    if (earlyCompileError) {
      results.push({
        passed: false,
        status: 'compile_error',
        runtimeMs: 0,
        stdout: '',
        stderr: earlyCompileError,
        compileError: earlyCompileError,
        timeout: false,
        isHidden: tc.isHidden,
        input: tc.isHidden ? undefined : tc.input,
        expected: tc.isHidden ? undefined : tc.expectedOutput,
        actual: ''
      });
      continue;
    }

    const execRes = await executeSingleTestCase(code, language, tc.input, timeLimitMs);
    const passed = compareOutputs(execRes.stdout, tc.expectedOutput);

    let status: IAttemptTestCaseResult['status'] = 'failed';

    if (execRes.compileError) {
      status = 'compile_error';
      earlyCompileError = execRes.compileError;
    } else if (execRes.timeout) {
      status = 'timeout';
    } else if (execRes.runtimeError) {
      status = 'runtime_error';
    } else if (passed) {
      status = 'passed';
    } else {
      status = 'failed';
    }

    results.push({
      passed: status === 'passed',
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
      compileError: r.compileError,
      runtimeError: r.runtimeError
    }));
}
