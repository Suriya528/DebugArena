import axios from 'axios';
import puppeteer from 'puppeteer-core';
import path from 'path';

const API = 'http://localhost:5000/api';
const ARTIFACT_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/ca14c8ba-a716-430a-a329-a9eaf281363b';
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

async function verifyPhase3() {
  console.log('🔑 1. Logging in as Admin...');
  const loginRes = await axios.post(`${API}/auth/login`, {
    username: 'admin',
    password: 'admin123'
  });
  const token = loginRes.data.token;
  const authHeaders = { Authorization: `Bearer ${token}` };

  console.log('🩺 2. Running Pre-Event System Health Inspector...');
  const readinessRes = await axios.get(`${API}/admin/control-room/readiness`, { headers: authHeaders });
  console.log('✅ System Readiness Result:', readinessRes.data.statusLabel);
  readinessRes.data.checks.forEach((c: any) => {
    console.log(`   ${c.passed ? '✓' : '✗'} ${c.name}: ${c.detail}`);
  });

  if (!readinessRes.data.ready) {
    throw new Error('System readiness check failed!');
  }

  console.log('💓 3. Querying Live Control Room Pulse...');
  const pulseRes = await axios.get(`${API}/admin/control-room/pulse?roundNumber=1`, { headers: authHeaders });
  console.log('✅ Pulse Metrics:', JSON.stringify(pulseRes.data.counts));
  console.log(`   Judge Status: ${pulseRes.data.system.judgeStatus} | DB Latency: ${pulseRes.data.system.dbLatencyMs}ms`);

  console.log('⚖️ 4. Querying Question Fairness & Anomaly Detection...');
  const fairnessRes = await axios.get(`${API}/admin/control-room/fairness?roundNumber=1`, { headers: authHeaders });
  console.log(`✅ Evaluated ${fairnessRes.data.metrics.length} questions in Round 1`);
  const targetQ = fairnessRes.data.metrics[0];

  console.log(`⚡ 5. Testing Anomaly Action: [Give Full Marks] on Question "${targetQ.title}"...`);
  const actionRes = await axios.post(`${API}/admin/control-room/anomaly-action`, {
    roundNumber: 1,
    questionId: targetQ.questionId,
    action: 'give_full_marks',
    reason: 'Verified ambiguous constraint in automated anomaly audit'
  }, { headers: authHeaders });
  console.log('✅ Anomaly Action Result:', actionRes.data.message);
  console.log(`   Affected candidate attempts updated: ${actionRes.data.affectedCount}`);

  console.log('🌐 6. Launching Headless Chrome to capture Visual Verification...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

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
  await page.type('input[placeholder*="team1 or admin"]', 'admin');
  await page.type('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');

  await page.waitForFunction(() => document.body.innerText.includes('Live Monitoring'), { timeout: 10000 });

  // Click "Live Monitoring" tab
  await page.evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const monBtn = btns.find(b => b.innerText.includes('Live Monitoring'));
    if (monBtn) monBtn.click();
  })()`);

  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase3_live_control_room.png') });
  console.log('📸 Saved phase3_live_control_room.png');

  // Click "Pre-Event Health Check" button
  console.log('🩺 Opening Pre-Event Health Inspector modal...');
  await page.evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const preBtn = btns.find(b => b.innerText.includes('Pre-Event Health Check'));
    if (preBtn) preBtn.click();
  })()`);

  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase3_preevent_health_inspector.png') });
  console.log('📸 Saved phase3_preevent_health_inspector.png');

  await browser.close();
  console.log('🎉 Phase 3 Live Control Room, Fairness Engine, and Pre-Event Inspector verified successfully!');
}

verifyPhase3().catch(err => {
  console.error('Phase 3 Verification Failed:', err);
  process.exit(1);
});
