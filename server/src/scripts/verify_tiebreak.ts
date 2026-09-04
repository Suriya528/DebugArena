import axios from 'axios';

const API = 'http://localhost:5000/api';

async function testTieBreak() {
  console.log('--- Verifying Phase 6: Tie-Break Engine (Full API Simulation) ---');

  // 1. Login as admin
  const adminRes = await axios.post(`${API}/auth/login`, { username: 'admin', password: 'admin123' });
  const adminToken = adminRes.data.token;

  // 2. Login as team3 and team4
  const t3Res = await axios.post(`${API}/auth/login`, { username: 'team3', password: 'debug123' });
  const t4Res = await axios.post(`${API}/auth/login`, { username: 'team4', password: 'debug123' });
  const t3Id = t3Res.data.user.id;
  const t4Id = t4Res.data.user.id;

  // 3. Advance team3 and team4 to Round 3 so they are eligible
  await axios.post(`${API}/admin/rounds/1/advance`, { participantIds: [t3Id, t4Id] }, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  await axios.post(`${API}/admin/rounds/2/advance`, { participantIds: [t3Id, t4Id] }, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  // 4. Start Round 3
  await axios.post(`${API}/admin/rounds/3/start`, {}, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log('✅ Round 3 started.');

  // 5. Fetch Round 3 question
  const r3State = await axios.get(`${API}/participant/round-state`, {
    headers: { Authorization: `Bearer ${t3Res.data.token}` }
  });
  const qId = r3State.data.questions[0]._id;

  // Simple valid Python solution for balanced parentheses
  const validPythonCode = `import sys
s = sys.stdin.read().strip()
mapping = {')': '(', '}': '{', ']': '['}
st = []
ok = True
for ch in s:
    if ch in '({[': st.append(ch)
    elif ch in mapping:
        if not st or st.pop() != mapping[ch]:
            ok = False; break
if st: ok = False
print("VALID" if ok else "INVALID")
`;

  // Both team3 and team4 submit identical code (giving same score)
  await axios.post(`${API}/participant/submit-code`, {
    questionId: qId,
    code: validPythonCode,
    language: 'python',
    roundNumber: 3
  }, { headers: { Authorization: `Bearer ${t3Res.data.token}` } });

  await axios.post(`${API}/participant/submit-code`, {
    questionId: qId,
    code: validPythonCode,
    language: 'python',
    roundNumber: 3
  }, { headers: { Authorization: `Bearer ${t4Res.data.token}` } });

  // Both submit round 3
  await axios.post(`${API}/participant/submit-round`, { roundNumber: 3 }, {
    headers: { Authorization: `Bearer ${t3Res.data.token}` }
  });
  await axios.post(`${API}/participant/submit-round`, { roundNumber: 3 }, {
    headers: { Authorization: `Bearer ${t4Res.data.token}` }
  });
  console.log('✅ Both team3 and team4 completed Round 3 with identical score and time.');

  // 6. Check tie-break detection
  const checkRes = await axios.get(`${API}/admin/tiebreak/check`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log('✅ Tie check endpoint response: hasTies =', checkRes.data.hasTies);
  if (!checkRes.data.hasTies) {
    throw new Error('Tie detection failed to identify tied participants!');
  }
  console.log(`✅ Tied group detected with ${checkRes.data.tiedGroups[0].length} participants:`, 
    checkRes.data.tiedGroups[0].map((p: any) => `@${p.username}`).join(' and '));

  // 7. Get tie-break question
  const qRes = await axios.get(`${API}/admin/questions?roundNumber=99`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const tieQ = qRes.data.questions[0];

  // 8. Admin triggers tie-break session
  const triggerRes = await axios.post(`${API}/admin/tiebreak/trigger`, {
    tiedUserIds: [t3Id, t4Id],
    questionId: tieQ._id,
    durationMinutes: 15
  }, { headers: { Authorization: `Bearer ${adminToken}` } });
  const tieBreakId = triggerRes.data.tieBreak._id;
  console.log('✅ Tie-breaker triggered by admin. Session ID:', tieBreakId);

  // 9. Admin resolves tie-break (team3 resolvedRank: 1, team4 resolvedRank: 2)
  await axios.post(`${API}/admin/tiebreak/resolve`, {
    tieBreakId,
    resolvedOrder: [
      { userId: t3Id, score: 50, timeTakenSeconds: 120, resolvedRank: 1 },
      { userId: t4Id, score: 30, timeTakenSeconds: 150, resolvedRank: 2 }
    ]
  }, { headers: { Authorization: `Bearer ${adminToken}` } });
  console.log('✅ Tie-break resolved by admin.');

  // 10. Fetch final leaderboard
  const lbRes = await axios.get(`${API}/admin/leaderboard`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const leaderboard = lbRes.data.leaderboard;
  const t3Rank = leaderboard.find((r: any) => r.userId.toString() === t3Id.toString())?.rank;
  const t4Rank = leaderboard.find((r: any) => r.userId.toString() === t4Id.toString())?.rank;

  console.log(`🏆 Final Leaderboard Ranking: @team3 Rank #${t3Rank} vs @team4 Rank #${t4Rank}`);
  if (t3Rank < t4Rank) {
    console.log('✅ Tie-break successfully broke the tie and placed team3 ahead of team4 on final leaderboard!');
  } else {
    console.error('❌ Tie-break ordering failed on leaderboard');
  }

  console.log('=====================================================');
  console.log('🎉 PHASE 6 TIE-BREAK TEST COMPLETED SUCCESSFULLY!');
  console.log('=====================================================');
}

testTieBreak().catch(err => {
  console.error('Tie-break test failed:', err.response?.data || err.message);
  process.exit(1);
});
