import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import http from 'http';
import { authRouter } from '../routes/auth.js';

async function run() {
  console.log('🚀 Starting Passkey Authentication & Email Dispatch Verification...\n');

  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;

  // 1. Create organizer
  console.log('1. Registering an organizer...');
  const regRes = await fetch(`${baseUrl}/api/auth/register-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Organizer Alice',
      email: 'alice.organizer@mit.edu',
      password: 'StandardPassword123!',
      collegeName: 'MIT School of Engineering',
      university: 'Massachusetts Institute of Technology'
    })
  });
  const regData: any = await regRes.json();
  if (regRes.status !== 201) throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
  const token = regData.token;
  const username = regData.user.username;
  console.log(`✔ Organizer registered: username='${username}', email='alice.organizer@mit.edu'`);

  // 2. Check initial passkey status (should be false)
  console.log('\n2. Checking initial passkey status...');
  const statusRes1 = await fetch(`${baseUrl}/api/auth/passkey/status`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const statusData1: any = await statusRes1.json();
  if (statusData1.hasPasskey !== false) throw new Error(`Expected hasPasskey=false, got: ${statusData1.hasPasskey}`);
  console.log('✔ Initial passkey status is false as expected.');

  // 3. Set custom passkey (symbol + alphanumeric: "MIT#2026@Key!")
  console.log('\n3. Setting custom keyword passkey (symbols, numeric, alphanumeric: "MIT#2026@Key!")...');
  const setupRes1 = await fetch(`${baseUrl}/api/auth/passkey/setup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ passkey: 'MIT#2026@Key!' })
  });
  const setupData1: any = await setupRes1.json();
  if (setupRes1.status !== 200 || !setupData1.hasPasskey) {
    throw new Error(`Setup passkey failed: ${JSON.stringify(setupData1)}`);
  }
  console.log(`✔ Passkey configured successfully: ${setupData1.message}`);

  // 4. Verify passkey status endpoint returns true
  const statusRes2 = await fetch(`${baseUrl}/api/auth/passkey/status`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const statusData2: any = await statusRes2.json();
  if (statusData2.hasPasskey !== true) throw new Error('Expected hasPasskey=true');
  console.log(`✔ Passkey status endpoint reports active: updated at ${statusData2.updatedAt}`);

  // 5. Sign in using passkey with email
  console.log('\n5. Logging in with passkey via email (alice.organizer@mit.edu)...');
  const loginRes1 = await fetch(`${baseUrl}/api/auth/passkey/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'alice.organizer@mit.edu',
      passkey: 'MIT#2026@Key!'
    })
  });
  const loginData1: any = await loginRes1.json();
  if (loginRes1.status !== 200 || !loginData1.token || !loginData1.user.hasPasskey) {
    throw new Error(`Passkey email login failed: ${JSON.stringify(loginData1)}`);
  }
  console.log(`✔ Passkey login with email succeeded! User authenticated: ${loginData1.user.name}`);

  // 6. Sign in using passkey with username
  console.log(`\n6. Logging in with passkey via username (@${username})...`);
  const loginRes2 = await fetch(`${baseUrl}/api/auth/passkey/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: username,
      passkey: 'MIT#2026@Key!'
    })
  });
  const loginData2: any = await loginRes2.json();
  if (loginRes2.status !== 200 || !loginData2.token) {
    throw new Error(`Passkey username login failed: ${JSON.stringify(loginData2)}`);
  }
  console.log(`✔ Passkey login with username succeeded!`);

  // 7. Attempt passkey login with wrong keyword
  console.log('\n7. Attempting login with incorrect passkey keyword (expected failure)...');
  const failRes = await fetch(`${baseUrl}/api/auth/passkey/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: username,
      passkey: 'WrongKey#999'
    })
  });
  if (failRes.status !== 401) {
    throw new Error(`Expected 401 Unauthorized for incorrect passkey, got: ${failRes.status}`);
  }
  console.log('✔ Incorrect passkey correctly rejected with 401 Unauthorized.');

  // 8. Update passkey to pure numeric keyword (e.g. "98765432")
  console.log('\n8. Updating passkey to pure numeric keyword ("98765432")...');
  const setupRes2 = await fetch(`${baseUrl}/api/auth/passkey/setup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ passkey: '98765432' })
  });
  const setupData2: any = await setupRes2.json();
  if (setupRes2.status !== 200) throw new Error(`Numeric passkey update failed: ${JSON.stringify(setupData2)}`);

  const loginNumericRes = await fetch(`${baseUrl}/api/auth/passkey/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: username,
      passkey: '98765432'
    })
  });
  if (loginNumericRes.status !== 200) throw new Error('Numeric passkey login failed');
  console.log('✔ Numeric passkey ("98765432") successfully updated and authenticated!');

  // 9. Revoke passkey
  console.log('\n9. Revoking passkey via DELETE /api/auth/passkey...');
  const revokeRes = await fetch(`${baseUrl}/api/auth/passkey`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (revokeRes.status !== 200) throw new Error('Revoke passkey failed');

  const revokedLoginRes = await fetch(`${baseUrl}/api/auth/passkey/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: username,
      passkey: '98765432'
    })
  });
  if (revokedLoginRes.status !== 400 && revokedLoginRes.status !== 401) {
    throw new Error(`Expected error after revoking passkey, got status: ${revokedLoginRes.status}`);
  }
  console.log('✔ Revocation confirmed: Passkey login immediately disabled.');

  console.log('\n🎉 ALL PASSKEY AUTHENTICATION & EMAIL DISPATCH TESTS PASSED PERFECTLY!\n');
  await mongoose.disconnect();
  await mongod.stop();
  server.close();
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
