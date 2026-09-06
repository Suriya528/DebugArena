import http from 'http';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import assert from 'assert';
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { College } from '../models/College.js';
import { authRouter } from '../routes/auth.js';
import { adminRouter } from '../routes/admin.js';
import { adminEventRouter } from '../routes/adminEvent.js';
import { tenantContext } from '../middleware/tenantContext.js';

const PORT = 5058;
const API = `http://localhost:${PORT}/api`;

async function verifyNewCollegeCreation() {
  console.log('🏛️ ========================================================');
  console.log('🏛️ VERIFYING NEW COLLEGE CREATION IN CREATE EVENT PIPELINE');
  console.log('🏛️ ========================================================\n');

  await connectDB();
  console.log('✅ Connected to MongoDB');

  // Ensure default super_admin exists if in fresh memory server
  const existingAdmin = await User.findOne({ username: 'admin' });
  if (!existingAdmin) {
    const defaultCol = await College.create({
      name: 'Default Institute of Tech',
      code: 'DEFAULT-TECH',
      primaryColor: '#6366f1'
    });
    await User.create({
      username: 'admin',
      name: 'Super Admin',
      email: 'admin@debugarena.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: 'super_admin',
      collegeId: defaultCol._id
    });
    console.log('🌱 Seeded super_admin and initial college for test run.');
  }

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(tenantContext as any);

  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/admin/events', adminEventRouter);

  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(PORT, () => resolve()));
  console.log(`🚀 In-Process Test Server listening on port ${PORT}\n`);

  try {
    // 1. Admin Login
    console.log('🔑 1. Logging in as Admin...');
    const adminLogin = await axios.post(`${API}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    const adminToken = adminLogin.data.token;
    const adminHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };
    console.log('✅ Logged in as:', adminLogin.data.user.username, 'Role:', adminLogin.data.user.role, 'CollegeId:', adminLogin.data.user.collegeId);

    // 2. Fetch Initial Colleges for Admin
    console.log('\n📋 2. Fetching initial colleges...');
    const initCollegesRes = await axios.get(`${API}/admin/events/colleges`, adminHeaders);
    console.log('✅ Initial Colleges count:', initCollegesRes.data.colleges.length);

    // 3. Create a New College as Admin
    const collegeCode1 = 'IMP-' + Math.floor(100 + Math.random() * 900);
    console.log(`\n➕ 3. Creating New College: "Imperial College of Technology" (${collegeCode1})...`);
    const createCol1Res = await axios.post(`${API}/admin/events/colleges`, {
      name: 'Imperial College of Technology',
      code: collegeCode1,
      primaryColor: '#6366f1'
    }, adminHeaders);

    assert.strictEqual(createCol1Res.status, 201);
    const createdCol1 = createCol1Res.data.college;
    assert.ok(createdCol1._id, 'College ID should be present');
    assert.strictEqual(createdCol1.code, collegeCode1);
    console.log('✅ Successfully created college! ID:', createdCol1._id, 'Name:', createdCol1.name);

    // 4. Verify New College appears in GET /api/admin/events/colleges
    console.log('\n🔍 4. Verifying New College appears in GET /api/admin/events/colleges...');
    const afterCollegesRes = await axios.get(`${API}/admin/events/colleges`, adminHeaders);
    const foundInList = afterCollegesRes.data.colleges.some((c: any) => c._id === createdCol1._id || c.code === collegeCode1);
    assert.ok(foundInList, 'Newly created college must appear in admin colleges list');
    console.log('✅ College confirmed present in colleges list! Total now:', afterCollegesRes.data.colleges.length);

    // 5. Create an Event using the New College ID
    const eventCode1 = 'IMP-EVENT-' + Math.floor(100 + Math.random() * 900);
    console.log(`\n🏆 5. Creating Event under New College (${eventCode1})...`);
    const eventRes = await axios.post(`${API}/admin/events`, {
      collegeId: createdCol1._id,
      name: 'Imperial Annual Hack 2026',
      code: eventCode1,
      description: 'Intercollegiate algorithmic coding championship',
      rules: ['Proctoring enforced'],
      initialRounds: [
        {
          roundNumber: 1,
          title: 'Round 1: Rapid Debugging',
          type: 'mcq',
          durationMinutes: 20,
          totalMarks: 50,
          passingMarks: 0,
          negativeMarkValue: 0
        }
      ]
    }, adminHeaders);

    assert.strictEqual(eventRes.status, 201);
    const createdEvent = eventRes.data.event;
    console.log('✅ Event successfully created! Event ID:', createdEvent._id);
    assert.strictEqual(createdEvent.collegeId.toString(), createdCol1._id.toString(), 'Event must be bound to the new college ID');
    console.log('✅ Event collegeId correctly bound to:', createdEvent.collegeId);

    // 6. Test as Newly Registered Organizer (college_admin)
    console.log('\n👤 6. Registering and testing as a fresh event organizer...');
    const organizerEmail = `org_${Date.now()}@testcampus.edu`;
    const regRes = await axios.post(`${API}/auth/register-admin`, {
      name: 'Professor Charles Xavier',
      email: organizerEmail,
      password: 'password123'
    });
    const orgToken = regRes.data.token;
    const orgHeaders = { headers: { Authorization: `Bearer ${orgToken}` } };
    console.log('✅ Organizer registered! Username:', regRes.data.user.username, 'Role:', regRes.data.user.role);

    const orgCollegeCode = 'XAV-' + Math.floor(100 + Math.random() * 900);
    console.log(`➕ Creating college as organizer: "Xavier Institute" (${orgCollegeCode})...`);
    const orgColRes = await axios.post(`${API}/admin/events/colleges`, {
      name: 'Xavier Institute of Higher Learning',
      code: orgCollegeCode,
      primaryColor: '#06b6d4'
    }, orgHeaders);

    assert.strictEqual(orgColRes.status, 201);
    const orgCol = orgColRes.data.college;
    console.log('✅ Organizer created college successfully! ID:', orgCol._id);

    const orgColList = await axios.get(`${API}/admin/events/colleges`, orgHeaders);
    const orgFound = orgColList.data.colleges.some((c: any) => c._id === orgCol._id);
    assert.ok(orgFound, 'Organizer must see their newly created college');
    console.log('✅ Organizer sees newly created college in their list.');

    // 7. Test Duplicate College Code validation
    console.log('\n🛡️ 7. Testing duplicate code rejection...');
    try {
      await axios.post(`${API}/admin/events/colleges`, {
        name: 'Duplicate College Name',
        code: orgCollegeCode,
        primaryColor: '#ffffff'
      }, orgHeaders);
      assert.fail('Should have rejected duplicate college code');
    } catch (err: any) {
      assert.strictEqual(err.response?.status, 400);
      console.log('✅ Duplicate college code properly rejected with 400:', err.response?.data?.error);
    }

    // 8. Test Empty Fields validation
    console.log('\n🛡️ 8. Testing empty fields validation...');
    try {
      await axios.post(`${API}/admin/events/colleges`, {
        name: '',
        code: ''
      }, orgHeaders);
      assert.fail('Should have rejected empty name/code');
    } catch (err: any) {
      assert.strictEqual(err.response?.status, 400);
      console.log('✅ Empty fields properly rejected with 400:', err.response?.data?.error);
    }

    console.log('\n🎉 ALL NEW COLLEGE CREATION TESTS PASSED PERFECTLY!');
  } finally {
    server.close();
    await disconnectDB();
  }
}

verifyNewCollegeCreation().catch(err => {
  console.error('❌ Verification failed:', err.response?.data || err.message);
  process.exit(1);
});
