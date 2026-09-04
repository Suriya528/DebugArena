import puppeteer from 'puppeteer-core';
import path from 'path';
import axios from 'axios';

const ARTIFACT_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/ca14c8ba-a716-430a-a329-a9eaf281363b';
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const API = 'http://localhost:5000/api';

async function captureOAFlow() {
  console.log('🔑 Logging in as Admin...');
  const adminRes = await axios.post(`${API}/auth/login`, { username: 'admin', password: 'admin123' });
  const adminToken = adminRes.data.token;

  console.log('🚀 Ensuring Round 1 is active...');
  try {
    await axios.post(`${API}/admin/rounds/1/start`, {}, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
  } catch (e: any) {
    console.log('Round 1 start notice:', e.response?.data?.error || e.message);
  }

  const candidateUsername = 'oa_candidate_' + Date.now().toString().slice(-4);
  console.log(`👤 Creating test participant: ${candidateUsername}...`);
  await axios.post(`${API}/admin/participants`, {
    username: candidateUsername,
    name: 'Amazon OA Candidate',
    password: 'debug123'
  }, { headers: { Authorization: `Bearer ${adminToken}` } });

  console.log('🌐 Launching Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('📸 Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

  // Login as participant
  console.log('🔑 Logging in as candidate...');
  await page.waitForSelector('input[placeholder*="team1 or admin"]', { timeout: 10000 });
  await page.type('input[placeholder*="team1 or admin"]', candidateUsername);
  await page.type('input[type="password"]', 'debug123');
  await page.click('button[type="submit"]');

  // Wait for InstructionsView
  console.log('⏳ Waiting for Assessment Briefing...');
  await page.waitForFunction(() => document.body.innerText.includes('Assessment Briefing'), { timeout: 10000 });
  await new Promise(r => setTimeout(r, 800));

  // Click start assessment button
  console.log('🎯 Clicking "Enter Full-Screen & Begin Assessment"...');
  const clicked = await page.evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const startBtn = btns.find(b => b.innerText.includes('Enter Full-Screen'));
    if (startBtn) {
      startBtn.click();
      return true;
    }
    return false;
  })()`);
  console.log('Start button clicked?', clicked);

  await new Promise(r => setTimeout(r, 1200));

  // 1. Capture Active Proctored Assessment with Watermark and Lockdown UI
  console.log('📸 Capturing oa_active_proctored_test.png...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'oa_active_proctored_test.png') });
  console.log('✅ Saved oa_active_proctored_test.png');

  // 2. Candidate exits Full-screen (e.g. presses Escape or Alt+Tabs)
  console.log('🚨 Simulating candidate pressing Escape / exiting full screen...');
  await page.evaluate(`(async () => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      } else {
        Object.defineProperty(document, 'fullscreenElement', {
          configurable: true,
          get: function() { return null; }
        });
        document.dispatchEvent(new Event('fullscreenchange'));
      }
    } catch (e) {
      console.error(e);
    }
  })()`);

  await new Promise(r => setTimeout(r, 1200));

  // 3. Capture OA Fullscreen Lockout Shield
  console.log('📸 Capturing oa_fullscreen_lockout.png...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'oa_fullscreen_lockout.png') });
  console.log('✅ Saved oa_fullscreen_lockout.png');

  await browser.close();
  console.log('🎉 Successfully captured Amazon OA proctoring screenshots!');
}

captureOAFlow().catch(err => {
  console.error('Error in captureOAFlow:', err);
  process.exit(1);
});
