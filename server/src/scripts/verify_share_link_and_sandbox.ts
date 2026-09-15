import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import http from 'http';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { College } from '../models/College.js';
import { Event } from '../models/Event.js';
import { DynamicRound } from '../models/DynamicRound.js';
import { Question } from '../models/Question.js';
import { Attempt } from '../models/Attempt.js';
import { participantRouter } from '../routes/participant.js';
import { adminEventRouter } from '../routes/adminEvent.js';

let mongod: MongoMemoryServer;
let server: http.Server;
let baseUrl: string;

async function setup() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  const app = express();
  app.use(express.json());

  app.use('/api/participant', participantRouter);
  app.use('/api/admin/events', adminEventRouter);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const port = (server.address() as any).port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
}

async function teardown() {
  if (server) server.close();
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

async function runVerification() {
  console.log('================================================================');
  console.log('🧪 VERIFYING EVENT SHARE LINK & ADMIN SANDBOX HTTP ENDPOINTS');
  console.log('================================================================');

  await setup();

  try {
    // 1. Create College & Event
    const testCollege = await College.create({
      name: 'Sandbox Verification Institute',
      code: 'SVI_TECH'
    });

    const testEvent = await Event.create({
      collegeId: testCollege._id,
      name: 'Grand Debugging Championship 2026',
      code: 'DBG2026',
      description: 'Public direct join and dry-run validation',
      status: 'draft',
      rules: ['No external web tabs', 'Strict proctoring'],
      scoringConfig: {
        violationLimit: 3
      }
    });

    // 2. Add Dynamic Round and Question
    const testRound = await DynamicRound.create({
      eventId: testEvent._id,
      roundNumber: 1,
      title: 'Algorithmic Bug Hunt',
      type: 'debugging',
      durationMinutes: 45,
      questionCount: 1,
      totalMarks: 50,
      status: 'pending'
    });

    const testQuestion = await Question.create({
      eventId: testEvent._id,
      collegeId: testCollege._id,
      roundNumber: 1,
      orderIndex: 0,
      marks: 50,
      title: 'Fix Array Sum Off-By-One',
      prompt: 'Given an array, calculate total sum.',
      type: 'coding',
      starterCode: {
        python: 'def solve():\n    pass'
      },
      allowedLanguages: ['python', 'javascript'],
      testCases: [
        {
          input: '1 2 3',
          expectedOutput: '6',
          isHidden: false,
          weight: 25
        },
        {
          input: '10 20',
          expectedOutput: '30',
          isHidden: true,
          weight: 25
        }
      ]
    });

    console.log(`\n--- TEST 1: GET /api/participant/event-info/:eventCode (Public Info Check) ---`);
    const infoRes = await fetch(`${baseUrl}/api/participant/event-info/DBG2026`);
    if (!infoRes.ok) {
      throw new Error(`Public info endpoint returned status ${infoRes.status}`);
    }
    const infoData = await infoRes.json();
    console.log(`  ✔ Successfully resolved Event Code "${infoData.event.code}" -> "${infoData.event.name}"`);
    console.log(`  ✔ College verified: "${infoData.event.college.name}" (${infoData.event.college.code})`);
    console.log(`  ✔ Dynamic Rounds returned: ${infoData.event.rounds.length}`);

    console.log(`\n--- TEST 2: GET /api/admin/events/:eventId/sandbox-preview ---`);
    const adminToken = jwt.sign({ id: new mongoose.Types.ObjectId(), username: 'admin', role: 'admin' }, ENV.JWT_SECRET);
    const previewRes = await fetch(`${baseUrl}/api/admin/events/${testEvent._id}/sandbox-preview`, {
      headers: {
        Authorization: `Bearer ${adminToken}`
      }
    });
    if (!previewRes.ok) {
      throw new Error(`Sandbox preview endpoint returned status ${previewRes.status}`);
    }
    const previewData = await previewRes.json();
    console.log(`  ✔ Fetched preview with ${previewData.rounds.length} rounds and ${previewData.questions.length} questions`);

    console.log(`\n--- TEST 3: POST /api/admin/events/sandbox-run (Dry-Run Against Test Cases) ---`);
    const solutionCode = `import sys\nline = sys.stdin.read().strip()\nif line:\n    print(sum(map(int, line.split())))\nelse:\n    print(0)`;
    const runRes = await fetch(`${baseUrl}/api/admin/events/sandbox-run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        questionId: testQuestion._id,
        code: solutionCode,
        language: 'python'
      })
    });
    if (!runRes.ok) {
      throw new Error(`Sandbox run endpoint returned status ${runRes.status}`);
    }
    const runData = await runRes.json();
    console.log(`  ✔ Dry-Run Execution: ${runData.allPassed ? 'ALL PASSED' : 'FAILED'}`);
    console.log(`  ✔ Passed ${runData.passedTestCases} of ${runData.totalTestCases} test cases`);
    if (!runData.allPassed) {
      throw new Error('Sandbox dry-run expected all tests to pass');
    }

    console.log(`\n--- TEST 4: POST /api/admin/events/sandbox-run (Custom Stdin Mode) ---`);
    const stdinRes = await fetch(`${baseUrl}/api/admin/events/sandbox-run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        code: `name = input()\nprint(f"Hello, {name}!")`,
        language: 'python',
        customStdin: 'World'
      })
    });
    if (!stdinRes.ok) {
      throw new Error(`Sandbox custom stdin returned status ${stdinRes.status}`);
    }
    const stdinData = await stdinRes.json();
    const stdout = stdinData.result?.stdout?.trim();
    console.log(`  ✔ Custom Stdin Output: "${stdout}"`);
    if (stdout !== 'Hello, World!') {
      throw new Error(`Expected output "Hello, World!", got "${stdout}"`);
    }

    console.log(`\n--- TEST 5: Strict Zero Database Contamination ---`);
    const attemptCount = await Attempt.countDocuments({ questionId: testQuestion._id });
    console.log(`  ✔ Database Attempt records created: ${attemptCount} (Strict Zero Invariant)`);
    if (attemptCount !== 0) {
      throw new Error('Dry run must not create Attempt records in the database!');
    }

    console.log('\n================================================================');
    console.log('🎉 ALL SHARE LINK & SANDBOX TESTS PASSED WITH 100% INTEGRITY!');
    console.log('================================================================\n');
  } finally {
    await teardown();
  }
}

runVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
