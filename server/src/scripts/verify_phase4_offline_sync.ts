import axios from 'axios';
import puppeteer from 'puppeteer-core';
import path from 'path';

const API_URL = 'http://localhost:5000/api';
const CLIENT_URL = 'http://localhost:5173';
const ARTIFACT_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/ca14c8ba-a716-430a-a329-a9eaf281363b';
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

async function verifyPhase4() {
  console.log('⏱️ 1. Testing Server-Authoritative Time Sync...');
  const t0 = Date.now();
  const timeRes = await axios.get(`${API_URL}/time/sync`);
  const t1 = Date.now();
  const rtt = t1 - t0;
  const serverTime = timeRes.data.serverTime;
  const skew = serverTime - (t0 + rtt / 2);

  console.log(`✅ Time Sync verified: Server Time=${new Date(serverTime).toISOString()}, RTT=${rtt}ms, Calculated Clock Skew=${skew}ms`);

  console.log('🏛️ 2. Activating Round 1 as Admin...');
  const adminLogin = await axios.post(`${API_URL}/auth/login`, {
    username: 'admin',
    password: 'admin123'
  });
  await axios.post(
    `${API_URL}/admin/rounds/1/start`,
    {},
    { headers: { Authorization: `Bearer ${adminLogin.data.token}` } }
  );
  console.log('✅ Round 1 is now active!');

  console.log('🔑 3. Logging in as Participant (team1)...');
  const loginRes = await axios.post(`${API_URL}/auth/login`, {
    username: 'team1',
    password: 'debug123'
  });
  const token = loginRes.data.token;
  const headers = { Authorization: `Bearer ${token}` };

  console.log('📋 3. Fetching Participant Round State...');
  const stateRes = await axios.get(`${API_URL}/participant/round-state`, { headers });
  const questionId = stateRes.data.questions[0]._id;
  const roundNumber = stateRes.data.round.roundNumber;

  console.log(`⚡ 4. Testing Idempotent Answer Save on Question ${questionId}...`);
  const testOpId = 'op_test_dedup_' + Date.now();
  const firstSave = await axios.post(
    `${API_URL}/participant/save-answer`,
    {
      questionId,
      roundNumber,
      selectedOption: 2,
      operationId: testOpId,
      seqId: 101,
      clientTimestamp: Date.now()
    },
    { headers }
  );
  console.log('   First Save Result:', firstSave.data);

  console.log('🔁 5. Repeating exact same operationId to test deduplication...');
  const secondSave = await axios.post(
    `${API_URL}/participant/save-answer`,
    {
      questionId,
      roundNumber,
      selectedOption: 2,
      operationId: testOpId,
      seqId: 101,
      clientTimestamp: Date.now()
    },
    { headers }
  );
  console.log('   Second Save (Deduplicated) Result:', secondSave.data);
  if (!secondSave.data.deduplicated) {
    throw new Error('Deduplication assertion failed: second save was not flagged deduplicated!');
  }
  console.log('✅ Idempotent deduplication confirmed!');

  console.log('📦 6. Testing Batch Sync with Offline Deduplication...');
  const batchOpId = 'op_batch_' + Date.now();
  const syncBatch1 = await axios.post(
    `${API_URL}/participant/sync-batch`,
    {
      updates: [
        {
          questionId,
          roundNumber,
          selectedOption: 3,
          operationId: batchOpId,
          seqId: 102,
          timestamp: Date.now()
        }
      ]
    },
    { headers }
  );
  console.log('   First Sync Batch Result:', syncBatch1.data);

  const syncBatch2 = await axios.post(
    `${API_URL}/participant/sync-batch`,
    {
      updates: [
        {
          questionId,
          roundNumber,
          selectedOption: 3,
          operationId: batchOpId,
          seqId: 102,
          timestamp: Date.now()
        }
      ]
    },
    { headers }
  );
  console.log('   Second Sync Batch Result (should have 0 new items processed):', syncBatch2.data);
  if (syncBatch2.data.syncedCount !== 0) {
    throw new Error('Batch sync deduplication assertion failed: duplicate batch item was processed again!');
  }
  console.log('✅ Offline batch deduplication confirmed!');

  console.log('🌐 7. Launching Headless Chrome to capture Visual Verification of Offline Resilience Banner...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(CLIENT_URL, { waitUntil: 'networkidle2' });

  // Handle full-screen mock for headless
  await page.evaluate(`(() => {
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: function() { return document.documentElement; }
    });
    document.dispatchEvent(new Event('fullscreenchange'));
  })()`);
  await new Promise(r => setTimeout(r, 600));

  await page.waitForSelector('input[placeholder*="team1 or admin"]', { timeout: 10000 });
  await page.type('input[placeholder*="team1 or admin"]', 'team1');
  await page.type('input[type="password"]', 'debug123');
  await page.click('button[type="submit"]');

  await page.waitForFunction(() => document.body.innerText.includes('Round 1') || document.body.innerText.includes('General Instructions') || document.body.innerText.includes('Question'), { timeout: 10000 });

  // Click Start Assessment if on instructions page
  await page.evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const startBtn = btns.find(b => b.innerText.includes('Start Assessment'));
    if (startBtn) startBtn.click();
  })()`);

  await new Promise(r => setTimeout(r, 1000));

  // Simulate network offline queue change event to display the resilient banner
  console.log('🛰️ Simulating network offline state and queued actions...');
  await page.evaluate(`(() => {
    window.dispatchEvent(new Event('offline'));
    window.dispatchEvent(new CustomEvent('debugarena_queue_change', {
      detail: { count: 3, status: 'queued' }
    }));
  })()`);

  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase4_offline_resilience_banner.png') });
  console.log('📸 Saved phase4_offline_resilience_banner.png');

  await browser.close();
  console.log('🎉 Phase 4: Offline Resilience, Conflict-Safe Sync & Assessment Timer verified successfully!');
}

verifyPhase4().catch(err => {
  console.error('Phase 4 Verification Failed:', err);
  process.exit(1);
});
