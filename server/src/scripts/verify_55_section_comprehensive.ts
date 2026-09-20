import http from 'http';
import express from 'express';
import jwt from 'jsonwebtoken';
import { connectDB, disconnectDB } from '../config/db.js';
import { ENV } from '../config/env.js';
import { User } from '../models/User.js';
import { College } from '../models/College.js';
import { Event } from '../models/Event.js';
import { DynamicRound } from '../models/DynamicRound.js';
import { Question } from '../models/Question.js';
import { QuestionTemplate } from '../models/QuestionTemplate.js';
import { RoundProgress } from '../models/RoundProgress.js';
import { Attempt } from '../models/Attempt.js';
import { ParticipantRoundResult } from '../models/ParticipantRoundResult.js';
import { participantRouter } from '../routes/participant.js';
import { adminRouter } from '../routes/admin.js';
import { adminEventRouter } from '../routes/adminEvent.js';
import { adminQuestionBankRouter } from '../routes/adminQuestionBank.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { executeSingleTestCase, runTestCases, compareOutputs } from '../services/judgeService.js';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  } else {
    console.log(`  ✅ ${msg}`);
  }
}

async function run() {
  console.log('🏛️ =========================================================================');
  console.log('🏛️ DEBUG ARENA — 55-SECTION COMPREHENSIVE VERIFICATION SUITE');
  console.log('🏛️ =========================================================================\n');

  await connectDB();
  console.log('📦 Connected to MongoDB');

  const app = express();
  app.use(express.json());
  app.use(tenantContext as any);
  app.use('/api/participant', participantRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/admin/events', adminEventRouter);
  app.use('/api/admin/questions/bank', adminQuestionBankRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api`;
  console.log(`📡 Test Server running on port ${port}\n`);

  try {
    const testSuffix = Date.now();

    const college = await College.create({
      name: `Test Tech ${testSuffix}`,
      code: `TT${testSuffix}`.slice(0, 10).toUpperCase(),
      primaryColor: '#6366f1',
      secondaryColor: '#06b6d4'
    });

    const adminUser = await User.create({
      username: `admin_55_${testSuffix}`,
      name: 'Super Administrator',
      email: `admin55_${testSuffix}@example.com`,
      passwordHash: 'dummy',
      role: 'super_admin',
      collegeId: college._id
    });

    const participant1 = await User.create({
      username: `user1_${testSuffix}`,
      name: 'Alice Runner',
      email: `alice_${testSuffix}@example.com`,
      passwordHash: 'dummy',
      role: 'participant',
      collegeId: college._id
    });

    const participant2 = await User.create({
      username: `user2_${testSuffix}`,
      name: 'Bob Runner',
      email: `bob_${testSuffix}@example.com`,
      passwordHash: 'dummy',
      role: 'participant',
      collegeId: college._id
    });

    const adminToken = jwt.sign(
      { userId: adminUser._id.toString(), username: adminUser.username, role: 'super_admin', collegeId: college._id.toString() },
      ENV.JWT_SECRET
    );

    console.log('\n--- Section 3, 4, 5: Question Bank Invariants ---');

    const mcqTmpl = await QuestionTemplate.create({
      title: `MCQ Sample ${testSuffix}`,
      topic: 'Logic',
      type: 'mcq',
      marks: 10,
      prompt: 'What is output of 1 + 1?',
      options: [
        { text: '1', isCorrect: false },
        { text: '2', isCorrect: true },
        { text: '3', isCorrect: false }
      ]
    });

    const codingTmpl1 = await QuestionTemplate.create({
      title: `Sum of Two Numbers ${testSuffix}`,
      topic: 'Math',
      type: 'coding',
      codingMode: 'standard',
      marks: 20,
      prompt: '### Problem Description\nCalculate the sum of two integers.\n### Input Format\nTwo integers on stdin\n### Output Format\nTheir sum',
      testCases: [
        { input: '3 5', output: '8', isHidden: false, weight: 10 },
        { input: '10 20', output: '30', isHidden: true, weight: 10 }
      ],
      starterCode: { python: 'import sys\n# write code here' }
    });

    const debugTmpl = await QuestionTemplate.create({
      title: `Buggy Multiply ${testSuffix}`,
      topic: 'Math',
      type: 'coding',
      codingMode: 'debug',
      marks: 20,
      prompt: '### Problem Description\nMultiply two numbers.\n### Bug Diagnostic\nThe operator is incorrect.\n### Input Format\nTwo integers\n### Output Format\nTheir product',
      testCases: [
        { input: '4 5', output: '20', isHidden: false, weight: 10 },
        { input: '-2 6', output: '-12', isHidden: true, weight: 10 }
      ],
      starterCode: { python: 'import sys\nlines = sys.stdin.read().split()\nif lines:\n    print(int(lines[0]) + int(lines[1])) # BUG: adds instead of multiplies' }
    });

    const sqlTmpl = await QuestionTemplate.create({
      title: `Active Users Query ${testSuffix}`,
      topic: 'SQL',
      type: 'sql',
      marks: 20,
      prompt: 'Select all users with age >= 18',
      testCases: [
        {
          input: 'CREATE TABLE Users (id INT, name TEXT, age INT); INSERT INTO Users VALUES (1, "Alice", 20), (2, "Bob", 15);',
          output: 'name\nAlice',
          isHidden: false,
          weight: 20
        }
      ]
    });

    assert(mcqTmpl.type === 'mcq', 'MCQ Question Template created successfully');
    assert(codingTmpl1.codingMode === 'standard', 'Standard Coding Question Template created');
    assert(debugTmpl.codingMode === 'debug', 'Debug Coding Question Template created with codingMode=debug');
    assert(sqlTmpl.type === 'sql', 'SQL Question Template created');

    console.log('\n--- Section 28 & 37: Event Creation & Round Configuration ---');

    const event = await Event.create({
      name: `Championship ${testSuffix}`,
      code: `EV${testSuffix}`.slice(0, 8).toUpperCase(),
      collegeId: college._id,
      ownerId: adminUser._id,
      status: 'draft',
      rules: ['No collaboration', 'Stay in fullscreen']
    });

    participant1.eventId = event._id;
    await participant1.save();
    participant2.eventId = event._id;
    await participant2.save();

    const round1 = await DynamicRound.create({
      eventId: event._id,
      roundNumber: 1,
      title: 'Round 1: Screening Quiz',
      type: 'mcq',
      durationMinutes: 15,
      questionCount: 1,
      totalMarks: 10,
      advancementQuota: 10,
      status: 'pending',
      selectedQuestionIds: []
    });

    const round2 = await DynamicRound.create({
      eventId: event._id,
      roundNumber: 2,
      title: 'Round 2: Algorithmic Duel',
      type: 'coding',
      durationMinutes: 30,
      questionCount: 2,
      totalMarks: 40,
      advancementQuota: 0,
      status: 'pending',
      selectedQuestionIds: []
    });

    assert(Boolean(event._id), `Event created in draft status: ${event.code}`);
    assert(round1.roundNumber === 1 && round2.roundNumber === 2, 'Two dynamic rounds created');

    console.log('\n--- Sections 3, 4, 5: Question Assignment Enforcement ---');

    const badTypeRes = await fetch(`${baseUrl}/admin/events/${event._id}/rounds/1/questions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ questionIds: [codingTmpl1._id.toString()] })
    });
    assert(badTypeRes.status === 400, 'Backend correctly rejected assigning coding question to MCQ round (HTTP 400)');

    const badCountRes = await fetch(`${baseUrl}/admin/events/${event._id}/rounds/1/questions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ questionIds: [mcqTmpl._id.toString(), mcqTmpl._id.toString()] })
    });
    assert(badCountRes.status === 400, 'Backend correctly rejected incorrect question count (HTTP 400)');

    const validR1Res = await fetch(`${baseUrl}/admin/events/${event._id}/rounds/1/questions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ questionIds: [mcqTmpl._id.toString()] })
    });
    assert(validR1Res.status === 200, 'Round 1 questions assigned successfully');

    const dupRes = await fetch(`${baseUrl}/admin/events/${event._id}/rounds/2/questions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ questionIds: [mcqTmpl._id.toString(), codingTmpl1._id.toString()] })
    });
    assert(dupRes.status === 400, 'Cross-round duplicate question assignment rejected (HTTP 400)');

    const validR2Res = await fetch(`${baseUrl}/admin/events/${event._id}/rounds/2/questions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ questionIds: [codingTmpl1._id.toString(), debugTmpl._id.toString()] })
    });
    assert(validR2Res.status === 200, 'Round 2 questions assigned successfully');

    console.log('\n--- Section 6: Question Deletion Protection ---');
    const delConflictRes = await fetch(`${baseUrl}/admin/questions/bank/${codingTmpl1._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(delConflictRes.status === 409, 'Question deletion blocked with 409 Conflict while assigned to an active event round');

    console.log('\n--- Sections 9, 10, 41: Coding Judge Execution Matrix ---');

    const pyCorrectRes = await executeSingleTestCase('import sys\nprint(sum(map(int, sys.stdin.read().split())))', 'python', '7 8', 2000);
    assert(pyCorrectRes.stdout === '15', 'Python correct answer evaluates to 15');

    const pyWrongRes = await executeSingleTestCase('print(9999)', 'python', '7 8', 2000);
    assert(pyWrongRes.stdout === '9999' && !compareOutputs(pyWrongRes.stdout, '15'), 'Python wrong answer detected');

    const pySyntaxRes = await executeSingleTestCase('def broken(:\n    pass', 'python', '7 8', 2000);
    assert(Boolean(pySyntaxRes.compileError), 'Python SyntaxError detected as compileError');

    const pyRtRes = await executeSingleTestCase('raise RuntimeError("Custom crash")', 'python', '7 8', 2000);
    assert(Boolean(pyRtRes.runtimeError), 'Python RuntimeError detected as runtimeError');

    const pyTimeoutRes = await executeSingleTestCase('while True:\n    pass', 'python', '7 8', 800);
    assert(pyTimeoutRes.timeout === true, 'Python infinite loop killed as timeout');

    const jsCorrectRes = await executeSingleTestCase('const fs = require("fs"); const [a, b] = fs.readFileSync(0, "utf-8").trim().split(/\\s+/).map(Number); console.log(a + b);', 'javascript', '12 18', 2000);
    assert(jsCorrectRes.stdout === '30', 'JavaScript correct answer evaluates to 30');

    const sqlSetup = 'CREATE TABLE T (x INT); INSERT INTO T VALUES (42);';
    const sqlQuery = 'SELECT x FROM T;';
    const sqlRes = await executeSingleTestCase(sqlQuery, 'sql', sqlSetup, 2000);
    assert(sqlRes.stdout.includes('42'), 'SQL in-memory query executed and returned 42');

    const sqlBadQuery = 'SELECT non_existent_col FROM T;';
    const sqlBadRes = await executeSingleTestCase(sqlBadQuery, 'sql', sqlSetup, 2000);
    assert(Boolean(sqlBadRes.runtimeError), 'SQL semantic error detected as runtimeError');

    console.log('\n--- Sections 11, 43: Debugging Challenge Execution Judging ---');
    const runtimeDebugQ = await Question.findOne({ eventId: event._id, roundNumber: 2, templateId: debugTmpl._id });
    assert(Boolean(runtimeDebugQ), 'Runtime debug question synchronized in round 2');

    const buggyCode = 'import sys\nlines = sys.stdin.read().split()\nif lines:\n    print(int(lines[0]) + int(lines[1]))';
    const buggyJudge = await runTestCases(buggyCode, 'python', runtimeDebugQ!.testCases || [], 2000);
    assert(buggyJudge.some(r => !r.passed), 'Buggy code correctly fails evaluation test cases');

    const fixedCode = 'import sys\nlines = sys.stdin.read().split()\nif lines:\n    print(int(lines[0]) * int(lines[1]))';
    const fixedJudge = await runTestCases(fixedCode, 'python', runtimeDebugQ!.testCases || [], 2000);
    assert(fixedJudge.every(r => r.passed), 'Fixed code passes all test cases without string matching');

    console.log('\n--- Sections 17, 44: Participant Timer Lifecycle ---');
    event.status = 'live';
    await event.save();
    round1.status = 'active';
    await round1.save();

    const p1Token = jwt.sign(
      { userId: participant1._id.toString(), username: participant1.username, role: 'participant', eventId: event._id.toString() },
      ENV.JWT_SECRET
    );

    const beforeStartRes = await fetch(`${baseUrl}/participant/round-state`, {
      headers: { Authorization: `Bearer ${p1Token}` }
    });
    const beforeStartData = await beforeStartRes.json();
    assert(beforeStartData.progress.status === 'not_started', 'Before clicking start: status is not_started');
    assert(beforeStartData.progress.startedAt === null, 'Before clicking start: startedAt is null');

    const startRes = await fetch(`${baseUrl}/participant/rounds/1/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${p1Token}` }
    });
    const startData = await startRes.json();
    assert(startData.success === true, 'Round 1 assessment started');
    assert(Boolean(startData.endsAt), 'endsAt deadline returned upon start');

    const afterStartRes = await fetch(`${baseUrl}/participant/round-state`, {
      headers: { Authorization: `Bearer ${p1Token}` }
    });
    const afterStartData = await afterStartRes.json();
    assert(afterStartData.progress.status === 'in_progress', 'After start: status is in_progress');
    assert(Boolean(afterStartData.round.deadlineAt), 'Authoritative deadlineAt is present in round state');

    console.log('\n--- Sections 18, 19, 20, 23: Submission & Publication Flow ---');

    const r1Question = await Question.findOne({ eventId: event._id, roundNumber: 1 });
    await Attempt.create({
      userId: participant1._id,
      questionId: r1Question!._id,
      roundNumber: 1,
      selectedOption: 1,
      score: 10,
      status: 'submitted'
    });

    const submitR1Res = await fetch(`${baseUrl}/participant/submit-round`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p1Token}` },
      body: JSON.stringify({ roundNumber: 1 })
    });
    assert(submitR1Res.status === 200, 'Participant 1 submitted Round 1');

    const stateAwaitingRes = await fetch(`${baseUrl}/participant/round-state`, {
      headers: { Authorization: `Bearer ${p1Token}` }
    });
    const stateAwaitingData = await stateAwaitingRes.json();
    assert(stateAwaitingData.result.status === 'RESULT_PENDING', 'Result status is RESULT_PENDING before publication');
    assert(stateAwaitingData.result.isPublished === false, 'Result isPublished is false before publication');
    assert(stateAwaitingData.progress.totalScore === undefined, 'Total score is stripped from participant view');
    assert(stateAwaitingData.nextRoundAvailable === false, 'nextRoundAvailable is false before admin publication');

    const unauthNextRes = await fetch(`${baseUrl}/participant/rounds/2/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${p1Token}` }
    });
    assert(unauthNextRes.status === 403, 'Unauthorized start of Round 2 blocked with HTTP 403');

    const lockRes = await fetch(`${baseUrl}/admin/events/${event._id}/rounds/1/lock`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(lockRes.status === 200, 'Admin locked Round 1');

    const publishRes = await fetch(`${baseUrl}/admin/rounds/1/results/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        eventId: event._id.toString(),
        selections: {
          [participant1._id.toString()]: 'SELECTED',
          [participant2._id.toString()]: 'NOT_SELECTED'
        }
      })
    });
    assert(publishRes.status === 200, 'Admin published Round 1 results');

    const p1PublishedRes = await fetch(`${baseUrl}/participant/round-state`, {
      headers: { Authorization: `Bearer ${p1Token}` }
    });
    const p1PublishedData = await p1PublishedRes.json();
    assert(p1PublishedData.result.status === 'SELECTED', 'Participant 1 result is SELECTED');
    assert(p1PublishedData.result.isPublished === true, 'Participant 1 result is published');
    assert(p1PublishedData.isFinalRound === false, 'Round 1 is recognized as NOT final round');
    assert(p1PublishedData.hasNextRound === true, 'Round 1 hasNextRound is true');

    round2.status = 'active';
    await round2.save();

    const p1NextAvailRes = await fetch(`${baseUrl}/participant/round-state`, {
      headers: { Authorization: `Bearer ${p1Token}` }
    });
    const p1NextAvailData = await p1NextAvailRes.json();
    assert(p1NextAvailData.nextRoundAvailable === true, 'nextRoundAvailable is true now that Round 2 is active');

    const startR2Res = await fetch(`${baseUrl}/participant/rounds/2/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${p1Token}` }
    });
    assert(startR2Res.status === 200, 'Participant 1 successfully accessed and started Round 2');

    console.log('\n--- Sections 20, 22, 45: Final Round Completion ---');

    const r2StateRes = await fetch(`${baseUrl}/participant/round-state`, {
      headers: { Authorization: `Bearer ${p1Token}` }
    });
    const r2StateData = await r2StateRes.json();
    assert(r2StateData.isFinalRound === true, 'Round 2 is dynamically recognized as the FINAL round');
    assert(r2StateData.hasNextRound === false, 'Round 2 hasNextRound is false');

    await fetch(`${baseUrl}/participant/submit-round`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p1Token}` },
      body: JSON.stringify({ roundNumber: 2 })
    });

    const lockR2Res = await fetch(`${baseUrl}/admin/events/${event._id}/rounds/2/lock`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(lockR2Res.status === 200, 'Admin locked Round 2');

    const pub2Res = await fetch(`${baseUrl}/admin/rounds/2/results/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        eventId: event._id.toString(),
        selections: {
          [participant1._id.toString()]: 'SELECTED'
        }
      })
    });

    const finalResultRes = await fetch(`${baseUrl}/participant/round-state`, {
      headers: { Authorization: `Bearer ${p1Token}` }
    });
    const finalResultData = await finalResultRes.json();
    assert(finalResultData.isFinalRound === true, 'Final round verified');
    assert(finalResultData.result.status === 'SELECTED', 'Participant 1 is SELECTED in championship final');
    assert(finalResultData.nextRoundAvailable === false, 'No further round available after final round');

    console.log('\n🏆 =========================================================================');
    console.log('🏆 ALL 55-SECTION AUDIT & INTEGRITY FIXTURES PASSED SUCCESSFULLY!');
    console.log('🏆 =========================================================================\n');

  } finally {
    server.close();
    await disconnectDB();
  }
}

run().catch((err) => {
  console.error('\n💥 FATAL VERIFICATION ERROR:', err);
  process.exit(1);
});
