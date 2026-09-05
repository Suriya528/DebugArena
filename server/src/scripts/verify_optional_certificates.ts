import axios from 'axios';

const API = 'http://localhost:5000/api';

async function runTests() {
  console.log('🧪 Starting Optional Certificates Verification Suite...');

  // 1. Admin Login
  console.log('\n--- Test 1: Admin Authentication ---');
  const loginRes = await axios.post(`${API}/auth/login`, {
    username: 'admin',
    password: 'admin123'
  });
  const token = loginRes.data.token;
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
  console.log('✅ Admin authenticated successfully');

  // Get Admin College
  const collegesRes = await axios.get(`${API}/admin/events/colleges`, authHeaders);
  const collegeId = collegesRes.data.colleges[0]._id;
  console.log(`✅ Retrieved College: ${collegesRes.data.colleges[0].name} (${collegeId})`);

  // 2. Create Event A with Certificates Disabled (Optional Feature = OFF)
  console.log('\n--- Test 2: Create Event with Certificates Disabled ---');
  const eventCodeA = 'OFF_' + Date.now().toString(36).toUpperCase();
  const eventARes = await axios.post(
    `${API}/admin/events`,
    {
      collegeId,
      name: 'Hackathon No Certs',
      code: eventCodeA,
      description: 'Tournament where event creator opted out of certificates',
      certificateConfig: {
        enabled: false,
        useDefaultTemplate: true
      }
    },
    authHeaders
  );
  const eventA = eventARes.data.event;
  console.log(`✅ Event A Created: "${eventA.name}" (Code: ${eventA.code})`);
  if (eventA.certificateConfig?.enabled === false) {
    console.log('✅ Verified: eventA.certificateConfig.enabled is strictly FALSE');
  } else {
    throw new Error(`Expected certificateConfig.enabled to be false, got: ${eventA.certificateConfig?.enabled}`);
  }

  // Register a participant for Event A
  const userARes = await axios.post(
    `${API}/admin/participants`,
    {
      username: `user_a_${Date.now().toString(36)}`,
      name: 'Participant Event A',
      password: 'password123',
      eventId: eventA._id
    },
    authHeaders
  );
  const testUserA = userARes.data.participant;
  console.log(`✅ Participant for Event A registered: ${testUserA.name} (${testUserA.id})`);

  // 3. Attempt to Issue Certificate for Event A (Should be REJECTED with 400)
  console.log('\n--- Test 3: Attempt Certificate Issuance on Event A (Expected Rejection) ---');
  let rejected = false;
  try {
    await axios.post(
      `${API}/certificates/issue`,
      {
        userId: testUserA.id,
        rank: 1,
        totalScore: 280,
        eventId: eventA._id,
        eventTitle: eventA.name,
        collegeName: 'Alpha Tech'
      },
      authHeaders
    );
  } catch (err: any) {
    if (err.response?.status === 400) {
      rejected = true;
      console.log(`✅ Successfully Blocked! Server returned 400 Bad Request: "${err.response.data.error}"`);
    } else {
      throw new Error(`Expected 400 status code, got ${err.response?.status}: ${err.message}`);
    }
  }

  if (!rejected) {
    throw new Error('Security flaw: Certificate was minted for an event where certificates are disabled!');
  }

  // 4. Lifecycle Action: Admin Toggles Certificates ON for Event A
  console.log('\n--- Test 4: Toggle Certificates ON for Event A via PATCH ---');
  const toggleOnRes = await axios.patch(
    `${API}/admin/events/${eventA._id}/toggle-certificates`,
    { enabled: true },
    authHeaders
  );
  console.log(`✅ Toggle response status: ${toggleOnRes.status}`);
  if (toggleOnRes.data.event.certificateConfig.enabled === true) {
    console.log('✅ Verified: Event A certificateConfig.enabled is now TRUE');
  } else {
    throw new Error('Failed to toggle certificates to true');
  }

  // 5. Issue Certificate for Event A now that it is enabled
  console.log('\n--- Test 5: Issue Certificate for Event A after Activation ---');
  const certRes = await axios.post(
    `${API}/certificates/issue`,
    {
      userId: testUserA.id,
      rank: 1,
      totalScore: 280,
      eventId: eventA._id,
      eventTitle: eventA.name,
      collegeName: 'Alpha Tech'
    },
    authHeaders
  );
  if (certRes.data.success && certRes.data.certificate) {
    console.log(`✅ Certificate issued successfully! ID: ${certRes.data.certificate.certificateId}`);
    console.log(`✅ Verification Hash: ${certRes.data.certificate.verificationHash}`);
  } else {
    throw new Error('Failed to issue certificate when enabled');
  }

  // 6. Create Event B with Certificates Enabled directly at Creation
  console.log('\n--- Test 6: Create Event B with Certificates Enabled Upfront ---');
  const eventCodeB = 'ON_' + Date.now().toString(36).toUpperCase();
  const eventBRes = await axios.post(
    `${API}/admin/events`,
    {
      collegeId,
      name: 'Premier Championship Certs Active',
      code: eventCodeB,
      description: 'Tournament with certificates enabled upfront',
      certificateConfig: {
        enabled: true,
        useDefaultTemplate: true,
        signatoryName: 'Dean of Engineering'
      }
    },
    authHeaders
  );
  const eventB = eventBRes.data.event;
  console.log(`✅ Event B Created: "${eventB.name}" (Code: ${eventB.code})`);
  if (eventB.certificateConfig?.enabled === true) {
    console.log('✅ Verified: eventB.certificateConfig.enabled is strictly TRUE');
  } else {
    throw new Error(`Expected certificateConfig.enabled to be true, got: ${eventB.certificateConfig?.enabled}`);
  }

  // Register participant for Event B
  const userBRes = await axios.post(
    `${API}/admin/participants`,
    {
      username: `user_b_${Date.now().toString(36)}`,
      name: 'Participant Event B',
      password: 'password123',
      eventId: eventB._id
    },
    authHeaders
  );
  const testUserB = userBRes.data.participant;
  console.log(`✅ Participant for Event B registered: ${testUserB.name} (${testUserB.id})`);

  // Issue cert for Event B (should succeed since enabled)
  const certBRes = await axios.post(
    `${API}/certificates/issue`,
    {
      userId: testUserB.id,
      rank: 1,
      totalScore: 300,
      eventId: eventB._id,
      eventTitle: eventB.name,
      collegeName: 'Alpha Tech'
    },
    authHeaders
  );
  if (certBRes.data.success && certBRes.data.certificate) {
    console.log(`✅ Certificate issued on Event B! ID: ${certBRes.data.certificate.certificateId}`);
  }

  // 7. Toggle Certificates OFF for Event B and verify it is blocked
  console.log('\n--- Test 7: Toggle Certificates OFF for Event B and verify issuance blocks ---');
  await axios.patch(
    `${API}/admin/events/${eventB._id}/toggle-certificates`,
    { enabled: false },
    authHeaders
  );
  let blockedEventB = false;
  try {
    await axios.post(
      `${API}/certificates/issue`,
      {
        userId: testUserB.id,
        rank: 2,
        totalScore: 240,
        eventId: eventB._id,
        eventTitle: eventB.name,
        collegeName: 'Alpha Tech'
      },
      authHeaders
    );
  } catch (err: any) {
    if (err.response?.status === 400) {
      blockedEventB = true;
      console.log(`✅ Successfully Blocked on Event B! Error: "${err.response.data.error}"`);
    }
  }
  if (!blockedEventB) {
    throw new Error('Security flaw: Certificate was minted after event certificates were toggled off!');
  }

  console.log('\n🎉 ALL 7 TESTS PASSED! Optional certificates feature is 100% verified and secure.\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err.response?.data || err.message);
  process.exit(1);
});
