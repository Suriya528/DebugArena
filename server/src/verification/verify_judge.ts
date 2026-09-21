import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  compareOutputs,
  executeSingleTestCase,
  runTestCases,
  sanitizeDiagnostics,
  sanitizeResultsForParticipant,
  summarizeTestResults,
  validateCodeSecurity
} from '../services/judgeService.js';
import { requireIsolatedVerification } from './safety.js';

type LanguageScenario = {
  language: string;
  correct: string;
  wrong: string;
  syntaxError: string;
  undeclaredIdentifier: string;
  invalidType: string;
  multipleErrors: string;
  runtimeError: string;
  timeout: string;
};

function commandAvailable(command: string, args: string[] = ['--version']): boolean {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    timeout: 5_000,
    windowsHide: true
  });
  return !result.error && result.status === 0;
}

function reportBlocked(language: string, reason: string): void {
  console.log(`[ENVIRONMENT BLOCKED] ${language}: ${reason}`);
}

async function verifyLanguage(scenario: LanguageScenario): Promise<void> {
  const correct = await executeSingleTestCase(scenario.correct, scenario.language, '2\n', 1_000);
  assert.equal(correct.verdict, 'accepted', `${scenario.language}: correct solution must run`);
  assert.equal(compareOutputs(correct.stdout, '4'), true, `${scenario.language}: correct solution output`);

  const wrong = await executeSingleTestCase(scenario.wrong, scenario.language, '2\n', 1_000);
  assert.equal(wrong.verdict, 'accepted', `${scenario.language}: wrong answer should execute`);
  assert.equal(compareOutputs(wrong.stdout, '4'), false, `${scenario.language}: wrong answer must be distinguished`);

  for (const [label, source] of [
    ['syntax', scenario.syntaxError],
    ['undeclared identifier', scenario.undeclaredIdentifier],
    ['invalid type', scenario.invalidType],
    ['multiple errors', scenario.multipleErrors]
  ] as const) {
    const compileError = await executeSingleTestCase(source, scenario.language, '2\n', 1_000);
    // JavaScript resolves names dynamically; only parser-invalid forms are
    // syntax errors, while a missing name is a genuine runtime exception.
    const expectedVerdict = scenario.language === 'javascript'
      ? (label === 'undeclared identifier' ? 'runtime_error' : 'syntax_error')
      : 'compilation_error';
    assert.equal(compileError.verdict, expectedVerdict, `${scenario.language}: ${label} must be parser/compiler error`);
    if (expectedVerdict === 'runtime_error') {
      assert.equal(typeof compileError.runtimeError, 'string', `${scenario.language}: ${label} must preserve runtime diagnostic`);
    } else {
      assert.equal(typeof compileError.compileError, 'string', `${scenario.language}: ${label} must preserve compiler diagnostic`);
    }
  }

  const runtimeError = await executeSingleTestCase(scenario.runtimeError, scenario.language, '2\n', 1_000);
  assert.equal(runtimeError.verdict, 'runtime_error', `${scenario.language}: runtime error must be classified`);

  const timeout = await executeSingleTestCase(scenario.timeout, scenario.language, '2\n', 350);
  assert.equal(timeout.verdict, 'time_limit_exceeded', `${scenario.language}: infinite program must time out`);

  console.log(`[VERIFIED] ${scenario.language} judging: correct, wrong answer, syntax/compiler diagnostics, runtime error, timeout.`);
}

