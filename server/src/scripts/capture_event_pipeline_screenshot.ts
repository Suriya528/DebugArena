import puppeteer from 'puppeteer-core';
import axios from 'axios';
import fs from 'fs';

async function capture() {
  const artifactDir = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\ca14c8ba-a716-430a-a329-a9eaf281363b';

  console.log('Logging in as Admin via API...');
  const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
    username: 'admin',
    password: 'admin123'
  });
  const { token, user: adminUser } = loginRes.data;

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,960']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960 });

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok, usr) => {
    localStorage.setItem('debugarena_token', tok);
    localStorage.setItem('debugarena_user', JSON.stringify(usr));
  }, token, adminUser);

  // Navigate to admin events view
  console.log('Navigating to Admin Portal...');
  await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));

  // Click on "Events" or "Event Manager" tab if not already active
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const eventBtn = buttons.find(b => b.textContent?.includes('Events') || b.textContent?.includes('Event'));
    if (eventBtn) (eventBtn as HTMLElement).click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Capture Event Manager Pipeline overview
  await page.screenshot({ path: `${artifactDir}\\admin_event_pipeline_cards_view.png`, fullPage: false });
  console.log(`Saved screenshot: admin_event_pipeline_cards_view.png`);

  // Open "New Event" or "Create Event" modal
  console.log('Opening Dynamic Event Builder Modal...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const createBtn = buttons.find(b => b.textContent?.includes('New Event') || b.textContent?.includes('Create Event') || b.textContent?.includes('Build Event'));
    if (createBtn) (createBtn as HTMLElement).click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Expand round 2 to show permitted languages chips
  await page.evaluate(() => {
    const roundCards = Array.from(document.querySelectorAll('div')).filter(el => el.textContent?.includes('Round 2: Core Bug Hunting'));
    // Click the round 2 header to expand it
    const r2Header = roundCards.find(el => el.classList.contains('cursor-pointer') && el.textContent?.includes('Round 2'));
    if (r2Header) {
      (r2Header as HTMLElement).click();
    }
  });
  await new Promise(r => setTimeout(r, 600));

  // Scroll the modal container down so Round 2 is fully visible
  await page.evaluate(() => {
    const modalScroll = document.querySelector('.overflow-y-auto');
    if (modalScroll) {
      modalScroll.scrollTop = 320;
    }
  });
  await new Promise(r => setTimeout(r, 600));

  // Capture Dynamic Event & Round Pipeline Builder Modal
  await page.screenshot({ path: `${artifactDir}\\admin_event_pipeline_builder_modal.png`, fullPage: false });
  console.log(`Saved screenshot: admin_event_pipeline_builder_modal.png`);

  await browser.close();
  console.log('Screenshot capture complete!');
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
