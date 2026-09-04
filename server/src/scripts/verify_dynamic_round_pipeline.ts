import fs from 'fs';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { College } from '../models/College.js';
import { Event } from '../models/Event.js';
import { DynamicRound } from '../models/DynamicRound.js';
import { User } from '../models/User.js';
import { Question } from '../models/Question.js';
import { ENV } from '../config/env.js';

const JWT_SECRET = ENV.JWT_SECRET;

function getRunningMongoUri(): string {
  try {
    const logPath = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\ca14c8ba-a716-430a-a329-a9eaf281363b\\.system_generated\\tasks\\task-1637.log';
    if (fs.existsSync(logPath)) {
      const content = fs.readFileSync(logPath, 'utf8');
      const matches = content.match(/Embedded MongoDB initialized at:\s*(mongodb:\/\/[^\s]+)/g);
      if (matches && matches.length > 0) {
        const lastMatch = matches[matches.length - 1];
        const uri = lastMatch.replace('Embedded MongoDB initialized at:', '').trim();
        const fullUri = uri.endsWith('/') ? `${uri}debugarena` : `${uri}/debugarena`;
        return fullUri;
      }
    }
  } catch (e) {
    console.warn('Could not read task log:', e);
  }
  return process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/debugarena';
}

async function runPipelineVerification() {
  console.log('🧪 Starting Dynamic Round Pipeline & Multi-Language Verification...\n');
  const mongoUri = getRunningMongoUri();
  console.log(`📡 Connecting to active server DB at: ${mongoUri}`);
  await mongoose.connect(mongoUri, { dbName: 'debugarena' });

  // 1. Setup College
  let college = await College.findOne({ code: 'ARCH-TECH' });
  if (!college) {
    college = await College.create({
      name: 'Institute of Advanced Architecture',
      code: 'ARCH-TECH',
      primaryColor: '#6366f1',
      secondaryColor: '#06b6d4'
    });
  }

  // 2. Setup Super Admin
  let admin = await User.findOne({ username: 'pipeline_admin' });
  if (!admin) {
    admin = await User.create({
      username: 'pipeline_admin',
      name: 'Architect Admin',
      passwordHash: 'dummy_hash',
      role: 'super_admin',
      collegeId: college._id
    });
  }

  const adminToken = jwt.sign(
    { userId: admin._id.toString(), username: admin.username, role: admin.role, collegeId: college._id.toString() },
    JWT_SECRET
  );

  // 3. Setup Participant
  let participant = await User.findOne({ username: 'pipeline_candidate' });
  if (!participant) {
    participant = await User.create({
      username: 'pipeline_candidate',
      name: 'Alice Coder',
      passwordHash: 'dummy_hash',
      role: 'participant',
      collegeId: college._id
    });
  }

  // 4. Test Event Creation with 4 Custom Dynamic Stages
  console.log('📦 Step 1: Testing Event Creation with Custom Multi-Stage Pipeline...');
  const eventCode = `PIPE-${Date.now().toString().slice(-4)}`;
  const createPayload = {
    collegeId: college._id.toString(),
    name: 'MegaFest Championship 2026',
    code: eventCode,
    description: '4-Stage Comprehensive Competition testing Aptitude, MCQ, Debugging, and Coding',
    initialRounds: [
      {
        roundNumber: 1,
        title: 'Stage 1: Logical Aptitude',
        type: 'aptitude',
        durationMinutes: 20,
        questionCount: 15,
        totalMarks: 100,
        negativeMarkValue: 0.25,
        advancementQuota: 20,
        allowedLanguages: []
      },
      {
        roundNumber: 2,
        title: 'Stage 2: Technical CS MCQs',
        type: 'mcq',
        durationMinutes: 15,
        questionCount: 10,
        totalMarks: 100,
        negativeMarkValue: 0,
        advancementQuota: 15,
        allowedLanguages: []
      },
      {
        roundNumber: 3,
        title: 'Stage 3: Python & C++ Bug Hunt',
        type: 'debugging',
        durationMinutes: 35,
        questionCount: 4,
        totalMarks: 120,
        negativeMarkValue: 0,
        advancementQuota: 8,
        allowedLanguages: ['python', 'cpp'], // strictly restricted!
        tieResolutionStrategy: 'expand'
      },
      {
        roundNumber: 4,
        title: 'Stage 4: Grand Final Algorithmic Coding',
        type: 'coding',
        durationMinutes: 55,
        questionCount: 2,
        totalMarks: 150,
        negativeMarkValue: 0,
        advancementQuota: 0, // Finals: winner stage
        allowedLanguages: ['python', 'cpp', 'java'],
        tieResolutionStrategy: 'expand'
      }
    ]
  };

  const createRes = await fetch('http://localhost:5000/api/admin/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify(createPayload)
  });

  const createData: any = await createRes.json();
  if (!createRes.ok) {
    console.error('❌ Event Creation Failed:', createData);
    process.exit(1);
  }

  const createdEvent = createData.event;
  console.log(`✅ Event Created: ${createdEvent.name} (Code: ${createdEvent.code})`);
  console.log(`   Initial Rounds Count in Response: ${createData.rounds.length}`);

  // 5. Fetch Event Details and Verify Schema Integrity
  console.log('\n🔍 Step 2: Verifying Dynamic Rounds Pipeline Schema in Database...');
  const detailsRes = await fetch(`http://localhost:5000/api/admin/events/${createdEvent._id}`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const detailsData: any = await detailsRes.json();
  const rounds = detailsData.rounds;

  if (rounds.length !== 4) {
    console.error(`❌ Expected 4 rounds, got ${rounds.length}`);
    process.exit(1);
  }

  console.log(`✅ Exactly 4 stages persisted:`);
  rounds.forEach((r: any, idx: number) => {
    console.log(`   [Stage ${r.roundNumber}] ${r.title} | Type: ${r.type} | Duration: ${r.durationMinutes}m | Quota: ${r.advancementQuota} | Allowed: [${r.allowedLanguages?.join(', ') || 'none'}]`);
  });

  // Check Round 3 restricted languages
  const round3 = rounds.find((r: any) => r.roundNumber === 3);
  if (!round3 || JSON.stringify(round3.allowedLanguages) !== JSON.stringify(['python', 'cpp'])) {
    console.error('❌ Round 3 allowedLanguages mismatch:', round3?.allowedLanguages);
    process.exit(1);
  }
  console.log('✅ Stage 3 strictly restricted to: [python, cpp]');

  // Check Round 4 Finals Quota
  const round4 = rounds.find((r: any) => r.roundNumber === 4);
  if (round4.advancementQuota !== 0) {
    console.error('❌ Final Round Quota should be 0, got:', round4.advancementQuota);
    process.exit(1);
  }
  console.log('✅ Stage 4 correctly marked with Finals Quota: 0');

  // 6. Test Security Enforcement on Disallowed Language
  console.log('\n🛡️ Step 3: Testing Sandbox Security Language Restriction on Stage 3...');
  
  // Create sample question for Stage 3
  const sampleQ = await Question.create({
    roundNumber: 3,
    type: 'coding',
    orderIndex: 1,
    title: 'Pointer Reversal Challenge',
    prompt: 'Fix the memory leak and reverse the linked list.',
    marks: 30,
    allowedLanguages: ['python', 'cpp'],
    starterCode: { python: 'def solve(): pass', cpp: 'void solve() {}' },
    testCases: [{ input: '5', expectedOutput: '5', isHidden: false, weight: 30 }],
    timeLimitMs: 2000
  });

  // Assign participant to this event
  participant.eventId = createdEvent._id;
  await participant.save();

  const participantToken = jwt.sign(
    { userId: participant._id.toString(), username: participant.username, role: 'participant', eventId: createdEvent._id.toString() },
    JWT_SECRET
  );

  // Attempt 1: Try running code in disallowed language (JavaScript)
  console.log('   Attempting code execution with DISALLOWED language (javascript)...');
  const runDisallowedRes = await fetch('http://localhost:5000/api/participant/run-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${participantToken}`
    },
    body: JSON.stringify({
      questionId: sampleQ._id.toString(),
      roundNumber: 3,
      code: 'console.log("hacked");',
      language: 'javascript'
    })
  });

  const runDisallowedData: any = await runDisallowedRes.json();
  if (runDisallowedRes.status === 400 && runDisallowedData.error?.includes('not permitted')) {
    console.log(`✅ SECURITY ENFORCED: Disallowed language correctly rejected with 400: "${runDisallowedData.error}"`);
  } else {
    console.error(`❌ Security failure: Disallowed language was not rejected! Status: ${runDisallowedRes.status}`, runDisallowedData);
    process.exit(1);
  }

  // Attempt 2: Try running code in PERMITTED language (Python)
  console.log('   Attempting code execution with PERMITTED language (python)...');
  const runPermittedRes = await fetch('http://localhost:5000/api/participant/run-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${participantToken}`
    },
    body: JSON.stringify({
      questionId: sampleQ._id.toString(),
      roundNumber: 3,
      code: 'print("5")',
      language: 'python'
    })
  });

  const runPermittedData: any = await runPermittedRes.json();
  if (runPermittedRes.status === 200 && runPermittedData.success) {
    console.log(`✅ PERMITTED EXECUTION: Python code executed successfully in sandbox!`);
  } else {
    console.error(`❌ Permitted code run failed: Status: ${runPermittedRes.status}`, runPermittedData);
    process.exit(1);
  }

  // 7. Test Adding a 5th Stage (SQL) to Active Event
  console.log('\n➕ Step 4: Testing Dynamic Round Addition (Stage 5: SQL Query)...');
  const addRoundRes = await fetch(`http://localhost:5000/api/admin/events/${createdEvent._id}/rounds`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      title: 'Stage 5: Database Optimization & SQL',
      type: 'sql',
      durationMinutes: 30,
      questionCount: 3,
      totalMarks: 75,
      allowedLanguages: ['sql'],
      advancementQuota: 0
    })
  });

  const addRoundData: any = await addRoundRes.json();
  if (addRoundRes.ok && addRoundData.round.roundNumber === 5 && addRoundData.round.type === 'sql') {
    console.log(`✅ Stage 5 added successfully: ${addRoundData.round.title} (Allowed: [${addRoundData.round.allowedLanguages.join(', ')}])`);
  } else {
    console.error('❌ Failed to add 5th stage:', addRoundData);
    process.exit(1);
  }

  console.log('\n🎉 ALL PIPELINE DESIGNER & LANGUAGE ENFORCEMENT TESTS PASSED 100%!\n');
  await mongoose.disconnect();
  process.exit(0);
}

runPipelineVerification().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
