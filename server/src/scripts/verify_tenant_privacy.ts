import http from 'http';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectDB, disconnectDB } from '../config/db.js';
import { College } from '../models/College.js';
import { Event } from '../models/Event.js';
import { User } from '../models/User.js';
import { RoundProgress } from '../models/RoundProgress.js';
import { authRouter } from '../routes/auth.js';
import { adminRouter } from '../routes/admin.js';
import { adminEventRouter } from '../routes/adminEvent.js';
import { certificateRouter } from '../routes/certificate.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { ENV } from '../config/env.js';

const PORT = 5055;
const API = `http://localhost:${PORT}/api`;

async function verifyTenantPrivacy() {
  console.log('🔒 =======================================================');
  console.log('🔒 MULTI-TENANT PRIVACY & ZERO COMPETITOR DISCLOSURE SUITE');
  console.log('🔒 =======================================================\n');

  await connectDB();
  console.log('✅ Connected to MongoDB');

  // Setup standalone Express app on PORT 5055
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(tenantContext as any);

  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/admin/events', adminEventRouter);
  app.use('/api/certificates', certificateRouter);

  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(PORT, () => resolve()));
  console.log(`🚀 Test Isolation Server running on port ${PORT}\n`);

  // 1. Seed College Alpha and College Beta
  await College.deleteMany({ code: { $in: ['ALPHA-TECH', 'BETA-ENG'] } });
  await User.deleteMany({ username: { $in: ['admin_alpha', 'admin_beta', 'alpha_coder1', 'beta_coder1'] } });

  const collegeAlpha = await College.create({
    name: 'Alpha Institute of Technology',
    code: 'ALPHA-TECH',
    primaryColor: '#4f46e5',
    contactEmail: 'contact@alpha.edu'
  });

  const collegeBeta = await College.create({
    name: 'Beta University of Engineering',
    code: 'BETA-ENG',
    primaryColor: '#06b6d4',
    contactEmail: 'contact@beta.edu'
  });

  console.log(`🏛️ Seeded Tenants:`);
  console.log(`   - Alpha: ${collegeAlpha.name} (${collegeAlpha.code}) [ID: ${collegeAlpha._id}]`);
  console.log(`   - Beta:  ${collegeBeta.name} (${collegeBeta.code}) [ID: ${collegeBeta._id}]\n`);

  // 2. Seed Admin Alpha and Admin Beta
  const passwordHash = await bcrypt.hash('Admin@123', 10);

  const adminAlpha = await User.create({
    username: 'admin_alpha',
    name: 'Alpha Dean of Computing',
    passwordHash,
    role: 'admin',
    collegeId: collegeAlpha._id
  });

  const adminBeta = await User.create({
    username: 'admin_beta',
    name: 'Beta Director of Technology',
    passwordHash,
    role: 'admin',
    collegeId: collegeBeta._id
  });

  // 3. Seed Events for Alpha and Beta
  const eventAlpha = await Event.create({
    collegeId: collegeAlpha._id,
    name: 'Alpha Annual Code Sprint 2026',
    code: 'ALPHA-DEV-26',
    description: 'Alpha internal championship',
    status: 'live'
  });

  const eventBeta = await Event.create({
    collegeId: collegeBeta._id,
    name: 'Beta TopCoder Grand Prix 2026',
    code: 'BETA-HACK-26',
    description: 'Beta internal championship',
    status: 'live'
  });

  // 4. Seed Participants for Alpha and Beta
  const alphaUser = await User.create({
    username: 'alpha_coder1',
    name: 'Alice Alpha',
    passwordHash,
    role: 'participant',
    collegeId: collegeAlpha._id,
    eventId: eventAlpha._id
  });

  const betaUser = await User.create({
    username: 'beta_coder1',
    name: 'Bob Beta',
    passwordHash,
    role: 'participant',
    collegeId: collegeBeta._id,
    eventId: eventBeta._id
  });

  // RoundProgress for both
  await RoundProgress.create({
    userId: alphaUser._id,
    roundNumber: 1,
    totalScore: 95,
    timeTakenSeconds: 320,
    status: 'submitted',
    submittedAt: new Date()
  });

  await RoundProgress.create({
    userId: betaUser._id,
    roundNumber: 1,
    totalScore: 99,
    timeTakenSeconds: 280,
    status: 'submitted',
    submittedAt: new Date()
  });

  // Generate Admin Alpha JWT
  const alphaToken = jwt.sign(
    {
      userId: adminAlpha._id.toString(),
      username: adminAlpha.username,
      role: adminAlpha.role,
      name: adminAlpha.name,
      collegeId: collegeAlpha._id.toString(),
      eventId: eventAlpha._id.toString()
    },
    ENV.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const authHeaders = {
    headers: { Authorization: `Bearer ${alphaToken}` }
  };

  console.log('🔑 Authenticated as College Alpha Admin (Token generated)\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(title: string, condition: boolean, extraInfo?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${title}`);
      if (extraInfo) console.log(`     ↳ ${extraInfo}`);
    } else {
      console.error(`  ❌ [FAIL] ${title}`);
      if (extraInfo) console.error(`     ↳ ${extraInfo}`);
    }
  }

  // TEST 1: GET /api/admin/events/colleges
  console.log('🧪 Test 1: GET /api/admin/events/colleges (Tenant Concealment)');
  try {
    const res = await axios.get(`${API}/admin/events/colleges`, authHeaders);
    const colleges = res.data.colleges || [];
    const hasAlpha = colleges.some((c: any) => c.code === 'ALPHA-TECH');
    const hasBeta = colleges.some((c: any) => c.code === 'BETA-ENG');
    assert('Returns only College Alpha', hasAlpha && colleges.length === 1);
    assert('Competitor College Beta is completely concealed', !hasBeta, `Returned colleges count: ${colleges.length}`);
  } catch (err: any) {
    assert('GET /colleges failed', false, err.message);
  }

  // TEST 2: GET /api/admin/events
  console.log('\n🧪 Test 2: GET /api/admin/events (Event Tenant Isolation)');
  try {
    const res = await axios.get(`${API}/admin/events`, authHeaders);
    const events = res.data.events || [];
    const hasAlphaEvent = events.some((e: any) => e.code === 'ALPHA-DEV-26');
    const hasBetaEvent = events.some((e: any) => e.code === 'BETA-HACK-26');
    assert('Returns College Alpha events', hasAlphaEvent);
    assert('Competitor College Beta events are completely concealed', !hasBetaEvent, `Returned events count: ${events.length}`);
  } catch (err: any) {
    assert('GET /events failed', false, err.message);
  }

  // TEST 3: GET /api/admin/events/:betaEventId (Direct Cross-Tenant Lookup Concealment)
  console.log('\n🧪 Test 3: GET /api/admin/events/:betaEventId (Cross-Tenant 404 Concealment)');
  try {
    await axios.get(`${API}/admin/events/${eventBeta._id}`, authHeaders);
    assert('Direct access to Beta event should return 404', false, 'Allowed cross-tenant read!');
  } catch (err: any) {
    assert('Direct access to Beta event returns 404 Not Found', err.response?.status === 404, `Status: ${err.response?.status}`);
  }

  // TEST 4: GET /api/admin/participants (Participant Tenant Isolation)
  console.log('\n🧪 Test 4: GET /api/admin/participants (Participant Tenant Isolation)');
  try {
    const res = await axios.get(`${API}/admin/participants`, authHeaders);
    const participants = res.data.participants || [];
    const hasAlphaUser = participants.some((p: any) => p.username === 'alpha_coder1');
    const hasBetaUser = participants.some((p: any) => p.username === 'beta_coder1');
    assert('Returns College Alpha participants', hasAlphaUser);
    assert('Competitor College Beta participants are concealed', !hasBetaUser);
  } catch (err: any) {
    assert('GET /participants failed', false, err.message);
  }

  // TEST 5: GET /api/admin/leaderboard (Leaderboard Tenant Isolation)
  console.log('\n🧪 Test 5: GET /api/admin/leaderboard (Leaderboard Tenant Isolation)');
  try {
    const res = await axios.get(`${API}/admin/leaderboard`, authHeaders);
    const leaderboard = res.data.leaderboard || [];
    const hasAlphaInLb = leaderboard.some((r: any) => r.username === 'alpha_coder1');
    const hasBetaInLb = leaderboard.some((r: any) => r.username === 'beta_coder1');
    assert('Leaderboard includes Alpha participants', hasAlphaInLb);
    assert('Leaderboard conceals Beta participants', !hasBetaInLb);
  } catch (err: any) {
    assert('GET /leaderboard failed', false, err.message);
  }

  // TEST 6: POST /api/admin/events/colleges (College Admin Cannot Create Colleges)
  console.log('\n🧪 Test 6: POST /api/admin/events/colleges (Privilege Boundary)');
  try {
    await axios.post(`${API}/admin/events/colleges`, { name: 'Rogue College', code: 'ROGUE' }, authHeaders);
    assert('College admin creation should be forbidden', false, 'Allowed non-super admin to create college!');
  } catch (err: any) {
    assert('College admin blocked from college registration with 403 Forbidden', err.response?.status === 403, `Status: ${err.response?.status}`);
  }

  // TEST 7: POST /api/admin/events (Spoofed CollegeId Overwrite Protection)
  console.log('\n🧪 Test 7: POST /api/admin/events (Spoofed CollegeId Overwrite Protection)');
  try {
    const maliciousPayload = {
      collegeId: collegeBeta._id.toString(), // Attacker tries to create event under Beta
      name: 'Spoofed Cross-Tenant Event',
      code: 'SPOOF-' + Date.now().toString(36).toUpperCase(),
      description: 'Attempting to inject into competitor college'
    };
    const res = await axios.post(`${API}/admin/events`, maliciousPayload, authHeaders);
    const createdEvent = res.data.event;
    assert('Event collegeId is forced to Admin Alpha collegeId', createdEvent.collegeId.toString() === collegeAlpha._id.toString(), `Actual collegeId: ${createdEvent.collegeId}`);
  } catch (err: any) {
    assert('Event creation failed unexpectedly', false, err.message);
  }

  // TEST 8: PUT /api/admin/events/:betaEventId (Cross-Tenant Modification Block)
  console.log('\n🧪 Test 8: PUT /api/admin/events/:betaEventId (Cross-Tenant Modification Block)');
  try {
    await axios.put(`${API}/admin/events/${eventBeta._id}`, { name: 'Hacked Beta Event' }, authHeaders);
    assert('Modifying competitor event should return 404', false, 'Allowed cross-tenant update!');
  } catch (err: any) {
    assert('Modifying competitor event returns 404 Not Found', err.response?.status === 404, `Status: ${err.response?.status}`);
  }

  // TEST 9: POST /api/admin/events/:betaEventId/freeze (Cross-Tenant Freeze Block)
  console.log('\n🧪 Test 9: POST /api/admin/events/:betaEventId/freeze (Cross-Tenant Freeze Block)');
  try {
    await axios.post(`${API}/admin/events/${eventBeta._id}/freeze`, {}, authHeaders);
    assert('Freezing competitor event should return 404', false, 'Allowed cross-tenant freeze!');
  } catch (err: any) {
    assert('Freezing competitor event returns 404 Not Found', err.response?.status === 404, `Status: ${err.response?.status}`);
  }

  // TEST 10: GET /api/admin/tiebreak/check (Tiebreak Check Isolation)
  console.log('\n🧪 Test 10: GET /api/admin/tiebreak/check (Tiebreak Check Isolation)');
  try {
    const res = await axios.get(`${API}/admin/tiebreak/check`, authHeaders);
    const tiedGroups = res.data.tiedGroups || [];
    let leaksBeta = false;
    for (const g of tiedGroups) {
      if (g.some((p: any) => p.username === 'beta_coder1')) leaksBeta = true;
    }
    assert('Tiebreak check strictly conceals competitor participants', !leaksBeta);
  } catch (err: any) {
    assert('GET /tiebreak/check failed', false, err.message);
  }

  // TEST 11: Cross-Tenant Participant Disqualification Block
  console.log('\n🧪 Test 11: PATCH /api/admin/participants/:id/disqualify (Cross-Tenant Disqualification Block)');
  try {
    await axios.patch(`${API}/admin/participants/${betaUser._id}/disqualify`, { isDisqualified: true, reason: 'Rogue disqualification' }, authHeaders);
    assert('Disqualifying competitor participant should return 404', false, 'Allowed cross-tenant disqualification!');
  } catch (err: any) {
    assert('Disqualifying competitor participant returns 404 Not Found', err.response?.status === 404, `Status: ${err.response?.status}`);
  }

  console.log('\n=======================================================');
  console.log(`📊 FINAL RESULT: ${passedTests}/${totalTests} Tests Passed`);
  console.log('=======================================================');

  server.close();
  await disconnectDB();

  if (passedTests === totalTests) {
    console.log('🎉 STRICT MULTI-TENANT PRIVACY ARCHITECTURE VERIFIED!\n');
    process.exit(0);
  } else {
    console.error('💥 SOME TENANT ISOLATION TESTS FAILED!\n');
    process.exit(1);
  }
}

verifyTenantPrivacy().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
