import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express, { Express } from 'express';
import http from 'http';
import { College } from '../models/College.js';
import { Event } from '../models/Event.js';
import { User } from '../models/User.js';
import { RoundProgress } from '../models/RoundProgress.js';
import { ViolationLog } from '../models/ViolationLog.js';
import { Competition } from '../models/Competition.js';
import { ENV } from '../config/env.js';
import { authRouter } from '../routes/auth.js';
import { participantRouter } from '../routes/participant.js';

let mongod: MongoMemoryServer;
let server: http.Server;
let baseUrl: string;

async function setup() {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  const app: Express = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use('/api/participant', participantRouter);

  await new Promise<void>((resolve) => {
    server = http.createServer(app).listen(0, () => {
      const address = server.address() as any;
      baseUrl = `http://localhost:${address.port}`;
      resolve();
    });
  });

  console.log(`Connected to In-Memory MongoDB. Test server listening at ${baseUrl}.`);
}

async function teardown() {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  await mongoose.disconnect();
  await mongod.stop();
  console.log('MongoDB and test server shut down.');
}

async function runVerification() {
  await setup();

  try {
    console.log('\n================================================================');
    console.log('🛡️ RUNNING PROCTORING LOCKDOWN & GOOGLE/EVENT AUTH TEST SUITE');
    console.log('================================================================\n');

    // Setup College and Event with custom strike configuration
    const college = await College.create({
      name: 'Massachusetts Institute of Technology',
      code: 'MIT'
    });

    const event = await Event.create({
      name: 'HackMIT 2026',
      code: 'HACK26',
      collegeId: college._id,
      status: 'live',
      scoringConfig: {
        violationLimit: 2, // Custom strict limit (default is 3)
        autoSubmitOnViolation: true
      }
    });

    // Also create Competition singleton with different limit to verify Event priority
    await Competition.create({
      violationLimit: 5,
      autoSubmitOnViolation: false
    });

    // --- TEST 1: Participant Join by Event Code & Idempotent Reconnect ---
    console.log('--- TEST 1: Participant Join by Code & Idempotent Reconnect ---');
    const joinRes1 = await fetch(`${baseUrl}/api/participant/join-by-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventCode: 'HACK26',
        name: 'Alan Turing',
        regNo: '22CS001',
        department: 'Computer Science',
        year: '3rd Year',
        password: 'securePassword123'
      })
    });

    const joinData1: any = await joinRes1.json();
    if (joinRes1.status !== 200 || !joinData1.token) {
      throw new Error(`Test 1 Failed: Initial join failed: ${JSON.stringify(joinData1)}`);
    }
    const token1 = joinData1.token;
    const userId1 = joinData1.user.id;
    console.log('  ✔ Candidate joined event successfully via code HACK26.');

    // Simulate Laptop Restart: Reconnecting with same event code & roll number
    const joinRes2 = await fetch(`${baseUrl}/api/participant/join-by-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventCode: 'hack26', // case-insensitive test
        name: 'Alan Turing',
        regNo: '22CS001',
        password: 'securePassword123'
      })
    });

    const joinData2: any = await joinRes2.json();
    if (joinRes2.status !== 200 || joinData2.user.id !== userId1) {
      throw new Error(`Test 1 Failed: Reconnect idempotency failed: ${JSON.stringify(joinData2)}`);
    }
    console.log('  ✔ Idempotent reconnect succeeded seamlessly without duplicate key error.');

    // Test Invalid Password Reconnect Rejection
    const joinRes3 = await fetch(`${baseUrl}/api/participant/join-by-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventCode: 'HACK26',
        name: 'Imposter',
        regNo: '22CS001',
        password: 'wrongPassword'
      })
    });

    if (joinRes3.status !== 401) {
      throw new Error('Test 1 Failed: Did not reject wrong password on existing roll number');
    }
    console.log('  ✔ Unauthorized credential rejected on existing contestant seat.');

    // --- TEST 2: Strict Tab-Switch Lockdown & Event-Scoped Strike Limits ---
    console.log('\n--- TEST 2: Tab-Switch Strike & Event scoringConfig Priority ---');
    // Start active round for candidate
    await RoundProgress.create({
      userId: userId1,
      roundNumber: 1,
      status: 'in_progress',
      violationCount: 0
    });

    // Send 1st tab-switch violation
    const violRes1 = await fetch(`${baseUrl}/api/participant/log-violation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token1}`
      },
      body: JSON.stringify({
        roundNumber: 1,
        type: 'tab_switch',
        details: 'Candidate switched tabs to external browser'
      })
    });

    const violData1: any = await violRes1.json();
    if (violRes1.status !== 200 || violData1.violationLimit !== 2 || violData1.violationCount !== 2) {
      throw new Error(`Test 2 Failed: Strike log or event violation limit failed: ${JSON.stringify(violData1)}`);
    }
    console.log('  ✔ Tab switch incurred 2-strike severe penalty.');
    console.log('  ✔ Event.scoringConfig.violationLimit (2) honored over Competition limit (5).');

    // Verify auto-submission and candidate disqualification
    if (!violData1.autoSubmitted) {
      throw new Error('Test 2 Failed: Expected candidate to be auto-submitted when reaching violation limit (2)');
    }

    const updatedUser = await User.findById(userId1);
    const updatedProgress = await RoundProgress.findOne({ userId: userId1, roundNumber: 1 });

    if (!updatedUser?.isDisqualified || updatedProgress?.status !== 'eliminated') {
      throw new Error(`Test 2 Failed: Candidate status not updated to eliminated: user.isDisqualified=${updatedUser?.isDisqualified}`);
    }
    console.log('  ✔ Cheating candidate auto-submitted and eliminated from event.');

    // --- TEST 3: EventId Preservation on Violation Log ---
    console.log('\n--- TEST 3: EventId Preservation on Violation Log ---');
    const log = await ViolationLog.findOne({ userId: userId1 });
    if (!log || !log.eventId || log.eventId.toString() !== event._id.toString()) {
      throw new Error(`Test 3 Failed: ViolationLog eventId not preserved: ${log?.eventId}`);
    }
    console.log('  ✔ ViolationLog strictly indexed with eventId for lifecycle retention.');

    // --- TEST 4: Post-Submission Disarmament (Tab Switch Allowed Post-Submission) ---
    console.log('\n--- TEST 4: Post-Submission Proctoring Disarmament ---');
    // Create candidate 2 who has already submitted Round 1
    const cand2 = await User.create({
      username: 'cand2_mit',
      name: 'Grace Hopper',
      role: 'participant',
      eventId: event._id,
      collegeId: college._id,
      passwordHash: 'hashed123'
    });

    const jwtMod = await import('jsonwebtoken');
    const cand2Token = jwtMod.default.sign(
      { userId: cand2._id.toString(), username: cand2.username, role: cand2.role, eventId: event._id.toString() },
      ENV.JWT_SECRET,
      { expiresIn: '24h' }
    );

    await RoundProgress.create({
      userId: cand2._id,
      roundNumber: 1,
      status: 'submitted', // Already submitted!
      violationCount: 0
    });

    // Attempt to log violation on already-submitted round
    const violResSubmitted = await fetch(`${baseUrl}/api/participant/log-violation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cand2Token}`
      },
      body: JSON.stringify({
        roundNumber: 1,
        type: 'tab_switch',
        details: 'Switched tab after submitting'
      })
    });

    const violDataSubmitted: any = await violResSubmitted.json();
    if (violResSubmitted.status !== 200 || !violDataSubmitted.ignored) {
      throw new Error(`Test 4 Failed: Expected violation to be safely ignored on submitted round: ${JSON.stringify(violDataSubmitted)}`);
    }

    const unmolestedProgress = await RoundProgress.findOne({ userId: cand2._id, roundNumber: 1 });
    if (unmolestedProgress?.violationCount !== 0 || unmolestedProgress?.status !== 'submitted') {
      throw new Error('Test 4 Failed: Submitted round was modified by tab switch!');
    }
    console.log('  ✔ Server safely ignored tab switch on submitted round (Zero strikes logged).');
    console.log('  ✔ Candidate progress remains pristine (status: "submitted").');

    // --- TEST 5: Google OAuth Admin Onboarding & Real Email Enforcement ---
    console.log('\n--- TEST 5: Google Sign-Up/Login with Real Email & College Onboarding ---');
    // Invalid email rejected
    const badEmailRes = await fetch(`${baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mockEmail: 'not-an-email',
        name: 'Fake User'
      })
    });

    if (badEmailRes.status !== 400) {
      throw new Error('Test 5 Failed: Did not reject invalid email format');
    }
    console.log('  ✔ Invalid email format rejected by Google endpoint.');

    // Valid Google Admin Sign-Up (Step 1: Auth)
    const goodGoogleRes = await fetch(`${baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mockEmail: 'organizer.dean@oxford.edu',
        name: 'Dean Oxford'
      })
    });

    const goodGoogleData: any = await goodGoogleRes.json();
    if (goodGoogleRes.status !== 200 || goodGoogleData.user.role !== 'college_admin' || !goodGoogleData.needsOnboarding) {
      throw new Error(`Test 5 Failed: Google admin signup step 1 failed: ${JSON.stringify(goodGoogleData)}`);
    }

    // Step 2: Post-auth institution onboarding
    const onboardRes = await fetch(`${baseUrl}/api/auth/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${goodGoogleData.token}`
      },
      body: JSON.stringify({
        collegeName: 'University of Oxford'
      })
    });

    const onboardData: any = await onboardRes.json();
    if (onboardRes.status !== 200 || !onboardData.college) {
      throw new Error(`Test 5 Failed: Onboarding step 2 failed: ${JSON.stringify(onboardData)}`);
    }

    const createdAdmin = await User.findById(goodGoogleData.user.id);
    const createdCollege = await College.findById(createdAdmin?.collegeId);

    if (!createdAdmin || !createdCollege || !createdCollege.name.includes('Oxford')) {
      throw new Error('Test 5 Failed: College tenant not provisioned or linked to Google admin');
    }
    console.log('  ✔ Google admin provisioned as "college_admin" with auto-derived Oxford institution code.');

    // Existing participant role collision protection
    await User.create({
      username: 'student_mit_real',
      email: 'student_candidate@oxford.edu',
      passwordHash: 'hashedPass123',
      role: 'participant',
      name: 'Oxford Student'
    });

    const collisionRes = await fetch(`${baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mockEmail: 'student_candidate@oxford.edu'
      })
    });

    if (collisionRes.status !== 403) {
      throw new Error('Test 5 Failed: Allowed participant email to authenticate via Admin Google portal');
    }
    console.log('  ✔ Privilege Escalation Guard: Participant email strictly blocked from Admin Google access.');

    console.log('\n================================================================');
    console.log('🎉 ALL 5/5 PROCTORING & AUTHENTICATION TESTS PASSED PERFECTLY!');
    console.log('================================================================\n');

  } finally {
    await teardown();
  }
}

runVerification().catch(err => {
  console.error('❌ Verification Suite Failed:', err);
  process.exit(1);
});
