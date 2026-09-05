import mongoose from 'mongoose';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import { College } from '../models/College.js';
import { Event } from '../models/Event.js';
import { DynamicRound } from '../models/DynamicRound.js';
import { User } from '../models/User.js';
import { RoundProgress } from '../models/RoundProgress.js';
import { Certificate, generateCertificateHash } from '../models/Certificate.js';
import { ENV } from '../config/env.js';

function getRunningMongoUri(): string {
  try {
    const tasksDir = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\ca14c8ba-a716-430a-a329-a9eaf281363b\\.system_generated\\tasks';
    if (fs.existsSync(tasksDir)) {
      const files = fs.readdirSync(tasksDir)
        .filter(f => f.endsWith('.log'))
        .map(f => ({ name: f, time: fs.statSync(`${tasksDir}\\${f}`).mtimeMs }))
        .sort((a, b) => b.time - a.time)
        .map(x => x.name);
      for (const file of files) {
        const fullPath = `${tasksDir}\\${file}`;
        const content = fs.readFileSync(fullPath, 'utf8');
        const matches = content.match(/Embedded MongoDB initialized at:\s*(mongodb:\/\/[^\s]+)/g);
        if (matches && matches.length > 0) {
          const lastMatch = matches[matches.length - 1];
          const uri = lastMatch.replace('Embedded MongoDB initialized at:', '').trim();
          return uri.endsWith('/') ? `${uri}debugarena` : `${uri}/debugarena`;
        }
      }
    }
  } catch (e) {
    console.warn('Could not read task log:', e);
  }
  return process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/debugarena';
}

const MONGO_URI = getRunningMongoUri();
const JWT_SECRET = ENV.JWT_SECRET;
const API_URL = 'http://localhost:5000/api';

