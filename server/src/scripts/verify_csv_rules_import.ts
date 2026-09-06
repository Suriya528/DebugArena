import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import http from 'http';
import { adminEventRouter } from '../routes/adminEvent.js';
import { College } from '../models/College.js';
import { Event } from '../models/Event.js';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';

// Replica of the client CSV line parser & extractor for automated verification
function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function extractRulesFromCsv(content: string): string[] {
  const clean = content.replace(/^\uFEFF/, '').trim();
  if (!clean) return [];

  const rawLines = clean.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (rawLines.length === 0) return [];

  const firstLineCells = parseCsvLine(rawLines[0]);
  let ruleColIdx = 0;
  let startLine = 0;

  // Header detection
  const lowerHeader = firstLineCells.map(c => c.toLowerCase().trim());
  const exactMatch = lowerHeader.findIndex(h =>
    h === 'rule' || h === 'rules' || h === 'rule description' || h === 'description' || h === 'guideline' || h === 'guidelines'
  );

  if (exactMatch !== -1) {
    ruleColIdx = exactMatch;
    startLine = 1;
  } else if (lowerHeader.some(h => h.includes('rule') || h.includes('desc') || h.includes('guideline') || h.includes('instruction'))) {
    const match = lowerHeader.findIndex(h => h.includes('rule') || h.includes('desc') || h.includes('guideline') || h.includes('instruction'));
    ruleColIdx = match !== -1 ? match : 0;
    startLine = 1;
  } else if (firstLineCells.length > 1 && (/^(#|no\.?|id|s\.no\.?|sl\.?)$/i.test(firstLineCells[0]) || /^\d+$/.test(firstLineCells[0]))) {
    if (/^(#|no\.?|id|s\.no\.?|sl\.?)$/i.test(firstLineCells[0])) {
      startLine = 1;
    }
    ruleColIdx = 1;
  }

  const results: string[] = [];
  for (let i = startLine; i < rawLines.length; i++) {
    const cells = parseCsvLine(rawLines[i]);
    if (cells.length === 0) continue;

    let candidate = '';
    if (cells[ruleColIdx] !== undefined && cells[ruleColIdx].trim().length > 0) {
      candidate = cells[ruleColIdx];
    } else if (cells.length > 1 && /^\d+$/.test(cells[0])) {
      candidate = cells[1];
    } else {
      candidate = cells.reduce((longest, c) => (c.length > longest.length ? c : longest), '');
    }

    candidate = candidate.replace(/^["']|["']$/g, '').trim();
    candidate = candidate.replace(/^(\d+[\.\)]\s*|rule\s*\d+[:\.\-]?\s*|[-•*]\s*)/i, '').trim();

    if (candidate.length >= 3) {
      results.push(candidate);
    }
  }

  return results;
}

async function run() {
  console.log('🚀 Starting CSV Rules Extraction & Event Creation Verification...\n');

  // Test 1: Standard CSV with Header
  console.log('1. Testing extraction from standard CSV with "Rule" header...');
  const csv1 = `Rule
"Full-screen proctoring is strictly enforced throughout the competition."
"Zero negative marking on all debugging challenges."
"Tab switching and window minimization incur escalated security strikes."`;
  const rules1 = extractRulesFromCsv(csv1);
  if (rules1.length !== 3) throw new Error(`Expected 3 rules, got ${rules1.length}`);
  if (!rules1[0].includes('Full-screen proctoring')) throw new Error('First rule incorrect');
  console.log(`✔ Extracted ${rules1.length} rules correctly from single-column CSV.`);

  // Test 2: Multi-column CSV with ID, Rule, Severity
  console.log('\n2. Testing multi-column CSV with ID and Rule description...');
  const csv2 = `ID,Rule Description,Severity
1,"No external IDEs, secondary monitors, or browser tabs permitted.",High
2,"Camera and microphone must remain engaged during the round.",Critical
3,"Submissions evaluated against hidden test suites.",Medium`;
  const rules2 = extractRulesFromCsv(csv2);
  if (rules2.length !== 3) throw new Error(`Expected 3 rules, got ${rules2.length}`);
  if (!rules2[0].includes('No external IDEs')) throw new Error(`Unexpected extracted rule: ${rules2[0]}`);
  console.log(`✔ Extracted ${rules2.length} rules correctly from multi-column CSV.`);

  // Test 3: Unheaded raw rules list with numbering
  console.log('\n3. Testing unheaded CSV with numbered prefixes...');
  const csv3 = `1. Calculator and paper must be approved by proctor.
2. Zero tolerance for unauthorized collaboration.
3. Submissions must compile cleanly without warnings.`;
  const rules3 = extractRulesFromCsv(csv3);
  if (rules3.length !== 3) throw new Error(`Expected 3 rules, got ${rules3.length}`);
  if (rules3[0].startsWith('1.')) throw new Error('Prefix was not cleaned up');
  console.log(`✔ Extracted and sanitized ${rules3.length} numbered rules: "${rules3[0]}"`);

  // Test 4: End-to-End Event Creation with Extracted Rules
  console.log('\n4. Testing Event Creation API with extracted rules...');
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  const app = express();
  app.use(express.json());
  app.use('/api/admin/events', adminEventRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;

  const college = await College.create({
    name: 'Imperial College London',
    code: 'ICL',
    university: 'Imperial College London'
  });

  const adminToken = jwt.sign(
    { userId: new mongoose.Types.ObjectId().toString(), username: 'imperial_admin', role: 'admin', collegeId: college._id.toString() },
    ENV.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const combinedRules = Array.from(new Set([...rules1, ...rules2, ...rules3]));

  const createRes = await fetch(`${baseUrl}/api/admin/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      collegeId: college._id.toString(),
      name: 'Imperial Code Battle 2026',
      code: 'ICB26',
      description: 'Annual inter-department coding championship',
      rules: combinedRules,
      scoringConfig: {
        negativeMarking: false,
        violationLimit: 3
      },
      initialRounds: [
        {
          roundNumber: 1,
          title: 'Round 1: Rapid Debugging',
          type: 'debugging',
          durationMinutes: 30,
          questionCount: 3,
          totalMarks: 100,
          allowedLanguages: ['python', 'cpp', 'java'],
          advancementQuota: 10
        }
      ]
    })
  });

  const createData: any = await createRes.json();
  if (createRes.status !== 201) {
    throw new Error(`Event creation failed: ${JSON.stringify(createData)}`);
  }

  const savedEvent = await Event.findById(createData.event._id);
  if (!savedEvent) throw new Error('Event was not persisted');
  if (savedEvent.rules.length !== combinedRules.length) {
    throw new Error(`Expected ${combinedRules.length} rules, but event has ${savedEvent.rules.length}`);
  }

  console.log(`✔ Event successfully created with ${savedEvent.rules.length} custom rules extracted from CSV!`);
  console.log('Sample saved rules:');
  savedEvent.rules.slice(0, 3).forEach((r, idx) => console.log(`   ${idx + 1}. ${r}`));

  await mongoose.disconnect();
  await mongod.stop();
  server.close();

  console.log('\n🎉 ALL CSV RULES EXTRACTION AND EVENT CREATION TESTS PASSED PERFECTLY!\n');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
