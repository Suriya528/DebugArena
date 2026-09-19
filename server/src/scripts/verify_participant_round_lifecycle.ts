import http from 'http';
import express from 'express';
import jwt from 'jsonwebtoken';
import { connectDB, disconnectDB } from '../config/db.js';
import { ENV } from '../config/env.js';
import { User } from '../models/User.js';
import { Round } from '../models/Round.js';
import { Question } from '../models/Question.js';
import { RoundProgress } from '../models/RoundProgress.js';
import { Attempt } from '../models/Attempt.js';
import { participantRouter } from '../routes/participant.js';
import { adminRouter } from '../routes/admin.js';
import { startServerTimerSweep, stopServerTimerSweep } from '../services/timerService.js';

async function run() {
  console.log('🚀 Starting Participant Round Lifecycle Automated Verification Suite...\n');

  await connectDB();

  // Spin up an isolated Express HTTP server for testing real network requests
  const app = express();
  app.use(express.json());
  app.use('/api/participant', participantRouter);
  app.use('/api/admin', adminRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api`;
  console.log(`📡 Test server running at ${baseUrl}`);

  // Start the background sweeper
  startServerTimerSweep();

  try {
    // 1. Setup Test Fixtures: Admin & Participants
    const testSuffix = Date.now();
    const adminUser = await User.create({
      username: `admin_test_${testSuffix}`,
      email: `admin_${testSuffix}@example.com`,
      passwordHash: 'dummy',
      name: 'Admin Test',
      role: 'admin'
    });

    const participant1 = await User.create({
      username: `part1_${testSuffix}`,
      email: `part1_${testSuffix}@example.com`,
      passwordHash: 'dummy',
      name: 'Participant One',
      role: 'participant'
    });

    const participant2 = await User.create({
      username: `part2_${testSuffix}`,
      email: `part2_${testSuffix}@example.com`,
      passwordHash: 'dummy',
      name: 'Participant Two',
      role: 'participant'
    });

    const adminToken = jwt.sign(
      { userId: adminUser._id.toString(), username: adminUser.username, role: 'admin' },
      ENV.JWT_SECRET
    );

    const part1Token = jwt.sign(
      { userId: participant1._id.toString(), username: participant1.username, role: 'participant' },
      ENV.JWT_SECRET
    );

    const part2Token = jwt.sign(
      { userId: participant2._id.toString(), username: participant2.username, role: 'participant' },
      ENV.JWT_SECRET
    );

    const testRoundNumber = 1;
    // Clean any prior state for testRoundNumber
    await Round.deleteMany({ roundNumber: testRoundNumber });
    await Question.deleteMany({ roundNumber: testRoundNumber, eventId: null });
    await RoundProgress.deleteMany({ roundNumber: testRoundNumber });
    await Attempt.deleteMany({ roundNumber: testRoundNumber });

    // Create Round 1 with duration = 2 minutes
    const round = await Round.create({
      roundNumber: testRoundNumber,
      title: 'Lifecycle Verification Round',
      description: 'Testing participant attempt lifecycle',
      type: 'coding',
      durationMinutes: 2,
      status: 'pending'
    });

    // Create 10 questions so Round 1 question quota is satisfied
    for (let i = 1; i <= 10; i++) {
      await Question.create({
        roundNumber: testRoundNumber,
        orderIndex: i,
        title: `Test Problem ${i}`,
        type: 'coding',
        marks: 10,
        prompt: `Problem ${i} prompt`,
        inputFormat: 'standard input',
        outputFormat: 'standard output',
        constraints: '1 <= N <= 100',
        allowedLanguages: ['python', 'javascript'],
        starterCode: { python: 'print("hello")' },
        testCases: [
          { input: '1', expectedOutput: '1', isHidden: false, weight: 5 },
          { input: '2', expectedOutput: '2', isHidden: true, weight: 5 }
        ]
      });
    }

    // Helper fetch wrapper
    async function apiReq(url: string, token: string, method = 'GET', body?: any) {
      const res = await fetch(`${baseUrl}${url}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: body ? JSON.stringify(body) : undefined
      });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, data };
    }

    console.log('--- Admin Starts Round Globally ---');
    const adminStartRes = await apiReq(`/admin/rounds/${testRoundNumber}/start`, adminToken, 'POST');
    if (adminStartRes.status !== 200) {
      throw new Error(`Admin start failed: ${JSON.stringify(adminStartRes.data)}`);
    }
    console.log('✓ Admin started round successfully (Round is active for competition).');

    // -------------------------------------------------------------
    // Test 1: Open but do not start
    // -------------------------------------------------------------
    console.log('\n[TEST 1] Open but do not start');
    const t1Res = await apiReq('/participant/round-state', part1Token);
    if (t1Res.status !== 200) throw new Error(`Test 1 failed: status ${t1Res.status}`);

    if (t1Res.data.progress?.status !== 'not_started') {
      throw new Error(`Expected progress.status to be 'not_started', got: ${t1Res.data.progress?.status}`);
    }
    if (t1Res.data.progress?.startedAt !== null || t1Res.data.progress?.endsAt !== null) {
      throw new Error('Expected startedAt and endsAt to be null before participant start');
    }
    if (t1Res.data.canStart !== true) {
      throw new Error(`Expected canStart === true, got ${t1Res.data.canStart}`);
    }
    console.log('✓ Test 1 Passed: status=NOT_STARTED, canStart=true, startedAt=null, endsAt=null, no countdown running.');

    // -------------------------------------------------------------
    // Section 31 Network Verification: GET must not create attempt
    // -------------------------------------------------------------
    console.log('\n[SECTION 31] Network Verification: Read-only GET does not create in_progress attempt');
    const dbProgressBefore = await RoundProgress.findOne({ userId: participant1._id, roundNumber: testRoundNumber });
    if (dbProgressBefore && dbProgressBefore.status === 'in_progress') {
      throw new Error('Database mutated to in_progress during read-only GET request!');
    }
    console.log('✓ Section 31 Passed: Database verified unmutated by read-only calls.');

    // -------------------------------------------------------------
    // Test 2: Start Round
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Participant Clicks START ROUND');
    const t2Res = await apiReq(`/participant/rounds/${testRoundNumber}/start`, part1Token, 'POST', {
      roundNumber: testRoundNumber
    });
    if (t2Res.status !== 200) throw new Error(`Test 2 failed: status ${t2Res.status}, data: ${JSON.stringify(t2Res.data)}`);

    if (t2Res.data.status !== 'in_progress') {
      throw new Error(`Expected status to be 'in_progress', got: ${t2Res.data.status}`);
    }
    if (!t2Res.data.startedAt || !t2Res.data.endsAt) {
      throw new Error('Missing server startedAt or endsAt');
    }
    const startedAt = new Date(t2Res.data.startedAt).getTime();
    const endsAt = new Date(t2Res.data.endsAt).getTime();
    const durationDiffMs = endsAt - startedAt;
    if (Math.abs(durationDiffMs - 2 * 60 * 1000) > 1000) {
      throw new Error(`Duration difference is not 2 minutes: ${durationDiffMs}ms`);
    }
    console.log(`✓ Test 2 Passed: Started successfully. startedAt=${t2Res.data.startedAt}, endsAt=${t2Res.data.endsAt}, duration=2m.`);

    // -------------------------------------------------------------
    // Test 9: Double Click / Idempotency
    // -------------------------------------------------------------
    console.log('\n[TEST 9] Double Click / Idempotent Start');
    const t9Res = await apiReq(`/participant/rounds/${testRoundNumber}/start`, part1Token, 'POST', {
      roundNumber: testRoundNumber
    });
    if (t9Res.status !== 200) throw new Error(`Test 9 failed: status ${t9Res.status}`);
    if (t9Res.data.startedAt !== t2Res.data.startedAt || t9Res.data.endsAt !== t2Res.data.endsAt) {
      throw new Error('Double click reset the timer! Timestamps must be preserved identically.');
    }
    const countAttempts = await RoundProgress.countDocuments({ userId: participant1._id, roundNumber: testRoundNumber });
    if (countAttempts !== 1) {
      throw new Error(`Expected exactly 1 RoundProgress record, found: ${countAttempts}`);
    }
    console.log('✓ Test 9 Passed: Double click handled idempotently without timer reset or duplicate documents.');

    // -------------------------------------------------------------
    // Test 3: Refresh
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Browser Refresh Simulation');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const t3Res = await apiReq('/participant/round-state', part1Token);
    if (t3Res.status !== 200) throw new Error(`Test 3 failed: status ${t3Res.status}`);
    if (t3Res.data.progress?.status !== 'in_progress') {
      throw new Error(`Expected in_progress on refresh, got: ${t3Res.data.progress?.status}`);
    }
    if (t3Res.data.progress?.startedAt !== t2Res.data.startedAt || t3Res.data.progress?.endsAt !== t2Res.data.endsAt) {
      throw new Error('Refresh corrupted or reset startedAt / endsAt!');
    }
    if (t3Res.data.round?.remainingSeconds >= 120) {
      throw new Error('Timer was reset to full duration after refresh!');
    }
    console.log(`✓ Test 3 Passed: Attempt persisted across reload. Remaining: ${t3Res.data.round?.remainingSeconds}s.`);

    // -------------------------------------------------------------
    // Test 5: Multiple Tabs
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Multiple Tabs Consistency');
    const tab1 = await apiReq('/participant/round-state', part1Token);
    const tab2 = await apiReq('/participant/round-state', part1Token);
    if (tab1.data.progress?.endsAt !== tab2.data.progress?.endsAt) {
      throw new Error('Tabs received different deadlines!');
    }
    console.log('✓ Test 5 Passed: Multiple tabs share identical server-authoritative attempt window.');

    // -------------------------------------------------------------
    // Test 8: Submit After Expiry
    // -------------------------------------------------------------
    console.log('\n[TEST 8] Submission Rejection After Attempt Expiry');
    // Set endsAt in the past
    await RoundProgress.updateOne(
      { userId: participant1._id, roundNumber: testRoundNumber },
      { endsAt: new Date(Date.now() - 10000) }
    );

    const firstQuestion = await Question.findOne({ roundNumber: testRoundNumber });
    const submitExpired = await apiReq('/participant/submit-code', part1Token, 'POST', {
      roundNumber: testRoundNumber,
      questionId: firstQuestion?._id.toString(),
      code: 'print("late")',
      language: 'python'
    });

    if (submitExpired.status !== 400 && submitExpired.status !== 403) {
      throw new Error(`Expected 400/403 for expired submission, got ${submitExpired.status}`);
    }
    console.log('✓ Test 8 Passed: Submission rejected after attempt deadline elapsed.');

    // -------------------------------------------------------------
    // Test 6: Auto-Finalization on Expiration
    // -------------------------------------------------------------
    console.log('\n[TEST 6] Expiration State Transition');
    const t6Res = await apiReq('/participant/round-state', part1Token);
    if (t6Res.data.progress?.status !== 'submitted' && t6Res.data.progress?.status !== 'expired') {
      throw new Error(`Expected expired attempt to become submitted/expired, got: ${t6Res.data.progress?.status}`);
    }
    if (t6Res.data.round?.remainingSeconds !== 0) {
      throw new Error(`Expected 0 remaining seconds, got: ${t6Res.data.round?.remainingSeconds}`);
    }
    console.log('✓ Test 6 Passed: Expired attempt transitioned to final state, remainingSeconds=0.');

    // -------------------------------------------------------------
    // Test 7: Before Start + Time Passes (CRITICAL REGRESSION TEST)
    // -------------------------------------------------------------
    console.log('\n[TEST 7] CRITICAL REGRESSION TEST: Participant opens round, does NOT click start, time passes longer than duration');
    // Participant 2 opens round
    const p2Initial = await apiReq('/participant/round-state', part2Token);
    if (p2Initial.data.progress?.status !== 'not_started') {
      throw new Error(`Participant 2 expected not_started, got ${p2Initial.data.progress?.status}`);
    }
    if (p2Initial.data.canStart !== true) {
      throw new Error('Participant 2 canStart should be true');
    }

    console.log('  Participant 2 opened round. Status: NOT_STARTED. Time now passes (simulating > 2 minutes elapsed since admin started)...');
    // Simulate admin start was 1 hour ago
    await Round.updateOne({ roundNumber: testRoundNumber }, { startedAt: new Date(Date.now() - 60 * 60 * 1000) });

    // Trigger timer sweep
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Participant 2 fetches round state again
    const p2AfterWait = await apiReq('/participant/round-state', part2Token);
    if (p2AfterWait.data.progress?.status !== 'not_started') {
      throw new Error(`Participant 2 premature end! Expected not_started, got: ${p2AfterWait.data.progress?.status}`);
    }
    if (p2AfterWait.data.canStart !== true) {
      throw new Error('Participant 2 canStart must still be true!');
    }
    if (p2AfterWait.data.progress?.startedAt !== null || p2AfterWait.data.progress?.endsAt !== null) {
      throw new Error('Participant 2 timestamps were consumed while waiting!');
    }
    console.log('  Participant 2 is STILL not_started with canStart=true after duration passed.');

    // Now Participant 2 clicks START
    const p2StartRes = await apiReq(`/participant/rounds/${testRoundNumber}/start`, part2Token, 'POST', {
      roundNumber: testRoundNumber
    });
    if (p2StartRes.status !== 200) {
      throw new Error(`Participant 2 failed to start: ${JSON.stringify(p2StartRes.data)}`);
    }
    if (p2StartRes.data.status !== 'in_progress') {
      throw new Error(`Participant 2 expected in_progress, got ${p2StartRes.data.status}`);
    }
    const p2Remaining = p2StartRes.data.remainingSeconds;
    if (p2Remaining < 115 || p2Remaining > 120) {
      throw new Error(`Participant 2 did not get fresh full 2-minute duration! Remaining: ${p2Remaining}`);
    }
    console.log(`✓ Test 7 PASSED: Fresh 2-minute duration (${p2Remaining}s) started from exact moment of participant click!`);

    // -------------------------------------------------------------
    // TEST 10: Ghost Attempt Self-Healing (Section 29)
    // -------------------------------------------------------------
    console.log('\n--- Running Test 10: Ghost Attempt Self-Healing (Section 29) ---');
    const participant3 = await User.create({
      username: `part3_${testSuffix}`,
      email: `part3_${testSuffix}@example.com`,
      passwordHash: 'dummy',
      name: 'Participant Three',
      role: 'participant'
    });
    const part3Token = jwt.sign(
      { userId: participant3._id.toString(), username: participant3.username, role: 'participant' },
      ENV.JWT_SECRET
    );

    // Simulate participant 3 having a corrupted 'submitted' ghost record with 0 attempts and 0 score
    await RoundProgress.create({
      userId: participant3._id,
      roundNumber: testRoundNumber,
      status: 'submitted',
      totalScore: 0,
      timeTakenSeconds: 0,
      startedAt: new Date(Date.now() - 10000),
      endsAt: new Date(Date.now() - 5000),
      submittedAt: new Date(Date.now() - 5000)
    });

    // Participant 3 opens round: GET /round-state should self-heal ghost record to not_started
    const p3State = await apiReq('/participant/round-state', part3Token);
    if (p3State.data.progress?.status !== 'not_started') {
      throw new Error(`Expected ghost record to be healed to not_started, got: ${p3State.data.progress?.status}`);
    }
    if (p3State.data.canStart !== true) {
      throw new Error(`Expected canStart to be true after healing, got: ${p3State.data.canStart}`);
    }
    console.log('  Participant 3 ghost record successfully healed to not_started on round open.');

    // Participant 3 clicks Start Round: POST /rounds/:roundNumber/start
    const p3StartRes = await apiReq(`/participant/rounds/${testRoundNumber}/start`, part3Token, 'POST', {
      roundNumber: testRoundNumber
    });
    if (p3StartRes.status !== 200 || p3StartRes.data.status !== 'in_progress') {
      throw new Error(`Expected in_progress after starting healed record, got: ${JSON.stringify(p3StartRes.data)}`);
    }
    console.log('✓ Test 10 PASSED: Ghost submitted record successfully healed and started!');

    // Clean up test data
    await Round.deleteMany({ roundNumber: testRoundNumber });
    await Question.deleteMany({ roundNumber: testRoundNumber, eventId: null });
    await RoundProgress.deleteMany({ roundNumber: testRoundNumber });
    await Attempt.deleteMany({ roundNumber: testRoundNumber });
    await User.deleteMany({ _id: { $in: [adminUser._id, participant1._id, participant2._id, participant3._id] } });

    console.log('\n===============================================================');
    console.log('🎉 ALL 10 TEST MATRIX SCENARIOS PASSED WITH ZERO REGRESSIONS!');
    console.log('===============================================================\n');
  } finally {
    stopServerTimerSweep();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await disconnectDB();
  }
}

run().catch((err) => {
  console.error('\n❌ Lifecycle Verification Test Failed:\n', err);
  process.exit(1);
});
