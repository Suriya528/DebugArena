import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import http from 'http';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { College } from '../models/College.js';
import { Event } from '../models/Event.js';
import { DynamicRound } from '../models/DynamicRound.js';
import { User } from '../models/User.js';
import { RoundProgress } from '../models/RoundProgress.js';
import { Question } from '../models/Question.js';
import { participantRouter } from '../routes/participant.js';
import { adminRouter } from '../routes/admin.js';
import { authRouter } from '../routes/auth.js';
import { initSocketIO } from '../services/socketService.js';

let mongod: MongoMemoryServer;
let server: http.Server;
let baseUrl: string;

async function setup() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  const app = express();
  app.use(express.json());
  server = http.createServer(app);
  initSocketIO(server);

  app.use('/api/auth', authRouter);
  app.use('/api/participant', participantRouter);
  app.use('/api/admin', adminRouter);

  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      const port = (server.address() as any).port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
}

async function runTests() {
  console.log('\n================================================================');
  console.log('🔍 VERIFYING SENIOR ARCHITECT AUDIT FIXES');
  console.log('================================================================\n');

  await setup();

  // Seed baseline College, Event, and Round
  const college = await College.create({ name: 'MIT', code: 'MIT01' });
  const event = await Event.create({
    name: 'Hackathon 2026',
    code: 'HACK99',
    collegeId: college._id,
    status: 'live',
    scoringConfig: { violationLimit: 2, autoSubmitOnViolation: true }
  });

  const dynRound1 = await DynamicRound.create({
    eventId: event._id,
    roundNumber: 1,
    title: 'Round 1: Rapid Fire MCQs',
    type: 'mcq',
    status: 'pending',
    durationMinutes: 15
  });

  const dynRound = await DynamicRound.create({
    eventId: event._id,
    roundNumber: 2,
    title: 'Round 2: Algorithmic Debugging',
    type: 'debugging',
    status: 'active',
    startedAt: new Date(Date.now() - 60000), // started 1 min ago
    durationMinutes: 30,
    allowedLanguages: ['python', 'cpp']
  });

  const question = await Question.create({
    eventId: event._id,
    roundNumber: 2,
    type: 'coding',
    title: 'Reverse Linked List',
    prompt: 'Reverse the linked list',
    marks: 100,
    starterCode: { python: 'def reverse(): pass' },
    allowedLanguages: ['python', 'cpp'],
    testCases: [{ input: '1->2->3', expectedOutput: '3->2->1', weight: 100, isHidden: false }],
    timeLimitMs: 2000
  });

  const adminUser = await User.create({
    username: 'superadmin',
    role: 'super_admin',
    name: 'Platform Admin',
    passwordHash: 'testhash'
  });
  const adminToken = jwt.sign(
    { userId: adminUser._id.toString(), username: adminUser.username, role: adminUser.role },
    ENV.JWT_SECRET
  );

  console.log('--- TEST 1: join-by-code Concurrent Duplicate-Key Collision Handling ---');
  // Trigger two simultaneous registration attempts with identical roll number
  const joinPayload = {
    eventCode: 'HACK99',
    name: 'Concurrent Candidate',
    regNo: 'ROLL_CONCURRENT_1',
    password: 'Password123!',
    department: 'CS',
    year: '3'
  };

  const [res1, res2] = await Promise.all([
    fetch(`${baseUrl}/api/participant/join-by-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(joinPayload)
    }),
    fetch(`${baseUrl}/api/participant/join-by-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(joinPayload)
    })
  ]);

  if (!res1.ok || !res2.ok) {
    throw new Error(`Concurrent join failed! Statuses: ${res1.status}, ${res2.status}`);
  }
  const data1 = await res1.json();
  const data2 = await res2.json();
  if (data1.user.id !== data2.user.id) {
    throw new Error('Expected both concurrent calls to resolve to identical candidate user id!');
  }
  console.log('  ✔ Concurrent registrations handled with zero duplicate key crash.\n');

  const studentToken = data1.token;
  const studentId = data1.user.id;

  console.log('--- TEST 2: run-code Protected Against Post-Submission & Deadline Expiry ---');
  // First run-code should succeed
  const runRes1 = await fetch(`${baseUrl}/api/participant/run-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      questionId: question._id.toString(),
      roundNumber: 2,
      code: 'print("3->2->1")',
      language: 'python'
    })
  });
  if (!runRes1.ok) {
    throw new Error(`Initial run-code failed: ${await runRes1.text()}`);
  }
  console.log('  ✔ Legitimate run-code executed successfully.');

  // Now submit round explicitly
  await RoundProgress.findOneAndUpdate(
    { userId: studentId, roundNumber: 2 },
    { $set: { status: 'submitted', totalScore: 100 } },
    { upsert: true }
  );

  // Attempting run-code on submitted round MUST return 403
  const runRes2 = await fetch(`${baseUrl}/api/participant/run-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      questionId: question._id.toString(),
      roundNumber: 2,
      code: 'print("post-submit-tamper")',
      language: 'python'
    })
  });
  if (runRes2.status !== 403) {
    throw new Error(`Expected 403 for run-code on submitted round, got ${runRes2.status}`);
  }
  console.log('  ✔ run-code on submitted round strictly rejected (403).\n');

  console.log('--- TEST 3: Admin Start Round Preserves Submitted and Eliminated Status ---');
  // Setup participant 1 as submitted, participant 2 as eliminated
  const student2 = await User.create({
    username: 'cheating_student',
    role: 'participant',
    name: 'Cheater',
    eventId: event._id,
    passwordHash: 'testhash'
  });
  await RoundProgress.create({
    userId: studentId,
    roundNumber: 1,
    status: 'submitted',
    totalScore: 95
  });
  await RoundProgress.create({
    userId: student2._id,
    roundNumber: 1,
    status: 'eliminated',
    totalScore: 0
  });

  // Admin calls POST /api/admin/rounds/1/start
  const startRes = await fetch(`${baseUrl}/api/admin/rounds/1/start?eventId=${event._id.toString()}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`
    }
  });
  if (!startRes.ok) {
    throw new Error(`Admin start round failed: ${await startRes.text()}`);
  }

  // Verify that student 1 is STILL submitted and student 2 is STILL eliminated
  const prog1 = await RoundProgress.findOne({ userId: studentId, roundNumber: 1 });
  const prog2 = await RoundProgress.findOne({ userId: student2._id, roundNumber: 1 });

  if (prog1?.status !== 'submitted') {
    throw new Error(`Candidate 1 status corrupted! Expected 'submitted', got '${prog1?.status}'`);
  }
  if (prog2?.status !== 'eliminated') {
    throw new Error(`Eliminated candidate was resurrected! Expected 'eliminated', got '${prog2?.status}'`);
  }
  console.log('  ✔ Submitted candidate preserved (status: "submitted").');
  console.log('  ✔ Eliminated candidate strictly preserved (status: "eliminated").\n');

  console.log('================================================================');
  console.log('🎉 ALL ARCHITECTURAL AUDIT VERIFICATION TESTS PASSED!');
  console.log('================================================================\n');

  await mongoose.disconnect();
  await mongod.stop();
  server.close();
}

runTests().catch((err) => {
  console.error('Test verification failed:', err);
  process.exit(1);
});
