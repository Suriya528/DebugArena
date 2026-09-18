import http from 'http';
import express from 'express';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { ENV } from '../config/env.js';
import { User } from '../models/User.js';
import { College } from '../models/College.js';
import { Event } from '../models/Event.js';
import { DynamicRound } from '../models/DynamicRound.js';
import { Question } from '../models/Question.js';
import { Attempt } from '../models/Attempt.js';
import { RoundProgress } from '../models/RoundProgress.js';
import { finalizeParticipantRoundScore } from '../services/scoringService.js';
import { participantRouter } from '../routes/participant.js';
import { adminControlRoomRouter } from '../routes/adminControlRoom.js';
import { adminRouter } from '../routes/admin.js';
import { adminEventRouter } from '../routes/adminEvent.js';
import { initSocketIO } from '../services/socketService.js';

let mongod: MongoMemoryServer;
let server: http.Server;
let baseUrl: string;

function assert(condition: any, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  } else {
    console.log(`  ✓ ${message}`);
  }
}

async function run() {
  console.log('🧪 ========================================================');
  console.log('🧪 AUDIT REMEDIATION VERIFICATION SUITE');
  console.log('🧪 ========================================================\n');

  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  const app = express();
  app.use(express.json());
  server = http.createServer(app);
  initSocketIO(server);

  app.use('/api/participant', participantRouter);
  app.use('/api/admin/control-room', adminControlRoomRouter);
  app.use('/api/admin/events', adminEventRouter);
  app.use('/api/admin', adminRouter);

  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      const port = (server.address() as any).port;
      baseUrl = `http://localhost:${port}/api`;
      resolve();
    });
  });

  // Setup test college and events
  const college = await College.create({
    name: 'Audit Tech Institute',
    code: 'ATI',
    primaryColor: '#6366f1',
    secondaryColor: '#06b6d4'
  });

  const event1 = await Event.create({
    collegeId: college._id,
    name: 'Championship 2026',
    code: 'CHAMP26',
    status: 'live',
    rules: ['Be ethical'],
    scoringConfig: {
      negativeMarking: false,
      tieBreakerPriority: ['codingScore', 'totalTime'],
      autoSubmitOnTimeUp: true,
      violationLimit: 3,
      autoSubmitOnViolation: true
    }
  });

  const r1 = await DynamicRound.create({
    eventId: event1._id,
    roundNumber: 1,
    title: 'Stage 1: MCQs',
    type: 'mcq',
    durationMinutes: 15,
    questionCount: 1,
    totalMarks: 10,
    status: 'active',
    startedAt: new Date()
  });

  const r2 = await DynamicRound.create({
    eventId: event1._id,
    roundNumber: 2,
    title: 'Stage 2: Coding Bug Hunt',
    type: 'coding',
    durationMinutes: 30,
    questionCount: 1,
    totalMarks: 20,
    status: 'pending',
    startedAt: null
  });

  const mcqQuestion = await Question.create({
    eventId: event1._id,
    roundNumber: 1,
    type: 'mcq',
    orderIndex: 0,
    title: 'Pointer arithmetic in C',
    prompt: 'What does *(ptr + 1) do?',
    options: ['Increment value', 'Access next element', 'Dereference NULL', 'Compile error'],
    correctOptionIndex: 1,
    marks: 10
  });

  const codingQuestion = await Question.create({
    eventId: event1._id,
    roundNumber: 2,
    type: 'coding',
    orderIndex: 0,
    title: 'Array Reversal',
    prompt: 'Reverse the array.',
    marks: 20,
    testCases: [
      { input: '3\n1 2 3', expectedOutput: '3 2 1', isHidden: false, weight: 10 },
      { input: '1\n99', expectedOutput: '99', isHidden: true, weight: 10 }
    ]
  });

  const participant = await User.create({
    username: 'champ_alice',
    name: 'Alice Cooper',
    passwordHash: '$2a$10$dummyhashdummyhashdummyh',
    role: 'participant',
    collegeId: college._id,
    eventId: event1._id
  });

  const participantToken = jwt.sign(
    { userId: participant._id.toString(), username: participant.username, role: 'participant', eventId: event1._id.toString() },
    ENV.JWT_SECRET
  );
  const participantHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${participantToken}`
  };

  const admin = await User.create({
    username: 'super_admin',
    name: 'Admin Boss',
    passwordHash: '$2a$10$dummyhashdummyhashdummyh',
    role: 'super_admin',
    collegeId: college._id
  });
  const adminToken = jwt.sign(
    { userId: admin._id.toString(), username: admin.username, role: 'super_admin', collegeId: college._id.toString() },
    ENV.JWT_SECRET
  );
  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`
  };

  // ----------------------------------------------------
  // TEST 1: Universal MCQ Auto-Grading (Timer Sweep / Round Lock)
  // ----------------------------------------------------
  console.log('--- TEST 1: Universal MCQ Auto-Grading on Timer Expiry / Round Lock ---');
  
  // Participant saves MCQ answer without manual submit
  const saveRes = await fetch(`${baseUrl}/participant/save-answer`, {
    method: 'POST',
    headers: participantHeaders,
    body: JSON.stringify({
      questionId: mcqQuestion._id.toString(),
      roundNumber: 1,
      selectedOption: 1 // Correct option
    })
  });
  assert(saveRes.status === 200, 'POST /save-answer returned 200 OK');

  const attemptBefore = await Attempt.findOne({ userId: participant._id, questionId: mcqQuestion._id });
  assert(attemptBefore?.score === 0, 'Attempt score is initially 0 before grading');
  assert(attemptBefore?.status === 'saved', 'Attempt status is "saved"');

  // Now simulate timer expiration or admin round lock by calling finalizeParticipantRoundScore directly
  const finalResult = await finalizeParticipantRoundScore(participant._id.toString(), 1);
  assert(finalResult.totalScore === 10, `MCQ auto-grading assigned correct marks: ${finalResult.totalScore}/10`);

  const attemptAfter = await Attempt.findOne({ userId: participant._id, questionId: mcqQuestion._id });
  assert(attemptAfter?.score === 10, 'Attempt score was auto-evaluated to 10 points');
  assert(attemptAfter?.status === 'submitted', 'Attempt status was updated to "submitted"');

  // ----------------------------------------------------
  // TEST 2: Multi-Round Progression (Deadlock Fix for Round 2 & 3)
  // ----------------------------------------------------
  console.log('\n--- TEST 2: Multi-Round Progression & Deadlock Fix ---');
  
  // Admin advances participant from Round 1
  await RoundProgress.findOneAndUpdate(
    { userId: participant._id, roundNumber: 1 },
    { $set: { status: 'advanced' } }
  );

  // Admin starts Round 2
  r2.status = 'active';
  r2.startedAt = new Date();
  await r2.save();

  // Participant requests /round-state
  const roundStateRes = await fetch(`${baseUrl}/participant/round-state`, {
    headers: participantHeaders
  });
  assert(roundStateRes.status === 200, 'GET /round-state returned 200 OK');
  const roundStateData = await roundStateRes.json();

  assert(roundStateData.round.roundNumber === 2, `Round state accurately resolved Round 2 (got: ${roundStateData.round.roundNumber})`);
  assert(roundStateData.round.status === 'active', 'Round 2 status is active');
  assert(roundStateData.nextRoundAvailable === false, 'nextRoundAvailable is FALSE when participant is in the active round (DEADLOCK BROKEN!)');
  assert(roundStateData.round.deadlineAt !== null && roundStateData.round.deadlineAt !== undefined, 'round.deadlineAt timestamp is provided for drift-free timer');

  // ----------------------------------------------------
  // TEST 3: Live Real-Time Leaderboard Score Update on Submit-Code
  // ----------------------------------------------------
  console.log('\n--- TEST 3: Live Real-Time Leaderboard Score Update on Submit-Code ---');

  // Participant creates attempt on coding question
  const codeRes = await fetch(`${baseUrl}/participant/submit-code`, {
    method: 'POST',
    headers: participantHeaders,
    body: JSON.stringify({
      questionId: codingQuestion._id.toString(),
      roundNumber: 2,
      code: 'print("3 2 1")',
      language: 'python'
    })
  });
  assert(codeRes.status === 200, 'POST /submit-code returned 200 OK');
  const codeData = await codeRes.json();
  assert(codeData.score > 0, `Code evaluation awarded points: ${codeData.score}`);

  // Check that RoundProgress.totalScore was immediately updated in DB
  const progRound2 = await RoundProgress.findOne({ userId: participant._id, roundNumber: 2 });
  assert((progRound2?.totalScore || 0) > 0, `RoundProgress.totalScore immediately updated to ${progRound2?.totalScore} points without waiting for round submission`);

  // Verify that GET /admin/leaderboard shows points immediately
  const lbRes = await fetch(`${baseUrl}/admin/leaderboard?eventId=${event1._id}`, {
    headers: adminHeaders
  });
  const lbData = await lbRes.json();
  const aliceRow = lbData.leaderboard.find((r: any) => r.username === 'champ_alice');
  assert(aliceRow !== undefined, 'Participant found in live leaderboard');
  assert(aliceRow.roundScores[2] === progRound2?.totalScore, `Live leaderboard immediately reflects Round 2 score: ${aliceRow.roundScores[2]} pts`);

  // ----------------------------------------------------
  // TEST 4: Control Room Zero-Participant Isolation
  // ----------------------------------------------------
  console.log('\n--- TEST 4: Control Room Zero-Participant Isolation ---');

  const emptyEvent = await Event.create({
    collegeId: college._id,
    name: 'Future Event With Zero Participants',
    code: 'EMPTY01',
    status: 'draft'
  });

  const pulseRes = await fetch(`${baseUrl}/admin/control-room/pulse?eventId=${emptyEvent._id}&roundNumber=1`, {
    headers: adminHeaders
  });
  assert(pulseRes.status === 200, 'GET /pulse returned 200 OK');
  const pulseData = await pulseRes.json();
  assert(pulseData.counts.totalParticipants === 0, `Total participants is 0 (actual: ${pulseData.counts.totalParticipants})`);
  assert(pulseData.counts.activeParticipants === 0, `Active participants is 0 (actual: ${pulseData.counts.activeParticipants})`);
  assert(pulseData.counts.suspiciousEvents === 0, `Suspicious events is 0 (actual: ${pulseData.counts.suspiciousEvents})`);
  console.log('  ✓ No data leaked from other events when event has 0 participants!');

  // ----------------------------------------------------
  // TEST 5: Multi-Event Unique Progress Support
  // ----------------------------------------------------
  console.log('\n--- TEST 5: Multi-Event Unique Progress Support ---');

  const event2 = await Event.create({
    collegeId: college._id,
    name: 'Second Tournament',
    code: 'SEC2026',
    status: 'live'
  });

  // Create RoundProgress for participant in Event 2 for Round 1
  let duplicateError = false;
  try {
    await RoundProgress.create({
      userId: participant._id,
      eventId: event2._id,
      roundNumber: 1,
      totalScore: 50,
      status: 'in_progress'
    });
  } catch (err: any) {
    duplicateError = true;
    console.error('Duplicate key error occurred:', err.message);
  }
  assert(!duplicateError, 'Participant can participate in Event 1 and Event 2 for Round 1 without unique key collision!');

  console.log('\n✨ ========================================================');
  console.log('✨ ALL AUDIT REMEDIATION TESTS PASSED FLAWLESSLY!');
  console.log('✨ ========================================================');

  server.close();
  await mongoose.disconnect();
  await mongod.stop();
  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
