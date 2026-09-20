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
import { ParticipantRoundResult } from '../models/ParticipantRoundResult.js';
import { participantRouter } from '../routes/participant.js';
import { adminRouter } from '../routes/admin.js';

async function run() {
  console.log('🚀 Starting Result Publishing & Selection Flow Verification Suite...\n');

  await connectDB();

  const app = express();
  app.use(express.json());
  app.use('/api/participant', participantRouter);
  app.use('/api/admin', adminRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  try {
    const testSuffix = Date.now();
    const adminUser = await User.create({
      username: `admin_pub_${testSuffix}`,
      email: `admin_${testSuffix}@example.com`,
      passwordHash: 'dummy',
      name: 'Admin Publisher',
      role: 'admin'
    });

    const participant1 = await User.create({
      username: `p1_sel_${testSuffix}`,
      email: `p1_${testSuffix}@example.com`,
      passwordHash: 'dummy',
      name: 'Selected Winner',
      role: 'participant'
    });

    const participant2 = await User.create({
      username: `p2_unsel_${testSuffix}`,
      email: `p2_${testSuffix}@example.com`,
      passwordHash: 'dummy',
      name: 'Unselected Contender',
      role: 'participant'
    });

    const adminToken = jwt.sign(
      { userId: adminUser._id.toString(), username: adminUser.username, role: 'admin' },
      ENV.JWT_SECRET
    );

    const p1Token = jwt.sign(
      { userId: participant1._id.toString(), username: participant1.username, role: 'participant' },
      ENV.JWT_SECRET
    );

    const p2Token = jwt.sign(
      { userId: participant2._id.toString(), username: participant2.username, role: 'participant' },
      ENV.JWT_SECRET
    );

    // Setup Round 1 and Round 2
    await Round.deleteMany({ roundNumber: { $in: [1, 2] } });
    await Question.deleteMany({ roundNumber: { $in: [1, 2] } });

    const round1 = await Round.create({
      roundNumber: 1,
      title: 'Preliminary Quiz',
      type: 'mcq',
      durationMinutes: 30,
      questionCount: 1,
      status: 'active',
      startedAt: new Date(),
      deadlineAt: new Date(Date.now() + 30 * 60 * 1000)
    });

    const round2 = await Round.create({
      roundNumber: 2,
      title: 'Coding Arena',
      type: 'coding',
      durationMinutes: 45,
      questionCount: 1,
      status: 'active',
      startedAt: new Date(),
      deadlineAt: new Date(Date.now() + 45 * 60 * 1000)
    });

    const qList1 = [];
    for (let i = 1; i <= 10; i++) {
      qList1.push({
        roundNumber: 1,
        orderIndex: i,
        type: 'mcq',
        title: `Sample MCQ ${i}`,
        prompt: `What is ${i}+${i}?`,
        options: ['1', '2', '3', '4'],
        correctOptionIndex: 1,
        marks: 10
      });
    }
    const createdQ1s = await Question.insertMany(qList1);
    const q1 = createdQ1s[0];

    const qList2 = [];
    for (let i = 1; i <= 3; i++) {
      qList2.push({
        roundNumber: 2,
        orderIndex: i,
        type: 'coding',
        title: `Sample Coding ${i}`,
        prompt: `Write program ${i}`,
        marks: 20
      });
    }
    await Question.insertMany(qList2);

    console.log('✅ Test fixtures initialized.');

    // -------------------------------------------------------------
    // Test 1: Participant 1 starts and submits Round 1
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Participant starts and submits Round 1 ---');
    const startRes1 = await fetch(`${baseUrl}/participant/rounds/1/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${p1Token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ roundNumber: 1 })
    });
    const startData1 = await startRes1.json();
    if (startRes1.status !== 200 || startData1.status !== 'in_progress') {
      throw new Error(`Test 1 Failed: start response ${JSON.stringify(startData1)}`);
    }

    // Submit answer for Q1
    await Attempt.create({
      userId: participant1._id,
      questionId: q1._id,
      roundNumber: 1,
      selectedOption: 1,
      score: 10,
      status: 'submitted'
    });

    // Participant 1 submits Round 1
    const subRes1 = await fetch(`${baseUrl}/participant/submit-round`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${p1Token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ roundNumber: 1 })
    });
    const subData1 = await subRes1.json();
    if (subRes1.status !== 200 || !subData1.success) {
      throw new Error(`Test 1 Failed: p1 submit response ${JSON.stringify(subData1)}`);
    }

    // Participant 2 starts and submits Round 1
    await fetch(`${baseUrl}/participant/rounds/1/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${p2Token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ roundNumber: 1 })
    });
    await fetch(`${baseUrl}/participant/submit-round`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${p2Token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ roundNumber: 1 })
    });

    console.log('✅ Test 1 Passed: Both participants submitted Round 1.');

    // -------------------------------------------------------------
    // Test 2: Pre-Publication Confidentiality (Result Pending & Zero Score Exposure)
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Participant round-state secrecy & result pending ---');
    const stateRes1 = await fetch(`${baseUrl}/participant/round-state`, {
      headers: { Authorization: `Bearer ${p1Token}` }
    });
    const stateData1 = await stateRes1.json();

    if (!stateData1.result || stateData1.result.status !== 'RESULT_PENDING' || stateData1.result.isPublished !== false) {
      throw new Error(`Test 2 Failed: Expected RESULT_PENDING with isPublished: false, got ${JSON.stringify(stateData1.result)}`);
    }
    if (stateData1.progress.totalScore !== undefined) {
      throw new Error(`Test 2 Failed: totalScore was not stripped! Received ${stateData1.progress.totalScore}`);
    }
    if (stateData1.progress.timeTakenSeconds !== undefined) {
      throw new Error(`Test 2 Failed: timeTakenSeconds was not stripped! Received ${stateData1.progress.timeTakenSeconds}`);
    }
    if (stateData1.nextRoundAvailable !== false) {
      throw new Error(`Test 2 Failed: nextRoundAvailable must be false before publication!`);
    }
    console.log('✅ Test 2 Passed: Secrecy preserved — RESULT_PENDING, score stripped, next round unavailable.');

    // -------------------------------------------------------------
    // Test 3: Participant cannot access Round 2 before publication
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Participant barred from starting Round 2 before publication ---');
    const startR2Pre = await fetch(`${baseUrl}/participant/rounds/2/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${p1Token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ roundNumber: 2 })
    });
    const startR2PreData = await startR2Pre.json();
    if (startR2Pre.status !== 403) {
      throw new Error(`Test 3 Failed: Expected 403, got ${startR2Pre.status} with ${JSON.stringify(startR2PreData)}`);
    }
    console.log(`✅ Test 3 Passed: Blocked with 403: "${startR2PreData.error}"`);

    // -------------------------------------------------------------
    // Test 4: Admin saves draft selections (Participants still see pending)
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Admin saves selection draft privately ---');
    const saveDraftRes = await fetch(`${baseUrl}/admin/rounds/1/results/save`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        selections: [
          { participantId: participant1._id.toString(), selection: 'SELECTED' },
          { participantId: participant2._id.toString(), selection: 'NOT_SELECTED' }
        ]
      })
    });
    const saveDraftData = await saveDraftRes.json();
    if (saveDraftRes.status !== 200 || !saveDraftData.success) {
      throw new Error(`Test 4 Failed: save draft response ${JSON.stringify(saveDraftData)}`);
    }

    // Verify participant still sees RESULT_PENDING
    const stateResAfterDraft = await fetch(`${baseUrl}/participant/round-state`, {
      headers: { Authorization: `Bearer ${p1Token}` }
    });
    const stateDataAfterDraft = await stateResAfterDraft.json();
    if (stateDataAfterDraft.result?.status !== 'RESULT_PENDING' || stateDataAfterDraft.result?.isPublished !== false) {
      throw new Error(`Test 4 Failed: Participant must not see draft! Got ${JSON.stringify(stateDataAfterDraft.result)}`);
    }
    console.log('✅ Test 4 Passed: Draft saved privately; participant still sees RESULT_PENDING.');

    // -------------------------------------------------------------
    // Test 5: Admin publishes results (Participant 1 Selected, Participant 2 Not Selected)
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Admin publishes official results ---');
    // Lock/end round 1 first to satisfy publication requirements
    await Round.updateOne({ roundNumber: 1 }, { status: 'completed', endedAt: new Date() });

    const publishRes = await fetch(`${baseUrl}/admin/rounds/1/results/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const publishData = await publishRes.json();
    if (publishRes.status !== 200 || !publishData.success) {
      throw new Error(`Test 5 Failed: publish response ${JSON.stringify(publishData)}`);
    }
    console.log(`✅ Test 5 Passed: Results published (${publishData.selectedCount} selected, ${publishData.notSelectedCount} not selected).`);

    // -------------------------------------------------------------
    // Test 6: Participant 1 sees SELECTED and can start Round 2
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Participant 1 (Selected) flow ---');
    const p1StatePostPub = await fetch(`${baseUrl}/participant/round-state`, {
      headers: { Authorization: `Bearer ${p1Token}` }
    });
    const p1DataPostPub = await p1StatePostPub.json();
    if (p1DataPostPub.result?.status !== 'SELECTED' || p1DataPostPub.result?.isPublished !== true) {
      throw new Error(`Test 6 Failed: Expected SELECTED & isPublished: true, got ${JSON.stringify(p1DataPostPub.result)}`);
    }
    if (p1DataPostPub.nextRoundAvailable !== true) {
      throw new Error(`Test 6 Failed: nextRoundAvailable must be true for selected participant when round 2 is active!`);
    }

    // Participant 1 starts Round 2
    const startR2P1 = await fetch(`${baseUrl}/participant/rounds/2/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${p1Token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ roundNumber: 2 })
    });
    const startR2P1Data = await startR2P1.json();
    if (startR2P1.status !== 200 || startR2P1Data.status !== 'in_progress') {
      throw new Error(`Test 6 Failed: Participant 1 should successfully start round 2! Got: ${JSON.stringify(startR2P1Data)}`);
    }
    console.log('✅ Test 6 Passed: Participant 1 is SELECTED, saw next round available, and successfully entered Round 2!');

    // -------------------------------------------------------------
    // Test 7: Participant 2 sees NOT_SELECTED and is barred from Round 2
    // -------------------------------------------------------------
    console.log('\n--- Test 7: Participant 2 (Not Selected) flow ---');
    const p2StatePostPub = await fetch(`${baseUrl}/participant/round-state`, {
      headers: { Authorization: `Bearer ${p2Token}` }
    });
    const p2DataPostPub = await p2StatePostPub.json();
    if (p2DataPostPub.result?.status !== 'NOT_SELECTED' || p2DataPostPub.result?.isPublished !== true) {
      throw new Error(`Test 7 Failed: Expected NOT_SELECTED & isPublished: true, got ${JSON.stringify(p2DataPostPub.result)}`);
    }
    if (p2DataPostPub.nextRoundAvailable !== false) {
      throw new Error(`Test 7 Failed: nextRoundAvailable must be false for unselected participant!`);
    }

    // Participant 2 attempts to start Round 2
    const startR2P2 = await fetch(`${baseUrl}/participant/rounds/2/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${p2Token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ roundNumber: 2 })
    });
    if (startR2P2.status !== 403) {
      throw new Error(`Test 7 Failed: Unselected participant must get 403! Got ${startR2P2.status}`);
    }
    console.log('✅ Test 7 Passed: Participant 2 is NOT_SELECTED and strictly barred from entering Round 2.');

    console.log('\n🎉 ALL 7 RESULT PUBLISHING & SELECTION FLOW TESTS PASSED PERFECTLY!\n');
  } finally {
    server.close();
    await disconnectDB();
  }
}

run().catch((err) => {
  console.error('❌ Verification suite failed:', err);
  process.exit(1);
});
