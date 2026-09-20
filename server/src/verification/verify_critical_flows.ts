import assert from 'node:assert/strict';
import http from 'node:http';
import cors from 'cors';
import express from 'express';
import { connectDB, disconnectDB } from '../config/db.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { adminRouter } from '../routes/admin.js';
import { adminEventRouter } from '../routes/adminEvent.js';
import { adminQuestionBankRouter } from '../routes/adminQuestionBank.js';
import { authRouter } from '../routes/auth.js';
import { participantRouter } from '../routes/participant.js';
import { isIsolatedVerificationMode, requireIsolatedVerification } from './safety.js';

type HttpResult = { status: number; body: any };

async function startIsolatedApplication(): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  await connectDB();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(tenantContext as any);
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', verificationMode: isIsolatedVerificationMode() });
  });
  app.use('/api/auth', authRouter);
  app.use('/api/participant', participantRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/admin/events', adminEventRouter);
  app.use('/api/admin/questions/bank', adminQuestionBankRouter);

  const server = http.createServer(app);
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Unable to obtain an ephemeral port for isolated verification.');
    }

    return {
      baseUrl: `http://127.0.0.1:${address.port}`,
      close: async () => {
        await new Promise<void>((resolve, reject) => {
          server.close((error) => error ? reject(error) : resolve());
        });
        await disconnectDB();
      }
    };
  } catch (error) {
    server.close();
    await disconnectDB();
    throw error;
  }
}

