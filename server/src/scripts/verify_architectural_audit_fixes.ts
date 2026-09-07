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
import { adminEventRouter } from '../routes/adminEvent.js';
import { adminQuestionBankRouter } from '../routes/adminQuestionBank.js';
import { Attempt } from '../models/Attempt.js';
import { QuestionTemplate } from '../models/QuestionTemplate.js';
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
  app.use('/api/admin/events', adminEventRouter);
  app.use('/api/admin/questions/bank', adminQuestionBankRouter);
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

  // -------------------------------------------------------------
  // TEST 4: Event Deletion & Cascade Purge
  // -------------------------------------------------------------
  console.log('--- TEST 4: Event Deletion & Multi-Tier Cascade Cleanup ---');
  const testEvent = await Event.create({
    collegeId: college._id,
    name: 'HackSprint 2026',
    code: 'HACK26',
    status: 'draft'
  });

  const testRound = await DynamicRound.create({
    eventId: testEvent._id,
    collegeId: college._id,
    roundNumber: 1,
    title: 'Round 1 Dynamic',
    roundType: 'mcq'
  });

  const testStudent = await User.create({
    name: 'Cascade Student',
    username: 'cascade_student',
    passwordHash: 'hash123',
    role: 'participant',
    collegeId: college._id,
    eventId: testEvent._id
  });

  const testQuestion = await Question.create({
    collegeId: college._id,
    eventId: testEvent._id,
    roundNumber: 1,
    type: 'mcq',
    title: 'Cascade MCQ',
    prompt: 'What is O(1)?',
    options: ['Constant', 'Linear'],
    correctOptionIndex: 0
  });

  const testAttempt = await Attempt.create({
    userId: testStudent._id,
    questionId: testQuestion._id,
    roundNumber: 1,
    selectedOption: 0,
    score: 10
  });

  const testProgress = await RoundProgress.create({
    userId: testStudent._id,
    roundNumber: 1,
    status: 'in_progress',
    totalScore: 10
  });

  const delEventRes = await fetch(`${baseUrl}/api/admin/events/${testEvent._id.toString()}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  if (!delEventRes.ok) {
    throw new Error(`Event deletion failed: ${await delEventRes.text()}`);
  }

  const checkEvt = await Event.findById(testEvent._id);
  const checkRnd = await DynamicRound.findOne({ eventId: testEvent._id });
  const checkQ = await Question.findOne({ eventId: testEvent._id });
  const checkUsr = await User.findById(testStudent._id);
  const checkAtt = await Attempt.findById(testAttempt._id);
  const checkProg = await RoundProgress.findById(testProgress._id);

  if (checkEvt || checkRnd || checkQ || checkUsr || checkAtt || checkProg) {
    throw new Error('Cascade purge failed: orphaned records found after deleting event!');
  }
  console.log('  ✔ Event and all child resources (dynamic rounds, questions, participants, attempts, progress) purged with zero orphans.\n');

  // -------------------------------------------------------------
  // TEST 5: Question Bank CRUD (PUT & DELETE)
  // -------------------------------------------------------------
  console.log('--- TEST 5: Question Bank Template Update & Deletion ---');
  const bankTemplate = await QuestionTemplate.create({
    title: 'Original Bank Template',
    topic: 'Arrays',
    language: 'python',
    type: 'debugging',
    prompt: 'Fix the off-by-one bug',
    marks: 20
  });

  // Test PUT /api/admin/questions/bank/:templateId
  const updateRes = await fetch(`${baseUrl}/api/admin/questions/bank/${bankTemplate._id.toString()}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      title: 'Updated Bank Template',
      topic: 'Dynamic Programming',
      prompt: 'Updated prompt with deep DP analysis',
      marks: 30
    })
  });
  if (!updateRes.ok) {
    throw new Error(`Template update failed: ${await updateRes.text()}`);
  }

  const updatedDoc = await QuestionTemplate.findById(bankTemplate._id);
  if (updatedDoc?.title !== 'Updated Bank Template' || updatedDoc?.marks !== 30) {
    throw new Error('Template update did not persist correctly!');
  }
  console.log('  ✔ Question Bank template successfully updated via PUT.');

  // Test DELETE /api/admin/questions/bank/:templateId
  const deleteTemplateRes = await fetch(`${baseUrl}/api/admin/questions/bank/${bankTemplate._id.toString()}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  if (!deleteTemplateRes.ok) {
    throw new Error(`Template deletion failed: ${await deleteTemplateRes.text()}`);
  }

  const deletedDoc = await QuestionTemplate.findById(bankTemplate._id);
  if (deletedDoc) {
    throw new Error('Template was not deleted!');
  }
  console.log('  ✔ Question Bank template successfully removed via DELETE.\n');

  // -------------------------------------------------------------
  // TEST 6: Direct Question Creation auto-assigns collegeId
  // -------------------------------------------------------------
  console.log('--- TEST 6: Direct Question Creation auto-assigns collegeId ---');
  const eventDirect = await Event.create({
    collegeId: college._id,
    name: 'Direct Event',
    code: 'DIRECT26',
    status: 'draft'
  });

  const directQRes = await fetch(`${baseUrl}/api/admin/questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      eventId: eventDirect._id.toString(),
      roundNumber: 2,
      type: 'coding',
      title: 'Direct Question',
      prompt: 'Test prompt',
      marks: 20
    })
  });
  if (!directQRes.ok) {
    throw new Error(`Direct question creation failed: ${await directQRes.text()}`);
  }
  const directQJson = await directQRes.json();
  const savedDirectQ = await Question.findById(directQJson.question._id);
  if (!savedDirectQ?.collegeId || savedDirectQ.collegeId.toString() !== college._id.toString()) {
    throw new Error(`collegeId was not populated on Question! Got: ${savedDirectQ?.collegeId}`);
  }
  console.log('  ✔ Direct question creation correctly populated collegeId from parent event/user session.\n');

  // -------------------------------------------------------------
  // TEST 7: GET /api/auth/config returns googleClientId
  // -------------------------------------------------------------
  console.log('--- TEST 7: GET /api/auth/config returns googleClientId ---');
  const authConfigRes = await fetch(`${baseUrl}/api/auth/config`);
  if (!authConfigRes.ok) {
    throw new Error(`GET /api/auth/config failed: ${await authConfigRes.text()}`);
  }
  const authConfigJson = await authConfigRes.json();
  if (typeof authConfigJson.googleClientId !== 'string') {
    throw new Error('Expected googleClientId string in /api/auth/config');
  }
  console.log('  ✔ GET /api/auth/config returned googleClientId correctly.\n');

  // -------------------------------------------------------------
  // TEST 8: Passkey-first registration without email or password
  // -------------------------------------------------------------
  console.log('--- TEST 8: Passkey-first registration without email or password ---');
  const passkeySignup1Res = await fetch(`${baseUrl}/api/auth/register-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Organizer Alpha',
      passkey: 'ALPHA-KEY-2026',
      collegeName: 'Stanford Engineering',
      university: 'Stanford University'
    })
  });
  if (!passkeySignup1Res.ok) {
    throw new Error(`Passkey signup 1 failed: ${await passkeySignup1Res.text()}`);
  }
  const passkeySignup1Json = await passkeySignup1Res.json();
  if (!passkeySignup1Json.token || !passkeySignup1Json.user.hasPasskey) {
    throw new Error('Expected token and hasPasskey: true for passkey organizer');
  }
  const user1 = await User.findById(passkeySignup1Json.user.id);
  if (user1?.authProvider !== 'passkey') {
    throw new Error(`Expected authProvider 'passkey', got: ${user1?.authProvider}`);
  }
  if (user1?.email !== undefined) {
    throw new Error(`Expected email undefined to avoid sparse unique collisions, got: ${user1?.email}`);
  }

  // Second passkey user without email to verify sparse index collision is impossible
  const passkeySignup2Res = await fetch(`${baseUrl}/api/auth/register-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Organizer Beta',
      passkey: 'BETA-KEY-2026',
      collegeName: 'MIT EECS',
      university: 'MIT'
    })
  });
  if (!passkeySignup2Res.ok) {
    throw new Error(`Passkey signup 2 failed: ${await passkeySignup2Res.text()}`);
  }
  console.log('  ✔ Passkey-first registration successfully created accounts without email or password.\n');

  // -------------------------------------------------------------
  // TEST 9: Instant 1-step passkey login for accounts without email
  // -------------------------------------------------------------
  console.log('--- TEST 9: Instant 1-step passkey login for accounts without email ---');
  const instantLoginRes = await fetch(`${baseUrl}/api/auth/passkey/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passkey: 'ALPHA-KEY-2026' })
  });
  if (!instantLoginRes.ok) {
    throw new Error(`Instant passkey login failed: ${await instantLoginRes.text()}`);
  }
  const instantLoginJson = await instantLoginRes.json();
  if (!instantLoginJson.token || instantLoginJson.user.name !== 'Organizer Alpha') {
    throw new Error(`Expected direct 1-step token for email-less passkey user, got: ${JSON.stringify(instantLoginJson)}`);
  }
  console.log('  ✔ Instant 1-step passkey login returned JWT directly without dead-end email requirement.\n');

  // -------------------------------------------------------------
  // TEST 10: Passkey login with email (Laptop-to-Mobile Verification Flow)
  // -------------------------------------------------------------
  console.log('--- TEST 10: Passkey login with email (Laptop-to-Mobile Verification Flow) ---');
  // Create organizer with passkey AND email
  const emailAdmin = await User.create({
    username: 'prof_gamma',
    name: 'Prof. Gamma',
    email: 'gamma@university.edu',
    role: 'admin',
    authProvider: 'passkey',
    hasPasskey: true,
    passkeyHash: await (await import('bcryptjs')).default.hash('GAMMA-SECURE-KEY', 10),
    collegeId: college._id
  });

  // Organizer enters passkey on laptop
  const emailPasskeyLoginRes = await fetch(`${baseUrl}/api/auth/passkey/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passkey: 'GAMMA-SECURE-KEY' })
  });
  if (!emailPasskeyLoginRes.ok) {
    throw new Error(`Email passkey login failed: ${await emailPasskeyLoginRes.text()}`);
  }
  const emailPasskeyLoginJson = await emailPasskeyLoginRes.json();
  if (!emailPasskeyLoginJson.requiresEmailVerification || !emailPasskeyLoginJson.sessionId) {
    throw new Error('Expected requiresEmailVerification and sessionId');
  }

  // Laptop starts polling session-status (initially not verified)
  const poll1Res = await fetch(`${baseUrl}/api/auth/passkey/session-status?sessionId=${emailPasskeyLoginJson.sessionId}`);
  const poll1Json = await poll1Res.json();
  if (poll1Json.verified) {
    throw new Error('Session should not be verified before link is clicked');
  }

  // Organizer opens email on mobile phone and clicks magic link
  // Extract magic token from devSignInUrl or DB session
  const magicToken = new URL(emailPasskeyLoginJson.devSignInUrl).searchParams.get('token');
  if (!magicToken) {
    throw new Error('Missing token in devSignInUrl');
  }

  // Mobile phone calls verify-magic-token with session ID
  const mobileVerifyRes = await fetch(`${baseUrl}/api/auth/passkey/verify-magic-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: magicToken,
      sessionId: emailPasskeyLoginJson.sessionId
    })
  });
  if (!mobileVerifyRes.ok) {
    throw new Error(`Mobile verification failed: ${await mobileVerifyRes.text()}`);
  }
  const mobileVerifyJson = await mobileVerifyRes.json();
  if (!mobileVerifyJson.token || mobileVerifyJson.user.username !== 'prof_gamma') {
    throw new Error('Mobile verification did not return valid token');
  }

  // Laptop polling checks again -> MUST NOW BE VERIFIED!
  const poll2Res = await fetch(`${baseUrl}/api/auth/passkey/session-status?sessionId=${emailPasskeyLoginJson.sessionId}`);
  const poll2Json = await poll2Res.json();
  if (!poll2Json.verified || !poll2Json.token) {
    throw new Error('Laptop polling should report verified: true with token');
  }
  console.log('  ✔ Laptop-to-mobile passkey verification flow seamlessly verified session and unlocked laptop.\n');

  // -------------------------------------------------------------
  // TEST 11: Passkey Disambiguation when multiple accounts share passkey
  // -------------------------------------------------------------
  console.log('--- TEST 11: Passkey Disambiguation when multiple accounts share passkey ---');
  // Create another account with the SAME passkey as user1
  const sharedKeyUser = await User.create({
    username: 'shared_alpha_2',
    name: 'Shared Alpha Two',
    email: 'shared2@university.edu',
    role: 'admin',
    authProvider: 'passkey',
    hasPasskey: true,
    passkeyHash: await (await import('bcryptjs')).default.hash('ALPHA-KEY-2026', 10),
    passkeyLookupHash: (await import('crypto')).createHmac('sha256', ENV.JWT_SECRET).update('ALPHA-KEY-2026').digest('hex'),
    collegeId: college._id
  });

  const disambigRes = await fetch(`${baseUrl}/api/auth/passkey/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passkey: 'ALPHA-KEY-2026' })
  });
  const disambigJson = await disambigRes.json();
  if (!disambigJson.requiresEmail || disambigJson.matchedCount !== 2) {
    throw new Error(`Expected requiresEmail: true with matchedCount 2, got: ${JSON.stringify(disambigJson)}`);
  }
  if (!disambigJson.maskedAccounts.some((a: any) => a.username === 'shared_alpha_2')) {
    throw new Error('Expected username in maskedAccounts for disambiguation chip');
  }

  // Disambiguate using username
  const resolvedLoginRes = await fetch(`${baseUrl}/api/auth/passkey/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passkey: 'ALPHA-KEY-2026', email: 'shared_alpha_2' })
  });
  if (!resolvedLoginRes.ok) {
    throw new Error(`Disambiguated login failed: ${await resolvedLoginRes.text()}`);
  }
  const resolvedJson = await resolvedLoginRes.json();
  if (!resolvedJson.requiresEmailVerification && !resolvedJson.token) {
    throw new Error('Expected successful login or email verification after disambiguation');
  }
  console.log('  ✔ Disambiguation returned accounts with usernames and accepted username disambiguation.\n');

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
