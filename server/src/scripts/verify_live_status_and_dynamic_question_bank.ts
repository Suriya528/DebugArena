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
import { tenantContext } from '../middleware/tenantContext.js';
import { ENV } from '../config/env.js';

const PORT = 5088;
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
  console.log('🧪 LIVE EVENT ACTIVATION & DYNAMIC QUESTION BANK SUITE');
  console.log('🧪 ========================================================\n');

  await connectDB();
  console.log('✅ Connected to MongoDB');

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(tenantContext as any);
  app.use('/api/admin/events', adminEventRouter);
  app.use('/api/admin/questions/bank', adminQuestionBankRouter);
  app.use('/api/admin', adminRouter);

  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(PORT, () => resolve()));
  console.log(`🚀 Test Server running on port ${PORT}\n`);

  try {
    // 1. Setup College & Admin
    let college = await College.findOne({ code: 'DYNAMIC-QB-TEST' });
    if (!college) {
      college = await College.create({
        name: 'Dynamic QB College',
        code: 'DYNAMIC-QB-TEST',
        primaryColor: '#8b5cf6'
      });
    }

    const adminUser = await User.findOneAndUpdate(
      { username: 'dynamic_qb_admin' },
      {
        name: 'Dynamic QB Admin',
        username: 'dynamic_qb_admin',
        role: 'college_admin',
        collegeId: college._id
      },
      { upsert: true, new: true }
    );

    const token = jwt.sign(
      { userId: adminUser._id.toString(), username: 'dynamic_qb_admin', role: 'college_admin', collegeId: college._id.toString() },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    // TEST 1: Creating an event initializes it directly to 'live' with startedAt
    console.log('\n--- TEST 1: Event Creation defaults to LIVE ---');
    const createRes = await axios.post(
      `${API}/admin/events`,
      {
        name: 'Dynamic Live Championship 2026',
        code: `LIVE${Date.now().toString().slice(-4)}`,
        description: 'Championship testing live activation and dynamic stage question management',
        initialRounds: [
          { roundNumber: 1, title: 'Stage 1: Core MCQs', type: 'mcq', durationMinutes: 20, questionCount: 5, totalMarks: 50 },
          { roundNumber: 2, title: 'Stage 2: Bug Debugging', type: 'debugging', durationMinutes: 30, questionCount: 2, totalMarks: 50 }
        ]
      },
      authHeaders
    );

    const createdEvent = createRes.data.event;
    assert(createRes.status === 201, 'POST /admin/events returned 201 Created');
    assert(createdEvent.status === 'live', `Event status is directly 'live' (got: '${createdEvent.status}')`);
    assert(Boolean(createdEvent.startedAt), `Event has startedAt timestamp (${createdEvent.startedAt})`);

    // TEST 2: GET /admin/events/:id returns 'live' and auto-promotes any legacy 'ready' events
    console.log('\n--- TEST 2: GET /admin/events/:id auto-promotes ready to live ---');
    // First manually simulate a legacy event in 'ready' state
    const legacyEvent = await Event.create({
      collegeId: college._id,
      ownerId: adminUser._id,
      name: 'Legacy Ready Event',
      code: `RDY${Date.now().toString().slice(-4)}`,
      status: 'ready'
    });
    assert(legacyEvent.status === 'ready', 'Legacy event initialized as ready');

    const getRes = await axios.get(`${API}/admin/events/${legacyEvent._id}`, authHeaders);
    assert(getRes.data.event.status === 'live', `GET /admin/events/:id auto-promoted ready to 'live' (got: '${getRes.data.event.status}')`);
    assert(Boolean(getRes.data.event.startedAt), 'Auto-promoted event has startedAt timestamp');

    // TEST 3: Question Bank GET /admin/questions/bank?eventId=... returns roundCounts and deployedInRounds
    console.log('\n--- TEST 3: Question Bank returns event-scoped roundCounts and deployedInRounds ---');
    const bankRes = await axios.get(`${API}/admin/questions/bank?eventId=${createdEvent._id}`, authHeaders);
    assert(bankRes.status === 200, 'GET /admin/questions/bank returned 200');
    assert(Array.isArray(bankRes.data.questions), 'bank questions is an array');
    assert(typeof bankRes.data.roundCounts === 'object', 'roundCounts is returned');
    console.log('  Bank roundCounts for event:', bankRes.data.roundCounts);

    // TEST 4: Auto-populate Stage 1 from Question Bank
    console.log('\n--- TEST 4: Auto-populate Stage 1 from Question Bank ---');
    const popRes1 = await axios.post(
      `${API}/admin/questions/bank/populate-stage`,
      {
        eventId: createdEvent._id,
        roundNumber: 1
      },
      authHeaders
    );
    assert(popRes1.data.success === true, 'populate-stage Stage 1 returned success');
    assert(popRes1.data.totalCount >= 5, `Stage 1 has at least 5 questions (got: ${popRes1.data.totalCount})`);

    // TEST 5: Auto-populate Stage 2 from Question Bank
    console.log('\n--- TEST 5: Auto-populate Stage 2 from Question Bank ---');
    const popRes2 = await axios.post(
      `${API}/admin/questions/bank/populate-stage`,
      {
        eventId: createdEvent._id,
        roundNumber: 2
      },
      authHeaders
    );
    assert(popRes2.data.success === true, 'populate-stage Stage 2 returned success');
    assert(popRes2.data.totalCount >= 2, `Stage 2 has at least 2 questions (got: ${popRes2.data.totalCount})`);

    // TEST 6: Strict Scoping - GET /admin/questions?eventId=... returns strictly this event's questions
    console.log('\n--- TEST 6: Strict scoping in GET /admin/questions ---');
    const qRes1 = await axios.get(`${API}/admin/questions?eventId=${createdEvent._id}&roundNumber=1`, authHeaders);
    assert(qRes1.data.questions.length >= 5, `GET /admin/questions returned ${qRes1.data.questions.length} questions for Stage 1`);
    for (const q of qRes1.data.questions) {
      assert(q.eventId.toString() === createdEvent._id.toString(), `Question ${q.title} has matching eventId`);
      assert(q.roundNumber === 1, `Question ${q.title} has roundNumber 1`);
    }

    // Empty round scoping check: Round 88 has 0 questions, must return [] and NOT leak other tournaments' questions
    const qResEmpty = await axios.get(`${API}/admin/questions?eventId=${createdEvent._id}&roundNumber=88`, authHeaders);
    assert(qResEmpty.data.questions.length === 0, `Empty round returns [] and never leaks other events' questions (got: ${qResEmpty.data.questions.length})`);

    // TEST 7: Deploy from Question Bank to Round
    console.log('\n--- TEST 7: Deploy template directly to Stage 2 ---');
    const sampleTemplate = bankRes.data.questions.find((t: any) => t.type === 'coding' || t.type === 'debugging') || bankRes.data.questions[0];
    const deployRes = await axios.post(
      `${API}/admin/questions/bank/${sampleTemplate._id}/deploy-to-round`,
      {
        roundNumber: 2,
        eventId: createdEvent._id
      },
      authHeaders
    );
    assert(deployRes.status === 200, `Successfully deployed template to Stage 2: ${sampleTemplate.title}`);

    // Verify template now returns deployedInRounds: [2] in Question Bank
    const bankAfterDeploy = await axios.get(`${API}/admin/questions/bank?eventId=${createdEvent._id}`, authHeaders);
    const updatedTemplate = bankAfterDeploy.data.questions.find((t: any) => t.title === sampleTemplate.title);
    assert(Boolean(updatedTemplate), `Found updated template in bank: ${sampleTemplate.title}`);
    assert(updatedTemplate.deployedInRounds.includes(2), `Template deployedInRounds includes Stage 2: ${JSON.stringify(updatedTemplate.deployedInRounds)}`);

    // Cleanup
    await Event.deleteMany({ _id: { $in: [createdEvent._id, legacyEvent._id] } });
    await DynamicRound.deleteMany({ eventId: { $in: [createdEvent._id, legacyEvent._id] } });
    await Question.deleteMany({ eventId: { $in: [createdEvent._id, legacyEvent._id] } });

    console.log('\n🎉 ========================================================');
    console.log('🎉 ALL TESTS PASSED! 100% VERIFIED!');
    console.log('🎉 ========================================================\n');
  } catch (err: any) {
    console.error('❌ Verification failed:', err.response?.data || err.message);
    process.exit(1);
  } finally {
    server.close();
    await disconnectDB();
    process.exit(0);
  }
}

runVerification();
