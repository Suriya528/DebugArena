import puppeteer from 'puppeteer-core';

async function capture() {
  const artifactDir = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\ca14c8ba-a716-430a-a329-a9eaf281363b';

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,960']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960 });

  // 1. Visit Landing Page as public unauthenticated visitor
  console.log('Navigating to Landing Page...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  await page.screenshot({ path: `${artifactDir}\\landing_page_hero_view.png`, fullPage: false });
  console.log('Saved screenshot: landing_page_hero_view.png');

  // 2. Open Admin Portal Modal
  console.log('Opening Admin Portal Modal...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const adminBtn = buttons.find(b => b.textContent?.includes('Admin Portal') || b.textContent?.includes('Organizer Sign-In'));
    if (adminBtn) (adminBtn as HTMLElement).click();
  });
  await new Promise(r => setTimeout(r, 800));

  await page.screenshot({ path: `${artifactDir}\\landing_page_admin_modal.png`, fullPage: false });
  console.log('Saved screenshot: landing_page_admin_modal.png');

  // Close Admin Modal
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const closeBtn = document.querySelector('button[class*="absolute top-5 right-5"]');
    if (closeBtn) (closeBtn as HTMLElement).click();
  });
  await new Promise(r => setTimeout(r, 600));

  // 3. Open Join Event Modal
  console.log('Opening Join Event Modal...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const joinBtn = buttons.find(b => b.textContent?.includes('Join Event') || b.textContent?.includes('Enter with Event Code'));
    if (joinBtn) (joinBtn as HTMLElement).click();
  });
  await new Promise(r => setTimeout(r, 800));

  await page.screenshot({ path: `${artifactDir}\\landing_page_join_modal.png`, fullPage: false });
  console.log('Saved screenshot: landing_page_join_modal.png');

  await browser.close();
  console.log('All screenshots captured successfully!');
}

capture().catch(err => {
  console.error('Screenshot capture error:', err);
  process.exit(1);
});
