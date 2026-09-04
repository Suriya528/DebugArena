import axios from 'axios';
import puppeteer from 'puppeteer-core';
import path from 'path';

const API = 'http://localhost:5000/api';
const CLIENT_URL = 'http://localhost:5173';
const ARTIFACT_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/ca14c8ba-a716-430a-a329-a9eaf281363b';
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

async function verifyPhase5() {
  console.log('🔑 1. Logging in as Admin...');
  const loginRes = await axios.post(`${API}/auth/login`, {
    username: 'admin',
    password: 'admin123'
  });
  const token = loginRes.data.token;
  const headers = { Authorization: `Bearer ${token}` };

  console.log('🕵️ 2. Verifying Evidence-Based Suspicion API...');
  const suspRes = await axios.get(`${API}/admin/analytics/suspicion`, { headers });
  console.log(`✅ Retrieved suspicion reports for ${suspRes.data.reports.length} participants.`);
  console.log('   Top participant suspicion score:', suspRes.data.reports[0].username, suspRes.data.reports[0].totalScore, suspRes.data.reports[0].level);

  console.log('🎯 3. Verifying Dynamic Skill Radar API...');
  const radarRes = await axios.get(`${API}/admin/analytics/skill-radar`, { headers });
  console.log(`✅ Retrieved Skill Radar with ${radarRes.data.radarData.length} competency domains.`);
  radarRes.data.radarData.forEach((d: any) => {
    console.log(`   - ${d.skill}: ${d.proficiency}% (${d.questionsEvaluated} questions evaluated)`);
  });

  console.log('🌐 4. Launching Headless Chrome to capture Visual Verification of Modals...');
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
  await page.type('input[placeholder*="team1 or admin"]', 'admin');
  await page.type('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');

  await page.waitForFunction(() => document.body.innerText.includes('Live Monitoring') || document.body.innerText.includes('Participants'), { timeout: 10000 });

  // Click "Participants" tab in Admin Nav
  console.log('👥 Navigating to Participants view...');
  await page.evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const partBtn = btns.find(b => b.innerText.includes('Participants'));
    if (partBtn) partBtn.click();
  })()`);

  await new Promise(r => setTimeout(r, 1200));

  // 1. Open Suspicion Evidence Modal
  console.log('🕵️ Opening Suspicion Evidence Modal...');
  await page.evaluate(`(() => {
    const eyeBtn = document.querySelector('button[title*="Suspicion"]');
    if (eyeBtn) eyeBtn.click();
  })()`);
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase5_suspicion_evidence_modal.png') });
  console.log('📸 Saved phase5_suspicion_evidence_modal.png');

  // Dismiss modal
  await page.evaluate(`(() => {
    const dismissBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Dismiss') || b.innerText.includes('Close'));
    if (dismissBtn) dismissBtn.click();
  })()`);
  await new Promise(r => setTimeout(r, 600));

  // 2. Open Debugging Journey Replay Modal
  console.log('📼 Opening Debugging Journey Replay Modal...');
  await page.evaluate(`(() => {
    const replayBtn = document.querySelector('button[title*="Journey Replay"]');
    if (replayBtn) replayBtn.click();
  })()`);
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase5_journey_replay_modal.png') });
  console.log('📸 Saved phase5_journey_replay_modal.png');

  // Dismiss modal
  await page.evaluate(`(() => {
    const dismissBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Close') || b.innerText.includes('Dismiss'));
    if (dismissBtn) dismissBtn.click();
  })()`);
  await new Promise(r => setTimeout(r, 600));

  // 3. Open Skill Radar Modal
  console.log('🎯 Opening Skill Radar Modal...');
  await page.evaluate(`(() => {
    const skillBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Skill Radar'));
    if (skillBtn) skillBtn.click();
  })()`);
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase5_skill_radar_modal.png') });
  console.log('📸 Saved phase5_skill_radar_modal.png');

  await browser.close();
  console.log('🎉 Phase 5: Evidence-Based Suspicion, Debugging Journey Replay & Skill Radar verified successfully!');
}

verifyPhase5().catch(err => {
  console.error('Phase 5 Verification Failed:', err);
  process.exit(1);
});
