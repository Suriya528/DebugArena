import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import axios from 'axios';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\ca14c8ba-a716-430a-a329-a9eaf281363b';
const REPO_SCREENSHOTS = 'C:\\Users\\Admin\\Desktop\\debugging\\docs\\screenshots';

async function captureScreenshots() {
  console.log('🚀 Obtaining Admin token via API...');
  const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
    username: 'admin',
    password: 'admin123'
  });
  const token = loginRes.data.token;
  console.log('✅ Admin token acquired');

  console.log('🚀 Launching Chrome for Optional Certificate Visual Verification...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Inject Token and Navigate
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.evaluate((t: string) => {
    localStorage.setItem('debugarena_token', t);
  }, token);

  console.log('🔄 Reloading page with authenticated session...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // 2. Navigate to Events tab
  console.log('🏛️ Navigating to Event Manager...');
  const navButtons = await page.$$('button');
  for (const b of navButtons) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text?.includes('Events')) {
      await b.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 2000));

  // Screenshot of Event Manager with Certs On / Off badges and Header Toggle
  const eventManagerPath = path.join(ARTIFACT_DIR, 'admin_event_manager_certs_status.png');
  await page.screenshot({ path: eventManagerPath, fullPage: false });
  fs.copyFileSync(eventManagerPath, path.join(REPO_SCREENSHOTS, 'admin_event_manager_certs_status.png'));
  console.log(`📸 Saved: ${eventManagerPath}`);

  // 3. Open Create Event Modal (EventBuilderModal)
  console.log('➕ Opening Create Event Modal...');
  const createBtns = await page.$$('button');
  for (const b of createBtns) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text?.includes('Create Event')) {
      await b.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1500));

  // Screenshot of Section 4 in OFF state (Default optional)
  const modalOffPath = path.join(ARTIFACT_DIR, 'admin_event_builder_cert_toggle_off.png');
  await page.screenshot({ path: modalOffPath, fullPage: false });
  fs.copyFileSync(modalOffPath, path.join(REPO_SCREENSHOTS, 'admin_event_builder_cert_toggle_off.png'));
  console.log(`📸 Saved: ${modalOffPath}`);

  // 4. Click the "Enable Certificates" Toggle Button inside modal
  console.log('🔘 Toggling Certificates ON in Modal...');
  const toggleBtns = await page.$$('button');
  for (const b of toggleBtns) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text?.includes('Enable Certificates')) {
      await b.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1000));

  // Screenshot of Section 4 in ON state (Expanded)
  const modalOnPath = path.join(ARTIFACT_DIR, 'admin_event_builder_cert_toggle_on.png');
  await page.screenshot({ path: modalOnPath, fullPage: false });
  fs.copyFileSync(modalOnPath, path.join(REPO_SCREENSHOTS, 'admin_event_builder_cert_toggle_on.png'));
  console.log(`📸 Saved: ${modalOnPath}`);

  // Close modal
  const closeBtns = await page.$$('button');
  for (const b of closeBtns) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text?.includes('Cancel')) {
      await b.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1000));

  // 5. Navigate to Leaderboard
  console.log('🏆 Navigating to Leaderboard...');
  const lbNavBtns = await page.$$('button');
  for (const b of lbNavBtns) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text?.includes('Leaderboard')) {
      await b.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 2000));

  // Screenshot of Leaderboard with Certificates Active
  const lbPath = path.join(ARTIFACT_DIR, 'admin_leaderboard_certificate_column_view.png');
  await page.screenshot({ path: lbPath, fullPage: false });
  fs.copyFileSync(lbPath, path.join(REPO_SCREENSHOTS, 'admin_leaderboard_certificate_column_view.png'));
  console.log(`📸 Saved: ${lbPath}`);

  await browser.close();
  console.log('✨ All Visual Verification Screenshots Captured Successfully!');
}

captureScreenshots().catch(err => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
