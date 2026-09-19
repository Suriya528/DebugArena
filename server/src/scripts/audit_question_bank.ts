import { connectDB, disconnectDB } from '../config/db.js';
import { QuestionTemplate } from '../models/QuestionTemplate.js';
import { Question } from '../models/Question.js';
import { DynamicRound } from '../models/DynamicRound.js';
import { Event } from '../models/Event.js';

const REQUIRED_LANGUAGES = ['c', 'cpp', 'python', 'java', 'javascript'];

const PLACEHOLDER_PATTERNS = [
  /\/\/\s*Solution\s+implementation/i,
  /\/\/\s*Write\s+your\s+code\s+here/i,
  /\/\/\s*Your\s+solution\s+here/i,
  /\/\/\s*TODO/i,
  /Implementation\s+goes\s+here/i,
  /Your\s+implementation/i
];

function isCodeEffectivelyEmpty(lang: string, code?: string): boolean {
  if (!code || typeof code !== 'string') return true;
  const trimmed = code.trim();
  if (!trimmed) return true;
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }
  // Check if it's just import/include + empty main / return 0 / pass
  const clean = trimmed
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*/g, '')
    .replace(/#include\s*<.*?>/g, '')
    .replace(/import\s+.*?;?/g, '')
    .replace(/using\s+namespace\s+std;/g, '')
    .replace(/public\s+class\s+\w+\s*\{/g, '')
    .replace(/int\s+main\s*\([^)]*\)\s*\{/g, '')
    .replace(/void\s+main\s*\([^)]*\)\s*\{/g, '')
    .replace(/public\s+static\s+void\s+main\s*\([^)]*\)\s*\{/g, '')
    .replace(/function\s+\w+\s*\([^)]*\)\s*\{/g, '')
    .replace(/def\s+\w+\s*\([^)]*\)\s*:/g, '')
    .replace(/return\s+0;?/g, '')
    .replace(/return;?/g, '')
    .replace(/pass/g, '')
    .replace(/[\s{};]/g, '');
  return clean.length === 0;
}

