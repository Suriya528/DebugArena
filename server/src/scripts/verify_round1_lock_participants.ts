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
import { User } from '../models/User.js';
import { adminRouter } from '../routes/admin.js';
import { adminEventRouter } from '../routes/adminEvent.js';
import { participantRouter } from '../routes/participant.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { ENV } from '../config/env.js';

const PORT = 5096;
const API = `http://localhost:${PORT}/api`;

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`? ASSERTION FAILED: ${msg}`);
    throw new Error(msg);
  } else {
    console.log(`  ? ${msg}`);
  }
}

async function runVerification() {
  console.log('?? ========================================================');
  console.log('?? ROUND 1 PARTICIPANT LOCK VERIFICATION SUITE');
  console.log('?? ========================================================\n');

  await connectDB();
  console.log('? Connected to MongoDB');

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(tenantContext as any);
  app.use('/api/admin/events', adminEventRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/participant', participantRouter);

  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(PORT, () => resolve()));
  console.log(`?? Test Server running on port ${PORT}\n`);

  try {
    let college = await College.findOne({ code: 'R1-LOCK-TEST' });
    if (!college) {
      college = await College.create({
        name: 'R1 Lock Test College',
        code: 'R1-LOCK-TEST',
        primaryColor: '#6366f1'
      });
    }

    let adminUser = await User.findOne({ email: 'admin@r1-lock.test' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Admin R1 Lock',
        username: 'admin_r1_lock',
        email: 'admin@r1-lock.test',
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

    const eventName = `R1 Lock Tournament ${Date.now()}`;
    const eventCode = `R1L${Date.now().toString().slice(-4)}`;
    const createEventRes = await axios.post(
      `${API}/admin/events`,
      {
        collegeId: college._id.toString(),
        name: eventName,
        code: eventCode,
        rounds: [
          { roundNumber: 1, title: 'MCQ Screening', type: 'mcq', durationMinutes: 30, questionCount: 2, totalMarks: 20 },
          { roundNumber: 2, title: 'Code Debugging', type: 'debugging', durationMinutes: 45, questionCount: 2, totalMarks: 40 }
        ]
      },
      authHeaders
    );

    const eventId = createEventRes.data.event.id || createEventRes.data.event._id;
    assert(Boolean(eventId), `Event created with ID: ${eventId} (code: ${eventCode})`);

    await Question.create([
      {
        eventId,
        roundNumber: 1,
        title: 'Q1',
        prompt: 'Question 1 prompt',
        type: 'mcq',
        options: ['Option A', 'Option B'],
        correctOptionIndex: 0,
        marks: 10
      },
      {
        eventId,
        roundNumber: 1,
        title: 'Q2',
        prompt: 'Question 2 prompt',
        type: 'mcq',
        options: ['Option A', 'Option B'],
        correctOptionIndex: 1,
        marks: 10
      }
    ]);

    console.log('\n--- TEST 1: Add Single Participant Before Round 1 Starts ---');
    const p1Username = `early_bird_${Date.now()}`;
    const addSingleRes = await axios.post(
      `${API}/admin/participants`,
      {
        username: p1Username,
        password: 'password123',
        name: 'Early Bird Student',
        eventId
      },
      authHeaders
    );
    assert(addSingleRes.status === 201, 'POST /admin/participants succeeded with 201 Created');
    assert(addSingleRes.data.participant.username === p1Username, `Participant created: @${p1Username}`);

    console.log('\n--- TEST 2: Bulk Import Participants Before Round 1 Starts ---');
    const bulkP1 = `bulk1_${Date.now()}`;
    const bulkP2 = `bulk2_${Date.now()}`;
    const bulkRes = await axios.post(
      `${API}/admin/participants/bulk`,
      {
        eventId,
        participants: [
          { username: bulkP1, password: 'password123' },
          { username: bulkP2, password: 'password123' }
        ]
      },
      authHeaders
    );
    assert(bulkRes.status === 200, 'POST /admin/participants/bulk succeeded with 200 OK');
    assert(bulkRes.data.createdCount === 2, `Bulk import created 2 participants`);

    console.log('\n--- TEST 3: Check GET /admin/participants Before Round 1 Starts ---');
    const listBeforeRes = await axios.get(`${API}/admin/participants?eventId=${eventId}`, authHeaders);
    assert(listBeforeRes.status === 200, 'GET /admin/participants returned 200 OK');
    assert(listBeforeRes.data.isRound1Started === false, 'isRound1Started is false before Round 1 launch');

    console.log('\n--- TEST 4: Start Round 1 ---');
    const startRoundRes = await axios.post(
      `${API}/admin/events/${eventId}/rounds/1/start`,
      {},
      authHeaders
    );
    assert(startRoundRes.status === 200, 'POST /rounds/1/start succeeded');
    const r1 = await DynamicRound.findOne({ eventId, roundNumber: 1 });
    assert(r1?.status === 'active', 'Round 1 status is now active');

    console.log('\n--- TEST 5: Check GET /admin/participants After Round 1 Starts ---');
    const listAfterRes = await axios.get(`${API}/admin/participants?eventId=${eventId}`, authHeaders);
    assert(listAfterRes.status === 200, 'GET /admin/participants returned 200 OK');
    assert(listAfterRes.data.isRound1Started === true, 'isRound1Started is strictly true after Round 1 starts');

    console.log('\n--- TEST 6: Single Add Participant After Round 1 Started MUST BE BLOCKED ---');
    let singleBlocked = false;
    try {
      await axios.post(
        `${API}/admin/participants`,
        {
          username: `late_bird_${Date.now()}`,
          password: 'password123',
          eventId
        },
        authHeaders
      );
    } catch (err: any) {
      assert(err.response?.status === 400, `POST /admin/participants rejected with 400 (got: ${err.response?.status})`);
      assert(
        err.response?.data?.error?.includes('Round 1 has already started'),
        `Error mentions Round 1 started: "${err.response?.data?.error}"`
      );
      singleBlocked = true;
    }
    assert(singleBlocked, 'Adding single participant was strictly blocked after Round 1 started');

    console.log('\n--- TEST 7: Bulk Import Participants After Round 1 Started MUST BE BLOCKED ---');
    let bulkBlocked = false;
    try {
      await axios.post(
        `${API}/admin/participants/bulk`,
        {
          eventId,
          participants: [
            { username: `late_bulk_${Date.now()}`, password: 'password123' }
          ]
        },
        authHeaders
      );
    } catch (err: any) {
      assert(err.response?.status === 400, `POST /admin/participants/bulk rejected with 400 (got: ${err.response?.status})`);
      assert(
        err.response?.data?.error?.includes('Round 1 has already started'),
        `Error mentions Round 1 started: "${err.response?.data?.error}"`
      );
      bulkBlocked = true;
    }
    assert(bulkBlocked, 'Bulk import was strictly blocked after Round 1 started');

    console.log('\n--- TEST 8: Self-Registration of New Participant After Round 1 Started MUST BE BLOCKED ---');
    let selfRegisterBlocked = false;
    try {
      await axios.post(`${API}/participant/join-by-code`, {
        eventCode,
        username: `unregistered_student_${Date.now()}`,
        password: 'mypassword',
        mode: 'register',
        name: 'Unregistered Student'
      });
    } catch (err: any) {
      assert(err.response?.status === 403, `POST /join-by-code rejected with 403 (got: ${err.response?.status})`);
      assert(
        err.response?.data?.error?.includes('Round 1 has started'),
        `Error mentions Round 1 started: "${err.response?.data?.error}"`
      );
      selfRegisterBlocked = true;
    }
    assert(selfRegisterBlocked, 'New participant self-registration was strictly blocked');

    console.log('\n--- TEST 9: Existing Participant Login / Reconnect Still Succeeds ---');
    const reconnectRes = await axios.post(`${API}/participant/join-by-code`, {
      eventCode,
      username: p1Username,
      password: 'password123'
    });
    assert(reconnectRes.status === 200, 'POST /join-by-code succeeded for existing participant');
    assert(reconnectRes.data.user.username === p1Username, `Existing participant @${p1Username} successfully logged in`);

    console.log('\n? ========================================================');
    console.log('? ALL 9 ROUND 1 PARTICIPANT LOCK TESTS PASSED FLAWLESSLY!');
    console.log('? ========================================================');
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    await disconnectDB();
  }
}

runVerification().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
