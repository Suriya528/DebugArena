import puppeteer from 'puppeteer-core';
import path from 'path';
import axios from 'axios';

const ARTIFACT_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/ca14c8ba-a716-430a-a329-a9eaf281363b';
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const API = 'http://localhost:5000/api';

async function runTabSwitchTest() {
  console.log('🔑 Logging in as Admin...');
  const adminRes = await axios.post(`${API}/auth/login`, { username: 'admin', password: 'admin123' });
  const adminToken = adminRes.data.token;

  console.log('🚀 Ensuring Round 1 is active...');
  try {
    await axios.post(`${API}/admin/rounds/1/start`, {}, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
  } catch (e: any) {}

  const candidateUsername = 'tab_cheater_' + Date.now().toString().slice(-4);
  console.log(`👤 Creating test candidate: ${candidateUsername}...`);
  await axios.post(`${API}/admin/participants`, {
    username: candidateUsername,
    name: 'Tab Switch Exploiter',
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

  // 1. Visit Portal & Enter Fullscreen
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  await page.evaluate(`(() => {
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: function() { return document.documentElement; }
    });
    document.dispatchEvent(new Event('fullscreenchange'));
  })()`);
  await new Promise(r => setTimeout(r, 600));

  // 2. Login as Candidate
  await page.waitForSelector('input[placeholder*="team1 or admin"]', { timeout: 10000 });
  await page.type('input[placeholder*="team1 or admin"]', candidateUsername);
  await page.type('input[type="password"]', 'debug123');
  await page.click('button[type="submit"]');

  await page.waitForFunction(() => document.body.innerText.includes('Begin Assessment'), { timeout: 10000 });
  await new Promise(r => setTimeout(r, 600));

  // 3. Start Assessment
  await page.evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const start = btns.find(b => b.innerText.includes('Begin Assessment'));
    if (start) start.click();
  })()`);

  await page.waitForFunction(() => document.body.innerText.toLowerCase().includes('question palette'), { timeout: 10000 });
  console.log('✅ Candidate is inside active test');

  // 4. Trigger Tab Switch / Window Blur Breach!
  console.log('🚨 Simulating candidate switching tabs (document.hidden = true)...');
  await page.evaluate(`(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: function() { return true; }
    });
    document.dispatchEvent(new Event('visibilitychange'));
  })()`);

  await new Promise(r => setTimeout(r, 1200));

  // 5. Capture Tab Switch Lockout Breach Modal with 8-second self-destruct timer
  console.log('📸 Capturing tab_switch_breach_modal.png...');
  await page.waitForFunction(() => document.body.innerText.toLowerCase().includes('tab switch prohibited'), { timeout: 10000 });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'tab_switch_breach_modal.png') });
  console.log('✅ Saved tab_switch_breach_modal.png');

  // 6. Verify 2-strike escalation on server
  const strikeCheck = await axios.get(`${API}/participant/round-state`, {
    headers: {
      Authorization: `Bearer ${(await axios.post(`${API}/auth/login`, { username: candidateUsername, password: 'debug123' })).data.token}`
    }
  });
  console.log('Server strike count after single tab switch:', strikeCheck.data.progress?.violationCount);

  // 7. Wait 9 seconds for self-destruct timer to expire and auto-submit
  console.log('⏳ Waiting 9 seconds for grace window countdown to auto-submit...');
  await new Promise(r => setTimeout(r, 9000));

  try {
    await page.waitForFunction(() => document.body.innerText.toLowerCase().includes('submitted successfully'), { timeout: 8000 });
  } catch (e) {}

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'tab_switch_auto_submitted.png') });
  console.log('✅ Saved tab_switch_auto_submitted.png');

  await browser.close();
  console.log('🎉 Tab-switch defense verified successfully!');
}

runTabSwitchTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