async function runVerification() {
  console.log('=== [START] ADVANCEMENT QUOTA & CERTIFICATE TEMPLATE VERIFICATION ===\n');
  console.log(` Connecting to active MongoDB: ${MONGO_URI}`);

  await mongoose.connect(MONGO_URI, { dbName: 'debugarena' });
  console.log(' Connected to MongoDB');

  // 1. Create Test Admin and Token
  let adminUser = await User.findOne({ username: 'verify_admin' });
  if (!adminUser) {
    adminUser = await User.create({
      username: 'verify_admin',
      passwordHash: 'dummy_hash',
      name: 'System Verifier Admin',
      role: 'admin'
    });
  }

  const adminToken = jwt.sign(
    { userId: adminUser._id.toString(), username: adminUser.username, role: adminUser.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const authHeaders = {
    Authorization: `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  };

  // 2. Setup College and Event with Custom Certificate Config
  const collegeCode = 'AIT_' + Date.now().toString(36).toUpperCase();
  const college = await College.create({
    name: 'Apex Institute of Technology',
    code: collegeCode,
    primaryColor: '#6366f1',
    secondaryColor: '#06b6d4'
  });
  console.log(` Created College: ${college.name} (${college.code})`);

  const eventCode = 'COMBAT_' + Date.now().toString(36).toUpperCase();
  const customTemplateUrl = 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200';
  const event = await Event.create({
    collegeId: college._id,
    name: 'Apex Code Combat 2026',
    code: eventCode,
    status: 'ready',
    rules: ['Mandatory full-screen', 'Automated cutoff progression'],
    certificateConfig: {
      enabled: true,
      useDefaultTemplate: false,
      customTemplateUrl: customTemplateUrl,
      textColorMode: 'auto',
      primaryColor: '#f59e0b',
      issuerName: 'Dr. Evelyn Vance',
      issuerTitle: 'Dean of Computing & Tournament Chancellor',
      includeQrVerification: true
    }
  });
  console.log(` Created Event: ${event.name} with custom certificate configuration`);

  // 3. Configure Dynamic Rounds with Upfront Advancement Quotas
  // Round 1: Top 15 Advance (from 25)
  const round1 = await DynamicRound.create({
    eventId: event._id,
    roundNumber: 1,
    title: 'Round 1: Rapid Debugging Qualifier',
    type: 'debugging',
    durationMinutes: 20,
    totalMarks: 100,
    advancementQuota: 15,
    advancementRule: 'top_n',
    tieResolutionStrategy: 'expand',
    status: 'active',
    startedAt: new Date()
  });

  // Round 2: Top 10 Advance (to Finals)
  const round2 = await DynamicRound.create({
    eventId: event._id,
    roundNumber: 2,
    title: 'Round 2: Algorithmic Optimization',
    type: 'coding',
    durationMinutes: 30,
    totalMarks: 100,
    advancementQuota: 10,
    advancementRule: 'top_n',
    tieResolutionStrategy: 'expand',
    status: 'pending'
  });

  // Round 3: Finals (Quota = 0, winner podium)
  const round3 = await DynamicRound.create({
    eventId: event._id,
    roundNumber: 3,
    title: 'Round 3: Grand Finale',
    type: 'coding',
    durationMinutes: 45,
    totalMarks: 100,
    advancementQuota: 0,
    status: 'pending'
  });
  console.log(' Configured Upfront Rounds: R1 Quota=15 -> R2 Quota=10 -> R3 Finals');

  // 4. Seed 25 Teams in Round 1
  console.log('\n--- Seeding 25 Teams for Round 1 ---');
  const participants = [];
  for (let i = 1; i <= 25; i++) {
    const pad = i < 10 ? '0' + i : '' + i;
    const isDisqualifiedCheater = i === 17; // Team 17 cheated and is disqualified
    const user = await User.create({
      username: `team_${pad}_${Date.now().toString(36)}`,
      passwordHash: 'dummy_hash_for_test',
      name: `Team ${pad} Titans`,
      role: 'participant',
      eventId: event._id,
      collegeId: college._id,
      isDisqualified: isDisqualifiedCheater,
      disqualificationReason: isDisqualifiedCheater ? 'Exceeded proctoring strikes limit' : undefined
    });
    participants.push(user);
  }

  // Assign scores to create a deterministic tournament ranking:
  // - Teams 01-14: clear high scores (95 down to 60)
  // - Team 15 & 16: exact tie at cutoff (Score: 55, Time: 900s, Strikes: 0)
  // - Team 17: high score (99) BUT disqualified!
  // - Teams 18-25: scores 50 down to 10
  for (let i = 0; i < participants.length; i++) {
    const user = participants[i];
    const rankIndex = i + 1;
    let score = 100 - rankIndex * 3;
    let time = 600 + rankIndex * 20;
    let violations = 0;

    if (rankIndex === 15 || rankIndex === 16) {
      score = 55;
      time = 900;
      violations = 0;
    } else if (rankIndex === 17) {
      score = 99; // high score, but isDisqualified=true!
      time = 500;
      violations = 4;
    }

    await RoundProgress.create({
      userId: user._id,
      roundNumber: 1,
      totalScore: score,
      timeTakenSeconds: time,
      violationCount: violations,
      status: 'submitted',
      submittedAt: new Date(Date.now() - (25 - i) * 60000)
    });
  }
  console.log(' Seeded 25 Round 1 participants with controlled scores, cutoff tie, and 1 disqualified user');

  // 5. Execute Auto-Advancement for Round 1
  console.log('\n--- Executing Auto-Advancement for Round 1 (Target Quota = 15) ---');
  const advanceRes1 = await axios.post(
    `${API_URL}/admin/rounds/1/auto-advance`,
    { eventId: event._id.toString(), quota: 15, tieStrategy: 'expand' },
    { headers: authHeaders }
  );

  console.log(' Auto-Advance R1 Response:', advanceRes1.data.message);
  console.log(` Target Quota: ${advanceRes1.data.targetQuota}`);
  console.log(` Actually Advanced Count: ${advanceRes1.data.advancedCount}`);
  console.log(` Eliminated Count: ${advanceRes1.data.eliminatedCount}`);
  console.log(` Cutoff Tie Detected: ${advanceRes1.data.cutoffTieDetected}`);
  console.log(` Tie Expanded: ${advanceRes1.data.tieExpanded}`);

  // Assertions for Round 1:
  // Cutoff tie between Team 15 & 16 must expand to advance both (16 advanced)
  if (!advanceRes1.data.cutoffTieDetected || !advanceRes1.data.tieExpanded) {
    throw new Error('FAIL: Cutoff tie was not properly detected or expanded for fairness!');
  }
  if (advanceRes1.data.advancedCount !== 16) {
    throw new Error(`FAIL: Expected 16 advanced teams due to tie expansion, got ${advanceRes1.data.advancedCount}`);
  }

  // Verify disqualified Team 17 was NOT advanced
  const team17Progress = await RoundProgress.findOne({ userId: participants[16]._id, roundNumber: 1 });
  if (team17Progress?.status === 'advanced') {
    throw new Error('FAIL: Disqualified user was erroneously advanced!');
  }
  console.log(' Verified: Disqualified cheater was correctly excluded from advancement!');

  // Verify Team 15 and 16 are both marked advanced
  const team15Progress = await RoundProgress.findOne({ userId: participants[14]._id, roundNumber: 1 });
  const team16Progress = await RoundProgress.findOne({ userId: participants[15]._id, roundNumber: 1 });
  if (team15Progress?.status !== 'advanced' || team16Progress?.status !== 'advanced') {
    throw new Error('FAIL: Tied candidates at cutoff boundary were not both advanced!');
  }
  console.log(' Verified: Both cutoff-tied candidates (Team 15 & 16) successfully advanced under Academic Fairness!');

  // 6. Simulate Round 2 for Advanced Teams and Auto-Advance Top 10 to Finals
  console.log('\n--- Simulating Round 2 and Advancing Top 10 to Finals ---');
  const r1AdvancedUsers = await RoundProgress.find({ roundNumber: 1, status: 'advanced' });
  console.log(` Advancing ${r1AdvancedUsers.length} teams into Round 2`);

  // Create R2 progress records
  for (let idx = 0; idx < r1AdvancedUsers.length; idx++) {
    const adv = r1AdvancedUsers[idx];
    const score = 100 - idx * 5; // idx 0 has 100, idx 9 has 55, idx 10 has 50
    await RoundProgress.create({
      userId: adv.userId,
      roundNumber: 2,
      totalScore: score,
      timeTakenSeconds: 1000 + idx * 30,
      violationCount: 0,
      status: 'submitted',
      submittedAt: new Date()
    });
  }

  // Trigger Round 2 Auto-Advancement with Quota = 10
  const advanceRes2 = await axios.post(
    `${API_URL}/admin/rounds/2/auto-advance`,
    { eventId: event._id.toString(), quota: 10, tieStrategy: 'strict' },
    { headers: authHeaders }
  );

  console.log(' Auto-Advance R2 Response:', advanceRes2.data.message);
  console.log(` R2 Advanced Count: ${advanceRes2.data.advancedCount}`);
  if (advanceRes2.data.advancedCount !== 10) {
    throw new Error(`FAIL: Expected exactly 10 finalists, got ${advanceRes2.data.advancedCount}`);
  }
  console.log(' Verified: Exactly top 10 finalists advanced to the Grand Finale (Round 3)!');

  // 7. Test Certificate Issuance & Cryptographic Public Verification
  console.log('\n--- Testing Certificate Engine & Cryptographic QR Verification ---');

  // 7a. Issue Certificate for Winner (Rank 1) using Default Luxury Theme
  const winner = participants[0];
  const issueRes1 = await axios.post(
    `${API_URL}/certificates/issue`,
    {
      userId: winner._id.toString(),
      rank: 1,
      totalScore: 98,
      eventTitle: event.name,
      collegeName: college.name,
      useCustomTemplate: false
    },
    { headers: authHeaders }
  );

  const cert1 = issueRes1.data.certificate;
  console.log(` Issued Luxury Certificate #${cert1.certificateId} for ${cert1.participantName}`);

  // Public Verify Cert 1
  const verifyRes1 = await axios.get(`${API_URL}/certificates/verify/${cert1.certificateId}`);
  console.log(' Public Verification Result for Luxury Cert:', verifyRes1.data.cryptographicStatus);
  if (!verifyRes1.data.valid || verifyRes1.data.cryptographicStatus !== 'GENUINE_VERIFIED_SHA256') {
    throw new Error('FAIL: Certificate 1 cryptographic signature validation failed!');
  }
  console.log(' Verified: Certificate 1 is 100% genuine and signed with HMAC-SHA256!');

  // 7b. Issue Certificate for Rank 2 using Custom College Template
  const runnerUp = participants[1];
  const issueRes2 = await axios.post(
    `${API_URL}/certificates/issue`,
    {
      userId: runnerUp._id.toString(),
      rank: 2,
      totalScore: 94,
      eventTitle: event.name,
      collegeName: college.name,
      templateUrl: customTemplateUrl,
      useCustomTemplate: true
    },
    { headers: authHeaders }
  );

  const cert2 = issueRes2.data.certificate;
  console.log(` Issued Custom Template Certificate #${cert2.certificateId} for ${cert2.participantName}`);

  // Public Verify Cert 2
  const verifyRes2 = await axios.get(`${API_URL}/certificates/verify/${cert2.certificateId}`);
  console.log(' Public Verification Result for Custom Template Cert:', verifyRes2.data.cryptographicStatus);
  if (
    !verifyRes2.data.valid ||
    verifyRes2.data.cryptographicStatus !== 'GENUINE_VERIFIED_SHA256' ||
    !verifyRes2.data.useCustomTemplate ||
    verifyRes2.data.templateUrl !== customTemplateUrl
  ) {
    throw new Error('FAIL: Custom template certificate verification failed or lost template metadata!');
  }
  console.log(' Verified: Certificate 2 correctly preserved custom college template & verified signature!');

  // 7c. Tamper-Proof Integrity Test: Alter DB record directly
  console.log('\n--- Tamper Detection Integrity Test ---');
  await Certificate.updateOne({ certificateId: cert1.certificateId }, { $set: { totalScore: 999 } });
  const verifyTampered = await axios.get(`${API_URL}/certificates/verify/${cert1.certificateId}`);
  console.log(' Tampered Verification Status:', verifyTampered.data.cryptographicStatus);
  if (verifyTampered.data.valid || verifyTampered.data.cryptographicStatus !== 'HASH_MISMATCH_TAMPERED') {
    throw new Error('FAIL: Tampered certificate was not caught by the cryptographic signature check!');
  }
  console.log(' Verified: Tampered certificate immediately flagged as HASH_MISMATCH_TAMPERED!');

  console.log('\n=============================================================');
  console.log(' ALL VERIFICATION CHECKS PASSED WITH 100% SUCCESS!');
  console.log('  1. 25 teams in R1 -> Top 15 quota with cutoff tie -> 16 advanced');
  console.log('  2. Disqualified cheaters excluded from advancement slots');
  console.log('  3. Round 2 -> Top 10 quota -> exactly 10 finalists advanced');
  console.log('  4. Default luxury verifiable certificate with HMAC-SHA256');
  console.log('  5. Custom college template certificate with dynamic overlay');
  console.log('  6. Public unauthenticated QR verification & tamper detection');
  console.log('=============================================================\n');

  await mongoose.disconnect();
}

runVerification().catch(err => {
  console.error('\n Verification failed with error:', err);
  process.exit(1);
});
