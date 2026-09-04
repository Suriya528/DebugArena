import puppeteer from 'puppeteer-core';
import path from 'path';
import axios from 'axios';

const ARTIFACT_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/ca14c8ba-a716-430a-a329-a9eaf281363b';
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const API = 'http://localhost:5000/api';

async function runBrowserVerification() {
  console.log('🌐 Preparing fresh participant for test...');
  const adminRes = await axios.post(`${API}/auth/login`, { username: 'admin', password: 'admin123' });
  const adminToken = adminRes.data.token;

  try {
    await axios.post(`${API}/admin/participants`, {
      username: 'team_demo',
      name: 'Delta Coders',
      password: 'debug123'
    }, { headers: { Authorization: `Bearer ${adminToken}` } });
  } catch (e) {}

  console.log('🌐 Launching headless Chrome browser verification...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Visit Login Page
  console.log('📸 Step 1: Navigating to Login Page (http://localhost:5173)...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '01_login_page.png') });
  console.log('✅ Saved 01_login_page.png');

  // 2. Login as Admin
  console.log('📸 Step 2: Logging in as Admin...');
  await page.click('input[placeholder*="team1 or admin"]', { clickCount: 3 });
  await page.type('input[placeholder*="team1 or admin"]', 'admin');
  await page.click('input[type="password"]', { clickCount: 3 });
  await page.type('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForSelector('text=Live Assessment Event Feed', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '02_admin_live_monitor.png') });
  console.log('✅ Saved 02_admin_live_monitor.png');

  // Click on Competition & Rounds Tab
  console.log('📸 Step 3: Viewing Competition & Rounds...');
  const controlTab = await page.$('text=Competition & Rounds');
  if (controlTab) await controlTab.click();
  await page.waitForSelector('text=Tournament Control Center', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '03_admin_competition_control.png') });
  console.log('✅ Saved 03_admin_competition_control.png');

  // Click on Round Results & Advance Tab
  console.log('📸 Step 4: Viewing Round Results & Advancement...');
  const resultsTab = await page.$('text=Round Results & Advance');
  if (resultsTab) await resultsTab.click();
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '04_admin_round_results.png') });
  console.log('✅ Saved 04_admin_round_results.png');

  // Click on Question Bank Tab
  console.log('📸 Step 5: Viewing Question Bank...');
  const questionsTab = await page.$('text=Question Bank');
  if (questionsTab) await questionsTab.click();
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '05_admin_question_bank.png') });
  console.log('✅ Saved 05_admin_question_bank.png');

  // Click on Final Leaderboard Tab
  console.log('📸 Step 6: Viewing Final Leaderboard...');
  const lbTab = await page.$('text=Final Leaderboard');
  if (lbTab) await lbTab.click();
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '06_admin_leaderboard.png') });
  console.log('✅ Saved 06_admin_leaderboard.png');

  // 7. Clear localStorage and navigate fresh to Login Page
  console.log('📸 Step 7: Navigating clean to Login Page for Participant...');
  await page.evaluate(() => localStorage.clear());
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  await page.waitForSelector('text=Sign In to Assessment', { timeout: 10000 });

  // 8. Login as Participant (team_demo)
  console.log('📸 Step 8: Logging in as Participant (team_demo)...');
  await page.click('input[placeholder*="team1 or admin"]', { clickCount: 3 });
  await page.type('input[placeholder*="team1 or admin"]', 'team_demo');
  await page.click('input[type="password"]', { clickCount: 3 });
  await page.type('input[type="password"]', 'debug123');
  await page.click('button[type="submit"]');

  await page.waitForSelector('text=Assessment Briefing', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '07_participant_instructions.png') });
  console.log('✅ Saved 07_participant_instructions.png');

  // 9. Start Round 1 (Enter Assessment)
  console.log('📸 Step 9: Entering MCQ Assessment Shell...');
  const startBtn = await page.$('text=Enter Full-Screen & Begin Assessment');
  if (startBtn) await startBtn.click();
  await page.waitForSelector('text=Question Palette', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '08_participant_mcq_shell.png') });
  console.log('✅ Saved 08_participant_mcq_shell.png');

  // Select Option and Mark for Review
  console.log('📸 Step 10: Answering question & marking for review...');
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await (await btn.getProperty('innerText')).jsonValue();
    if (text.includes('[1] followed by [1, 2]')) {
      await btn.click();
      break;
    }
  }
  const markBtn = await page.$('text=Mark for Review');
  if (markBtn) await markBtn.click();
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '09_participant_mcq_answered.png') });
  console.log('✅ Saved 09_participant_mcq_answered.png');

  // 11. Clear localStorage and login as team1 to view Coding Shell
  console.log('📸 Step 11: Signing in as team1 to view Coding Shell...');
  await page.evaluate(() => localStorage.clear());
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  await page.waitForSelector('text=Sign In to Assessment', { timeout: 10000 });

  await page.click('input[placeholder*="team1 or admin"]', { clickCount: 3 });
  await page.type('input[placeholder*="team1 or admin"]', 'team1');
  await page.click('input[type="password"]', { clickCount: 3 });
  await page.type('input[type="password"]', 'debug123');
  await page.click('button[type="submit"]');

  await new Promise(r => setTimeout(r, 2000));
  const codingStartBtn = await page.$('text=Enter Full-Screen & Begin Assessment');
  if (codingStartBtn) {
    await codingStartBtn.click();
    await new Promise(r => setTimeout(r, 2000));
  }

  await page.screenshot({ path: path.join(ARTIFACT_DIR, '10_participant_coding_shell.png') });
  console.log('✅ Saved 10_participant_coding_shell.png');

  console.log('🎉 Browser verification completed successfully with 10 screenshots!');
  await browser.close();
}

runBrowserVerification().catch(err => {
  console.error('Browser verification failed:', err);
  process.exit(1);
});
