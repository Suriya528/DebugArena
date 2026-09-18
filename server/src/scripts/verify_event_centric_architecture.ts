import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import http from 'http';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { ENV } from '../config/env.js';
import { College } from '../models/College.js';
import { Event } from '../models/Event.js';
import { DynamicRound } from '../models/DynamicRound.js';
import { User } from '../models/User.js';
import { Question } from '../models/Question.js';
import { QuestionTemplate } from '../models/QuestionTemplate.js';
import { ImportAudit } from '../models/ImportAudit.js';
import { participantRouter } from '../routes/participant.js';
import { adminRouter } from '../routes/admin.js';
import { adminEventRouter } from '../routes/adminEvent.js';
import { adminQuestionBankRouter } from '../routes/adminQuestionBank.js';
import { initSocketIO } from '../services/socketService.js';
import { hashToken, verifyToken, decryptToken, generateSecureToken } from '../utils/tokenUtils.js';
import { parseRawFile, previewImport, safeDeleteFile, generateOfficialTemplate } from '../services/importEngine.js';

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

async function teardown() {
  if (server) {
    await new Promise<void>((res) => server.close(() => res()));
  }
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
}

function createAdminToken(userId: string, username: string, collegeId: string, role: string = 'admin'): string {
  return jwt.sign(
    { userId, username, role, collegeId },
    ENV.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

async function runVerification() {
  console.log('================================================================');
  console.log('🛡️  VERIFYING EVENT-CENTRIC ARCHITECTURE & SYSTEM INTEGRITY');
  console.log('================================================================\n');

  await setup();

  try {
    // -------------------------------------------------------------
    // Step 1: Create College and Admin Users
    // -------------------------------------------------------------
    console.log('[TEST 1] Creating colleges and admin organizers...');
    const collegeA = await College.create({ name: 'Stanford Engineering', code: 'STANFORD01' });
    const collegeB = await College.create({ name: 'MIT Institute', code: 'MIT01' });

    const adminA = await User.create({
      name: 'Stanford Admin',
      username: 'admin_stanford',
      email: 'admin@stanford.edu',
      passwordHash: 'hash123',
      role: 'admin',
      collegeId: collegeA._id
    });
    const tokenAdminA = createAdminToken(adminA._id.toString(), adminA.username, collegeA._id.toString(), 'admin');

    const adminB = await User.create({
      name: 'MIT Admin',
      username: 'admin_mit',
      email: 'admin@mit.edu',
      passwordHash: 'hash123',
      role: 'admin',
      collegeId: collegeB._id
    });
    const tokenAdminB = createAdminToken(adminB._id.toString(), adminB.username, collegeB._id.toString(), 'admin');

    console.log('  ✅ Admin accounts successfully created.');

    // -------------------------------------------------------------
    // Step 2: Event Creation with Automatic Token Minting & Hashing
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Creating Event via POST /api/admin/events...');
    const createRes = await axios.post(
      `${baseUrl}/api/admin/events`,
      {
        name: 'Spring 2026 Stanford Code Bowl',
        code: 'STANFORD_BOWL_26',
        collegeId: collegeA._id.toString(),
        description: 'Elite debugging competition'
      },
      { headers: { Authorization: `Bearer ${tokenAdminA}` } }
    );

    const createdEvent = createRes.data.event;
    const participantLink = createRes.data.participantLink;
    const adminLink = createRes.data.adminLink;

    console.log(`  Event created: ${createdEvent.name} (${createdEvent._id})`);
    console.log(`  Returned Participant Link: ${participantLink}`);
    console.log(`  Returned Admin Link: ${adminLink}`);

    if (!participantLink || !participantLink.startsWith('/join/')) {
      throw new Error(`Invalid participant link returned: ${participantLink}`);
    }
    if (!adminLink || (!adminLink.startsWith('/control/') && !adminLink.startsWith('/manage/'))) {
      throw new Error(`Invalid admin link returned: ${adminLink}`);
    }

    const rawParticipantToken = participantLink.split('/join/')[1];
    const rawAdminToken = adminLink.startsWith('/control/')
      ? adminLink.split('/control/')[1]
      : adminLink.split('/manage/')[1];

    // Verify DB records: Plaintext tokens must NOT exist, SHA-256 hashes must match
    const eventInDb = await Event.findById(createdEvent._id);
    if (!eventInDb) throw new Error('Event not found in database');

    console.log('\n[TEST 3] Verifying Token Cryptographic Invariants in Database...');
    if ((eventInDb as any).participantAccessToken || (eventInDb as any).adminAccessToken) {
      throw new Error('CRITICAL SECURITY VIOLATION: Raw tokens stored in plaintext in DB!');
    }

    if (rawParticipantToken !== eventInDb.code) {
      throw new Error(`Participant link must use Event Code (${eventInDb.code}), got: ${rawParticipantToken}`);
    }

    const expectedAdminHash = hashToken(rawAdminToken);
    if (eventInDb.adminAccessTokenHash !== expectedAdminHash) {
      throw new Error('adminAccessTokenHash does not match SHA-256 of raw token');
    }
    console.log('  ✅ Participant link uses Event Code context directly (/join/<eventCode>).');
    console.log('  ✅ Raw admin token is absent from DB, only SHA-256 hash stored.');

    // -------------------------------------------------------------
    // Step 3: Public Participant Access Resolution
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Testing GET /api/participant/access/:participantToken...');
    const accessRes = await axios.get(`${baseUrl}/api/participant/access/${rawParticipantToken}`);
    const pubData = accessRes.data;

    console.log(`  Resolved Event: "${pubData.event.name}" (${pubData.event.collegeName})`);
    if (pubData.adminLink || pubData.adminToken || (pubData.event as any).adminAccessTokenHash) {
      throw new Error('CRITICAL LEAK: Admin credentials exposed via participant access route!');
    }
    if ((pubData.event as any).participantAccessTokenHash || (pubData.event as any).participantTokenCipher) {
      throw new Error('Sensitive cryptographic hashes exposed in public response!');
    }
    console.log('  ✅ Public access endpoint returns strictly sanitized metadata.');

    // -------------------------------------------------------------
    // Step 4: Event-Scoped Participant Isolation
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Verifying Event-Scoped User Isolation (Duplicate Roll Number in Different Events)...');
    // Create Event B by Admin B
    const createResB = await axios.post(
      `${baseUrl}/api/admin/events`,
      {
        name: 'MIT Debugathon 2026',
        code: 'MIT_DEBUG_26',
        collegeId: collegeB._id.toString()
      },
      { headers: { Authorization: `Bearer ${tokenAdminB}` } }
    );
    const rawParticipantTokenB = createResB.data.participantLink.split('/join/')[1];

    // Contestant "REG1001" registers for Stanford Event
    const regResA = await axios.post(`${baseUrl}/api/participant/join-by-token`, {
      participantToken: rawParticipantToken,
      regNo: 'REG1001',
      name: 'Alice Stanford',
      email: 'alice@stanford.edu',
      password: 'password123'
    });
    console.log(`  Contestant registered for Stanford event: User ID ${regResA.data.user._id}, Roll No: ${regResA.data.user.regNo}`);

    // Contestant with identical roll number "REG1001" registers for MIT Event
    const regResB = await axios.post(`${baseUrl}/api/participant/join-by-token`, {
      participantToken: rawParticipantTokenB,
      regNo: 'REG1001',
      name: 'Bob MIT',
      email: 'bob@mit.edu',
      password: 'password123'
    });
    console.log(`  Contestant registered for MIT event: User ID ${regResB.data.user._id}, Roll No: ${regResB.data.user.regNo}`);

    // Verify both exist in DB with identical regNo 'REG1001' but different eventIds
    const userA = await User.findById(regResA.data.user._id);
    const userB = await User.findById(regResB.data.user._id);

    if (userA?.regNo !== 'REG1001' || userB?.regNo !== 'REG1001') {
      throw new Error('Roll numbers do not match REG1001');
    }
    if (userA?.eventId?.toString() === userB?.eventId?.toString()) {
      throw new Error('Event IDs must be different for isolated events');
    }
    console.log('  ✅ Multi-tenant isolation verified: Same roll number safely coexists across separate events.');

    // Attempting duplicate registration within SAME event with different password must fail (401)
    try {
      await axios.post(`${baseUrl}/api/participant/join-by-token`, {
        participantToken: rawParticipantToken,
        regNo: 'REG1001',
        name: 'Duplicate Alice',
        email: 'alice_duplicate@stanford.edu',
        password: 'different_wrong_password'
      });
      throw new Error('Expected duplicate registration with different password in same event to fail, but it succeeded');
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.data?.error?.includes('already registered')) {
        console.log('  ✅ Within-event collision prevented: Duplicate registration with mismatched password rejected with 401.');
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // Step 5: Admin Management Route Authorization & Ownership
    // -------------------------------------------------------------
    console.log('\n[TEST 6] Testing GET /api/admin/events/manage/:adminToken authorization...');
    // Owner Admin A accesses Event A manage route
    const manageResA = await axios.get(
      `${baseUrl}/api/admin/events/manage/${rawAdminToken}`,
      { headers: { Authorization: `Bearer ${tokenAdminA}` } }
    );
    if (manageResA.data.event.name !== 'Spring 2026 Stanford Code Bowl') {
      throw new Error('Unexpected event retrieved by owner');
    }
    console.log('  ✅ Event owner successfully authenticated and accessed management workspace.');

    // Admin B (unauthorized for Event A) attempts to access Event A
    try {
      await axios.get(
        `${baseUrl}/api/admin/events/manage/${rawAdminToken}`,
        { headers: { Authorization: `Bearer ${tokenAdminB}` } }
      );
      throw new Error('Unauthorized admin access was not rejected');
    } catch (err: any) {
      if (err.response?.status === 403) {
        console.log('  ✅ Cross-tenant management denied: Non-owner admin received 403 Forbidden.');
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // Step 6: Admin Link Regeneration
    // -------------------------------------------------------------
    console.log('\n[TEST 7] Testing Admin Link Regeneration...');
    const regenRes = await axios.post(
      `${baseUrl}/api/admin/events/${createdEvent._id}/regenerate-admin-link`,
      {},
      { headers: { Authorization: `Bearer ${tokenAdminA}` } }
    );
    const newAdminLink = regenRes.data.adminLink;
    const newRawAdminToken = newAdminLink.startsWith('/control/')
      ? newAdminLink.split('/control/')[1]
      : newAdminLink.split('/manage/')[1];

    if (newRawAdminToken === rawAdminToken) {
      throw new Error('Regenerated admin token must be different from old token');
    }
    console.log(`  New Admin Link minted: ${newAdminLink}`);

    // Verify old admin token is now invalid (404)
    try {
      await axios.get(
        `${baseUrl}/api/admin/events/manage/${rawAdminToken}`,
        { headers: { Authorization: `Bearer ${tokenAdminA}` } }
      );
      throw new Error('Old admin token should have been invalidated');
    } catch (err: any) {
      if (err.response?.status === 404) {
        console.log('  ✅ Old admin token successfully invalidated (404).');
      } else {
        throw err;
      }
    }

    // Verify new admin token works
    const newManageRes = await axios.get(
      `${baseUrl}/api/admin/events/manage/${newRawAdminToken}`,
      { headers: { Authorization: `Bearer ${tokenAdminA}` } }
    );
    if (newManageRes.status !== 200) {
      throw new Error('New admin token failed to authenticate');
    }
    console.log('  ✅ New admin token authenticated successfully.');

    // Verify participant token remained unaffected
    const participantCheckRes = await axios.get(`${baseUrl}/api/participant/access/${rawParticipantToken}`);
    if (participantCheckRes.status !== 200) {
      throw new Error('Participant token was affected by admin token regeneration');
    }
    console.log('  ✅ Participant link remained completely stable and unaffected.');

    // -------------------------------------------------------------
    // Step 7: Question Import Engine & Deduplication
    // -------------------------------------------------------------
    console.log('\n[TEST 8] Testing Question Import Engine (CSV & JSON Parsing, Deduplication, File Cleanup)...');

    // Generate valid CSV content matching standard import columns
    const csvContent = `title,topic,difficulty,marks,prompt,option_a,option_b,option_c,option_d,correct_option,explanation,tags
Pointer Arithmetic Bug,C Programming,easy,10,Identify the flaw in ptr calculation,10,20,30,Undefined,D,Arrays decay to pointers,c,pointers
Memory Leak in Loop,C++,medium,15,Detect unreleased memory in dynamic allocation,Free memory,Use RAII,Ignore,Delete pointer,B,RAII prevents memory leaks,cpp,memory
Duplicate Title Test,Testing,easy,10,Identical test prompt,A,B,C,D,B,Explanation,test
Duplicate Title Test,Testing,easy,10,Identical test prompt,A,B,C,D,B,Explanation,test`;

    const tempCsvPath = path.join(process.cwd(), 'temp_test_import.csv');
    fs.writeFileSync(tempCsvPath, csvContent, 'utf-8');

    // Run import parsing (parseRawFile auto-cleans temp file)
    const rawRows = parseRawFile(tempCsvPath, 'temp_test_import.csv');

    const importPreview = await previewImport(rawRows, 'mcq');

    console.log(`  Parsed rows: ${importPreview.totalRows}`);
    console.log(`  Valid count: ${importPreview.validCount}`);
    console.log(`  Duplicate count in batch: ${importPreview.duplicateCount}`);
    console.log(`  Invalid count: ${importPreview.invalidCount}`);

    if (importPreview.duplicateCount !== 1) {
      throw new Error(`Expected exactly 1 duplicate row detected, got ${importPreview.duplicateCount}`);
    }
    if (importPreview.validCount !== 3) {
      throw new Error(`Expected 3 valid rows, got ${importPreview.validCount}`);
    }

    // Verify physical file was deleted
    if (fs.existsSync(tempCsvPath)) {
      throw new Error('Temporary file was NOT physically deleted after processing!');
    }
    console.log('  ✅ Temporary upload file was physically unlinked from disk.');

    // Confirm import into Question Bank
    const confirmRes = await axios.post(
      `${baseUrl}/api/admin/questions/bank/import/confirm`,
      {
        questions: importPreview.validQuestions,
        eventId: createdEvent._id.toString(),
        fileName: 'temp_test_import.csv',
        fileSize: Buffer.byteLength(csvContent)
      },
      { headers: { Authorization: `Bearer ${tokenAdminA}` } }
    );

    console.log(`  Committed to Question Bank: ${confirmRes.data.insertedCount} questions.`);
    if (confirmRes.data.insertedCount !== 3) {
      throw new Error(`Expected 3 imported questions, got ${confirmRes.data.insertedCount}`);
    }

    // Attempt re-importing the same CSV: All 3 valid items should now be detected as duplicates against DB
    fs.writeFileSync(tempCsvPath, csvContent, 'utf-8');
    const secondRawRows = parseRawFile(tempCsvPath, 'temp_test_import.csv');
    const secondImportPreview = await previewImport(secondRawRows, 'mcq');

    console.log(`  Second import preview: ${secondImportPreview.duplicateCount} duplicates found.`);
    if (secondImportPreview.duplicateCount < 3) {
      throw new Error(`Expected at least 3 duplicates against DB and in batch, got ${secondImportPreview.duplicateCount}`);
    }
    console.log('  ✅ Fingerprint deduplication against database verified.');

    // -------------------------------------------------------------
    // Step 8: Pre-Event Checklist Validation
    // -------------------------------------------------------------
    console.log('\n[TEST 9] Testing Pre-Event Checklist Validation...');
    // Create an empty event with no questions to test validation failure
    const emptyEvent = await Event.create({
      collegeId: collegeA._id,
      name: 'Empty Unconfigured Event',
      code: 'EMPTY_EVENT_26',
      ownerId: adminA._id,
      status: 'draft'
    });

    const validateRes1 = await axios.post(
      `${baseUrl}/api/admin/events/${emptyEvent._id}/validate`,
      {},
      { headers: { Authorization: `Bearer ${tokenAdminA}` } }
    );
    console.log(`  Validation status (no rounds): isValid = ${validateRes1.data.isValid}`);
    console.log(`  Errors flagged: ${validateRes1.data.errors.length}`);
    if (validateRes1.data.isValid) {
      throw new Error('Event without rounds should NOT pass pre-event validation');
    }

    // Now validate createdEvent which has auto-seeded rounds and questions
    const validateRes2 = await axios.post(
      `${baseUrl}/api/admin/events/${createdEvent._id}/validate`,
      {},
      { headers: { Authorization: `Bearer ${tokenAdminA}` } }
    );
    console.log(`  Validation status (configured event): isValid = ${validateRes2.data.isValid}`);
    console.log(`  Updated Event status in DB: ${validateRes2.data.status}`);
    if (!validateRes2.data.isValid) {
      throw new Error(`Configured event failed validation: ${JSON.stringify(validateRes2.data.errors)}`);
    }
    console.log('  ✅ Pre-event checklist validator successfully validated the tournament.');

    // -------------------------------------------------------------
    // Step 9: Official Template Generation
    // -------------------------------------------------------------
    console.log('\n[TEST 10] Verifying Official Downloadable Template Generator...');
    const csvMcqTemplate = generateOfficialTemplate('mcq', 'csv');
    const jsonCodingTemplate = generateOfficialTemplate('coding', 'json');

    const csvContentStr = csvMcqTemplate.buffer.toString('utf-8');
    if (!csvContentStr.includes('title') || !csvContentStr.includes('prompt')) {
      throw new Error('CSV template header mismatch');
    }
    const parsedJson = JSON.parse(jsonCodingTemplate.buffer.toString('utf-8'));
    if (!Array.isArray(parsedJson) || !parsedJson[0].allowed_languages || !parsedJson[0].testcase_1_input) {
      throw new Error('JSON coding template structure mismatch');
    }
    console.log('  ✅ Official template generator verified for CSV and JSON.');

    console.log('\n================================================================');
    console.log('🎉 ALL 10 TESTS PASSED! ARCHITECTURAL VERIFICATION COMPLETE!');
    console.log('================================================================\n');
  } finally {
    await teardown();
  }
}

runVerification().catch((err) => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
