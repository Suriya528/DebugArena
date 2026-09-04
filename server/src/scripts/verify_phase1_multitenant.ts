import axios from 'axios';
import puppeteer from 'puppeteer-core';
import path from 'path';

const API = 'http://localhost:5000/api';
const ARTIFACT_DIR = 'C:/Users/Admin/.gemini/antigravity/brain/ca14c8ba-a716-430a-a329-a9eaf281363b';
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

async function verifyPhase1() {
  console.log('🔑 1. Logging in as Super Admin...');
  const loginRes = await axios.post(`${API}/auth/login`, {
    username: 'admin',
    password: 'admin123'
  });
  const token = loginRes.data.token;
  console.log('✅ Logged in as:', loginRes.data.user.username, 'Role:', loginRes.data.user.role);

  const authHeaders = { Authorization: `Bearer ${token}` };

  console.log('🏛️ 2. Fetching initial colleges...');
  const collegesRes = await axios.get(`${API}/admin/events/colleges`, { headers: authHeaders });
  console.log('✅ Found Colleges:', collegesRes.data.colleges.map((c: any) => `${c.name} (${c.code})`));

  console.log('📅 3. Fetching initial events...');
  const eventsRes = await axios.get(`${API}/admin/events`, { headers: authHeaders });
  console.log('✅ Found Events:', eventsRes.data.events.map((e: any) => `${e.name} (${e.code})`));

  console.log('➕ 4. Creating a new College...');
  const newCollegeRes = await axios.post(`${API}/admin/events/colleges`, {
    name: 'Stanford School of Engineering',
    code: 'STAN-ENG',
    primaryColor: '#8b5cf6',
    secondaryColor: '#ec4899',
    contactEmail: 'debug@stanford.edu'
  }, { headers: authHeaders });
  const newCollegeId = newCollegeRes.data.college._id;
  console.log('✅ Created College:', newCollegeRes.data.college.name);

  console.log('🚀 5. Creating a Dynamic Event for Stanford...');
  const newEventRes = await axios.post(`${API}/admin/events`, {
    collegeId: newCollegeId,
    name: 'Stanford Code Battle 2026',
    code: 'SCB26',
    description: 'Inter-departmental algorithmic debugging and SQL challenge.',
    rules: [
      'Proctored full-screen assessment.',
      'Strict zero-tolerance policy on tab switching.'
    ],
    scoringConfig: {
      negativeMarking: true,
      violationLimit: 2,
      autoSubmitOnTimeUp: true,
      autoSubmitOnViolation: true
    }
  }, { headers: authHeaders });
  const newEventId = newEventRes.data.event._id;
  console.log('✅ Created Dynamic Event:', newEventRes.data.event.name, 'with', newEventRes.data.rounds.length, 'default rounds');

  console.log('⚡ 6. Adding a Custom Dynamic Round (SQL & Bug Hunting)...');
  const newRoundRes = await axios.post(`${API}/admin/events/${newEventId}/rounds`, {
    title: 'Round 4: Advanced SQL & Concurrency Debugging',
    description: 'Fix deadlocks, slow queries, and race conditions.',
    type: 'sql',
    durationMinutes: 40,
    totalMarks: 150,
    passingMarks: 50
  }, { headers: authHeaders });
  console.log('✅ Added Dynamic Round:', newRoundRes.data.round.title, 'Type:', newRoundRes.data.round.type);

  console.log('🔒 7. Freezing the Event against accidental structural changes...');
  await axios.post(`${API}/admin/events/${newEventId}/freeze`, {}, { headers: authHeaders });
  console.log('✅ Event frozen successfully');

  console.log('🛡️ 8. Verifying Frozen Protection...');
  try {
    await axios.post(`${API}/admin/events/${newEventId}/rounds`, {
      title: 'Illegal Round',
      type: 'coding'
    }, { headers: authHeaders });
    throw new Error('Should have failed to add round to frozen event');
  } catch (err: any) {
    if (err.response?.status === 403) {
      console.log('✅ Frozen Guard verified: blocked modifications with 403 Forbidden');
    } else {
      throw err;
    }
  }

  console.log('📜 9. Verifying Immutable Audit Logs...');
  const logsRes = await axios.get(`${API}/admin/events/${newEventId}/audit-logs`, { headers: authHeaders });
  console.log('✅ Recorded Audit Events:', logsRes.data.logs.map((l: any) => `[${l.action}] by @${l.adminUsername}`));

  console.log('🌐 10. Launching Headless Chrome to capture visual verification...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Go to client portal and log in as admin
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

  await page.waitForFunction(() => document.body.innerText.includes('Event Builder & Tenancy'), { timeout: 10000 });
  console.log('✅ Admin is inside Admin Dashboard');

  // Click on Event Builder & Tenancy tab
  await page.evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const evBtn = btns.find(b => b.innerText.includes('Event Builder & Tenancy'));
    if (evBtn) evBtn.click();
  })()`);

  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase1_admin_event_builder.png') });
  console.log('📸 Saved phase1_admin_event_builder.png');

  // Click on "Create Event" button to open modal
  await page.evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const createBtn = btns.find(b => b.innerText.includes('Create Event'));
    if (createBtn) createBtn.click();
  })()`);

  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase1_dynamic_event_builder_modal.png') });
  console.log('📸 Saved phase1_dynamic_event_builder_modal.png');

  await browser.close();
  console.log('🎉 Phase 1 Multi-Tenant & Dynamic Event/Round Builder verified successfully!');
}

verifyPhase1().catch(err => {
  console.error('Phase 1 Verification Failed:', err);
  process.exit(1);
});