export async function auditQuestionBank() {
  console.log('🔍 Starting comprehensive database audit of Question Bank...');
  await connectDB();

  let allTemplates = await QuestionTemplate.find({});
  if (allTemplates.length === 0) {
    console.log('Central Question Bank is empty. Seeding defaults for audit...');
    const { seedDefaultQuestionTemplates } = await import('../services/defaultQuestions.js');
    await seedDefaultQuestionTemplates(true);
    allTemplates = await QuestionTemplate.find({});
  }
  const allLiveQuestions = await Question.find({});
  const allDynamicRounds = await DynamicRound.find({});
  const allEvents = await Event.find({});

  console.log(`\nFound ${allTemplates.length} QuestionTemplates in Master Question Bank.`);
  console.log(`Found ${allLiveQuestions.length} Question records across live tournaments/rounds.`);
  console.log(`Found ${allDynamicRounds.length} DynamicRound records.`);
  console.log(`Found ${allEvents.length} Events.`);

  const auditResults: Array<{
    source: 'Template' | 'Question';
    id: string;
    title: string;
    type: string;
    codingMode?: string;
    classification: 'COMPLETE' | 'PARTIALLY_COMPLETE' | 'INCOMPLETE' | 'INVALID' | 'NEEDS_REVIEW';
    issues: string[];
    missingLanguages: string[];
    placeholderLanguages: string[];
    sampleCount: number;
    hiddenCount: number;
  }> = [];

  // Audit QuestionTemplates
  for (const tmpl of allTemplates) {
    const issues: string[] = [];
    const missingLanguages: string[] = [];
    const placeholderLanguages: string[] = [];

    if (tmpl.type === 'debugging') {
      issues.push("Legacy questionType 'debugging' (must be 'coding' with codingMode: 'debug')");
    }

    if (tmpl.type === 'coding' || tmpl.type === 'debugging') {
      if (!tmpl.inputFormat || tmpl.inputFormat.trim().length < 5) {
        issues.push('Missing or incomplete inputFormat');
      }
      if (!tmpl.outputFormat || tmpl.outputFormat.trim().length < 5) {
        issues.push('Missing or incomplete outputFormat');
      }
      if (!tmpl.constraints || tmpl.constraints.trim().length < 5) {
        issues.push('Missing or incomplete constraints');
      }
      if (!tmpl.prompt || tmpl.prompt.trim().length < 20) {
        issues.push('Missing or too short prompt/problem statement');
      }

      const sampleTests = (tmpl.testCases || []).filter(tc => !tc.isHidden);
      const hiddenTests = (tmpl.testCases || []).filter(tc => tc.isHidden);

      if (sampleTests.length < 2) {
        issues.push(`Insufficient sample test cases: ${sampleTests.length} (minimum 2 required)`);
      }
      if (hiddenTests.length < 3) {
        issues.push(`Insufficient hidden test cases: ${hiddenTests.length} (minimum 3 required)`);
      }

      const starterCode = tmpl.starterCode instanceof Map ? Object.fromEntries(tmpl.starterCode) : (tmpl.starterCode || {});
      for (const lang of REQUIRED_LANGUAGES) {
        const code = starterCode[lang];
        if (!code) {
          missingLanguages.push(lang);
        } else if (isCodeEffectivelyEmpty(lang, code)) {
          placeholderLanguages.push(lang);
        }
      }

      if (missingLanguages.length > 0) {
        issues.push(`Missing starter code for languages: [${missingLanguages.join(', ')}]`);
      }
      if (placeholderLanguages.length > 0) {
        issues.push(`Placeholder / empty starter code for languages: [${placeholderLanguages.join(', ')}]`);
      }
    }

    let classification: 'COMPLETE' | 'PARTIALLY_COMPLETE' | 'INCOMPLETE' | 'INVALID' | 'NEEDS_REVIEW' = 'COMPLETE';
    if (tmpl.type === 'coding' || tmpl.type === 'debugging') {
      if (issues.length === 0) {
        classification = 'COMPLETE';
      } else if (missingLanguages.length === REQUIRED_LANGUAGES.length || !tmpl.prompt) {
        classification = 'INCOMPLETE';
      } else if (placeholderLanguages.length > 0 || missingLanguages.length > 0 || issues.some(i => i.includes('inputFormat') || i.includes('outputFormat'))) {
        classification = 'PARTIALLY_COMPLETE';
      } else if (issues.length > 0) {
        classification = 'PARTIALLY_COMPLETE';
      }
    }

    auditResults.push({
      source: 'Template',
      id: tmpl._id.toString(),
      title: tmpl.title,
      type: tmpl.type,
      codingMode: tmpl.codingMode,
      classification,
      issues,
      missingLanguages,
      placeholderLanguages,
      sampleCount: (tmpl.testCases || []).filter(tc => !tc.isHidden).length,
      hiddenCount: (tmpl.testCases || []).filter(tc => tc.isHidden).length
    });
  }

  // Summary statistics
  const codingTemplates = auditResults.filter(r => r.type === 'coding' || r.type === 'debugging');
  console.log('\n==============================================');
  console.log(`AUDIT SUMMARY: ${codingTemplates.length} CODING/DEBUGGING TEMPLATES`);
  console.log('==============================================');

  const counts = {
    COMPLETE: codingTemplates.filter(r => r.classification === 'COMPLETE').length,
    PARTIALLY_COMPLETE: codingTemplates.filter(r => r.classification === 'PARTIALLY_COMPLETE').length,
    INCOMPLETE: codingTemplates.filter(r => r.classification === 'INCOMPLETE').length,
    INVALID: codingTemplates.filter(r => r.classification === 'INVALID').length,
    NEEDS_REVIEW: codingTemplates.filter(r => r.classification === 'NEEDS_REVIEW').length,
  };

  console.log(`COMPLETE:           ${counts.COMPLETE}`);
  console.log(`PARTIALLY_COMPLETE: ${counts.PARTIALLY_COMPLETE}`);
  console.log(`INCOMPLETE:         ${counts.INCOMPLETE}`);
  console.log(`INVALID:            ${counts.INVALID}`);
  console.log(`NEEDS_REVIEW:       ${counts.NEEDS_REVIEW}`);

  console.log('\n--- DETAILED BREAKDOWN OF CODING/DEBUGGING TEMPLATES ---');
  for (const item of codingTemplates) {
    console.log(`\n[${item.classification}] "${item.title}" (ID: ${item.id})`);
    console.log(`  Type: ${item.type}, Mode: ${item.codingMode || 'standard'}, Samples: ${item.sampleCount}, Hidden: ${item.hiddenCount}`);
    if (item.issues.length > 0) {
      console.log('  Issues:');
      item.issues.forEach(issue => console.log(`    - ${issue}`));
    } else {
      console.log('  ✓ No issues detected (All 5 languages complete & runnable)');
    }
  }

  console.log('\n--- CHECKING ROUND ASSIGNMENTS ---');
  let typeMismatchErrors = 0;
  for (const dr of allDynamicRounds) {
    const roundQuestions = await QuestionTemplate.find({ _id: { $in: dr.selectedQuestionIds || [] } });
    for (const q of roundQuestions) {
      let match = false;
      if (dr.type === 'coding') {
        match = q.type === 'coding' || q.type === 'debugging';
      } else if (dr.type === 'mcq') {
        match = q.type === 'mcq' || q.type === 'aptitude';
      } else if (dr.type === 'sql') {
        match = q.type === 'sql';
      }
      if (!match) {
        console.error(`❌ Mismatch in Round ${dr.roundNumber} (${dr.type}): Question "${q.title}" is ${q.type}`);
        typeMismatchErrors++;
      }
    }
  }
  console.log(`Total round question type mismatch errors found: ${typeMismatchErrors}`);

  await disconnectDB();
  console.log('\nAudit complete.');
}

auditQuestionBank().catch(console.error);