async function verifyJavaScript(): Promise<void> {
  await verifyLanguage({
    language: 'javascript',
    correct: "const fs = require('fs'); const n = Number(fs.readFileSync(0, 'utf8').trim()); console.log(n * 2);",
    wrong: 'console.log(999);',
    syntaxError: 'const = ;',
    undeclaredIdentifier: 'missingName();',
    // JavaScript is dynamically typed, so parser failures provide its
    // equivalent static validation; the runtime case is tested separately.
    invalidType: 'const value = ;',
    multipleErrors: 'const = ;\nfunction {',
    runtimeError: "throw new Error('expected runtime failure');",
    timeout: 'while (true) {}'
  });

  const syntaxError = await executeSingleTestCase('const = ;', 'javascript', '', 1_000);
  assert.equal(syntaxError.verdict, 'syntax_error', 'JavaScript parser failure must be syntax error');
  assert.equal(typeof syntaxError.syntaxError, 'string', 'JavaScript parser diagnostic is preserved');
  assert.match(syntaxError.syntaxError || '', /SyntaxError/, 'JavaScript parser output is authentic');

  const runtimeSyntaxError = await executeSingleTestCase("throw new SyntaxError('raised at runtime');", 'javascript', '', 1_000);
  assert.equal(runtimeSyntaxError.verdict, 'runtime_error', 'Runtime SyntaxError instance must not be parser failure');

  const memoryError = await executeSingleTestCase(
    'const items = []; while (true) items.push(new Array(1024 * 1024).fill(0));',
    'javascript',
    '',
    10_000,
    16
  );
  assert.equal(memoryError.verdict, 'memory_limit_exceeded', 'Node heap exhaustion must be memory-limit error');

  const syntaxSummary = summarizeTestResults(await runTestCases(
    'const = ;',
    'javascript',
    [{ input: '', expectedOutput: '', isHidden: false, weight: 1 }],
    1_000
  ));
  assert.equal(syntaxSummary.status, 'Syntax Error', 'participant summary must preserve syntax category');

  const results = await runTestCases(
    'console.log(4);',
    'javascript',
    [
      { input: '', expectedOutput: '4', isHidden: false, weight: 10 },
      { input: 'private-input', expectedOutput: 'secret-output', isHidden: true, weight: 10 }
    ],
    1_000
  );
  const participantResults = sanitizeResultsForParticipant(results);
  assert.equal(participantResults.length, 1, 'hidden test result must not be returned to a participant');
  assert.equal(JSON.stringify(participantResults).includes('secret-output'), false, 'hidden expected output must stay private');
  assert.equal(JSON.stringify(participantResults).includes('private-input'), false, 'hidden input must stay private');

  const hiddenRuntimeResults = await runTestCases(
    "const fs = require('fs'); const input = fs.readFileSync(0, 'utf8'); if (input.includes('private-input')) throw new Error(input); console.log(4);",
    'javascript',
    [
      { input: 'visible-input', expectedOutput: '4', isHidden: false, weight: 10 },
      { input: 'private-input', expectedOutput: '4', isHidden: true, weight: 10 }
    ],
    1_000
  );
  const hiddenRuntimeSummary = summarizeTestResults(hiddenRuntimeResults);
  assert.equal(hiddenRuntimeSummary.status, 'Runtime Error', 'a hidden runtime failure must retain its verdict');
  assert.equal(JSON.stringify(hiddenRuntimeSummary).includes('private-input'), false, 'hidden runtime diagnostics must not expose hidden stdin');
  console.log('[VERIFIED] JavaScript hidden-test isolation.');
}

function verifyDiagnosticSanitization(): void {
  const diagnostic = sanitizeDiagnostics('C:\\internal\\server\\tmp\\submission_42\\Solution.java:12: error: ; expected\nhttps://judge.internal.example/token=secret');
  assert.match(diagnostic, /Solution\.java:12/, 'safe filename and location must remain visible');
  assert.equal(/submission_42|judge\.internal|secret/i.test(diagnostic), false, 'internal paths, URLs, and credentials must be redacted');
  console.log('[VERIFIED] compiler diagnostic sanitization.');
}

async function verifySql(): Promise<void> {
  const readOnlyCte = validateCodeSecurity('WITH values_cte(value) AS (SELECT 7) SELECT value FROM values_cte;', 'sql');
  assert.equal(readOnlyCte.safe, true, 'read-only SQL SELECT and WITH queries must remain allowed');
  const writeAttempt = validateCodeSecurity('DELETE FROM items;', 'sql');
  assert.equal(writeAttempt.safe, false, 'SQL write statements must be rejected before execution');

  if (!commandAvailable('py', ['-3', '--version'])) {
    reportBlocked('SQL', 'Python 3 with sqlite3 is not available to the local judge.');
    return;
  }

  const setup = 'CREATE TABLE items(id INTEGER, value INTEGER); INSERT INTO items VALUES (1, 7), (2, 9);';
  const correct = await executeSingleTestCase('SELECT value FROM items WHERE id = 1;', 'sql', setup, 1_000);
  assert.equal(correct.runtimeError, undefined, 'SQL correct query must run');
  assert.equal(compareOutputs(correct.stdout, 'value\n7'), true, 'SQL correct query result comparison');

  const wrong = await executeSingleTestCase('SELECT value FROM items WHERE id = 2;', 'sql', setup, 1_000);
  assert.equal(compareOutputs(wrong.stdout, 'value\n7'), false, 'SQL wrong query must be distinguished');

  const runtimeError = await executeSingleTestCase('SELECT missing_column FROM items;', 'sql', setup, 1_000);
  assert.equal(typeof runtimeError.runtimeError, 'string', 'SQL invalid query must be classified as runtime error');

  const timeout = await executeSingleTestCase(
    'WITH RECURSIVE counter(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM counter) SELECT x FROM counter;',
    'sql',
    setup,
    350
  );
  assert.equal(timeout.timeout, true, 'SQL unbounded query must time out');

  const results = await runTestCases(
    'SELECT value FROM items WHERE id = 1;',
    'sql',
    [
      { input: setup, expectedOutput: 'value\n7', isHidden: false, weight: 10 },
      { input: 'CREATE TABLE secret(value TEXT); INSERT INTO secret VALUES (\'private\');', expectedOutput: 'private', isHidden: true, weight: 10 }
    ],
    1_000
  );
  const participantResults = sanitizeResultsForParticipant(results);
  assert.equal(participantResults.length, 1, 'SQL hidden test must not be returned to participant');
  assert.equal(JSON.stringify(participantResults).includes('private'), false, 'SQL hidden test data must stay private');
  console.log('[VERIFIED] SQL judging: correct, wrong query, comparison, read-only guard, timeout, hidden isolation.');
}

