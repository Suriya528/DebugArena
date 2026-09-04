import puppeteer from 'puppeteer-core';
import axios from 'axios';
import mongoose from 'mongoose';
import { Certificate } from '../models/Certificate.js';
import { ENV } from '../config/env.js';
import fs from 'fs';

function getRunningMongoUri(): string {
  try {
    const logPath = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\ca14c8ba-a716-430a-a329-a9eaf281363b\\.system_generated\\tasks\\task-1637.log';
    if (fs.existsSync(logPath)) {
      const content = fs.readFileSync(logPath, 'utf8');
      const matches = content.match(/Embedded MongoDB initialized at:\s*(mongodb:\/\/[^\s]+)/g);
      if (matches && matches.length > 0) {
        const lastMatch = matches[matches.length - 1];
        const uri = lastMatch.replace('Embedded MongoDB initialized at:', '').trim();
        return uri.endsWith('/') ? `${uri}debugarena` : `${uri}/debugarena`;
      }
    }
  } catch (e) {
    console.warn('Could not read task log:', e);
  }
  return process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/debugarena';
}

async function capture() {
  const artifactDir = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\ca14c8ba-a716-430a-a329-a9eaf281363b';
  await mongoose.connect(getRunningMongoUri(), { dbName: 'debugarena' });

  // Get a valid certificate
  const cert = await Certificate.findOne().sort({ createdAt: -1 });
  const certId = cert ? cert.certificateId : 'CERT-TEST-2026';

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  // 1. Capture Public Certificate Verification View
  console.log(`Navigating to public verification: http://localhost:5173/verify-cert/${certId}`);
  await page.goto(`http://localhost:5173/verify-cert/${certId}`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: `${artifactDir}\\public_certificate_verification_page.png`, fullPage: false });
  console.log(`Saved screenshot: public_certificate_verification_page.png`);

  // 2. Capture Admin Round Advancement Quota View
  console.log('Logging in as Admin via API...');
  const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
    username: 'admin',
    password: 'admin123'
  });
  const { token, user: adminUser } = loginRes.data;

  console.log('Navigating to Admin Portal with authenticated session...');
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok, usr) => {
    localStorage.setItem('debugarena_token', tok);
    localStorage.setItem('debugarena_user', JSON.stringify(usr));
  }, token, adminUser);

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  // Click on "Round Results" tab
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('Round Results')) {
      await btn.click();
      break;
    }
  }

  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: `${artifactDir}\\admin_round_advancement_quota_view.png`, fullPage: false });
  console.log(`Saved screenshot: admin_round_advancement_quota_view.png`);

  // 3. Capture Certificate Modal on Leaderboard
  console.log('Navigating to Final Leaderboard...');
  const allButtons = await page.$$('button');
  for (const btn of allButtons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('Final Leaderboard')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1500));

  // Find certificate button in the table
  const certBtns = await page.$$('button');
  for (const btn of certBtns) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && (text.includes('Verify & Issue') || text.includes('Certificate'))) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1500));

  await page.screenshot({ path: `${artifactDir}\\admin_certificate_modal_with_theme_switcher.png`, fullPage: false });
  console.log(`Saved screenshot: admin_certificate_modal_with_theme_switcher.png`);

  await browser.close();
  await mongoose.disconnect();
  console.log('Screenshots captured successfully!');
}

capture().catch(err => {
  console.error('Screenshot capture error:', err);
  process.exit(1);
});
