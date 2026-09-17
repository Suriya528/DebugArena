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
import { User } from '../models/User.js';
import { RoundProgress } from '../models/RoundProgress.js';
import { adminRouter } from '../routes/admin.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { ENV } from '../config/env.js';

const PORT = 5077;
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
  console.log('🧪 EVENT-SCOPED LEADERBOARD & ROUND RESULTS TEST SUITE');
  console.log('🧪 ========================================================\n');

  await connectDB();
  console.log('✅ Connected to MongoDB');

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(tenantContext as any);
  app.use('/api/admin', adminRouter);

  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(PORT, () => resolve()));
  console.log(`🚀 Test Server running on port ${PORT}\n`);

  try {
    // 1. Setup College & Admin
    let college = await College.findOne({ code: 'STANDINGS-TEST' });
    if (!college) {
      college = await College.create({
        name: 'Standings Scope Institute',
        code: 'STANDINGS-TEST',
        primaryColor: '#6366f1'
      });
    }

    const adminUser = await User.findOneAndUpdate(
      { username: 'standings_admin' },
      {
        name: 'Standings Admin',
        passwordHash: 'dummy',
        role: 'admin',
        collegeId: college._id
      },
      { upsert: true, new: true }
    );

    const token = jwt.sign(
      {
        userId: adminUser._id.toString(),
        username: adminUser.username,
        role: adminUser.role,
        collegeId: college._id.toString()
      },
      ENV.JWT_SECRET,
      { expiresIn: '2h' }
    );

    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    // Clean up test events
    await Event.deleteMany({ code: { $in: ['EVT-SCOPE1', 'EVT-SCOPE2'] } });
    await User.deleteMany({ username: { $in: ['e1_coder1', 'e1_coder2', 'e1_coder3', 'e2_coder1'] } });

    // 2. Create Event 1 (2 Custom Dynamic Rounds)
    const event1 = await Event.create({
      collegeId: college._id,
      ownerId: adminUser._id,
      name: 'Event 1 - Bug Hunter Championship',
      code: 'EVT-SCOPE1',
      description: 'Tournament 1 with 2 distinct dynamic rounds',
      status: 'live',
      scoringConfig: {
        negativeMarking: false,
        tieBreakerPriority: ['codingScore', 'debuggingScore', 'totalTime'],
        autoSubmitOnTimeUp: true,
        violationLimit: 3,
        autoSubmitOnViolation: true
      }
    });

    const e1_round1 = await DynamicRound.create({
      eventId: event1._id,
      roundNumber: 1,
      title: 'Speed Debugging Challenge',
      type: 'mcq',
      durationMinutes: 20,
      totalMarks: 40,
      advancementQuota: 2,
      status: 'active'
    });

    const e1_round2 = await DynamicRound.create({
      eventId: event1._id,
      roundNumber: 2,
      title: 'Algorithm Final Arena',
      type: 'coding',
      durationMinutes: 45,
      totalMarks: 100,
      advancementQuota: 0,
      status: 'pending'
    });

    // 3. Create Event 2 (1 Custom Dynamic Round)
    const event2 = await Event.create({
      collegeId: college._id,
      ownerId: adminUser._id,
      name: 'Event 2 - Python Fundamentals',
      code: 'EVT-SCOPE2',
      description: 'Tournament 2 with 1 distinct dynamic round',
      status: 'live',
      scoringConfig: {
        negativeMarking: false,
        tieBreakerPriority: ['codingScore', 'totalTime'],
        autoSubmitOnTimeUp: true,
        violationLimit: 3,
        autoSubmitOnViolation: true
      }
    });

    const e2_round1 = await DynamicRound.create({
      eventId: event2._id,
      roundNumber: 1,
      title: 'Python Fundamentals & Syntax',
      type: 'mcq',
      durationMinutes: 15,
      totalMarks: 50,
      advancementQuota: 0,
      status: 'active'
    });

    // 4. Enroll Participants
    const e1_user1 = await User.create({
      username: 'e1_coder1',
      name: 'Alice First',
      passwordHash: 'dummy',
      role: 'participant',
      collegeId: college._id,
      eventId: event1._id
    });

    const e1_user2 = await User.create({
      username: 'e1_coder2',
      name: 'Bob Second',
      passwordHash: 'dummy',
      role: 'participant',
      collegeId: college._id,
      eventId: event1._id
    });

    const e1_user3 = await User.create({
      username: 'e1_coder3',
      name: 'Charlie Third (Unstarted)',
      passwordHash: 'dummy',
      role: 'participant',
      collegeId: college._id,
      eventId: event1._id
    });

    const e2_user1 = await User.create({
      username: 'e2_coder1',
      name: 'Dave Event2 Only',
      passwordHash: 'dummy',
      role: 'participant',
      collegeId: college._id,
      eventId: event2._id
    });

    // 5. Seed Round Progress for Event 1
    await RoundProgress.deleteMany({ userId: { $in: [e1_user1._id, e1_user2._id, e1_user3._id, e2_user1._id] } });

    await RoundProgress.create({
      userId: e1_user1._id,
      roundNumber: 1,
      totalScore: 35,
      timeTakenSeconds: 100,
      status: 'submitted',
      submittedAt: new Date()
    });

    await RoundProgress.create({
      userId: e1_user2._id,
      roundNumber: 1,
      totalScore: 25,
      timeTakenSeconds: 120,
      status: 'submitted',
      submittedAt: new Date()
    });

    // e1_user3 has NO progress in Stage 1 yet (not_started)

    console.log('📌 Test Data Initialized:');
    console.log(`   - Event 1: ${event1.name} (Rounds: 2, Enrolled: 3)`);
    console.log(`   - Event 2: ${event2.name} (Rounds: 1, Enrolled: 1)\n`);

    // TEST 1: GET /api/admin/rounds/1/results?eventId=event1._id
    console.log('⚡ TEST 1: GET /api/admin/rounds/1/results (Event 1 Scoped Results)');
    const r1Res = await axios.get(`${API}/admin/rounds/1/results?eventId=${event1._id}`, authHeaders);
    const r1Data = r1Res.data;

    assert(r1Data.roundNumber === 1, 'Returns roundNumber 1');
    assert(r1Data.roundMeta?.title === 'Speed Debugging Challenge', `Round title is "${r1Data.roundMeta?.title}"`);
    assert(r1Data.rounds?.length === 2, `Returns exactly 2 rounds for Event 1 (got: ${r1Data.rounds?.length})`);
    assert(r1Data.rounds[0].title === 'Speed Debugging Challenge', 'Round 1 title matches DynamicRound');
    assert(r1Data.rounds[1].title === 'Algorithm Final Arena', 'Round 2 title matches DynamicRound');
    assert(r1Data.results?.length === 3, `Returns all 3 enrolled participants of Event 1 (got: ${r1Data.results?.length})`);

    const r1Alice = r1Data.results.find((r: any) => r.userId?.username === 'e1_coder1');
    const r1Bob = r1Data.results.find((r: any) => r.userId?.username === 'e1_coder2');
    const r1Charlie = r1Data.results.find((r: any) => r.userId?.username === 'e1_coder3');
    const r1Dave = r1Data.results.find((r: any) => r.userId?.username === 'e2_coder1');

    assert(Boolean(r1Alice && r1Alice.totalScore === 35 && r1Alice.status === 'submitted'), 'Alice is ranked #1 with score 35 (submitted)');
    assert(Boolean(r1Bob && r1Bob.totalScore === 25 && r1Bob.status === 'submitted'), 'Bob is ranked #2 with score 25 (submitted)');
    assert(Boolean(r1Charlie && r1Charlie.status === 'not_started' && r1Charlie.totalScore === 0), 'Charlie is listed as not_started with 0 score');
    assert(!r1Dave, 'Dave from Event 2 is NOT present in Event 1 results');

    // TEST 2: GET /api/admin/leaderboard?eventId=event1._id
    console.log('\n⚡ TEST 2: GET /api/admin/leaderboard (Event 1 Scoped Leaderboard)');
    const lbRes = await axios.get(`${API}/admin/leaderboard?eventId=${event1._id}`, authHeaders);
    const lbData = lbRes.data;

    assert(lbData.rounds?.length === 2, `Leaderboard has exactly 2 configured rounds (got: ${lbData.rounds?.length})`);
    assert(lbData.leaderboard?.length === 3, `Leaderboard has 3 participants (got: ${lbData.leaderboard?.length})`);

    const lbAlice = lbData.leaderboard.find((r: any) => r.username === 'e1_coder1');
    const lbBob = lbData.leaderboard.find((r: any) => r.username === 'e1_coder2');
    const lbCharlie = lbData.leaderboard.find((r: any) => r.username === 'e1_coder3');
    const lbDave = lbData.leaderboard.find((r: any) => r.username === 'e2_coder1');

    assert(lbAlice && lbAlice.rank === 1 && lbAlice.totalScore === 35, 'Alice is Rank 1 with totalScore 35');
    assert(lbBob && lbBob.rank === 2 && lbBob.totalScore === 25, 'Bob is Rank 2 with totalScore 25');
    assert(lbCharlie && lbCharlie.rank === 3 && lbCharlie.totalScore === 0, 'Charlie is Rank 3 with totalScore 0');
    assert(!lbDave, 'Dave from Event 2 is NOT in Event 1 leaderboard');
    assert(lbAlice?.roundBreakdown?.[1]?.title === 'Speed Debugging Challenge', 'Round breakdown accurately references Stage 1');
    assert(lbAlice?.roundBreakdown?.[2]?.title === 'Algorithm Final Arena', 'Round breakdown accurately references Stage 2');

    // TEST 3: Advance top 2 participants to Stage 2
    console.log('\n⚡ TEST 3: POST /api/admin/rounds/1/advance (Advancement to Stage 2)');
    const advRes = await axios.post(
      `${API}/admin/rounds/1/advance`,
      {
        participantIds: [e1_user1._id.toString(), e1_user2._id.toString()],
        eventId: event1._id.toString()
      },
      authHeaders
    );
    assert(advRes.data.success === true, 'Advancement API returned success');

    // Check Stage 2 results
    const r2Res = await axios.get(`${API}/admin/rounds/2/results?eventId=${event1._id}`, authHeaders);
    const r2Data = r2Res.data;

    assert(r2Data.roundNumber === 2, 'Stage 2 results query returns roundNumber 2');
    assert(r2Data.roundMeta?.title === 'Algorithm Final Arena', `Stage 2 title is "${r2Data.roundMeta?.title}"`);
    assert(r2Data.results?.length === 2, `Stage 2 shows exactly the 2 advanced candidates (got: ${r2Data.results?.length})`);

    const r2Alice = r2Data.results.find((r: any) => r.userId?.username === 'e1_coder1');
    const r2Bob = r2Data.results.find((r: any) => r.userId?.username === 'e1_coder2');
    const r2Charlie = r2Data.results.find((r: any) => r.userId?.username === 'e1_coder3');

    assert(Boolean(r2Alice && r2Alice.status === 'not_started'), 'Alice is eligible for Stage 2 (not_started)');
    assert(Boolean(r2Bob && r2Bob.status === 'not_started'), 'Bob is eligible for Stage 2 (not_started)');
    assert(!r2Charlie, 'Charlie (eliminated in Stage 1) is NOT shown in Stage 2');

    // TEST 4: Event 2 isolation
    console.log('\n⚡ TEST 4: GET /api/admin/rounds/1/results?eventId=event2._id (Event 2 Scoped Results)');
    const e2R1Res = await axios.get(`${API}/admin/rounds/1/results?eventId=${event2._id}`, authHeaders);
    const e2R1Data = e2R1Res.data;

    assert(e2R1Data.rounds?.length === 1, `Event 2 has exactly 1 round (got: ${e2R1Data.rounds?.length})`);
    assert(e2R1Data.roundMeta?.title === 'Python Fundamentals & Syntax', `Event 2 Round 1 title is "${e2R1Data.roundMeta?.title}"`);
    assert(e2R1Data.results?.length === 1, `Event 2 has exactly 1 candidate (got: ${e2R1Data.results?.length})`);
    assert(e2R1Data.results[0]?.userId?.username === 'e2_coder1', 'Event 2 only has Dave (e2_coder1)');

    console.log('\n🎉 ALL EVENT SCOPING & STANDINGS TESTS PASSED WITH 100% SUCCESS!\n');
  } catch (err: any) {
    console.error('Test execution failed:', err.response?.data || err.message);
    throw err;
  } finally {
    server.close();
    await disconnectDB();
  }
}

runVerification();
