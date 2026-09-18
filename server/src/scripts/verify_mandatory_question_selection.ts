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
import { adminRouter } from '../routes/admin.js';
import { adminEventRouter } from '../routes/adminEvent.js';
import { adminQuestionBankRouter } from '../routes/adminQuestionBank.js';
import { adminControlRoomRouter } from '../routes/adminControlRoom.js';
import { participantRouter } from '../routes/participant.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { ENV } from '../config/env.js';
import { seedDefaultQuestionTemplates } from '../services/defaultQuestions.js';

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
  console.log('🧪 MANDATORY ADMIN QUESTION SELECTION SUITE');
  console.log('🧪 ========================================================\n');

  await connectDB();
  console.log('✅ Connected to MongoDB');

  // Seed question templates if empty
  await seedDefaultQuestionTemplates();

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(tenantContext as any);
  app.use('/api/admin/events', adminEventRouter);
  app.use('/api/admin/questions/bank', adminQuestionBankRouter);
  app.use('/api/admin/control-room', adminControlRoomRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/participant', participantRouter);

  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(PORT, () => resolve()));
  console.log(`🚀 Test Server running on port ${PORT}\n`);

  try {
    // 1. Setup College & Admin
    let college = await College.findOne({ code: 'MANDATORY-QS-TEST' });
    if (!college) {
      college = await College.create({
        name: 'Mandatory Question Selection College',
        code: 'MANDATORY-QS-TEST',
        primaryColor: '#6366f1'
      });
    }

    let adminUser = await User.findOne({ email: 'admin@mandatory-qs.test' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Admin MQS',
        username: 'admin_mqs',
        email: 'admin@mandatory-qs.test',
        passwordHash: 'dummy_hash',
        role: 'college_admin',
        collegeId: college._id
      });
    }

    const adminToken = jwt.sign(
      { userId: adminUser._id, username: adminUser.username, role: 'college_admin', collegeId: college._id },
      ENV.JWT_SECRET,
      { expiresIn: '2h' }
    );
    const authHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };

    // TEST 1: Create Event via POST /api/admin/events -> MUST be draft, all rounds pending, 0 questions auto-seeded
    console.log('\n--- TEST 1: Create Event in Draft with Pending Rounds & No Silent Auto-Seeding ---');
    const createEventPayload = {
      collegeId: college._id.toString(),
      name: 'Mandatory QS Championship 2026',
      code: `MQS${Date.now().toString().slice(-4)}`,
      description: 'Testing strict invariant that questions must be selected by admin',
      rounds: [
        { roundNumber: 1, title: 'Stage 1: MCQs', type: 'mcq', durationMinutes: 15, questionCount: 5 },
        { roundNumber: 2, title: 'Stage 2: Core Debugging', type: 'debugging', durationMinutes: 25, questionCount: 2 },
        { roundNumber: 3, title: 'Stage 3: Championship Final', type: 'coding', durationMinutes: 35, questionCount: 2 }
      ]
    };

    const createRes = await axios.post(`${API}/admin/events`, createEventPayload, authHeaders);
    assert(createRes.status === 201, 'POST /admin/events returned 201 Created');
    const createdEvent = createRes.data.event;
    assert(createdEvent.status === 'draft', `Event status is 'draft' (actual: '${createdEvent.status}')`);
    assert(createdEvent.startedAt === null, 'Event startedAt is null');

    const dynamicRounds = await DynamicRound.find({ eventId: createdEvent._id }).sort({ roundNumber: 1 });
    assert(dynamicRounds.length === 3, 'Created 3 dynamic rounds');
    for (const r of dynamicRounds) {
      assert(r.status === 'pending', `Round ${r.roundNumber} status is 'pending' (actual: '${r.status}')`);
      assert(r.startedAt === null, `Round ${r.roundNumber} startedAt is null`);
    }

    const seededQuestionsCount = await Question.countDocuments({ eventId: createdEvent._id });
    assert(seededQuestionsCount === 0, `Zero questions automatically seeded behind admin's back (actual: ${seededQuestionsCount})`);

    // TEST 2: Attempt to start event ("GO LIVE") with 0 questions -> MUST BE BLOCKED with HTTP 400
    console.log('\n--- TEST 2: Attempting to Start Event with Missing Questions MUST Be Blocked ---');
    let startEventBlocked = false;
    try {
      await axios.post(`${API}/admin/events/${createdEvent._id}/start`, {}, authHeaders);
    } catch (err: any) {
      startEventBlocked = true;
      assert(err.response.status === 400, `POST /:eventId/start rejected with 400 (got: ${err.response.status})`);
      assert(err.response.data.error.includes('select questions'), `Error message mentions selecting questions (got: "${err.response.data.error}")`);
      assert(Array.isArray(err.response.data.incompleteRounds), 'Response returns incompleteRounds array');
      assert(err.response.data.incompleteRounds.length === 3, `All 3 unconfigured rounds listed (got: ${err.response.data.incompleteRounds.length})`);
    }
    assert(startEventBlocked, 'Event start was strictly blocked');

    // TEST 3: Attempt to start Round 1 individually via POST /:eventId/rounds/1/start -> MUST BE BLOCKED with HTTP 400
    console.log('\n--- TEST 3: Attempting to Start Round 1 with 0 Questions MUST Be Blocked ---');
    let startRoundBlocked = false;
    try {
      await axios.post(`${API}/admin/events/${createdEvent._id}/rounds/1/start`, {}, authHeaders);
    } catch (err: any) {
      startRoundBlocked = true;
      assert(err.response.status === 400, `POST /:eventId/rounds/1/start rejected with 400 (got: ${err.response.status})`);
      assert(err.response.data.error.includes('select questions'), `Error message mentions selecting questions (got: "${err.response.data.error}")`);
    }
    assert(startRoundBlocked, 'Round 1 start was strictly blocked');

    // TEST 4: Attempt to start Round 1 via legacy POST /rounds/1/start?eventId=... -> MUST BE BLOCKED
    console.log('\n--- TEST 4: Attempting to Start via Legacy POST /rounds/1/start MUST Be Blocked ---');
    let legacyStartBlocked = false;
    try {
      await axios.post(`${API}/admin/rounds/1/start?eventId=${createdEvent._id}`, {}, authHeaders);
    } catch (err: any) {
      legacyStartBlocked = true;
      assert(err.response.status === 400, `POST /rounds/1/start rejected with 400 (got: ${err.response.status})`);
    }
    assert(legacyStartBlocked, 'Legacy round start route was strictly blocked');

    // TEST 5: Admin selects questions for Round 1 only
    console.log('\n--- TEST 5: Admin Populates / Selects Questions for Round 1 Only ---');
    const popRes1 = await axios.post(
      `${API}/admin/questions/bank/populate-stage`,
      { eventId: createdEvent._id, roundNumber: 1 },
      authHeaders
    );
    assert(popRes1.status === 200, 'Populate stage 1 succeeded');
    const r1Count = await Question.countDocuments({ eventId: createdEvent._id, roundNumber: 1 });
    assert(r1Count >= 5, `Round 1 now has questions assigned (actual: ${r1Count})`);

    // Starting entire event should STILL fail because Round 2 and Round 3 are missing questions!
    let stillBlocked = false;
    try {
      await axios.post(`${API}/admin/events/${createdEvent._id}/start`, {}, authHeaders);
    } catch (err: any) {
      stillBlocked = true;
      assert(err.response.status === 400, 'Starting event still rejected because R2 and R3 lack questions');
      assert(err.response.data.incompleteRounds.length === 2, `Incomplete rounds correctly identifies R2 and R3 (got: ${err.response.data.incompleteRounds.length})`);
    }
    assert(stillBlocked, 'Event start remained blocked while later rounds are unassigned');

    // But starting Round 1 individually should now SUCCEED!
    console.log('\n--- TEST 5B: Starting Round 1 Individually Now Succeeds ---');
    const startR1Res = await axios.post(`${API}/admin/events/${createdEvent._id}/rounds/1/start`, {}, authHeaders);
    assert(startR1Res.status === 200, 'Round 1 started successfully');
    const updatedR1 = await DynamicRound.findOne({ eventId: createdEvent._id, roundNumber: 1 });
    assert(updatedR1?.status === 'active', 'Round 1 status is now active');

    // TEST 6: Populate questions for remaining rounds
    console.log('\n--- TEST 6: Populating Questions for All Remaining Rounds ---');
    const popAllRes = await axios.post(
      `${API}/admin/events/${createdEvent._id}/populate-round-questions`,
      {},
      authHeaders
    );
    assert(popAllRes.status === 200, 'Populate all rounds succeeded');

    // Check GET /admin/events/:eventId
    const detailsRes = await axios.get(`${API}/admin/events/${createdEvent._id}`, authHeaders);
    assert(detailsRes.status === 200, 'GET /admin/events/:eventId returned 200');
    assert(detailsRes.data.allRoundsQuestionsReady === true, 'allRoundsQuestionsReady is true');
    for (const r of detailsRes.data.rounds) {
      assert(r.isQuestionReady === true, `Round ${r.roundNumber} isQuestionReady is true (${r.assignedQuestionCount}/${r.targetQuestionCount})`);
    }

    // Now starting the full event ("GO LIVE") succeeds!
    console.log('\n--- TEST 6B: Event GO LIVE Now Succeeds ---');
    const startEventRes = await axios.post(`${API}/admin/events/${createdEvent._id}/start`, {}, authHeaders);
    assert(startEventRes.status === 200, 'Event started successfully and went live');
    const liveEvent = await Event.findById(createdEvent._id);
    assert(liveEvent?.status === 'live', `Event status is live (actual: '${liveEvent?.status}')`);

    // TEST 7: Participant Tenant Isolation & Anti-Leak
    console.log('\n--- TEST 7: Participant Tenant Isolation & Leak Prevention ---');
    // Create foreign question for a different event
    const foreignEvent = await Event.create({
      collegeId: college._id,
      ownerId: adminUser._id,
      name: 'Foreign Tournament',
      code: `FOR${Date.now().toString().slice(-4)}`,
      status: 'draft'
    });
    const foreignQuestion = await Question.create({
      eventId: foreignEvent._id,
      roundNumber: 1,
      title: 'Foreign Leaked MCQ',
      prompt: 'This belongs to another event and must never be shown or accepted',
      type: 'mcq',
      marks: 10,
      options: ['A', 'B', 'C', 'D'],
      correctOptionIndex: 0
    });

    // Create participant user for our createdEvent
    let participant = await User.create({
      name: 'Test Participant',
      username: `part_${Date.now().toString().slice(-4)}`,
      email: `part_${Date.now()}@test.com`,
      passwordHash: 'dummy',
      role: 'participant',
      collegeId: college._id,
      eventId: createdEvent._id
    });
    const partToken = jwt.sign(
      { userId: participant._id, username: participant.username, role: 'participant', collegeId: college._id, eventId: createdEvent._id },
      ENV.JWT_SECRET,
      { expiresIn: '2h' }
    );
    const partHeaders = { headers: { Authorization: `Bearer ${partToken}` } };

    // Fetch participant round-state
    const stateRes = await axios.get(`${API}/participant/round-state`, partHeaders);
    assert(stateRes.status === 200, 'Participant round-state fetched 200');
    assert(Array.isArray(stateRes.data.questions), 'Questions returned to candidate');
    const receivedQuestionIds = stateRes.data.questions.map((q: any) => q._id.toString());
    assert(!receivedQuestionIds.includes(foreignQuestion._id.toString()), 'Participant did NOT receive foreign question (Zero cross-tenant leak!)');

    // Attempt to save answer for foreign question -> MUST BE REJECTED with 403
    let foreignSubmitBlocked = false;
    try {
      await axios.post(
        `${API}/participant/save-answer`,
        { questionId: foreignQuestion._id.toString(), roundNumber: 1, selectedOption: 0 },
        partHeaders
      );
    } catch (err: any) {
      foreignSubmitBlocked = true;
      assert(err.response.status === 403, `Foreign question submission rejected with 403 (got: ${err.response.status})`);
      assert(err.response.data.error.includes('Question does not belong'), 'Error identifies foreign question mismatch');
    }
    assert(foreignSubmitBlocked, 'Cross-tenant submission strictly rejected');

    // TEST 8: Control Room Readiness Inspector Scoped to Event
    console.log('\n--- TEST 8: Control Room Readiness Scoped to Event ---');
    const readyRes = await axios.get(`${API}/admin/control-room/readiness?eventId=${createdEvent._id}`, authHeaders);
    assert(readyRes.status === 200, 'GET /readiness returned 200');
    assert(readyRes.data.ready === true, 'Event readiness is true');
    const qCheck = readyRes.data.checks.find((c: any) => c.name === 'Round Questions Selection');
    assert(qCheck && qCheck.passed === true, `Round Questions Selection check passed: ${qCheck?.detail}`);

    console.log('\n✨ ========================================================');
    console.log('✨ ALL 8 VERIFICATION SUITES PASSED FLAWLESSLY!');
    console.log('✨ ========================================================\n');
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    await disconnectDB();
    console.log('🔌 Disconnected DB and stopped server.');
  }
}

runVerification().catch(err => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
});
