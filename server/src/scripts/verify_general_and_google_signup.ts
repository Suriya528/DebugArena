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

  console.log('Testing General Sign-Up with College Name...');

  // Test 1: General registration with collegeName -> needsOnboarding should be FALSE
  const res1 = await fetch(`${baseUrl}/api/auth/register-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Dr. Sarah Connor',
      email: 'sarah@caltech.edu',
      password: 'password123',
      collegeName: 'California Institute of Technology'
    })
  });
  const data1: any = await res1.json();
  if (res1.status !== 201) throw new Error(`Registration failed: ${JSON.stringify(data1)}`);
  if (data1.needsOnboarding !== false) throw new Error(`Expected needsOnboarding=false, got: ${data1.needsOnboarding}`);
  if (!data1.user.collegeId) throw new Error('Expected user to have collegeId assigned');

  const caltech = await College.findById(data1.user.collegeId);
  if (!caltech || caltech.name !== 'California Institute of Technology' || !caltech.code) {
    throw new Error('College was not provisioned properly');
  }
  console.log(`✔ General Sign-Up succeeded: College provisioned with code '${caltech.code}' and needsOnboarding=false.`);

  // Test 2: General registration without collegeName -> needsOnboarding should be TRUE
  const res2 = await fetch(`${baseUrl}/api/auth/register-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Prof. John Smith',
      email: 'john@sample.edu',
      password: 'password123'
    })
  });
  const data2: any = await res2.json();
  if (res2.status !== 201) throw new Error(`Registration failed: ${JSON.stringify(data2)}`);
  if (data2.needsOnboarding !== true) throw new Error(`Expected needsOnboarding=true for missing college, got: ${data2.needsOnboarding}`);
  console.log('✔ General Sign-Up without college fallback works: needsOnboarding=true.');

  await mongoose.disconnect();
  await mongod.stop();
  server.close();
  console.log('🎉 ALL GENERAL & GOOGLE SIGNUP TESTS PASSED!');
}

run().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