async function verifyPython(): Promise<void> {
  const syntax = await executeSingleTestCase('def broken(:\n    pass', 'python', '', 1_000);
  assert.equal(syntax.verdict, 'syntax_error', 'Python SyntaxError must be detected before execution');
  assert.equal(typeof syntax.syntaxError, 'string', 'Python SyntaxError diagnostic must be retained');

  const indentation = await executeSingleTestCase('if True:\nprint(1)', 'python', '', 1_000);
  assert.equal(indentation.verdict, 'syntax_error', 'Python indentation error must be syntax error');

  const runtimeSyntaxError = await executeSingleTestCase("raise SyntaxError('raised at runtime')", 'python', '', 1_000);
  assert.equal(runtimeSyntaxError.verdict, 'runtime_error', 'Python runtime SyntaxError must not become a parser error');

  const correct = await executeSingleTestCase('import sys\nprint(int(sys.stdin.read().strip()) * 2)', 'python', '2\n', 1_000);
  assert.equal(correct.verdict, 'accepted', 'Python valid code must execute');
  const wrong = await executeSingleTestCase('print(999)', 'python', '2\n', 1_000);
  assert.equal(compareOutputs(wrong.stdout, '4'), false, 'Python wrong output must remain distinguishable');
  const timeout = await executeSingleTestCase('while True:\n    pass', 'python', '', 350);
  assert.equal(timeout.verdict, 'time_limit_exceeded', 'Python infinite code must time out');
  console.log('[VERIFIED] Python syntax, indentation, runtime, wrong output, timeout, accepted.');
}

export async function runJudgeVerification(): Promise<void> {
  requireIsolatedVerification('Online judge verification');
  assert.equal(compareOutputs('Hello   World\n', 'hello world'), true, 'output comparison normalizes harmless formatting');
  verifyDiagnosticSanitization();

  await verifyJavaScript();

  const scenarios: Array<{ label: string; available: boolean; reason: string; scenario: LanguageScenario }> = [
    {
      label: 'C',
      available: commandAvailable('gcc'),
      reason: 'gcc is not available on PATH.',
      scenario: {
        language: 'c',
        correct: '#include <stdio.h>\nint main(void) { int n; scanf("%d", &n); printf("%d\\n", n * 2); return 0; }',
        wrong: '#include <stdio.h>\nint main(void) { puts("999"); return 0; }',
        syntaxError: 'int main(void) { return 0 }',
        undeclaredIdentifier: 'int main(void) { return missing_name; }',
        invalidType: 'int main(void) { struct Missing value; return 0; }',
        multipleErrors: 'int main(void) { return missing_one }\nint other(void) { return missing_two }',
        runtimeError: '#include <stdlib.h>\nint main(void) { abort(); }',
        timeout: 'int main(void) { for (;;) {} }'
      }
    },
    {
      label: 'C++',
      available: commandAvailable('g++'),
      reason: 'g++ is not available on PATH.',
      scenario: {
        language: 'cpp',
        correct: '#include <iostream>\nint main() { int n; std::cin >> n; std::cout << n * 2 << "\\n"; }',
        wrong: '#include <iostream>\nint main() { std::cout << 999 << "\\n"; }',
        syntaxError: 'int main() { return 0 }',
        undeclaredIdentifier: 'int main() { return missing_name; }',
        invalidType: 'int main() { int value = "text"; return value; }',
        multipleErrors: 'int main() { return missing_one }\nint other() { return missing_two }',
        runtimeError: '#include <stdexcept>\nint main() { throw std::runtime_error("expected"); }',
        timeout: 'int main() { for (;;) {} }'
      }
    },
    {
      label: 'Java',
      available: commandAvailable('javac') && commandAvailable('java'),
      reason: 'javac and java are not both available on PATH.',
      scenario: {
        language: 'java',
        correct: 'import java.util.*; public class Solution { public static void main(String[] args) { Scanner s = new Scanner(System.in); System.out.println(s.nextInt() * 2); } }',
        wrong: 'public class Solution { public static void main(String[] args) { System.out.println(999); } }',
        syntaxError: 'public class Solution { public static void main(String[] args) { System.out.println(1) } }',
        undeclaredIdentifier: 'public class Solution { public static void main(String[] args) { System.out.println(missingName); } }',
        invalidType: 'public class Solution { public static void main(String[] args) { int value = "text"; } }',
        multipleErrors: 'public class Solution { void a() { missingOne } void b() { missingTwo } }',
        runtimeError: 'public class Solution { public static void main(String[] args) { throw new RuntimeException("expected"); } }',
        timeout: 'public class Solution { public static void main(String[] args) { while (true) {} } }'
      }
    },
  ];

  for (const entry of scenarios) {
    if (!entry.available) {
      reportBlocked(entry.label, entry.reason);
      continue;
    }
    await verifyLanguage(entry.scenario);
  }

  if (commandAvailable('py', ['-3', '--version'])) {
    await verifyPython();
    await verifySql();
  } else {
    reportBlocked('Python', 'Python 3 launcher/runtime is not available.');
    reportBlocked('SQL', 'Python 3 with sqlite3 is not available to the local judge.');
  }
}
