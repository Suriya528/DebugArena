import http from 'http';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { connectDB, disconnectDB } from '../config/db.js';
import { College } from '../models/College.js';
import { Event } from '../models/Event.js';
import { DynamicRound } from '../models/DynamicRound.js';
import { Question } from '../models/Question.js';
import { QuestionTemplate } from '../models/QuestionTemplate.js';
import { User } from '../models/User.js';
import { RoundProgress } from '../models/RoundProgress.js';
import { Attempt } from '../models/Attempt.js';
import { authRouter } from '../routes/auth.js';
import { participantRouter } from '../routes/participant.js';
import { adminRouter } from '../routes/admin.js';
import { adminEventRouter } from '../routes/adminEvent.js';
import { adminQuestionBankRouter } from '../routes/adminQuestionBank.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { ENV } from '../config/env.js';

const PORT = 5092;
const API = `http://localhost:${PORT}/api`;

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    throw new Error(msg);
  } else {
    console.log(`  ✓ ${msg}`);
  }
}

async function runVerification() {
  console.log('🧪 ========================================================');
  console.log('🧪 DEBUG ARENA ARCHITECTURAL REDESIGN VERIFICATION SUITE');
  console.log('🧪 ========================================================\n');

  await connectDB();
  console.log('✅ Connected to MongoDB');

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(tenantContext as any);
  app.use('/api/auth', authRouter);
  app.use('/api/participant', participantRouter);
  app.use('/api/admin/events', adminEventRouter);
  app.use('/api/admin/questions/bank', adminQuestionBankRouter);
  app.use('/api/admin', adminRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(PORT, () => resolve()));
  console.log(`🚀 Test Server running on port ${PORT}\n`);

  try {
    // =========================================================================
    // STEP 1: Multi-College Setup & Event Creation
    // =========================================================================
    console.log('--- Step 1: Multi-College & Event Creation ---');

    // College A
    let collegeA = await College.findOne({ code: 'COLLEGE-A' });
    if (!collegeA) {
      collegeA = await College.create({
        name: 'Alpha Engineering College',
        code: 'COLLEGE-A',
        primaryColor: '#6366f1'
      });
    }

    // College B
    let collegeB = await College.findOne({ code: 'COLLEGE-B' });
    if (!collegeB) {
      collegeB = await College.create({
        name: 'Beta Institute of Technology',
        code: 'COLLEGE-B',
        primaryColor: '#06b6d4'
      });
    }

    // Organizer A
    let organizerA = await User.findOne({ username: 'org_alpha_admin' });
    if (!organizerA) {
      organizerA = await User.create({
        username: 'org_alpha_admin',
        name: 'Alpha Organizer',
        passwordHash: 'dummyhash',
        role: 'admin',
        collegeId: collegeA._id
      });
    }
    const tokenA = jwt.sign(
      { userId: organizerA._id, username: organizerA.username, role: organizerA.role, collegeId: collegeA._id },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const authHeaderA = { headers: { Authorization: `Bearer ${tokenA}` } };

    // Organizer B
    let organizerB = await User.findOne({ username: 'org_beta_admin' });
    if (!organizerB) {
      organizerB = await User.create({
        username: 'org_beta_admin',
        name: 'Beta Organizer',
        passwordHash: 'dummyhash',
        role: 'admin',
        collegeId: collegeB._id
      });
    }
    const tokenB = jwt.sign(
      { userId: organizerB._id, username: organizerB.username, role: organizerB.role, collegeId: collegeB._id },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const authHeaderB = { headers: { Authorization: `Bearer ${tokenB}` } };

    // Create Event A (2 Rounds)
    const codeA = `ALPHAEV_${Date.now()}`;
    const createEvARes = await axios.post(
      `${API}/admin/events`,
      {
        name: 'Alpha Tech Hackathon',
        code: codeA,
        description: 'Multi-round debugging tournament for Alpha',
        collegeId: collegeA._id.toString(),
        rounds: [
          { roundNumber: 1, title: 'Screening MCQ', type: 'mcq', durationMinutes: 10, totalMarks: 50, passingMarks: 25 },
          { roundNumber: 2, title: 'Debugging Gauntlet', type: 'coding', durationMinutes: 20, totalMarks: 100, passingMarks: 60 }
        ]
      },
      authHeaderA
    );

    assert(createEvARes.status === 201, 'Event A created successfully');
    const eventA = createEvARes.data.event;
    const adminTokenA = createEvARes.data.adminAccessToken;
    const participantLinkA = createEvARes.data.participantLink;
    const adminLinkA = createEvARes.data.adminLink;

    assert(participantLinkA === `/join/${codeA}`, `Participant link is canonical: ${participantLinkA}`);
    assert(adminLinkA === `/control/${adminTokenA}`, `Admin link is private token based: ${adminLinkA}`);
    assert(adminTokenA && adminTokenA.length === 64, 'Admin token is cryptographically secure 64-char hex');
    assert(!adminLinkA.includes(codeA), 'Admin link does NOT contain Event Code');
    assert(!adminLinkA.includes(eventA._id), 'Admin link does NOT contain Mongo ID');

    // Create Event B (1 Round)
    const codeB = `BETAEV_${Date.now()}`;
    const createEvBRes = await axios.post(
      `${API}/admin/events`,
      {
        name: 'Beta Code Slam',
        code: codeB,
        description: 'Single round coding contest for Beta',
        collegeId: collegeB._id.toString(),
        rounds: [
          { roundNumber: 1, title: 'Speed Debugging', type: 'coding', durationMinutes: 15, totalMarks: 60, passingMarks: 30 }
        ]
      },
      authHeaderB
    );
    const eventB = createEvBRes.data.event;
    const adminTokenB = createEvBRes.data.adminAccessToken;

    // =========================================================================
    // STEP 2: Private Admin URL & Entry Flow Security
    // =========================================================================
    console.log('\n--- Step 2: Private Admin URL & Entry Flow ---');

    // 2A: Public control-info check
    const controlInfoRes = await axios.get(`${API}/admin/events/control-info/${adminTokenA}`);
    assert(controlInfoRes.status === 200, 'Public control-info retrieved successfully');
    assert(controlInfoRes.data.eventName === 'Alpha Tech Hackathon', 'Control info contains eventName');
    assert(controlInfoRes.data.collegeName === 'Alpha Engineering College', 'Control info contains collegeName');
    assert(controlInfoRes.data.code === undefined, 'Control info strictly does NOT leak event code');
    assert(controlInfoRes.data.adminAccessTokenHash === undefined, 'Control info strictly does NOT leak hashes');

    // 2B: Invalid control token
    try {
      await axios.get(`${API}/admin/events/control-info/invalid_fake_token_12345`);
      assert(false, 'Should reject invalid control token');
    } catch (err: any) {
      assert(err.response?.status === 404, 'Invalid control token rejected with 404');
    }

    // 2C: POST control-enter without authentication -> 401
    try {
      await axios.post(`${API}/admin/events/control-enter`, { adminToken: adminTokenA, eventCode: codeA });
      assert(false, 'Should reject unauthenticated control-enter');
    } catch (err: any) {
      assert(err.response?.status === 401, 'Unauthenticated control-enter rejected with 401');
    }

    // 2D: Organizer B attempting to access Organizer A's event -> 403
    try {
      await axios.post(
        `${API}/admin/events/control-enter`,
        { adminToken: adminTokenA, eventCode: codeA },
        authHeaderB
      );
      assert(false, 'Should reject Organizer B accessing Event A');
    } catch (err: any) {
      assert(err.response?.status === 403, 'Cross-organizer unauthorized control-enter rejected with 403');
    }

    // 2E: Organizer A entering with incorrect Event Key -> 403
    try {
      await axios.post(
        `${API}/admin/events/control-enter`,
        { adminToken: adminTokenA, eventCode: 'WRONG_CODE_999' },
        authHeaderA
      );
      assert(false, 'Should reject incorrect event code');
    } catch (err: any) {
      assert(err.response?.status === 403, 'Incorrect Event Key rejected with 403');
    }

    // 2F: Organizer A entering with correct Event Key -> 200 Success
    const enterRes = await axios.post(
      `${API}/admin/events/control-enter`,
      { adminToken: adminTokenA, eventCode: codeA },
      authHeaderA
    );
    assert(enterRes.status === 200, 'Organizer A successfully unlocked Event Control Center');
    assert(enterRes.data.event.name === 'Alpha Tech Hackathon', 'Returned event details in control-enter');
    assert(enterRes.data.rounds.length === 2, 'Returned event rounds in control-enter');

    // =========================================================================
    // STEP 3: Admin Token Regeneration
    // =========================================================================
    console.log('\n--- Step 3: Admin Token Regeneration ---');

    const regenRes = await axios.post(
      `${API}/admin/events/${eventA._id}/regenerate-admin-link`,
      {},
      authHeaderA
    );
    assert(regenRes.status === 200, 'Admin token regenerated successfully');
    const newAdminTokenA = regenRes.data.adminAccessToken;
    assert(newAdminTokenA !== adminTokenA, 'New admin token differs from old admin token');

    // Old token must immediately fail
    try {
      await axios.get(`${API}/admin/events/control-info/${adminTokenA}`);
      assert(false, 'Old admin token should be invalidated');
    } catch (err: any) {
      assert(err.response?.status === 404, 'Old admin token correctly rejected with 404');
    }

    // New token must work
    const newInfoRes = await axios.get(`${API}/admin/events/control-info/${newAdminTokenA}`);
    assert(newInfoRes.status === 200, 'New admin token verified and active');

    // Participant link must remain unchanged
    const detailsRes = await axios.get(`${API}/admin/events/${eventA._id}`, authHeaderA);
    assert(detailsRes.data.participantLink === `/join/${codeA}`, 'Participant link unchanged after admin regen');

    // =========================================================================
    // STEP 4: Global Participant Login Retired
    // =========================================================================
    console.log('\n--- Step 4: Global Participant Login Retired ---');

    // Create participant user directly to test global login block
    const testParticipant = await User.create({
      username: `candidate_${Date.now()}`,
      name: 'Global Candidate Test',
      passwordHash: 'somehash',
      role: 'participant',
      eventId: eventA._id,
      collegeId: collegeA._id
    });

    try {
      await axios.post(`${API}/auth/login`, {
        identifier: testParticipant.username,
        password: 'anypassword'
      });
      assert(false, 'Global participant login must be blocked');
    } catch (err: any) {
      assert(err.response?.status === 403, 'Global participant login rejected with 403');
      assert(
        err.response?.data?.error?.includes('retired') || err.response?.data?.error?.includes('/join/'),
        'Helpful message directing participant to their /join/<eventCode> URL'
      );
    }

    // =========================================================================
    // STEP 5: Event-Scoped Participant Usernames
    // =========================================================================
    console.log('\n--- Step 5: Event-Scoped Participant Usernames ---');

    const sharedUsername = `contestant_${Date.now()}`;

    // Join Event A with sharedUsername
    const joinARes = await axios.post(`${API}/participant/join-by-token`, {
      participantToken: codeA,
      username: sharedUsername,
      name: 'Contestant in Event A',
      password: 'password123',
      department: 'CSE',
      year: 'III'
    });
    assert(joinARes.status === 200, `Participant '${sharedUsername}' joined Event A`);
    const participantTokenA = joinARes.data.token;
    assert(participantTokenA, 'Received JWT for Participant A');

    // Join Event B with IDENTICAL sharedUsername (multi-event collision allowed!)
    const joinBRes = await axios.post(`${API}/participant/join-by-token`, {
      participantToken: codeB,
      username: sharedUsername,
      name: 'Contestant in Event B',
      password: 'password123',
      department: 'ECE',
      year: 'IV'
    });
    assert(joinBRes.status === 200, `Identical username '${sharedUsername}' joined Event B successfully`);
    const participantTokenB = joinBRes.data.token;
    assert(participantTokenB, 'Received JWT for Participant B');

    // Verify in DB that two distinct participant users exist with the same username
    const dbUserA = await User.findOne({ username: sharedUsername.toLowerCase(), eventId: eventA._id });
    const dbUserB = await User.findOne({ username: sharedUsername.toLowerCase(), eventId: eventB._id });
    assert(!!dbUserA && !!dbUserB, 'Both users exist in DB');
    assert(dbUserA!._id.toString() !== dbUserB!._id.toString(), 'Users have distinct MongoDB ObjectIDs');
    assert(dbUserA!.eventId!.toString() === eventA._id.toString(), 'User A mapped to Event A');
    assert(dbUserB!.eventId!.toString() === eventB._id.toString(), 'User B mapped to Event B');

    // =========================================================================
    // STEP 6: Server-Authoritative Round Lifecycle & Qualification Flow
    // =========================================================================
    console.log('\n--- Step 6: Server-Authoritative Round Lifecycle ---');

    // Ensure Event A is live and Round 1 is active
    await Event.findByIdAndUpdate(eventA._id, { status: 'live' });
    await DynamicRound.findOneAndUpdate({ eventId: eventA._id, roundNumber: 1 }, { status: 'active' });

    // Participant A auth header
    const pAuthA = { headers: { Authorization: `Bearer ${participantTokenA}` } };

    // Get initial round state (initializes in_progress)
    const state1 = await axios.get(`${API}/participant/round-state`, pAuthA);
    assert(state1.status === 200, 'Fetched participant round state');
    assert(state1.data.round?.roundNumber === 1, 'Current round is Round 1');
    assert(state1.data.progress?.status === 'in_progress', 'Round 1 initialized as in_progress');

    // Submit Round 1
    const submitRes = await axios.post(
      `${API}/participant/submit-round`,
      { roundNumber: 1, answers: {}, timeSpentSeconds: 120 },
      pAuthA
    );
    assert(submitRes.status === 200, 'Participant submitted Round 1');

    // Verify round state after submission: MUST stay submitted and cannot restart
    const stateAfterSubmit = await axios.get(`${API}/participant/round-state`, pAuthA);
    assert(stateAfterSubmit.data.progress?.status === 'submitted', 'Progress status is SUBMITTED');

    // Submitting again is idempotent and returns alreadySubmitted
    const resubmitRes = await axios.post(
      `${API}/participant/submit-round`,
      { roundNumber: 1, answers: {}, timeSpentSeconds: 120 },
      pAuthA
    );
    assert(resubmitRes.data.alreadySubmitted === true, 'Duplicate submission safely returns alreadySubmitted');

    // Qualification check: Next round (Round 2) is currently PENDING (not live)
    // Admin qualifies Participant A for Round 2
    await RoundProgress.findOneAndUpdate(
      { eventId: eventA._id, userId: dbUserA!._id, roundNumber: 1 },
      { status: 'advanced', isAdvanced: true, totalScore: 40 }
    );

    const stateQualifiedWaiting = await axios.get(`${API}/participant/round-state`, pAuthA);
    assert(
      stateQualifiedWaiting.data.isQualifiedWaitingNextRound === true,
      'isQualifiedWaitingNextRound is true while Round 2 is pending'
    );
    assert(
      stateQualifiedWaiting.data.nextRoundAvailable === false,
      'nextRoundAvailable is false while Round 2 is pending'
    );

    // Admin starts Round 2
    await DynamicRound.findOneAndUpdate({ eventId: eventA._id, roundNumber: 2 }, { status: 'active' });

    const stateNextRoundReady = await axios.get(`${API}/participant/round-state`, pAuthA);
    assert(
      stateNextRoundReady.data.nextRoundAvailable === true,
      'nextRoundAvailable is true now that Round 2 is active'
    );

    // Participant enters and submits Round 2 (Final Round)
    await axios.get(`${API}/participant/round-state`, pAuthA);
    await axios.post(
      `${API}/participant/submit-round`,
      { roundNumber: 2, answers: {}, timeSpentSeconds: 300 },
      pAuthA
    );

    const stateFinal = await axios.get(`${API}/participant/round-state`, pAuthA);
    assert(stateFinal.data.isFinalRound === true, 'isFinalRound is true on last round completion');
    assert(stateFinal.data.nextRoundAvailable === false, 'nextRoundAvailable is false for final round');

    // Non-selected elimination flow test
    // Create non-selected participant
    const nonSelectedUser = await User.create({
      username: `eliminated_${Date.now()}`,
      name: 'Eliminated Candidate',
      passwordHash: 'pass',
      role: 'participant',
      eventId: eventA._id,
      collegeId: collegeA._id
    });
    await RoundProgress.create({
      userId: nonSelectedUser._id,
      roundNumber: 1,
      eventId: eventA._id,
      status: 'eliminated',
      isAdvanced: false,
      totalScore: 10
    });
    const nonSelToken = jwt.sign(
      { userId: nonSelectedUser._id, username: nonSelectedUser.username, role: 'participant', eventId: eventA._id },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );
    let nonSelData: any = null;
    try {
      const nonSelState = await axios.get(`${API}/participant/round-state`, {
        headers: { Authorization: `Bearer ${nonSelToken}` }
      });
      nonSelData = nonSelState.data;
    } catch (err: any) {
      if (err.response?.status === 403) {
        nonSelData = err.response.data;
      } else {
        throw err;
      }
    }
    assert(nonSelData?.isEliminated === true, 'isEliminated is true for non-selected participant');

    // =========================================================================
    // STEP 7: High Concurrency Load Test (50 Concurrent Participants)
    // =========================================================================
    console.log('\n--- Step 7: 50 Concurrent Participants Load Test ---');

    const concurrentCount = 50;
    const concurrentUsers: any[] = [];
    const createPromises: Promise<any>[] = [];

    // Pre-create 50 participants
    for (let i = 0; i < concurrentCount; i++) {
      const u = new User({
        username: `load_p_${i}_${Date.now()}`,
        name: `Load Candidate ${i}`,
        passwordHash: 'dummyhash',
        role: 'participant',
        eventId: eventA._id,
        collegeId: collegeA._id
      });
      concurrentUsers.push(u);
      createPromises.push(u.save());
    }
    await Promise.all(createPromises);
    console.log(`  ✓ Created ${concurrentCount} test participant records in DB`);

    // Simulate all 50 participants submitting Round 1 concurrently
    const submissionPromises = concurrentUsers.map(async (u, idx) => {
      const pToken = jwt.sign(
        { userId: u._id, username: u.username, role: 'participant', eventId: eventA._id },
        ENV.JWT_SECRET,
        { expiresIn: '1h' }
      );
      const headers = { Authorization: `Bearer ${pToken}` };

      // Initialize round
      await axios.get(`${API}/participant/round-state`, { headers });

      // Submit round
      const res = await axios.post(
        `${API}/participant/submit-round`,
        { roundNumber: 1, answers: {}, timeSpentSeconds: 50 + idx },
        { headers }
      );
      return res.status;
    });

    const startConcurrency = Date.now();
    const results = await Promise.all(submissionPromises);
    const durationMs = Date.now() - startConcurrency;

    assert(results.length === concurrentCount, `All ${concurrentCount} submission requests completed`);
    assert(results.every(s => s === 200), 'All 50 concurrent submissions returned HTTP 200');
    console.log(`  ✓ 50 concurrent submissions finished in ${durationMs}ms (${(durationMs / 50).toFixed(1)}ms/req average)`);

    // Verify 50 distinct RoundProgress records exist with status 'submitted'
    const progressCount = await RoundProgress.countDocuments({
      eventId: eventA._id,
      roundNumber: 1,
      userId: { $in: concurrentUsers.map(u => u._id) },
      status: 'submitted'
    });
    assert(progressCount === concurrentCount, `Exactly ${concurrentCount} RoundProgress records persisted in MongoDB`);

    // Verify idempotency: duplicate submission attempt returns 200 or 400 without corrupting state
    const duplicateTestRes = await axios.post(
      `${API}/participant/submit-round`,
      { roundNumber: 1, answers: {}, timeSpentSeconds: 999 },
      { headers: { Authorization: `Bearer ${jwt.sign({ userId: concurrentUsers[0]._id, username: concurrentUsers[0].username, role: 'participant', eventId: eventA._id }, ENV.JWT_SECRET)}` } }
    );
    assert(duplicateTestRes.status === 200, 'Duplicate submission safely handled idempotently');

    console.log('\n🎉 ========================================================');
    console.log('🎉 ALL ARCHITECTURAL REDESIGN TESTS PASSED WITH 100% SUCCESS!');
    console.log('🎉 ========================================================\n');
  } catch (err: any) {
    console.error('\n❌ TEST SUITE FAILED:', err);
    throw err;
  } finally {
    server.close();
    await disconnectDB();
  }
}

runVerification().catch(() => process.exit(1));
