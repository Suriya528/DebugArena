import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  compareOutputs,
  executeSingleTestCase,
  runTestCases,
  sanitizeResultsForParticipant,
  validateCodeSecurity
} from '../services/judgeService.js';
import { requireIsolatedVerification } from './safety.js';

type LanguageScenario = {
  language: string;
  correct: string;
  wrong: string;
  compileError: string;
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
  assert.equal(correct.compileError, undefined, `${scenario.language}: correct solution must compile`);
  assert.equal(correct.runtimeError, undefined, `${scenario.language}: correct solution must run`);
  assert.equal(correct.timeout, false, `${scenario.language}: correct solution must not time out`);
  assert.equal(compareOutputs(correct.stdout, '4'), true, `${scenario.language}: correct solution output`);

  const wrong = await executeSingleTestCase(scenario.wrong, scenario.language, '2\n', 1_000);
  assert.equal(wrong.compileError, undefined, `${scenario.language}: wrong answer should compile`);
  assert.equal(wrong.runtimeError, undefined, `${scenario.language}: wrong answer should run`);
  assert.equal(compareOutputs(wrong.stdout, '4'), false, `${scenario.language}: wrong answer must be distinguished`);

  const compileError = await executeSingleTestCase(scenario.compileError, scenario.language, '2\n', 1_000);
  assert.equal(typeof compileError.compileError, 'string', `${scenario.language}: compilation error must be classified`);

  const runtimeError = await executeSingleTestCase(scenario.runtimeError, scenario.language, '2\n', 1_000);
  assert.equal(typeof runtimeError.runtimeError, 'string', `${scenario.language}: runtime error must be classified`);

  const timeout = await executeSingleTestCase(scenario.timeout, scenario.language, '2\n', 350);
  assert.equal(timeout.timeout, true, `${scenario.language}: infinite program must time out`);

  console.log(`[VERIFIED] ${scenario.language} judging: correct, wrong answer, compilation error, runtime error, timeout.`);
}

async function verifyJavaScript(): Promise<void> {
  await verifyLanguage({
    language: 'javascript',
    correct: "const fs = require('fs'); const n = Number(fs.readFileSync(0, 'utf8').trim()); console.log(n * 2);",
    wrong: 'console.log(999);',
    compileError: 'const = ;',
    runtimeError: "throw new Error('expected runtime failure');",
    timeout: 'while (true) {}'
  });

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
  console.log('[VERIFIED] JavaScript hidden-test isolation.');
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

export async function runJudgeVerification(): Promise<void> {
  requireIsolatedVerification('Online judge verification');
  assert.equal(compareOutputs('Hello   World\n', 'hello world'), true, 'output comparison normalizes harmless formatting');

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
        compileError: 'int main(void) { this is not valid C }',
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
        compileError: 'int main() { this is not valid C++ }',
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
        compileError: 'public class Solution { public static void main(String[] args) { not valid; } }',
        runtimeError: 'public class Solution { public static void main(String[] args) { throw new RuntimeException("expected"); } }',
        timeout: 'public class Solution { public static void main(String[] args) { while (true) {} } }'
      }
    },
    {
      label: 'Python',
      available: commandAvailable('py', ['-3', '--version']),
      reason: 'Python 3 launcher/runtime is not available.',
      scenario: {
        language: 'python',
        correct: 'import sys\nprint(int(sys.stdin.read().strip()) * 2)',
        wrong: 'print(999)',
        compileError: 'def broken(:\n    pass',
        runtimeError: "raise RuntimeError('expected')",
        timeout: 'while True:\n    pass'
      }
    }
  ];

  for (const entry of scenarios) {
    if (!entry.available) {
      reportBlocked(entry.label, entry.reason);
      continue;
    }
    await verifyLanguage(entry.scenario);
  }

  await verifySql();
}
