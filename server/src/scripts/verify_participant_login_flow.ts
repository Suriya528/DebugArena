import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ENV } from '../config/env.js';
import { Event } from '../models/Event.js';
import { College } from '../models/College.js';
import { User } from '../models/User.js';
import { generateSecureToken, hashToken } from '../utils/tokenUtils.js';
import http from 'http';
import express from 'express';
import { participantRouter } from '../routes/participant.js';

const app = express();
app.use(express.json());
app.use('/api/participant', participantRouter);

let mongod: MongoMemoryServer;

async function runVerification() {
  console.log('🧪 VERIFYING PARTICIPANT LOGIN FLOW & SECURITY INVARIANTS\n');
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  try {
    // 1. Create College & Event
    const college = await College.findOneAndUpdate(
      { code: 'TESTCOL' },
      { name: 'Test College of Engineering', code: 'TESTCOL', primaryColor: '#6366f1', secondaryColor: '#06b6d4' },
      { upsert: true, new: true }
    );

    const participantToken = generateSecureToken(32);
    const tokenHash = hashToken(participantToken);
    const eventCode = 'LOGINTEST26';

    await Event.deleteMany({ code: eventCode });
    const event = await Event.create({
      collegeId: college._id,
      name: 'Participant Login Invariant Test',
      code: eventCode,
      description: 'Verifying custom username/password login without phantom users',
      participantAccessTokenHash: tokenHash,
      status: 'live',
      rules: ['No tab switching']
    });

    console.log(`✅ Event created: ${event.name} (${event.code})`);

    // 2. Admin adds participant 'suriya' with password 'Debug#123'
    const passwordHash = await bcrypt.hash('Debug#123', 10);
    await User.deleteMany({ eventId: event._id });
    const participant = await User.create({
      username: 'suriya',
      name: 'suriya',
      passwordHash,
      role: 'participant',
      collegeId: college._id,
      eventId: event._id,
      regNo: 'SURIYA',
      department: 'CSE',
      year: 'III',
      status: 'active'
    });

    console.log(`✅ Admin added participant: username=${participant.username}, regNo=${participant.regNo}`);

    // Start local ephemeral test server
    const server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const baseUrl = `http://127.0.0.1:${port}/api/participant`;

    try {
      // TEST 1: Login with exact username & password via join-by-token
      console.log('\n[TEST 1] Login via /join-by-token with username "suriya"...');
      const res1 = await fetch(`${baseUrl}/join-by-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantToken,
          username: 'suriya',
          password: 'Debug#123'
        })
      });
      const data1: any = await res1.json();
      if (res1.status === 200 && data1.token) {
        console.log('  ✅ SUCCESS: Token issued for participant suriya');
      } else {
        throw new Error(`TEST 1 FAILED: Status ${res1.status} - ${JSON.stringify(data1)}`);
      }

      // TEST 2: Login with uppercase "SURIYA" (case insensitivity)
      console.log('\n[TEST 2] Login via /join-by-token with uppercase "SURIYA"...');
      const res2 = await fetch(`${baseUrl}/join-by-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantToken,
          username: 'SURIYA',
          password: 'Debug#123'
        })
      });
      const data2: any = await res2.json();
      if (res2.status === 200 && data2.token) {
        console.log('  ✅ SUCCESS: Case-insensitive login verified');
      } else {
        throw new Error(`TEST 2 FAILED: Status ${res2.status} - ${JSON.stringify(data2)}`);
      }

      // TEST 3: Login with wrong password
      console.log('\n[TEST 3] Login with incorrect password...');
      const res3 = await fetch(`${baseUrl}/join-by-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantToken,
          username: 'suriya',
          password: 'WrongPassword'
        })
      });
      if (res3.status === 401) {
        console.log('  ✅ SUCCESS: Rejected with 401 Invalid password');
      } else {
        throw new Error(`TEST 3 FAILED: Expected 401, got ${res3.status}`);
      }

      // TEST 4: Login with non-existent user (must NOT auto-create account)
      console.log('\n[TEST 4] Login with non-existent user "phantom_user" (Ensure no auto-creation)...');
      const userCountBefore = await User.countDocuments({ eventId: event._id });
      const res4 = await fetch(`${baseUrl}/join-by-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantToken,
          username: 'phantom_user',
          password: 'AnyPassword'
        })
      });
      const userCountAfter = await User.countDocuments({ eventId: event._id });
      if (res4.status === 404 && userCountBefore === userCountAfter) {
        console.log('  ✅ SUCCESS: Non-existent user rejected (404), zero phantom accounts created');
      } else {
        throw new Error(`TEST 4 FAILED: Status ${res4.status}, count before=${userCountBefore}, after=${userCountAfter}`);
      }

      // TEST 5: Login via /join-by-code with eventCode
      console.log('\n[TEST 5] Login via /join-by-code with event code "LOGINTEST26"...');
      const res5 = await fetch(`${baseUrl}/join-by-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventCode: 'LOGINTEST26',
          username: 'suriya',
          password: 'Debug#123'
        })
      });
      const data5: any = await res5.json();
      if (res5.status === 200 && data5.token) {
        console.log('  ✅ SUCCESS: Login via event code succeeded');
      } else {
        throw new Error(`TEST 5 FAILED: Status ${res5.status} - ${JSON.stringify(data5)}`);
      }
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }

    console.log('\n🎉 ALL PARTICIPANT LOGIN INVARIANT TESTS PASSED PERFECTLY!\n');
  } finally {
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
    }
  }
}

runVerification().catch(err => {
  console.error('Test run error:', err);
  process.exit(1);
});
