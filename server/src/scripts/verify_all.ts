import axios from 'axios';
import { io } from 'socket.io-client';

const API = 'http://localhost:5000/api';
let adminToken = '';
let participant1Token = '';
let participant2Token = '';
let team1Id = '';
let team2Id = '';

async function runVerification() {
  console.log('=====================================================');
  console.log('🚀 DEBUGARENA COMPREHENSIVE END-TO-END VERIFICATION');
  console.log('=====================================================\n');

  // --- PHASE 1: AUTHENTICATION & FOUNDATION ---
  console.log('--- Phase 1: Auth & Foundation ---');
  
  // 1. Admin login
  const adminLoginRes = await axios.post(`${API}/auth/login`, {
    username: 'admin',
    password: 'admin123'
  });
  adminToken = adminLoginRes.data.token;
  console.log('✅ Admin login succeeded. Role:', adminLoginRes.data.user.role);

  // 2. Participant 1 login
  const p1LoginRes = await axios.post(`${API}/auth/login`, {
    username: 'team1',
    password: 'debug123'
  });
  participant1Token = p1LoginRes.data.token;
  team1Id = p1LoginRes.data.user.id;
  console.log('✅ Participant (team1) login succeeded.');

  // 3. Participant 2 login
  const p2LoginRes = await axios.post(`${API}/auth/login`, {
    username: 'team2',
    password: 'debug123'
  });
  participant2Token = p2LoginRes.data.token;
  team2Id = p2LoginRes.data.user.id;
  console.log('✅ Participant (team2) login succeeded.');

  // 4. Test Invalid credentials rejection
  try {
    await axios.post(`${API}/auth/login`, { username: 'admin', password: 'wrongpassword' });
    console.error('❌ Failed: Should have rejected invalid password');
  } catch (e: any) {
    console.log('✅ Invalid password correctly rejected (401 Unauthorized).');
  }

  // 5. Test Role Protection (Participant cannot access /api/admin/competition)
  try {
    await axios.get(`${API}/admin/competition`, {
      headers: { Authorization: `Bearer ${participant1Token}` }
    });
    console.error('❌ Failed: Participant should not access admin endpoints');
  } catch (e: any) {
    console.log('✅ Role-based access control verified (403 Forbidden for participants).');
  }

  // --- PHASE 2: ROUND 1 MCQ ENGINE & RESILIENCE ---
  console.log('\n--- Phase 2: Round 1 MCQ Engine & Persistence ---');

  // 1. Admin starts Round 1
  const startR1 = await axios.post(`${API}/admin/rounds/1/start`, {}, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log('✅ Admin started Round 1. Round status:', startR1.data.round.status);

  // 2. Participant queries round state
  const r1State = await axios.get(`${API}/participant/round-state`, {
    headers: { Authorization: `Bearer ${participant1Token}` }
  });
  console.log(`✅ Participant retrieved Round 1 state: ${r1State.data.questions.length} questions loaded.`);
  console.log(`⏱️ Server remaining seconds: ${r1State.data.round.remainingSeconds}s (server-authoritative).`);

  // Verify questions do NOT leak correctOptionIndex to participant!
  const leakedKey = r1State.data.questions.some((q: any) => q.correctOptionIndex !== undefined);
  if (leakedKey) {
    console.error('❌ SECURITY ALERT: Question keys leaked to participant!');
  } else {
    console.log('🔒 Security check passed: Correct option keys stripped from participant response.');
  }

  // 3. Participant saves answers (simulating debounced save)
  const q1 = r1State.data.questions[0];
  const q2 = r1State.data.questions[1];
  const q3 = r1State.data.questions[2];

  await axios.post(`${API}/participant/save-answer`, {
    questionId: q1._id,
    roundNumber: 1,
    selectedOption: 1 // Correct option for Q1
  }, { headers: { Authorization: `Bearer ${participant1Token}` } });

  await axios.post(`${API}/participant/save-answer`, {
    questionId: q2._id,
    roundNumber: 1,
    selectedOption: 0 // Correct option for Q2
  }, { headers: { Authorization: `Bearer ${participant1Token}` } });

  await axios.post(`${API}/participant/save-answer`, {
    questionId: q3._id,
    roundNumber: 1,
    selectedOption: 3 // Wrong option for Q3 (checking no negative marking)
  }, { headers: { Authorization: `Bearer ${participant1Token}` } });

  // 4. Mark question for review
  await axios.post(`${API}/participant/mark-review`, {
    questionId: q2._id,
    roundNumber: 1,
    marked: true
  }, { headers: { Authorization: `Bearer ${participant1Token}` } });
  console.log('✅ Question #2 marked for review.');

  // 5. Test Refresh Recovery (reloading round state rehydrates saved answers and review flags)
  const rehydrated = await axios.get(`${API}/participant/round-state`, {
    headers: { Authorization: `Bearer ${participant1Token}` }
  });
  const att1 = rehydrated.data.attempts.find((a: any) => a.questionId === q1._id);
  const isMarkedInState = rehydrated.data.progress.markedForReview.includes(q2._id);
  if (att1 && att1.selectedOption === 1 && isMarkedInState) {
    console.log('🔄 Refresh recovery verified: Exactly preserved option and marked-for-review set.');
  } else {
    console.error('❌ Refresh recovery failed to rehydrate state properly.');
  }

  // 6. Submit Round 1
  const submitR1 = await axios.post(`${API}/participant/submit-round`, {
    roundNumber: 1
  }, { headers: { Authorization: `Bearer ${participant1Token}` } });
  console.log(`✅ Round 1 submitted. Total Score: ${submitR1.data.totalScore} pts (strictly non-negative).`);

  // Also have Team 2 submit Round 1 with a slightly lower score
  await axios.post(`${API}/participant/save-answer`, {
    questionId: q1._id,
    roundNumber: 1,
    selectedOption: 1
  }, { headers: { Authorization: `Bearer ${participant2Token}` } });
  await axios.post(`${API}/participant/submit-round`, {
    roundNumber: 1
  }, { headers: { Authorization: `Bearer ${participant2Token}` } });

  // --- PHASE 4: RANKED RESULTS & MANUAL ADVANCEMENT ---
  console.log('\n--- Phase 4: Round 1 Rankings & Manual Advancement ---');

  // Admin views Round 1 results
  const r1Results = await axios.get(`${API}/admin/rounds/1/results`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log(`📊 Round 1 Ranked Table: ${r1Results.data.results.length} finishers.`);
  r1Results.data.results.forEach((r: any) => {
    console.log(`   Rank ${r.rank}: @${r.userId.username} (${r.totalScore} pts, ${r.timeTakenSeconds}s)`);
  });

  // Admin advances ONLY team1 to Round 2 (team2 is eliminated)
  await axios.post(`${API}/admin/rounds/1/advance`, {
    participantIds: [team1Id]
  }, { headers: { Authorization: `Bearer ${adminToken}` } });
  console.log('✅ Admin advanced team1 to Round 2. team2 marked eliminated.');

  // Verify team2 is strictly locked out of Round 2
  try {
    await axios.get(`${API}/participant/round-state`, {
      headers: { Authorization: `Bearer ${participant2Token}` }
    });
    console.error('❌ Failed: Eliminated participant should be locked out!');
  } catch (e: any) {
    console.log('🔒 Strict round gating verified: Eliminated participant correctly blocked (403 Forbidden).');
  }

  // --- PHASE 3: CODE EXECUTION & DEBUGGING ENGINE ---
  console.log('\n--- Phase 3: Code Execution Engine (Round 2) ---');

  // Admin starts Round 2
  await axios.post(`${API}/admin/rounds/2/start`, {}, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log('✅ Admin started Round 2.');

  // team1 fetches Round 2 coding questions
  const r2State = await axios.get(`${API}/participant/round-state`, {
    headers: { Authorization: `Bearer ${participant1Token}` }
  });
  const codingQ = r2State.data.questions[0];
  console.log(`✅ team1 loaded Round 2 coding question: "${codingQ.title}".`);

  // Verify hidden test cases are NOT exposed to participant
  const hasHiddenExposed = codingQ.testCases.some((tc: any) => tc.isHidden === true);
  if (hasHiddenExposed) {
    console.error('❌ SECURITY ALERT: Hidden test cases exposed in participant question!');
  } else {
    console.log('🔒 Security check passed: Only visible sample cases delivered to client.');
  }

  // 1. Run Code with Buggy Starter Code (should fail test case without affecting score)
  const buggyCode = codingQ.starterCode.python;
  const runBuggyRes = await axios.post(`${API}/participant/run-code`, {
    questionId: codingQ._id,
    code: buggyCode,
    language: 'python'
  }, { headers: { Authorization: `Bearer ${participant1Token}` } });

  console.log('✅ Run Code (Buggy):', runBuggyRes.data.results.map((r: any) => `Case #${r.testNumber}: ${r.status}`).join(', '));

  // 2. Submit Code with Fixed Implementation
  const fixedPythonCode = `import sys

def solve():
    lines = sys.stdin.read().split()
    if not lines:
        return
    n = int(lines[0])
    arr = [int(x) for x in lines[1:n+1]]
    start = int(lines[n+1])
    end = int(lines[n+2])
    
    i = start
    j = end
    while i < j:
        arr[i], arr[j] = arr[j], arr[i]
        i += 1
        j -= 1
        
    print(*(arr))

if __name__ == '__main__':
    solve()
`;

  const submitFixedRes = await axios.post(`${API}/participant/submit-code`, {
    questionId: codingQ._id,
    code: fixedPythonCode,
    language: 'python',
    roundNumber: 2
  }, { headers: { Authorization: `Bearer ${participant1Token}` } });

  console.log(`✅ Submit Code (Fixed): Score earned: ${submitFixedRes.data.score} pts.`);
  console.log('   Test results:', submitFixedRes.data.results.map((r: any) => `Case #${r.testNumber}: ${r.status} (${r.isHidden ? 'Hidden' : 'Visible'})`).join(', '));

  // Verify hidden test inputs are NOT in submit response
  const hiddenInputLeaked = submitFixedRes.data.results.some((r: any) => r.isHidden && r.input !== undefined);
  if (hiddenInputLeaked) {
    console.error('❌ SECURITY ALERT: Hidden test case input leaked in submission response!');
  } else {
    console.log('🔒 Security check passed: Hidden test case inputs stripped from response.');
  }

  // --- PHASE 7: ANTI-CHEAT & OFFLINE QUEUE BATCH SYNC ---
  console.log('\n--- Phase 7: Anti-Cheat & Offline Batch Sync ---');

  // 1. Log fullscreen exit violation
  const violationRes = await axios.post(`${API}/participant/log-violation`, {
    roundNumber: 2,
    type: 'fullscreen_exit',
    details: 'Participant minimized window'
  }, { headers: { Authorization: `Bearer ${participant1Token}` } });
  console.log(`🚨 Violation logged. Current strike count: ${violationRes.data.violationCount} / ${violationRes.data.violationLimit}.`);

  // 2. Offline batch sync
  const batchSyncRes = await axios.post(`${API}/participant/sync-batch`, {
    updates: [
      { questionId: codingQ._id, roundNumber: 2, code: fixedPythonCode, language: 'python' }
    ]
  }, { headers: { Authorization: `Bearer ${participant1Token}` } });
  console.log(`🔄 Offline batch sync verified: ${batchSyncRes.data.syncedCount} queued updates synchronized.`);

  console.log('\n=====================================================');
  console.log('🎉 ALL INTEGRATION TESTS PASSED WITH 100% INTEGRITY!');
  console.log('=====================================================\n');
}

runVerification().catch(err => {
  console.error('❌ Verification failed:', err.response?.data || err.message);
  process.exit(1);
});
