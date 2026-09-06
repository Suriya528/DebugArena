import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import http from 'http';
import { authRouter } from '../routes/auth.js';
import { User } from '../models/User.js';
import { College } from '../models/College.js';

async function run() {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;

  console.log('Testing General Sign-Up with College Name and University...');

  // Test 1: General registration with collegeName AND university
  const res1 = await fetch(`${baseUrl}/api/auth/register-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Dr. Sarah Connor',
      email: 'sarah@caltech.edu',
      password: 'password123',
      collegeName: 'Division of Engineering and Applied Science',
      university: 'California Institute of Technology'
    })
  });
  const data1: any = await res1.json();
  if (res1.status !== 201) throw new Error(`Registration failed: ${JSON.stringify(data1)}`);
  if (data1.needsOnboarding !== false) throw new Error(`Expected needsOnboarding=false, got: ${data1.needsOnboarding}`);
  if (!data1.user.collegeId) throw new Error('Expected user to have collegeId assigned');

  const caltech = await College.findById(data1.user.collegeId);
  if (!caltech || !caltech.name.includes('Division') || caltech.university !== 'California Institute of Technology' || !caltech.code) {
    throw new Error(`College or university was not provisioned properly: ${JSON.stringify(caltech)}`);
  }
  console.log(`✔ General Sign-Up succeeded: College provisioned with code '${caltech.code}', name '${caltech.name}', university '${caltech.university}', and needsOnboarding=false.`);

  // Test 2: Google Sign-Up -> verify first -> then ask college name and university
  console.log('\nTesting Google Sign-Up flow: Verify Google first -> then onboarding with college & university...');
  const googleRes = await fetch(`${baseUrl}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mockEmail: 'professor.alan@oxford.edu',
      name: 'Prof. Alan Turing'
    })
  });
  const googleData: any = await googleRes.json();
  if (googleRes.status !== 200) throw new Error(`Google login failed: ${JSON.stringify(googleData)}`);
  if (googleData.needsOnboarding !== true) throw new Error('Expected Google signup to need onboarding (Step 2)');
  if (!googleData.token) throw new Error('Expected token returned from Google authentication');
  console.log(`✔ Google Account Verified: Name='${googleData.user.name}', Email='${googleData.user.email}', needsOnboarding=true.`);

  // Step 2 of Google Flow: Call /onboarding with collegeName AND university
  const onboardRes = await fetch(`${baseUrl}/api/auth/onboarding`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${googleData.token}`
    },
    body: JSON.stringify({
      collegeName: 'Balliol College',
      university: 'University of Oxford'
    })
  });
  const onboardData: any = await onboardRes.json();
  if (onboardRes.status !== 200) throw new Error(`Onboarding failed: ${JSON.stringify(onboardData)}`);
  if (!onboardData.college || onboardData.college.university !== 'University of Oxford') {
    throw new Error(`Onboarding college university missing: ${JSON.stringify(onboardData)}`);
  }

  const savedOxford = await College.findById(onboardData.college._id);
  if (!savedOxford || savedOxford.name !== 'Balliol College' || savedOxford.university !== 'University of Oxford') {
    throw new Error('College model does not have matching collegeName and university');
  }
  console.log(`✔ Google Step 2 Onboarding succeeded: College '${savedOxford.name}' linked to University '${savedOxford.university}' with auto-generated code '${savedOxford.code}'.`);

  await mongoose.disconnect();
  await mongod.stop();
  server.close();
  console.log('\n🎉 ALL COLLEGE & UNIVERSITY AUTHENTICATION TESTS PASSED!');
}

run().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
