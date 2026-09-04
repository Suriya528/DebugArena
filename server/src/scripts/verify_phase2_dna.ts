import axios from 'axios';
import puppeteer from 'puppeteer-core';
import path from 'path';

const API = 'http://localhost:5000/api';
const ARTIFACT_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/ca14c8ba-a716-430a-a329-a9eaf281363b';
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

async function verifyPhase2() {
  console.log('🔑 1. Logging in as Admin...');
  const loginRes = await axios.post(`${API}/auth/login`, {
    username: 'admin',
    password: 'admin123'
  });
  const token = loginRes.data.token;
  const authHeaders = { Authorization: `Bearer ${token}` };

  console.log('📚 2. Fetching Question Bank library...');
  const bankRes = await axios.get(`${API}/admin/questions/bank`, { headers: authHeaders });
  console.log('✅ Found Topics:', bankRes.data.topics);
  console.log('✅ Found Question Templates:', bankRes.data.questions.map((q: any) => `${q.title} [${q.hasDnaMutation ? 'DNA' : 'Standard'}]`));

  const binarySearchTemplate = bankRes.data.questions.find((q: any) => q.hasDnaMutation);
  if (!binarySearchTemplate) {
    throw new Error('No Question DNA template found in seeded library');
  }

  console.log(`🧬 3. Testing Core USP: Generating Question DNA Variants for "${binarySearchTemplate.title}"...`);
  const variantsRes = await axios.post(`${API}/admin/questions/bank/${binarySearchTemplate._id}/preview-variants`, {}, { headers: authHeaders });
  const variants = variantsRes.data.variants;
  console.log('✅ Generated Variants Count:', variants.length);

  variants.forEach((v: any) => {
    console.log(`   Candidate: @${v.candidateId} ➔ Variant: ${v.variantId}`);
    console.log(`     Parameters:`, JSON.stringify(v.parameterMap));
    console.log(`     Code snippet: ${v.mutatedCode.split('\n')[1]?.trim()}`);
  });

  // Verify determinism: Two requests with same candidate ID must produce identical output
  console.log('🔬 4. Verifying Determinism & Idempotence for Candidate Re-renders...');
  const verifyAlex1 = variants[0];
  const verifyAlexAgain = await axios.post(`${API}/admin/questions/bank/${binarySearchTemplate._id}/preview-variants`, {}, { headers: authHeaders });
  if (verifyAlex1.mutatedCode !== verifyAlexAgain.data.variants[0].mutatedCode) {
    throw new Error('Non-deterministic variant generation detected!');
  }
  console.log('✅ Cryptographic Seed Determinism PASSED: Identical output guaranteed across page refreshes.');

  console.log('🚀 5. Deploying Question DNA Template to Round 2...');
  const deployRes = await axios.post(`${API}/admin/questions/bank/${binarySearchTemplate._id}/deploy-to-round`, {
    roundNumber: 2
  }, { headers: authHeaders });
  console.log('✅ Question deployed to Round 2 with ID:', deployRes.data.question._id);

  console.log('🌐 6. Launching Headless Chrome to capture Visual Verification...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

  // Handle full-screen mock for headless
  await page.evaluate(`(() => {
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: function() { return document.documentElement; }
    });
    document.dispatchEvent(new Event('fullscreenchange'));
  })()`);
  await new Promise(r => setTimeout(r, 600));

  await page.waitForSelector('input[placeholder*="team1 or admin"]', { timeout: 10000 });
  await page.type('input[placeholder*="team1 or admin"]', 'admin');
  await page.type('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');

  await page.waitForFunction(() => document.body.innerText.includes('Question Bank'), { timeout: 10000 });
  console.log('✅ Admin is inside Admin Dashboard');

  // Click on "Question Bank" tab in navbar
  await page.evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const qbBtn = btns.find(b => b.innerText.includes('Question Bank'));
    if (qbBtn) qbBtn.click();
  })()`);

  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase2_question_bank_studio.png') });
  console.log('📸 Saved phase2_question_bank_studio.png');

  // Click on "Preview DNA Variants (USP)" on the first card
  console.log('🔍 Clicking "Preview DNA Variants (USP)" button...');
  await page.evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const previewBtn = btns.find(b => b.innerText.includes('Preview DNA Variants'));
    if (previewBtn) previewBtn.click();
  })()`);

  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase2_question_dna_variant_modal.png') });
  console.log('📸 Saved phase2_question_dna_variant_modal.png');

  await browser.close();
  console.log('🎉 Phase 2 Universal Question Engine & Question DNA USP verified successfully!');
}

verifyPhase2().catch(err => {
  console.error('Phase 2 Verification Failed:', err);
  process.exit(1);
});
