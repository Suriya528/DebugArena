import puppeteer from 'puppeteer-core';
import axios from 'axios';

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

  // Navigate to admin portal
  console.log('Navigating to Admin Portal...');
  await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));

  // Click on "Events" tab
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const eventBtn = buttons.find(b => b.textContent?.includes('Events') || b.textContent?.includes('Event'));
    if (eventBtn) (eventBtn as HTMLElement).click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Capture Event Manager with Locked Institutional Badge
  await page.screenshot({ path: `${artifactDir}\\admin_event_tenant_concealment_view.png`, fullPage: false });
  console.log(`Saved screenshot: admin_event_tenant_concealment_view.png`);

  // Open "Create Event" modal
  console.log('Opening Event Builder Modal...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const createBtn = buttons.find(b => b.textContent?.includes('Create Event'));
    if (createBtn) (createBtn as HTMLElement).click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Capture Event Builder Modal showing Section 1 Verified Host Card
  await page.screenshot({ path: `${artifactDir}\\admin_event_builder_locked_host_modal.png`, fullPage: false });
  console.log(`Saved screenshot: admin_event_builder_locked_host_modal.png`);

  await browser.close();
  console.log('🎉 Screenshot capture complete!');
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
