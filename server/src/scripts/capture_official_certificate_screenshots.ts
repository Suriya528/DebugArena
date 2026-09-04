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

  // Issue a sample certificate via API to verify the backend issue route and get its certificateId
  console.log('Issuing certificate for participant via API...');
  const certRes = await axios.post(
    'http://localhost:5000/api/certificates/issue',
    {
      userId: adminUser.id,
      rank: 1,
      totalScore: 98,
      eventTitle: 'DebugX Championship 2026',
      collegeName: 'ABC Institute of Technology',
      primaryColor: '#b8860b',
      secondaryColor: '#d97706',
      signatoryName: 'Dr. A. Sakthivel',
      signatoryTitle: 'Chairman, Examination & Technical Board',
      identificationNo: 'UP00F20-894721'
    },
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  const issuedCertId = certRes.data.certificate?.certificateId || 'CERT-DEMO-2026';
  console.log(`Issued test certificate: ${issuedCertId}`);

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
  console.log('Navigating to Leaderboard...');
  await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));

  // Click on "Final Leaderboard" tab
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const lbBtn = buttons.find(b => b.textContent?.includes('Final Leaderboard') || b.textContent?.includes('Leaderboard'));
    if (lbBtn) (lbBtn as HTMLElement).click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Click on "Verify & Issue" button for the first participant row
  console.log('Opening Certificate Modal...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const issueBtn = buttons.find(b => b.textContent?.includes('Verify & Issue'));
    if (issueBtn) (issueBtn as HTMLElement).click();
  });
  await new Promise(r => setTimeout(r, 1200));

  // Capture Certificate Modal
  await page.screenshot({ path: `${artifactDir}\\admin_certificate_modal_official_standard.png`, fullPage: false });
  console.log(`Saved screenshot: admin_certificate_modal_official_standard.png`);

  // Navigate to Public Verification Page
  console.log(`Navigating to Public Verification page for ${issuedCertId}...`);
  await page.goto(`http://localhost:5173/verify-cert/${issuedCertId}`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  // Capture Public Verification Certificate View
  await page.screenshot({ path: `${artifactDir}\\public_certificate_verification_official_standard.png`, fullPage: false });
  console.log(`Saved screenshot: public_certificate_verification_official_standard.png`);

  await browser.close();
  console.log('🎉 Official Certificate Screenshots captured successfully!');
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
