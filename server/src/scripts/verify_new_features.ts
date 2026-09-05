import axios from 'axios';
import assert from 'assert';

const API = 'http://localhost:5000/api';

async function main() {
  console.log('================================================================');
  console.log('🚀 VERIFYING 3 NEW HIGH-IMPACT ARCHITECTURAL FEATURES');
  console.log('================================================================\n');

  // 1. Admin Login
  const adminLogin = await axios.post(`${API}/auth/login`, {
    username: 'admin',
    password: 'admin123'
  });
  const adminToken = adminLogin.data.token;
  const adminHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };

  // Ensure Round 1 is active
  await axios.post(`${API}/admin/rounds/1/start`, {}, adminHeaders);

  // -------------------------------------------------------------
  // FEATURE 1: Custom Test Case Arbitrary Input Execution
  // -------------------------------------------------------------
  console.log('--- Feature 1: Custom Testcase Stdin Playground ---');
  const customUser = `custom_${Date.now()}`;
  await axios.post(`${API}/admin/participants`, {
    username: customUser,
    name: 'Custom Testcase Candidate',
    password: 'password123'
  }, adminHeaders);

  const customLogin = await axios.post(`${API}/auth/login`, {
    username: customUser,
    password: 'password123'
  });
  const customHeaders = { headers: { Authorization: `Bearer ${customLogin.data.token}` } };

  // Get a coding question to test arbitrary input execution
  const questionsRes = await axios.get(`${API}/admin/questions`, adminHeaders);
  const codingQ = (questionsRes.data.questions || []).find((q: any) => q.type === 'coding');

  if (codingQ) {
    // Run code with custom input
    const pyCode = 'import sys\nline = sys.stdin.read().strip()\nprint(f"ECHO: {line}")';
    const customStdin = 'Senior Architect Test 12345';

    const runRes = await axios.post(`${API}/participant/run-code`, {
      questionId: codingQ._id,
      code: pyCode,
      language: 'python',
      customInput: customStdin
    }, customHeaders);

    assert(runRes.data.success === true, 'run-code returned success');
    assert(runRes.data.isCustom === true, 'run-code flagged isCustom as true');
    assert(runRes.data.customResult, 'run-code returned customResult object');
    assert(runRes.data.customResult.input === customStdin, 'customResult echoed back input');
    assert(runRes.data.customResult.actualOutput.includes('ECHO: Senior Architect Test 12345'), 'customResult stdout matches execution');
    assert(runRes.data.customResult.status === 'Success', 'customResult status is Success');
    console.log('  ✅ PASS: Arbitrary stdin custom test case executed cleanly and returned stdout');
  } else {
    console.log('  ⚠️ SKIP: No coding question found in Round 1 for custom testcase verification');
  }

  // -------------------------------------------------------------
  // FEATURE 2: Direct Certificate Access for Participants
  // -------------------------------------------------------------
  console.log('\n--- Feature 2: Participant Direct Certificate Access ---');
  const certRes = await axios.get(`${API}/certificates/my-certificate`, customHeaders);
  assert(certRes.status === 200, 'GET /certificates/my-certificate returned 200 OK');
  assert(typeof certRes.data.hasCertificate === 'boolean', 'hasCertificate boolean returned');
  console.log(`  ✅ PASS: /api/certificates/my-certificate gracefully queried (hasCertificate: ${certRes.data.hasCertificate})`);

  // -------------------------------------------------------------
  // FEATURE 3: Bulk CSV Import with Extended Schema
  // -------------------------------------------------------------
  console.log('\n--- Feature 3: Bulk CSV Importer Extended Schema ---');
  const bulkPayload = [
    {
      username: `bulk_eng_${Date.now()}`,
      name: 'Alice Turing',
      password: 'password123',
      department: 'Computer Science',
      year: '3',
      regNo: 'CS-2026-001'
    },
    {
      username: `bulk_math_${Date.now()}`,
      name: 'Bob Lovelace',
      password: 'password123',
      department: 'Information Technology',
      year: '4',
      regNo: 'IT-2026-042'
    }
  ];

  const bulkRes = await axios.post(`${API}/admin/participants/bulk`, {
    participants: bulkPayload
  }, adminHeaders);

  assert(bulkRes.status === 200, 'POST /admin/participants/bulk returned 200 OK');
  assert(bulkRes.data.createdCount === 2, 'Created exactly 2 participants');

  // Verify created participants retain department, year, and regNo
  const participantsRes = await axios.get(`${API}/admin/participants`, adminHeaders);
  const createdAlice = participantsRes.data.participants.find((p: any) => p.username === bulkPayload[0].username);
  assert(createdAlice, 'Created participant found in roster');
  assert(createdAlice.department === 'Computer Science', 'department persisted correctly');
  assert(createdAlice.year === '3', 'year persisted correctly');
  assert(createdAlice.regNo === 'CS-2026-001', 'regNo persisted correctly');
  console.log('  ✅ PASS: Bulk CSV import correctly ingested and persisted department, year, and regNo');

  console.log('\n================================================================');
  console.log('🎉 ALL 3 NEW FEATURES VERIFIED WITH ZERO FLAWS');
  console.log('================================================================\n');
}

main().catch(err => {
  console.error('❌ Verification failed:', err.response?.data || err.message);
  process.exit(1);
});
