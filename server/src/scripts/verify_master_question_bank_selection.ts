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
import { participantRouter } from '../routes/participant.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { ENV } from '../config/env.js';

const PORT = 5098;
const API = `http://localhost:${PORT}/api`;

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    throw new Error(msg);
  } else {
    console.log(`  ✅ ${msg}`);
  }
}

async function runVerification() {
  console.log('🏛️ ========================================================');
  console.log('🏛️ MASTER QUESTION BANK & EVENT ROUND SELECTION VERIFICATION');
  console.log('🏛️ ========================================================\n');

  await connectDB();
  console.log('📦 Connected to MongoDB');

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(tenantContext as any);
  app.use('/api/admin', adminRouter);
  app.use('/api/admin/events', adminEventRouter);
  app.use('/api/admin/questions/bank', adminQuestionBankRouter);
  app.use('/api/participant', participantRouter);

  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(PORT, () => resolve()));
  console.log(`🚀 Test Server running on port ${PORT}\n`);

  try {
    // 1. Setup College & Admin User
    let college = await College.findOne({ code: 'MQB-TEST' });
    if (!college) {
      college = await College.create({
        name: 'Master Question Bank Test College',
        code: 'MQB-TEST',
        primaryColor: '#6366f1'
      });
    }

    let adminUser = await User.findOne({ email: 'admin@mqb.test' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Admin MQB',
        username: 'admin_mqb_test',
        email: 'admin@mqb.test',
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

    console.log('\n--- TEST 1: Create Master Question Templates Across Types ---');
    const qT_mcq1 = await QuestionTemplate.create({
      title: 'MCQ Q1 - Python Scopes',
      prompt: 'What is the scope resolution order in Python?',
      type: 'mcq',
      difficulty: 'easy',
      topic: 'Python',
      skillTags: ['scope', 'basics'],
      marks: 5,
      options: [
        { text: 'LEGB', isCorrect: true },
        { text: 'GELB', isCorrect: false },
        { text: 'LGBE', isCorrect: false },
        { text: 'BLEG', isCorrect: false }
      ]
    });

    const qT_mcq2 = await QuestionTemplate.create({
      title: 'MCQ Q2 - JS Event Loop',
      prompt: 'Which queue has higher priority in Node.js event loop?',
      type: 'mcq',
      difficulty: 'medium',
      topic: 'JavaScript',
      skillTags: ['event-loop', 'async'],
      marks: 5,
      options: [
        { text: 'Microtask Queue', isCorrect: true },
        { text: 'Macrotask Queue', isCorrect: false },
        { text: 'Timer Queue', isCorrect: false },
        { text: 'I/O Queue', isCorrect: false }
      ]
    });

    const qT_mcq3 = await QuestionTemplate.create({
      title: 'MCQ Q3 - SQL Index',
      prompt: 'What data structure is typically used for B-Tree indexes?',
      type: 'mcq',
      difficulty: 'medium',
      topic: 'SQL',
      skillTags: ['indexing', 'database'],
      marks: 5,
      options: [
        { text: 'B+ Tree', isCorrect: true },
        { text: 'Linked List', isCorrect: false },
        { text: 'Hash Table', isCorrect: false },
        { text: 'Binary Search Tree', isCorrect: false }
      ]
    });

    const qT_code1 = await QuestionTemplate.create({
      title: 'Code Q1 - Two Sum',
      prompt: 'Find two indices in the array that sum up to target.',
      type: 'coding',
      difficulty: 'easy',
      topic: 'Algorithms',
      skillTags: ['arrays', 'hashing'],
      marks: 20,
      testCases: [
        { input: '[2,7,11,15]\n9', output: '[0,1]', isHidden: false, weight: 10 },
        { input: '[3,2,4]\n6', output: '[1,2]', isHidden: true, weight: 10 }
      ]
    });

    const qT_code2 = await QuestionTemplate.create({
      title: 'Code Q2 - Reverse Linked List',
      prompt: 'Reverse a singly linked list in-place.',
      type: 'coding',
      difficulty: 'medium',
      topic: 'Data Structures',
      skillTags: ['linked-list'],
      marks: 25,
      testCases: [
        { input: '[1,2,3,4,5]', output: '[5,4,3,2,1]', isHidden: false, weight: 25 }
      ]
    });

    assert(Boolean(qT_mcq1._id && qT_mcq2._id && qT_code1._id), 'Master question templates created successfully');

    console.log('\n--- TEST 2: Question Bank Paginated API with Search & Filters ---');
    const bankRes = await axios.get(`${API}/admin/questions/bank?page=1&limit=2&type=mcq`, authHeaders);
    assert(bankRes.status === 200, 'GET /admin/questions/bank returned 200 OK');
    assert(bankRes.data.questions.length === 2, 'Page size limit=2 enforced');
    assert(bankRes.data.total >= 3, 'Total count reflects all MCQ templates');
    assert(bankRes.data.questions.every((q: any) => q.type === 'mcq'), 'Type filter strictly returned MCQ questions');

    const searchRes = await axios.get(`${API}/admin/questions/bank?search=Event+Loop`, authHeaders);
    assert(searchRes.data.questions.length >= 1, 'Search by keyword Event Loop returned matching questions');
    assert(searchRes.data.questions[0].title.includes('Event Loop'), 'Matching question title found');

    console.log('\n--- TEST 3: Bulk Question Lookup by IDs ---');
    const byIdsRes = await axios.post(
      `${API}/admin/questions/bank/by-ids`,
      { ids: [qT_mcq1._id.toString(), qT_code1._id.toString()] },
      authHeaders
    );
    assert(byIdsRes.status === 200, 'POST /admin/questions/bank/by-ids returned 200 OK');
    assert(byIdsRes.data.questions.length === 2, 'Returned exactly 2 requested question templates');

    console.log('\n--- TEST 4: Create Event with 2 Configured Rounds ---');
    const eventName = `Master Question Bank Event ${Date.now()}`;
    const eventCode = `MQB${Date.now().toString().slice(-4)}`;
    const createEventRes = await axios.post(
      `${API}/admin/events`,
      {
        collegeId: college._id.toString(),
        name: eventName,
        code: eventCode,
        rounds: [
          { roundNumber: 1, title: 'Preliminary MCQs', type: 'mcq', durationMinutes: 20, questionCount: 2, totalMarks: 10 },
          { roundNumber: 2, title: 'Coding Final', type: 'coding', durationMinutes: 45, questionCount: 1, totalMarks: 20 }
        ]
      },
      authHeaders
    );
    const eventId = createEventRes.data.event.id || createEventRes.data.event._id;
    assert(Boolean(eventId), `Event created with ID: ${eventId}`);

    console.log('\n--- TEST 5: Universal Start Lockout When Unconfigured ---');
    let eventStartBlocked = false;
    try {
      await axios.post(`${API}/admin/events/${eventId}/start`, {}, authHeaders);
    } catch (err: any) {
      assert(err.response?.status === 400, 'Event start blocked with 400');
      assert(err.response?.data?.error?.includes('No individual round can start until every configured round has its complete question set'), 'Descriptive lockout error returned');
      eventStartBlocked = true;
    }
    assert(eventStartBlocked, 'Event start was strictly blocked when rounds lacked questions');

    let round1StartBlocked = false;
    try {
      await axios.post(`${API}/admin/events/${eventId}/rounds/1/start`, {}, authHeaders);
    } catch (err: any) {
      assert(err.response?.status === 400, 'Round 1 start blocked with 400');
      assert(err.response?.data?.error?.includes('No individual round can start until every configured round has its complete question set'), 'Round start returned Universal Lockout error');
      round1StartBlocked = true;
    }
    assert(round1StartBlocked, 'Round 1 start was strictly blocked');

    console.log('\n--- TEST 6: Exact Quota & Type Validation in Round Question Selection ---');
    // Shortage validation
    let shortageBlocked = false;
    try {
      await axios.put(
        `${API}/admin/events/${eventId}/rounds/1/questions`,
        { questionIds: [qT_mcq1._id.toString()] },
        authHeaders
      );
    } catch (err: any) {
      assert(err.response?.status === 400, 'Shortage rejected with 400');
      assert(err.response?.data?.error?.includes('requires exactly 2 questions, but 1 were provided'), 'Shortage error message is exact');
      shortageBlocked = true;
    }
    assert(shortageBlocked, 'Question shortage correctly rejected');

    // Excess validation
    let excessBlocked = false;
    try {
      await axios.put(
        `${API}/admin/events/${eventId}/rounds/1/questions`,
        { questionIds: [qT_mcq1._id.toString(), qT_mcq2._id.toString(), qT_mcq3._id.toString()] },
        authHeaders
      );
    } catch (err: any) {
      assert(err.response?.status === 400, 'Excess rejected with 400');
      assert(err.response?.data?.error?.includes('requires exactly 2 questions, but 3 were provided'), 'Excess error message is exact');
      excessBlocked = true;
    }
    assert(excessBlocked, 'Question excess correctly rejected');

    // Duplicate in selection
    let internalDupBlocked = false;
    try {
      await axios.put(
        `${API}/admin/events/${eventId}/rounds/1/questions`,
        { questionIds: [qT_mcq1._id.toString(), qT_mcq1._id.toString()] },
        authHeaders
      );
    } catch (err: any) {
      assert(err.response?.status === 400, 'Internal duplicate rejected with 400');
      assert(err.response?.data?.error?.includes('Duplicate question IDs detected in selection'), 'Duplicate error message returned');
      internalDupBlocked = true;
    }
    assert(internalDupBlocked, 'Internal duplicate in selection correctly rejected');

    // Type mismatch validation
    let typeMismatchBlocked = false;
    try {
      await axios.put(
        `${API}/admin/events/${eventId}/rounds/1/questions`,
        { questionIds: [qT_mcq1._id.toString(), qT_code1._id.toString()] },
        authHeaders
      );
    } catch (err: any) {
      assert(err.response?.status === 400, 'Type mismatch rejected with 400');
      assert(err.response?.data?.error?.includes('does not match round type "mcq"'), 'Type mismatch error message returned');
      typeMismatchBlocked = true;
    }
    assert(typeMismatchBlocked, 'Type mismatch correctly rejected');

    // Valid assignment to Round 1
    const assignR1Res = await axios.put(
      `${API}/admin/events/${eventId}/rounds/1/questions`,
      { questionIds: [qT_mcq1._id.toString(), qT_mcq2._id.toString()] },
      authHeaders
    );
    assert(assignR1Res.status === 200, 'Round 1 questions assigned successfully');
    assert(assignR1Res.data.selectedCount === 2, 'Selected count is 2');

    // Verify DynamicRound and Question snapshots in MongoDB
    const r1Doc = await DynamicRound.findOne({ eventId, roundNumber: 1 });
    assert(r1Doc?.selectedQuestionIds?.length === 2, 'DynamicRound.selectedQuestionIds has 2 templates');
    const qSnapshots = await Question.find({ eventId, roundNumber: 1 });
    assert(qSnapshots.length === 2, 'Two snapshot Question records created for runtime execution');
    assert(qSnapshots[0].templateId?.toString() === qT_mcq1._id.toString(), 'Snapshot points to templateId');

    console.log('\n--- TEST 7: Universal Lockout Block When Round 2 is Still Unconfigured ---');
    let r1StartStillBlocked = false;
    try {
      await axios.post(`${API}/admin/events/${eventId}/rounds/1/start`, {}, authHeaders);
    } catch (err: any) {
      assert(err.response?.status === 400, 'Round 1 start rejected with 400 because Round 2 is incomplete');
      assert(err.response?.data?.error?.includes('No individual round can start until every configured round has its complete question set') && err.response?.data?.error?.includes('Round 2'), 'Error explicitly mentions Round 2 is incomplete');
      r1StartStillBlocked = true;
    }
    assert(r1StartStillBlocked, 'Universal lockout prevented Round 1 from starting before Round 2 is configured');

    console.log('\n--- TEST 8: Cross-Round Duplication Rejection ---');
    // First, configure Round 2 with qT_code1
    const assignR2Res = await axios.put(
      `${API}/admin/events/${eventId}/rounds/2/questions`,
      { questionIds: [qT_code1._id.toString()] },
      authHeaders
    );
    assert(assignR2Res.status === 200, 'Round 2 question assigned successfully');

    // Temporarily create Round 3 (type coding, quota 1)
    await DynamicRound.create({
      eventId,
      roundNumber: 3,
      title: 'Bonus Coding Round',
      type: 'coding',
      durationMinutes: 30,
      questionCount: 1,
      totalMarks: 20,
      status: 'pending',
      selectedQuestionIds: []
    });

    // Attempt to assign qT_code1 (already in Round 2) to Round 3
    let crossRoundBlocked = false;
    try {
      await axios.put(
        `${API}/admin/events/${eventId}/rounds/3/questions`,
        { questionIds: [qT_code1._id.toString()] },
        authHeaders
      );
    } catch (err: any) {
      assert(err.response?.status === 400, 'Cross-round duplicate rejected with 400');
      assert(err.response?.data?.error?.includes('already assigned to Round 2 in this tournament'), 'Descriptive cross-round error returned');
      crossRoundBlocked = true;
    }
    assert(crossRoundBlocked, 'Cross-round question duplication strictly prohibited');

    // Clean up temporary Round 3
    await DynamicRound.deleteOne({ eventId, roundNumber: 3 });

    console.log('\n--- TEST 9: Defensive Deletion (HTTP 409 Conflict When Question is in Use) ---');
    let deletionBlocked = false;
    try {
      await axios.delete(`${API}/admin/questions/bank/${qT_mcq1._id}`, authHeaders);
    } catch (err: any) {
      assert(err.response?.status === 409, 'Deletion rejected with HTTP 409 Conflict');
      assert(err.response?.data?.error?.includes('currently assigned to'), 'Conflict message details usage');
      assert(err.response?.data?.conflictRounds?.length > 0, 'Conflict payload lists specific referencing event rounds');
      deletionBlocked = true;
    }
    assert(deletionBlocked, 'Defensive deletion prevented removing question in active tournament');
    const checkStillExists = await QuestionTemplate.findById(qT_mcq1._id);
    assert(Boolean(checkStillExists), 'Question template remains safe in MongoDB');

    console.log('\n--- TEST 10: Successful Tournament and Round Launch ---');
    // Now both Round 1 (2/2) and Round 2 (1/1) are fully configured!
    const startEventRes = await axios.post(`${API}/admin/events/${eventId}/start`, {}, authHeaders);
    assert(startEventRes.status === 200, 'Event started successfully');

    const startR1Res = await axios.post(`${API}/admin/events/${eventId}/rounds/1/start`, {}, authHeaders);
    assert(startR1Res.status === 200, 'Round 1 started successfully');
    const updatedR1 = await DynamicRound.findOne({ eventId, roundNumber: 1 });
    assert(updatedR1?.status === 'active', 'Round 1 status transitioned to active');

    console.log('\n--- TEST 11: Participant Question Delivery Isolation ---');
    // Create participant
    const partUser = `p_test_${Date.now()}`;
    const participant = await User.create({
      name: 'Participant Test',
      username: partUser,
      email: `${partUser}@test.com`,
      passwordHash: 'dummy_hash',
      role: 'participant',
      collegeId: college._id,
      eventId
    });

    const partToken = jwt.sign(
      { userId: participant._id, username: participant.username, role: 'participant', collegeId: college._id, eventId },
      ENV.JWT_SECRET,
      { expiresIn: '2h' }
    );
    const partHeaders = { headers: { Authorization: `Bearer ${partToken}` } };

    const roundStateRes = await axios.get(`${API}/participant/round-state`, partHeaders);
    assert(roundStateRes.status === 200, 'GET /participant/round-state returned 200 OK');
    const delivered = roundStateRes.data.questions;
    assert(delivered.length === 2, 'Delivered exactly the 2 questions configured for Round 1');
    assert(delivered[0].prompt === qT_mcq1.prompt || delivered[0].prompt === qT_mcq2.prompt, 'Participant receives the exact assigned question prompt');
    assert(delivered[0].correctOptionIndex === undefined, 'Participant question delivery stripped the correct option for security');

    console.log('\n--- TEST 12: Cross-Event Question Reuse Without Master Template Duplication ---');
    const eventBCode = `MQB_B_${Date.now().toString().slice(-4)}`;
    const createEventBRes = await axios.post(
      `${API}/admin/events`,
      {
        collegeId: college._id.toString(),
        name: 'Second Event Reusing Questions',
        code: eventBCode,
        rounds: [
          { roundNumber: 1, title: 'Screening', type: 'mcq', durationMinutes: 15, questionCount: 1, totalMarks: 5 }
        ]
      },
      authHeaders
    );
    const eventBId = createEventBRes.data.event.id || createEventBRes.data.event._id;

    // Reuse qT_mcq1 in Event B
    const assignBRes = await axios.put(
      `${API}/admin/events/${eventBId}/rounds/1/questions`,
      { questionIds: [qT_mcq1._id.toString()] },
      authHeaders
    );
    assert(assignBRes.status === 200, 'Same question template assigned to Event B Round 1');

    // Check usedInEvents count in bank API
    const checkBankRes = await axios.get(`${API}/admin/questions/bank?search=Python+Scopes`, authHeaders);
    const reusedQ = checkBankRes.data.questions.find((q: any) => q._id.toString() === qT_mcq1._id.toString());
    assert(reusedQ.usedInEvents.length >= 2, `usedInEvents accurately aggregated across events (found: ${reusedQ.usedInEvents.length})`);

    console.log('\n--- TEST 13: Safe Deletion for Unused Question Template ---');
    const unusedQT = await QuestionTemplate.create({
      title: 'Unused Temporary Question',
      prompt: 'Temporary prompt',
      type: 'aptitude',
      difficulty: 'easy',
      topic: 'Math',
      marks: 1
    });

    const deleteUnusedRes = await axios.delete(`${API}/admin/questions/bank/${unusedQT._id}`, authHeaders);
    assert(deleteUnusedRes.status === 200, 'Unused template deleted successfully with 200 OK');
    const deletedCheck = await QuestionTemplate.findById(unusedQT._id);
    assert(deletedCheck === null, 'Unused template is permanently removed');

    console.log('\n🎉 ========================================================');
    console.log('🎉 ALL 13 MASTER QUESTION BANK & SELECTION TESTS PASSED!');
    console.log('🎉 ========================================================\n');
  } finally {
    server.close();
    await disconnectDB();
  }
}

runVerification().catch(err => {
  console.error('\n❌ VERIFICATION FAILED:', err.message);
  if (err.response) {
    console.error('Response status:', err.response.status);
    console.error('Response data:', err.response.data);
  }
  process.exit(1);
});
