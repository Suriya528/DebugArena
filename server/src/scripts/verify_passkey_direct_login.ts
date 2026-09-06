import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import http from 'http';
import { authRouter } from '../routes/auth.js';

async function run() {
  console.log('🚀 Starting Direct 1-Step Passkey & Disambiguation Verification...\n');

  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;

  // 1. Register Alice with passkey "SuperSecret#2026"
  console.log('1. Registering Alice with passkey during signup...');
  const regAlice = await fetch(`${baseUrl}/api/auth/register-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alice Johnson',
      email: 'alice.johnson@mit.edu',
      password: 'Password123!',
      passkey: 'SuperSecret#2026',
      collegeName: 'MIT Engineering',
      university: 'MIT'
    })
  });
  const dataAlice: any = await regAlice.json();
  if (regAlice.status !== 201) throw new Error(`Alice registration failed: ${JSON.stringify(dataAlice)}`);
  console.log(`✔ Alice registered with passkey! Username: ${dataAlice.user.username}`);

  // 2. Direct 1-Step Passkey Login for Alice (NO email provided!)
  console.log('\n2. Testing 1-Step Direct Passkey Login (No email, keyword ONLY)...');
  const directLoginAlice = await fetch(`${baseUrl}/api/auth/passkey/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      passkey: 'SuperSecret#2026'
    })
  });
  const dataDirectAlice: any = await directLoginAlice.json();
  if (directLoginAlice.status !== 200 || !dataDirectAlice.token || dataDirectAlice.user.name !== 'Alice Johnson') {
    throw new Error(`Direct passkey login failed: ${JSON.stringify(dataDirectAlice)}`);
  }
  console.log(`✔ 1-Step Direct Login SUCCESS! User: ${dataDirectAlice.user.name}, Token received.`);

  // 3. Register Bob with the SAME passkey "SuperSecret#2026" (duplicate passkey scenario)
  console.log('\n3. Registering Bob with the same passkey "SuperSecret#2026"...');
  const regBob = await fetch(`${baseUrl}/api/auth/register-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Bob Smith',
      email: 'bob.smith@stanford.edu',
      password: 'Password123!',
      passkey: 'SuperSecret#2026',
      collegeName: 'Stanford CS',
      university: 'Stanford University'
    })
  });
  const dataBob: any = await regBob.json();
  if (regBob.status !== 201) throw new Error(`Bob registration failed: ${JSON.stringify(dataBob)}`);
  console.log(`✔ Bob registered with identical passkey keyword! Username: ${dataBob.user.username}`);

  // 4. Attempt direct passkey login with "SuperSecret#2026" when 2 users share it
  console.log('\n4. Attempting direct login when multiple accounts share this passkey...');
  const multiRes = await fetch(`${baseUrl}/api/auth/passkey/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      passkey: 'SuperSecret#2026'
    })
  });
  const multiData: any = await multiRes.json();
  if (multiRes.status !== 200 || !multiData.requiresEmail) {
    throw new Error(`Expected requiresEmail=true, got: ${JSON.stringify(multiData)}`);
  }
  console.log('✔ Disambiguation challenge triggered!');
  console.log(`  Message: "${multiData.message}"`);
  console.log(`  Matched Accounts (${multiData.matchedCount}):`, multiData.maskedAccounts);

  // Validate masked emails
  const maskedEmails = multiData.maskedAccounts.map((a: any) => a.maskedEmail);
  console.log(`  Masked hints: ${maskedEmails.join(', ')}`);

  // 5. Disambiguate with Alice's email
  console.log("\n5. Disambiguating with Alice's email (alice.johnson@mit.edu)...");
  const disambigAlice = await fetch(`${baseUrl}/api/auth/passkey/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      passkey: 'SuperSecret#2026',
      email: 'alice.johnson@mit.edu'
    })
  });
  const disambigAliceData: any = await disambigAlice.json();
  if (disambigAlice.status !== 200 || disambigAliceData.user.name !== 'Alice Johnson') {
    throw new Error(`Disambiguation with Alice email failed: ${JSON.stringify(disambigAliceData)}`);
  }
  console.log(`✔ Authenticated as Alice Johnson successfully!`);

  // 6. Disambiguate with Bob's email
  console.log("\n6. Disambiguating with Bob's email (bob.smith@stanford.edu)...");
  const disambigBob = await fetch(`${baseUrl}/api/auth/passkey/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      passkey: 'SuperSecret#2026',
      email: 'bob.smith@stanford.edu'
    })
  });
  const disambigBobData: any = await disambigBob.json();
  if (disambigBob.status !== 200 || disambigBobData.user.name !== 'Bob Smith') {
    throw new Error(`Disambiguation with Bob email failed: ${JSON.stringify(disambigBobData)}`);
  }
  console.log(`✔ Authenticated as Bob Smith successfully!`);

  // 7. Disambiguate with wrong email
  console.log("\n7. Attempting disambiguation with non-matching email (charlie@other.edu)...");
  const disambigFail = await fetch(`${baseUrl}/api/auth/passkey/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      passkey: 'SuperSecret#2026',
      email: 'charlie@other.edu'
    })
  });
  if (disambigFail.status !== 401) {
    throw new Error(`Expected 401 for wrong disambiguation email, got: ${disambigFail.status}`);
  }
  console.log('✔ Non-matching email correctly rejected with 401.');

  // 8. Attempt login with completely invalid passkey
  console.log('\n8. Attempting login with unknown passkey keyword...');
  const invalidPass = await fetch(`${baseUrl}/api/auth/passkey/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      passkey: 'NonExistentPasskey!999'
    })
  });
  if (invalidPass.status !== 401) {
    throw new Error(`Expected 401 for unknown passkey, got: ${invalidPass.status}`);
  }
  console.log('✔ Unknown passkey rejected with 401.');

  console.log('\n🎉 ALL DIRECT 1-STEP PASSKEY & DISAMBIGUATION TESTS PASSED PERFECTLY!\n');
  await mongoose.disconnect();
  await mongod.stop();
  server.close();
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