async function request(baseUrl: string, pathname: string, options: {
  method?: string;
  token?: string;
  body?: unknown;
} = {}): Promise<HttpResult> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${baseUrl}${pathname}`, {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const raw = await response.text();
  let body: any = raw;
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    // Keep the raw body in diagnostics when a route returns non-JSON.
  }
  return { status: response.status, body };
}

function requireStatus(result: HttpResult, expected: number, label: string): any {
  assert.equal(
    result.status,
    expected,
    `${label}: expected HTTP ${expected}, got ${result.status}: ${JSON.stringify(result.body)}`
  );
  return result.body;
}

async function createTemplate(baseUrl: string, token: string, payload: Record<string, unknown>): Promise<any> {
  const response = await request(baseUrl, '/api/admin/questions/bank', {
    method: 'POST',
    token,
    body: payload
  });
  return requireStatus(response, 201, `create template ${String(payload.title)}`).template;
}

function idOf(value: any): string {
  const id = value?._id ?? value?.id ?? value;
  assert.ok(id, 'Expected a database identifier.');
  return String(id);
}

export async function runCriticalFlowVerification(): Promise<void> {
  requireIsolatedVerification('Critical product-flow verification');
  const isolatedApp = await startIsolatedApplication();
  const { baseUrl } = isolatedApp;

  try {
    const health = requireStatus(await request(baseUrl, '/api/health'), 200, 'isolated server health check');
    assert.equal(health.verificationMode, true, 'health endpoint must identify the isolated verification server');

    const adminRegistration = await request(baseUrl, '/api/auth/register-admin', {
      method: 'POST',
      body: {
        name: 'Verification Organizer',
        email: 'verification.organizer@example.test',
        password: 'verification-password',
        collegeName: 'Verification College',
        university: 'Isolated Test University'
      }
    });
    const admin = requireStatus(adminRegistration, 201, 'register verification organizer');
    const adminToken = String(admin.token);
    const collegeId = idOf(admin.user.collegeId);

    const eventCreation = await request(baseUrl, '/api/admin/events', {
      method: 'POST',
      token: adminToken,
      body: {
        collegeId,
        name: 'Isolated Debug Arena',
        code: 'VERIFY2026',
        description: 'Automated isolated verification event',
        rounds: [
          { title: 'Round 1 MCQ', type: 'mcq', durationMinutes: 3, questionCount: 2, totalMarks: 20, advancementQuota: 1 },
          { title: 'Round 2 Debug', type: 'debugging', durationMinutes: 3, questionCount: 1, totalMarks: 20, advancementQuota: 1, allowedLanguages: ['javascript', 'java'] },
          { title: 'Round 3 Final', type: 'coding', durationMinutes: 3, questionCount: 1, totalMarks: 20, allowedLanguages: ['javascript'] }
        ]
      }
    });
    const createdEvent = requireStatus(eventCreation, 201, 'event creation');
    const eventId = idOf(createdEvent.event);
    assert.equal(createdEvent.rounds.length, 3, 'event creation must configure exactly three rounds');
    assert.deepEqual(createdEvent.rounds.map((round: any) => round.roundNumber), [1, 2, 3], 'rounds must be sequentially configured');

    const mcqOne = await createTemplate(baseUrl, adminToken, {
      title: 'Verification MCQ One', topic: 'Verification', type: 'mcq', difficulty: 'easy', prompt: 'Choose the first answer.', marks: 10,
      options: [{ text: 'Correct', isCorrect: true }, { text: 'Incorrect', isCorrect: false }], allowedLanguages: []
    });
    const mcqTwo = await createTemplate(baseUrl, adminToken, {
      title: 'Verification MCQ Two', topic: 'Verification', type: 'mcq', difficulty: 'easy', prompt: 'Choose the first answer.', marks: 10,
      options: [{ text: 'Correct', isCorrect: true }, { text: 'Incorrect', isCorrect: false }], allowedLanguages: []
    });
    const debugTemplate = await createTemplate(baseUrl, adminToken, {
      title: 'Verification Debug Program', topic: 'Verification', type: 'debugging', codingMode: 'debug', language: 'javascript', difficulty: 'easy',
      prompt: 'Fix the multiplication program.', marks: 20, timeLimitMs: 1_000, allowedLanguages: ['javascript', 'java'],
      starterCode: {
        javascript: "const fs = require('fs'); const n = Number(fs.readFileSync(0, 'utf8').trim()); console.log(n * 3);",
        java: 'import java.util.*; public class Solution { public static void main(String[] args) { Scanner s = new Scanner(System.in); System.out.println(s.nextInt() * 3); } }'
      },
      testCases: [
        { input: '2\n', output: '4', isHidden: false, weight: 10 },
        { input: '3\n', output: '6', isHidden: true, weight: 10 }
      ]
    });
    assert.equal(debugTemplate.codingMode, 'debug', 'debug template must preserve debug mode');
    const finalTemplate = await createTemplate(baseUrl, adminToken, {
      title: 'Verification Final Program', topic: 'Verification', type: 'coding', codingMode: 'standard', language: 'javascript', difficulty: 'easy',
      prompt: 'Double the input.', marks: 20, timeLimitMs: 1_000, allowedLanguages: ['javascript'],
      starterCode: { javascript: "const fs = require('fs'); const n = Number(fs.readFileSync(0, 'utf8').trim()); console.log(n * 2);" },
      testCases: [{ input: '2\n', output: '4', isHidden: false, weight: 20 }]
    });

    const mcqOneId = idOf(mcqOne);
    const mcqTwoId = idOf(mcqTwo);
    const debugId = idOf(debugTemplate);
    const finalId = idOf(finalTemplate);
    const configure = (roundNumber: number, questionIds: string[]) => request(
      baseUrl,
      `/api/admin/events/${eventId}/rounds/${roundNumber}/questions`,
      { method: 'PUT', token: adminToken, body: { questionIds } }
    );

    requireStatus(await configure(1, [mcqOneId]), 400, 'exact question count rejects too few questions');
    requireStatus(await configure(1, [mcqOneId, mcqOneId]), 400, 'same-round duplicate question prevention');
    requireStatus(await configure(1, [mcqOneId, debugId]), 400, 'question-type compatibility');
    const configuredRoundOne = requireStatus(await configure(1, [mcqOneId, mcqTwoId]), 200, 'configure exact Round 1 question count');
    assert.equal(configuredRoundOne.selectedCount, 2, 'Round 1 must have exactly two selected questions');
    requireStatus(await configure(2, [debugId]), 200, 'configure Round 2 debug question');
    requireStatus(await configure(3, [debugId]), 400, 'same-event cross-round duplicate question prevention');
    requireStatus(await configure(3, [finalId]), 200, 'configure final coding question');

    requireStatus(await request(baseUrl, `/api/admin/events/${eventId}`, {
      method: 'PUT', token: adminToken, body: { status: 'registration' }
    }), 200, 'open registration for isolated participants');

    const joinParticipant = async (username: string, name: string): Promise<any> => {
      const joined = await request(baseUrl, '/api/participant/join-by-code', {
        method: 'POST',
        body: { eventCode: 'VERIFY2026', username, password: 'participant-password', name, mode: 'register' }
      });
      return requireStatus(joined, 200, `register participant ${username}`);
    };
    const participantOne = await joinParticipant('verify-one', 'Verification Participant One');
    const participantTwo = await joinParticipant('verify-two', 'Verification Participant Two');
    const participantOneToken = String(participantOne.token);
    const participantTwoToken = String(participantTwo.token);
    const participantOneId = idOf(participantOne.user);
    const participantTwoId = idOf(participantTwo.user);

    requireStatus(await request(baseUrl, `/api/admin/events/${eventId}/rounds/1/start`, {
      method: 'POST', token: adminToken
    }), 200, 'start Round 1 after complete configuration');

    const beforeStart = requireStatus(await request(baseUrl, '/api/participant/round-state?roundNumber=1', {
      token: participantOneToken
    }), 200, 'read Round 1 state before participant starts');
    assert.equal(beforeStart.progress.status, 'not_started', 'participant must be initialized as not_started');
    assert.equal(beforeStart.questions.length, 2, 'runtime questions must match exact configured count');

    const firstStart = requireStatus(await request(baseUrl, '/api/participant/rounds/1/start', {
      method: 'POST', token: participantOneToken
    }), 200, 'participant starts Round 1');
    assert.equal(firstStart.status, 'in_progress', 'participant attempt must enter in_progress');
    assert.ok(firstStart.startedAt && firstStart.endsAt, 'timer initialization must return both timestamps');
    const repeatedStart = requireStatus(await request(baseUrl, '/api/participant/rounds/1/start', {
      method: 'POST', token: participantOneToken
    }), 200, 'participant reopens Round 1');
    assert.equal(repeatedStart.idempotent, true, 'reopening an attempt must be idempotent');
    assert.equal(String(repeatedStart.startedAt), String(firstStart.startedAt), 'reopen must preserve timer start');

    const refreshed = requireStatus(await request(baseUrl, '/api/participant/round-state?roundNumber=1', {
      token: participantOneToken
    }), 200, 'refresh active attempt');
    assert.equal(String(refreshed.progress.startedAt), String(firstStart.startedAt), 'refresh must preserve attempt timer');
    const firstQuestionId = idOf(refreshed.questions[0]);
    requireStatus(await request(baseUrl, '/api/participant/save-answer', {
      method: 'POST', token: participantOneToken,
      body: { questionId: firstQuestionId, roundNumber: 1, selectedOption: 0 }
    }), 200, 'save MCQ answer');
    const afterSaveRefresh = requireStatus(await request(baseUrl, '/api/participant/round-state?roundNumber=1', {
      token: participantOneToken
    }), 200, 'refresh after saving answer');
    assert.equal(afterSaveRefresh.attempts[0].selectedOption, 0, 'refresh must retain saved answer');

    requireStatus(await request(baseUrl, '/api/participant/submit-round', {
      method: 'POST', token: participantOneToken, body: { roundNumber: 1 }
    }), 200, 'submit participant one Round 1');
    const awaitingPublication = requireStatus(await request(baseUrl, '/api/participant/round-state?roundNumber=1', {
      token: participantOneToken
    }), 200, 'read submitted Round 1 result');
    assert.equal(awaitingPublication.result.status, 'RESULT_PENDING', 'results must await publication');
    assert.equal('totalScore' in awaitingPublication.progress, false, 'unpublished result must not disclose score');

    requireStatus(await request(baseUrl, '/api/participant/rounds/1/start', {
      method: 'POST', token: participantTwoToken
    }), 200, 'participant two starts Round 1');
    const secondState = requireStatus(await request(baseUrl, '/api/participant/round-state?roundNumber=1', {
      token: participantTwoToken
    }), 200, 'read participant two Round 1 questions');
    requireStatus(await request(baseUrl, '/api/participant/save-answer', {
      method: 'POST', token: participantTwoToken,
      body: { questionId: idOf(secondState.questions[0]), roundNumber: 1, selectedOption: 1 }
    }), 200, 'save participant two answer');
    requireStatus(await request(baseUrl, '/api/participant/submit-round', {
      method: 'POST', token: participantTwoToken, body: { roundNumber: 1 }
    }), 200, 'submit participant two Round 1');

    requireStatus(await request(baseUrl, '/api/participant/rounds/2/start', {
      method: 'POST', token: participantOneToken
    }), 403, 'next round access before results publication');
    requireStatus(await request(baseUrl, '/api/admin/rounds/1/results/save', {
      method: 'POST', token: adminToken,
      body: {
        eventId,
        selections: [
          { participantId: participantOneId, selection: 'SELECTED' },
          { participantId: participantTwoId, selection: 'NOT_SELECTED' }
        ]
      }
    }), 200, 'save private result selections');
    const stillPending = requireStatus(await request(baseUrl, '/api/participant/round-state?roundNumber=1', {
      token: participantOneToken
    }), 200, 'private draft must not publish result');
    assert.equal(stillPending.result.status, 'RESULT_PENDING', 'saved draft must remain private');
    requireStatus(await request(baseUrl, '/api/admin/rounds/1/results/publish', {
      method: 'POST', token: adminToken, body: { eventId }
    }), 200, 'admin publishes Round 1 results');

    requireStatus(await request(baseUrl, `/api/admin/events/${eventId}/rounds/2/start`, {
      method: 'POST', token: adminToken
    }), 200, 'start intermediate Round 2');
    requireStatus(await request(baseUrl, '/api/participant/rounds/2/start', {
      method: 'POST', token: participantTwoToken
    }), 403, 'non-selected participant cannot access next round');
    requireStatus(await request(baseUrl, '/api/participant/rounds/2/start', {
      method: 'POST', token: participantOneToken
    }), 200, 'selected participant advances to Round 2');

    const debugState = requireStatus(await request(baseUrl, '/api/participant/round-state?roundNumber=2', {
      token: participantOneToken
    }), 200, 'read debug-mode Round 2 state');
    assert.equal(debugState.questions.length, 1, 'Round 2 must expose its configured single question');
    assert.ok(debugState.questions[0].starterCode.javascript.includes('n * 3'), 'debug-mode starter code must reach participant');
    const debugQuestionId = idOf(debugState.questions[0]);
    const currentEditorRun = requireStatus(await request(baseUrl, '/api/participant/run-code', {
      method: 'POST', token: participantOneToken,
      body: { questionId: debugQuestionId, roundNumber: 2, language: 'javascript', code: 'console.log(999);' }
    }), 200, 'execute current editor code');
    assert.equal(currentEditorRun.results[0].actual, '999', 'run-code must execute the submitted current editor buffer');
    assert.equal(currentEditorRun.results[0].passed, false, 'current editor wrong output must fail');
    const javaCorrectedCode = 'import java.util.*; public class Solution { public static void main(String[] args) { Scanner s = new Scanner(System.in); System.out.println(s.nextInt() * 2); } }';
    const javaLanguageRun = requireStatus(await request(baseUrl, '/api/participant/run-code', {
      method: 'POST', token: participantOneToken,
      body: { questionId: debugQuestionId, roundNumber: 2, language: 'java', code: javaCorrectedCode }
    }), 200, 'switch to Java and execute current editor code');
    assert.equal(javaLanguageRun.results[0].passed, true, 'supported Java language selection must execute correctly');
    requireStatus(await request(baseUrl, '/api/participant/run-code', {
      method: 'POST', token: participantOneToken,
      body: { questionId: debugQuestionId, roundNumber: 2, language: 'python', code: 'print(4)' }
    }), 400, 'language switching must enforce round language compatibility');
    const correctedCode = "const fs = require('fs'); const n = Number(fs.readFileSync(0, 'utf8').trim()); console.log(n * 2);";
    const debugRun = requireStatus(await request(baseUrl, '/api/participant/run-code', {
      method: 'POST', token: participantOneToken,
      body: { questionId: debugQuestionId, roundNumber: 2, language: 'javascript', code: correctedCode }
    }), 200, 'execute corrected debug-mode code');
    assert.equal(debugRun.results[0].passed, true, 'corrected debug code must pass visible sample');
    const debugSubmit = requireStatus(await request(baseUrl, '/api/participant/submit-code', {
      method: 'POST', token: participantOneToken,
      body: { questionId: debugQuestionId, roundNumber: 2, language: 'javascript', code: correctedCode }
    }), 200, 'submit corrected debug code');
    assert.equal(debugSubmit.status, 'Accepted', 'correct debug submission must pass all test cases');
    assert.equal(debugSubmit.results.length, 1, 'hidden test execution must remain hidden from participant response');
    requireStatus(await request(baseUrl, '/api/participant/submit-round', {
      method: 'POST', token: participantOneToken, body: { roundNumber: 2 }
    }), 200, 'submit intermediate round');
    requireStatus(await request(baseUrl, `/api/admin/events/${eventId}/rounds/2/lock`, {
      method: 'POST', token: adminToken
    }), 200, 'complete intermediate round');
    requireStatus(await request(baseUrl, '/api/admin/rounds/2/results/publish', {
      method: 'POST', token: adminToken,
      body: { eventId, selections: [{ participantId: participantOneId, selection: 'SELECTED' }] }
    }), 200, 'publish intermediate advancement');

    requireStatus(await request(baseUrl, `/api/admin/events/${eventId}/rounds/3/start`, {
      method: 'POST', token: adminToken
    }), 200, 'start final round');
    requireStatus(await request(baseUrl, '/api/participant/rounds/3/start', {
      method: 'POST', token: participantOneToken
    }), 200, 'participant starts final round');
    const finalState = requireStatus(await request(baseUrl, '/api/participant/round-state?roundNumber=3', {
      token: participantOneToken
    }), 200, 'read final-round state');
    assert.equal(finalState.isFinalRound, true, 'last configured round must be identified as final');
    assert.equal(finalState.hasNextRound, false, 'final round must not advertise a next round');
    const finalQuestionId = idOf(finalState.questions[0]);
    requireStatus(await request(baseUrl, '/api/participant/submit-code', {
      method: 'POST', token: participantOneToken,
      body: { questionId: finalQuestionId, roundNumber: 3, language: 'javascript', code: correctedCode }
    }), 200, 'submit final coding solution');
    requireStatus(await request(baseUrl, '/api/participant/submit-round', {
      method: 'POST', token: participantOneToken, body: { roundNumber: 3 }
    }), 200, 'complete final round');
    requireStatus(await request(baseUrl, `/api/admin/events/${eventId}/rounds/3/lock`, {
      method: 'POST', token: adminToken
    }), 200, 'lock final round');
    requireStatus(await request(baseUrl, '/api/admin/rounds/3/results/publish', {
      method: 'POST', token: adminToken,
      body: { eventId, selections: [{ participantId: participantOneId, selection: 'SELECTED' }] }
    }), 200, 'publish final result');
    const completedFinal = requireStatus(await request(baseUrl, '/api/participant/round-state?roundNumber=3', {
      token: participantOneToken
    }), 200, 'read completed final round');
    assert.equal(completedFinal.result.status, 'SELECTED', 'final result must be published');
    assert.equal(completedFinal.nextRoundAvailable, false, 'completed final must not expose another round');
    requireStatus(await request(baseUrl, '/api/participant/rounds/4/start', {
      method: 'POST', token: participantOneToken
    }), 404, 'no access beyond final round');

    console.log('[VERIFIED] Isolated DEBUG ARENA critical product flows.');
  } finally {
    await isolatedApp.close();
  }
}
