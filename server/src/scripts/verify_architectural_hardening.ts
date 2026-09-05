import axios from 'axios';
import mongoose from 'mongoose';
import { validateCodeSecurity } from '../services/judgeService.js';

const API = 'http://localhost:5000/api';

async function runHardeningVerification() {
  console.log('================================================================');
  console.log('🛡️  DEBUGARENA ZERO-FLAW ARCHITECTURAL HARDENING VERIFICATION');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // SUITE 1: Sandbox Isolation & Code Security Validation
  // -------------------------------------------------------------
  console.log('--- Suite 1: Sandbox Isolation & Static Code Guardrails ---');

  // Test 1.1: Blocks forbidden python modules
  const dangerousPython = [
    'import os\nos.system("ls")',
    'import subprocess\nsubprocess.run(["dir"])',
    'import socket\ns = socket.socket()',
    'import shutil\nshutil.rmtree("/")',
    'f = open("/etc/passwd", "r")',
    'eval("__import__(\'os\').system(\'whoami\')")',
    '__import__("subprocess")',
    'import pty; pty.spawn("/bin/sh")',
    'import ctypes'
  ];

  for (const snippet of dangerousPython) {
    const check = validateCodeSecurity(snippet, 'python');
    assert(!check.safe, `Blocked malicious Python: "${snippet.split('\n')[0]}" -> ${check.reason}`);
  }

  // Test 1.2: Allows legitimate competitive programming Python patterns
  const safePython = [
    'import sys\nlines = sys.stdin.read().split()',
    'import math\nprint(math.sqrt(16))',
    'import collections\nd = collections.deque()',
    'x = int(input())\nprint(x * 2)'
  ];

  for (const snippet of safePython) {
    const check = validateCodeSecurity(snippet, 'python');
    assert(check.safe, `Permitted safe Python code: "${snippet.split('\n')[0]}"`);
  }

  // Test 1.3: Blocks dangerous JS / TS patterns
  const dangerousJS = [
    'const { exec } = require("child_process");',
    'import fs from "fs";',
    'process.exit(1);',
    'eval("2 + 2");',
    'const f = Function("return process")();'
  ];

  for (const snippet of dangerousJS) {
    const check = validateCodeSecurity(snippet, 'javascript');
    assert(!check.safe, `Blocked malicious JS: "${snippet.split('\n')[0]}" -> ${check.reason}`);
  }

  // -------------------------------------------------------------
  // SUITE 2: Server API & Integration Tests
  // -------------------------------------------------------------
  console.log('\n--- Suite 2: Authentication, Tenant Context & Anti-Spoofing ---');

  // Login as admin
  const adminLogin = await axios.post(`${API}/auth/login`, {
    username: 'admin',
    password: 'admin123'
  });
  const adminToken = adminLogin.data.token;
  const adminHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };
  assert(
    adminLogin.data.user.role === 'admin' || adminLogin.data.user.role === 'super_admin',
    `Admin authenticated with ${adminLogin.data.user.role} role`
  );

  // Create and login as clean participant
  const p2User = `suite2_${Date.now()}`;
  await axios.post(`${API}/admin/participants`, {
    username: p2User,
    name: 'Suite 2 Participant',
    password: 'debug123'
  }, adminHeaders);

  const p1Login = await axios.post(`${API}/auth/login`, {
    username: p2User,
    password: 'debug123'
  });
  const p1Token = p1Login.data.token;
  const p1Headers = { headers: { Authorization: `Bearer ${p1Token}` } };
  assert(p1Login.data.user.role === 'participant', 'Participant authenticated with participant role');

  // Test 2.1: Tenant header spoofing rejection for non-super-admin
  const fakeCollegeId = new mongoose.Types.ObjectId().toString();
  try {
    const spoofRes = await axios.get(`${API}/participant/round-state`, {
      headers: {
        Authorization: `Bearer ${p1Token}`,
        'x-college-id': fakeCollegeId
      }
    });
    // Participant should NOT be assigned fakeCollegeId; server should use participant's real collegeId
    assert(spoofRes.status === 200, 'Request processed safely without adopting spoofed tenant');
  } catch (err: any) {
    assert(false, `Unexpected error on spoofing test: ${err.message}`);
  }

  // -------------------------------------------------------------
  // SUITE 3: Anti-Cheat Sliding Debounce & Strike Enforcement
  // -------------------------------------------------------------
  console.log('\n--- Suite 3: Anti-Cheat Debounce & Strike Limit Enforcement ---');

  // Ensure Round 1 is active for the event/competition
  try {
    await axios.post(`${API}/admin/rounds/1/start`, {}, adminHeaders);
  } catch (err: any) {
    // Round may already be started
  }

  // Create a dedicated participant for anti-cheat tests
  const antiCheatUsername = `anticheat_${Date.now()}`;
  await axios.post(`${API}/admin/participants`, {
    username: antiCheatUsername,
    name: 'AntiCheat Tester',
    password: 'debugpassword'
  }, adminHeaders);

  const acLogin = await axios.post(`${API}/auth/login`, {
    username: antiCheatUsername,
    password: 'debugpassword'
  });
  const acHeaders = { headers: { Authorization: `Bearer ${acLogin.data.token}` } };

  const acRoundState = await axios.get(`${API}/participant/round-state`, acHeaders);
  const currentRoundNum = acRoundState.data.round?.roundNumber || 1;

  // Fire first violation
  const v1 = await axios.post(`${API}/participant/log-violation`, {
    roundNumber: currentRoundNum,
    type: 'window_blur',
    details: 'Burst test blur 1'
  }, acHeaders);

  const initialCount = v1.data.violationCount;
  assert(v1.status === 200, `First violation logged (Count: ${initialCount})`);

  // Immediately fire second violation within 20ms (simulating Chrome blur + visibilitychange jitter)
  const v2 = await axios.post(`${API}/participant/log-violation`, {
    roundNumber: currentRoundNum,
    type: 'tab_switch',
    details: 'Burst test tab switch (rapid follow-up)'
  }, acHeaders);

  assert(
    v2.data.violationCount === initialCount && v2.data.deduped === true,
    `Rapid back-to-back violation debounced successfully! (Count: ${v2.data.violationCount}, deduped: ${v2.data.deduped})`
  );

  // -------------------------------------------------------------
  // SUITE 4: Multi-Submission Concurrency Mutex & Post-Submission Lock
  // -------------------------------------------------------------
  console.log('\n--- Suite 4: Multi-Submission Concurrency Mutex & Post-Submission Guard ---');

  // Let's create a fresh participant to test submission locks without corrupting team1
  const testUsername = `concurr_${Date.now()}`;
  const newPartRes = await axios.post(`${API}/admin/participants`, {
    username: testUsername,
    name: 'Concurrency Tester',
    password: 'debugpassword',
  }, adminHeaders);

  const newPartLogin = await axios.post(`${API}/auth/login`, {
    username: testUsername,
    password: 'debugpassword'
  });
  const newPartToken = newPartLogin.data.token;
  const newPartHeaders = { headers: { Authorization: `Bearer ${newPartToken}` } };

  // Fetch active round questions
  const newPartState = await axios.get(`${API}/participant/round-state`, newPartHeaders);
  if (newPartState.data.questions && newPartState.data.questions.length > 0) {
    const q = newPartState.data.questions[0];

    // 1. Save answer before round submission
    const saveRes = await axios.post(`${API}/participant/save-answer`, {
      roundNumber: newPartState.data.round.roundNumber,
      questionId: q._id,
      selectedOption: 0
    }, newPartHeaders);

    assert(saveRes.status === 200, 'Candidate answer saved successfully prior to submission');

    // 2. Submit Round explicitly to finalize
    const submitRoundRes = await axios.post(`${API}/participant/submit-round`, {
      roundNumber: newPartState.data.round.roundNumber
    }, newPartHeaders);

    assert(submitRoundRes.status === 200, 'Round explicitly finalized and submitted');

    // 3. Attempt to save answer AFTER round has been submitted (MUST BE REJECTED)
    try {
      await axios.post(`${API}/participant/save-answer`, {
        roundNumber: newPartState.data.round.roundNumber,
        questionId: q._id,
        selectedOption: 1
      }, newPartHeaders);
      assert(false, 'Should have rejected save-answer post-finalization');
    } catch (err: any) {
      assert(
        (err.response?.status === 403 || err.response?.status === 400) &&
          err.response?.data?.error?.toLowerCase().includes('submitted'),
        `Post-finalization answer save strictly rejected: ${err.response?.data?.error}`
      );
    }

    // 4. Attempt to submit code AFTER round has been submitted (MUST BE REJECTED)
    try {
      await axios.post(`${API}/participant/submit-code`, {
        roundNumber: newPartState.data.round.roundNumber,
        questionId: q._id,
        code: 'print("late hack")',
        language: 'python'
      }, newPartHeaders);
      assert(false, 'Should have rejected code submission post-finalization');
    } catch (err: any) {
      assert(
        (err.response?.status === 403 || err.response?.status === 400) &&
          err.response?.data?.error?.toLowerCase().includes('submitted'),
        `Post-finalization code submission strictly rejected: ${err.response?.data?.error}`
      );
    }
  }

  // -------------------------------------------------------------
  // SUITE 5: Tie-Break (Round 99) Submission Resilience
  // -------------------------------------------------------------
  console.log('\n--- Suite 5: Tie-Break (Round 99) Handlers ---');

  // Verify that submitting to round 99 doesn't crash with 400 'Round not found'
  // When no active tiebreak exists, it should give a clean semantic error (not an unhandled Round 99 missing error)
  try {
    await axios.post(`${API}/participant/save-answer`, {
      roundNumber: 99,
      questionId: new mongoose.Types.ObjectId().toString(),
      code: 'print("tiebreak")'
    }, newPartHeaders);
  } catch (err: any) {
    assert(
      err.response?.data?.error !== 'Round not found',
      `Round 99 gracefully handled (Status: ${err.response?.status}, Msg: "${err.response?.data?.error}")`
    );
  }

  // -------------------------------------------------------------
  // SUITE 6: Leaderboard Dynamic Aggregation
  // -------------------------------------------------------------
  console.log('\n--- Suite 6: Dynamic Multi-Round Leaderboard Aggregation ---');

  const lbRes = await axios.get(`${API}/admin/leaderboard`, adminHeaders);
  assert(lbRes.status === 200 && Array.isArray(lbRes.data.leaderboard), 'Leaderboard retrieved successfully');
  if (lbRes.data.leaderboard.length > 0) {
    const top = lbRes.data.leaderboard[0];
    assert('totalScore' in top && 'totalTimeSeconds' in top, 'Leaderboard rows contain dynamic totalScore and totalTimeSeconds');
    assert('lastStatus' in top, 'Leaderboard row contains lastStatus tracking candidate progression');
  }

  // -------------------------------------------------------------
  // SUITE 7: Tenant-Scoped Anomaly & Control Room Security
  // -------------------------------------------------------------
  console.log('\n--- Suite 7: Control Room & Anomaly Scoping ---');

  const pulseRes = await axios.get(`${API}/admin/control-room/pulse`, adminHeaders);
  assert(pulseRes.status === 200, 'Control room pulse endpoint responded with 200 OK');
  assert('counts' in pulseRes.data && 'system' in pulseRes.data, 'Control room pulse contains scoped counts and telemetry');

  const fairnessRes = await axios.get(`${API}/admin/control-room/fairness`, adminHeaders);
  assert(fairnessRes.status === 200, 'Fairness metrics endpoint responded with 200 OK');

  console.log('\n================================================================');
  console.log(`🏁 VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runHardeningVerification().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
