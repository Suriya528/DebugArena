import puppeteer from 'puppeteer-core';
import path from 'path';
import axios from 'axios';

const ARTIFACT_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/ca14c8ba-a716-430a-a329-a9eaf281363b';
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const API = 'http://localhost:5000/api';

async function runTest() {
  console.log('🔑 Logging in as Admin...');
  const adminRes = await axios.post(`${API}/auth/login`, { username: 'admin', password: 'admin123' });
  const adminToken = adminRes.data.token;

  console.log('🚀 Starting Round 1...');
  try {
    await axios.post(`${API}/admin/rounds/1/start`, {}, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
  } catch (e: any) {}

  const candidateUsername = 'proctor_team_' + Date.now().toString().slice(-4);
  console.log(`👤 Creating test candidate: ${candidateUsername}...`);
  await axios.post(`${API}/admin/participants`, {
    username: candidateUsername,
    name: 'Proctor Candidate',
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

  // 1. Visit Portal -> Shows Full-Screen Gate
  console.log('📸 Step 1: Visiting Portal without Fullscreen...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

  await page.waitForFunction(() => document.body.innerText.toLowerCase().includes('enter full-screen to sign in'), { timeout: 10000 });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '01_login_fullscreen_gate.png') });
  console.log('✅ Saved 01_login_fullscreen_gate.png');

  // 2. Enter Fullscreen -> Reveal Login Screen
  console.log('📸 Step 2: Clicking Enter Full-Screen & Entering Fullscreen...');
  await page.evaluate(`(() => {
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: function() { return document.documentElement; }
    });
    document.dispatchEvent(new Event('fullscreenchange'));
  })()`);
  await new Promise(r => setTimeout(r, 800));

  await page.waitForSelector('input[placeholder*="team1 or admin"]', { timeout: 10000 });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '02_login_form_fullscreen.png') });
  console.log('✅ Saved 02_login_form_fullscreen.png');

  // 3. Login as Candidate
  console.log('📸 Step 3: Authenticating Candidate...');
  await page.type('input[placeholder*="team1 or admin"]', candidateUsername);
  await page.type('input[type="password"]', 'debug123');
  await page.click('button[type="submit"]');

  await page.waitForFunction(() => document.body.innerText.includes('Begin Assessment'), { timeout: 10000 });
  await new Promise(r => setTimeout(r, 600));

  // 4. Click Begin Assessment -> View MCQ shell (No Scores!)
  console.log('📸 Step 4: Starting Assessment & Verifying NO Scores Displayed...');
  console.log('Body before click:', await page.evaluate(() => document.body.innerText.slice(0, 300)));
  const clicked = await page.evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const start = btns.find(b => b.innerText.includes('Begin Assessment'));
    if (start) {
      start.click();
      return true;
    }
    return false;
  })()`);
  console.log('Begin Assessment clicked?', clicked);
  await new Promise(r => setTimeout(r, 1500));
  console.log('Body after click:', await page.evaluate(() => document.body.innerText.slice(0, 300)));

  await page.waitForFunction(() => document.body.innerText.toLowerCase().includes('question palette'), { timeout: 10000 });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '03_active_test_no_scores.png') });
  console.log('✅ Saved 03_active_test_no_scores.png');

  // 5. Select Option & Submit Assessment
  console.log('📸 Step 5: Answering & Submitting Assessment...');
  await page.evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    // Click option B or second option
    const optBtn = btns.find(b => b.innerText.includes('[1] followed by [1, 2]') || b.innerText.includes('Option B'));
    if (optBtn) optBtn.click();
  })()`);

  await new Promise(r => setTimeout(r, 600));

  // Click Submit Assessment
  await page.evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const submitBtn = btns.find(b => b.innerText.toLowerCase().includes('submit assessment'));
    if (submitBtn) submitBtn.click();
  })()`);

  // Confirm submit in modal
  await page.waitForFunction(() => document.body.innerText.includes('Submit Round 1?'), { timeout: 10000 });
  await page.evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const confirmBtn = btns.find(b => b.innerText.includes('Confirm & Submit'));
    if (confirmBtn) confirmBtn.click();
  })()`);

  // 6. Verify "Submitted Successfully" Screen (No Scores!)
  console.log('📸 Step 6: Verifying "Submitted Successfully" Screen...');
  await page.waitForFunction(() => document.body.innerText.includes('Submitted Successfully'), { timeout: 10000 });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '04_submitted_successfully_no_scores.png') });
  console.log('✅ Saved 04_submitted_successfully_no_scores.png');

  // 7. Simulate Exiting Fullscreen -> Verify Lockout Shield takes over
  console.log('📸 Step 7: Exiting Fullscreen to verify lockout shield...');
  await page.evaluate(`(() => {
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: function() { return null; }
    });
    document.dispatchEvent(new Event('fullscreenchange'));
  })()`);

  await new Promise(r => setTimeout(r, 800));
  await page.waitForFunction(() => document.body.innerText.includes('Full-Screen Mode Exited'), { timeout: 10000 });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '05_lockout_shield.png') });
  console.log('✅ Saved 05_lockout_shield.png');

  await browser.close();
  console.log('🎉 All 5 verification steps passed with flying colors!');
}

runTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
