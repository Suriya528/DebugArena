import crypto from 'crypto';
import fs from 'fs';
import * as xlsx from 'xlsx';
import mongoose from 'mongoose';
import { QuestionTemplate, IQuestionTemplate } from '../models/QuestionTemplate.js';
import { Question } from '../models/Question.js';
import { ImportAudit } from '../models/ImportAudit.js';
import { AuditLog } from '../models/AuditLog.js';

export interface RawParsedQuestion {
  rowIndex: number;
  title?: string;
  topic?: string;
  language?: string;
  type?: string;
  difficulty?: string;
  marks?: number | string;
  prompt?: string;
  explanation?: string;
  options?: any;
  correctOption?: any;
  allowedLanguages?: any;
  starterCode?: any;
  testCases?: any;
  [key: string]: any;
}

export interface NormalizedQuestion {
  title: string;
  topic: string;
  language: string;
  type: 'mcq' | 'debugging' | 'coding' | 'sql' | 'aptitude' | 'custom';
  difficulty: 'easy' | 'medium' | 'hard';
  expectedSolveTimeMinutes: number;
  marks: number;
  skillTags: string[];
  prompt: string;
  explanation: string;
  options?: { text: string; isCorrect: boolean }[];
  allowedLanguages: string[];
  starterCode: Record<string, string>;
  testCases: { input: string; output: string; isHidden: boolean; weight: number }[];
  fingerprint: string;
  status: 'draft' | 'validated' | 'published' | 'archived';
}

export interface ValidationErrorItem {
  rowIndex: number;
  title?: string;
  field: string;
  error: string;
  rawValue?: any;
}

export interface ImportPreviewResult {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  validQuestions: NormalizedQuestion[];
  invalidRows: ValidationErrorItem[];
  duplicates: { rowIndex: number; title: string; fingerprint: string; existingId?: string }[];
  warnings: string[];
}

/**
 * Safely removes a temporary file from disk if it exists.
 */
export function safeDeleteFile(filePath?: string): void {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.warn(`[ImportEngine] Warning: Could not delete temp file at ${filePath}:`, err);
  }
}

/**
 * Generates a deterministic SHA-256 fingerprint for deduplication.
 */
export function computeFingerprint(type: string, title: string, prompt: string): string {
  const normType = (type || '').trim().toLowerCase();
  const normTitle = (title || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const normPrompt = (prompt || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return crypto.createHash('sha256').update(`${normType}|${normTitle}|${normPrompt}`).digest('hex');
}

/**
 * Parses raw file content from disk or buffer into an array of generic row objects.
 * Guarantees physical file cleanup on disk.
 */
export function parseRawFile(filePath?: string, originalName?: string, buffer?: Buffer): RawParsedQuestion[] {
  let rawData: Buffer | null = buffer || null;

  try {
    if (!rawData && filePath && fs.existsSync(filePath)) {
      rawData = fs.readFileSync(filePath);
    }

    if (!rawData || rawData.length === 0) {
      throw new Error('Uploaded file is empty or cannot be read.');
    }

    const fileName = (originalName || filePath || '').toLowerCase();

    if (fileName.endsWith('.json')) {
      const parsed = JSON.parse(rawData.toString('utf-8'));
      if (Array.isArray(parsed)) {
        return parsed.map((item, index) => ({ ...item, rowIndex: index + 1 }));
      } else if (parsed && Array.isArray(parsed.questions)) {
        return parsed.questions.map((item: any, index: number) => ({ ...item, rowIndex: index + 1 }));
      }
      throw new Error('JSON file must contain an array of questions or an object with a "questions" array.');
    }

    // Handle CSV or Excel (XLSX / XLS)
    const workbook = xlsx.read(rawData, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('No worksheets found in spreadsheet.');
    }
    const worksheet = workbook.Sheets[firstSheetName];
    const rows = xlsx.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    return rows.map((row, index) => {
      // Normalize object keys to lowercase trimmed strings
      const normalizedRow: Record<string, any> = { rowIndex: index + 2 }; // Excel row number (1-based header is row 1)
      for (const [key, value] of Object.entries(row)) {
        const cleanKey = key.trim().toLowerCase().replace(/[\s_-]+/g, '_');
        normalizedRow[cleanKey] = value;
      }
      return normalizedRow as RawParsedQuestion;
    });
  } finally {
    // Guaranteed deletion of uploaded source file
    if (filePath) {
      safeDeleteFile(filePath);
    }
  }
}

/**
 * Validates and normalizes a single question row.
 */
export function validateAndNormalizeRow(
  row: RawParsedQuestion,
  defaultType: 'mcq' | 'coding' | 'debugging' = 'mcq'
): { question?: NormalizedQuestion; errors: ValidationErrorItem[] } {
  const errors: ValidationErrorItem[] = [];
  const rowIndex = row.rowIndex || 0;

  const rawTitle = (row.title || row.question_title || row.name || '').toString().trim();
  const rawPrompt = (row.prompt || row.question || row.description || row.problem_statement || '').toString().trim();
  const rawTopic = (row.topic || row.category || 'General').toString().trim();
  const rawLanguage = (row.language || 'java').toString().trim().toLowerCase();
  
  let rawTypeStr = (row.type || defaultType || 'mcq').toString().trim().toLowerCase();
  if (rawTypeStr === 'code' || rawTypeStr === 'program') rawTypeStr = 'coding';
  if (rawTypeStr === 'debug') rawTypeStr = 'debugging';

  const validTypes = ['mcq', 'debugging', 'coding', 'sql', 'aptitude', 'custom'];
  const questionType = validTypes.includes(rawTypeStr) ? (rawTypeStr as NormalizedQuestion['type']) : defaultType;

  let difficultyStr = (row.difficulty || 'medium').toString().trim().toLowerCase();
  if (!['easy', 'medium', 'hard'].includes(difficultyStr)) {
    difficultyStr = 'medium';
  }
  const difficulty = difficultyStr as 'easy' | 'medium' | 'hard';

  const rawMarks = Number(row.marks || row.score || row.points || (questionType === 'mcq' ? 10 : 20));
  const marks = isNaN(rawMarks) || rawMarks <= 0 ? (questionType === 'mcq' ? 10 : 20) : rawMarks;

  const rawTime = Number(row.expected_solve_time_minutes || row.solve_time || (questionType === 'mcq' ? 5 : 15));
  const expectedSolveTimeMinutes = isNaN(rawTime) || rawTime <= 0 ? 15 : rawTime;

  const explanation = (row.explanation || row.solution_explanation || '').toString().trim();

  // Tags
  let skillTags: string[] = [];
  if (row.skill_tags || row.tags) {
    const rawTags = row.skill_tags || row.tags;
    if (Array.isArray(rawTags)) {
      skillTags = rawTags.map(t => String(t).trim()).filter(Boolean);
    } else if (typeof rawTags === 'string') {
      skillTags = rawTags.split(/[,;|]/).map(t => t.trim()).filter(Boolean);
    }
  }

  // Required Field Checks
  if (!rawTitle) {
    errors.push({ rowIndex, field: 'title', error: 'Question title is required.' });
  }
  if (!rawPrompt) {
    errors.push({ rowIndex, title: rawTitle, field: 'prompt', error: 'Question prompt/description is required.' });
  }

  // MCQ Normalization & Validation
  let options: { text: string; isCorrect: boolean }[] = [];
  if (questionType === 'mcq' || questionType === 'aptitude') {
    const optionCandidates: string[] = [];
    ['a', 'b', 'c', 'd', 'e', 'f'].forEach(letter => {
      const val = row[`option_${letter}`] || row[`option${letter}`] || row[`opt_${letter}`];
      if (val !== undefined && val !== null && String(val).trim()) {
        optionCandidates.push(String(val).trim());
      }
    });

    if (optionCandidates.length === 0) {
      ['1', '2', '3', '4', '5'].forEach(num => {
        const val = row[`option_${num}`] || row[`option${num}`] || row[`opt_${num}`];
        if (val !== undefined && val !== null && String(val).trim()) {
          optionCandidates.push(String(val).trim());
        }
      });
    }

    if (optionCandidates.length === 0 && row.options) {
      if (Array.isArray(row.options)) {
        for (const opt of row.options) {
          if (typeof opt === 'string') optionCandidates.push(opt.trim());
          else if (opt && typeof opt === 'object' && opt.text) optionCandidates.push(String(opt.text).trim());
        }
      } else if (typeof row.options === 'string') {
        const split = row.options.split('|').map((o: string) => o.trim()).filter(Boolean);
        optionCandidates.push(...split);
      }
    }

    if (optionCandidates.length < 2) {
      errors.push({
        rowIndex,
        title: rawTitle,
        field: 'options',
        error: 'MCQ questions must provide at least 2 distinct options (e.g. option_a, option_b).'
      });
    }

    // Determine correct option
    const rawCorrect = (
      row.correct_option ||
      row.correct_answer ||
      row.answer ||
      row.correct_option_index ||
      ''
    ).toString().trim();

    let correctIndex = -1;

    // Check letter match: A, B, C, D
    const letterMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5 };
    if (letterMap[rawCorrect.toLowerCase()] !== undefined) {
      correctIndex = letterMap[rawCorrect.toLowerCase()];
    } else {
      const numVal = parseInt(rawCorrect, 10);
      if (!isNaN(numVal)) {
        if (numVal >= 0 && numVal < optionCandidates.length) {
          correctIndex = numVal;
        } else if (numVal >= 1 && numVal <= optionCandidates.length) {
          correctIndex = numVal - 1;
        }
      } else if (rawCorrect) {
        correctIndex = optionCandidates.findIndex(
          o => o.toLowerCase() === rawCorrect.toLowerCase()
        );
      }
    }

    if (correctIndex < 0 || correctIndex >= optionCandidates.length) {
      errors.push({
        rowIndex,
        title: rawTitle,
        field: 'correctOption',
        error: `Correct option "${rawCorrect}" does not match any provided options. Must be A, B, C, D or valid option index.`,
        rawValue: rawCorrect
      });
    }

    options = optionCandidates.map((text, idx) => ({
      text,
      isCorrect: idx === correctIndex
    }));
  }

  // Coding & Debugging Normalization & Validation
  let starterCodeMap: Record<string, string> = {};
  let testCases: { input: string; output: string; isHidden: boolean; weight: number }[] = [];
  let allowedLanguages: string[] = ['java', 'python', 'cpp', 'javascript'];

  if (questionType === 'coding' || questionType === 'debugging' || questionType === 'sql') {
    if (row.allowed_languages) {
      if (Array.isArray(row.allowed_languages)) {
        allowedLanguages = row.allowed_languages.map(l => String(l).trim().toLowerCase());
      } else if (typeof row.allowed_languages === 'string') {
        allowedLanguages = row.allowed_languages
          .split(/[,;|]/)
          .map((l: string) => l.trim().toLowerCase())
          .filter(Boolean);
      }
    }

    if (row.starter_code) {
      if (typeof row.starter_code === 'object' && !Array.isArray(row.starter_code)) {
        starterCodeMap = row.starter_code;
      } else if (typeof row.starter_code === 'string') {
        try {
          starterCodeMap = JSON.parse(row.starter_code);
        } catch {
          starterCodeMap[rawLanguage || 'java'] = row.starter_code;
        }
      }
    }

    if (row.test_cases) {
      if (Array.isArray(row.test_cases)) {
        testCases = row.test_cases.map((tc: any) => ({
          input: String(tc.input ?? ''),
          output: String(tc.output ?? tc.expectedOutput ?? ''),
          isHidden: Boolean(tc.isHidden),
          weight: Number(tc.weight) || 10
        }));
      } else if (typeof row.test_cases === 'string') {
        try {
          const parsed = JSON.parse(row.test_cases);
          if (Array.isArray(parsed)) {
            testCases = parsed.map((tc: any) => ({
              input: String(tc.input ?? ''),
              output: String(tc.output ?? tc.expectedOutput ?? ''),
              isHidden: Boolean(tc.isHidden),
              weight: Number(tc.weight) || 10
            }));
          }
        } catch {
          // fallback
        }
      }
    }

    if (testCases.length === 0) {
      for (let i = 1; i <= 10; i++) {
        const inp = row[`testcase_${i}_input`] ?? row[`test_case_${i}_input`];
        const out = row[`testcase_${i}_output`] ?? row[`test_case_${i}_output`];
        const hidden = row[`testcase_${i}_hidden`] ?? row[`test_case_${i}_hidden`];
        const weight = row[`testcase_${i}_weight`] ?? row[`test_case_${i}_weight`];
        if (out !== undefined && out !== null && String(out).trim() !== '') {
          testCases.push({
            input: String(inp ?? ''),
            output: String(out).trim(),
            isHidden: hidden === true || String(hidden).toLowerCase() === 'true' || String(hidden) === '1',
            weight: Number(weight) || 10
          });
        }
      }
    }

    if (testCases.length === 0 && (row.input !== undefined || row.expected_output !== undefined || row.output !== undefined)) {
      testCases.push({
        input: String(row.input ?? ''),
        output: String(row.expected_output ?? row.output ?? '').trim(),
        isHidden: false,
        weight: 10
      });
    }

    if (testCases.length === 0) {
      errors.push({
        rowIndex,
        title: rawTitle,
        field: 'testCases',
        error: 'Coding and debugging questions must have at least 1 test case with expected output.'
      });
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  const fingerprint = computeFingerprint(questionType, rawTitle, rawPrompt);

  const normalized: NormalizedQuestion = {
    title: rawTitle,
    topic: rawTopic,
    language: rawLanguage,
    type: questionType,
    difficulty,
    expectedSolveTimeMinutes,
    marks,
    skillTags,
    prompt: rawPrompt,
    explanation,
    options: questionType === 'mcq' || questionType === 'aptitude' ? options : undefined,
    allowedLanguages,
    starterCode: starterCodeMap,
    testCases,
    fingerprint,
    status: 'published'
  };

  return { question: normalized, errors: [] };
}

/**
 * Runs the full preview pipeline on raw parsed rows:
 * - Validates each row
 * - Checks for duplicates against database and within upload batch
 */
export async function previewImport(
  rawRows: RawParsedQuestion[],
  defaultType: 'mcq' | 'coding' | 'debugging' = 'mcq'
): Promise<ImportPreviewResult> {
  const validQuestions: NormalizedQuestion[] = [];
  const invalidRows: ValidationErrorItem[] = [];
  const duplicates: { rowIndex: number; title: string; fingerprint: string; existingId?: string }[] = [];
  const warnings: string[] = [];

  const seenFingerprintsInBatch = new Set<string>();
  const fingerprintsToCheck: string[] = [];

  const prechecked: { rowIndex: number; question?: NormalizedQuestion; errors: ValidationErrorItem[] }[] = [];

  for (const row of rawRows) {
    const result = validateAndNormalizeRow(row, defaultType);
    prechecked.push({ rowIndex: row.rowIndex, ...result });

    if (result.question) {
      fingerprintsToCheck.push(result.question.fingerprint);
    } else {
      invalidRows.push(...result.errors);
    }
  }

  const existingTemplates = await QuestionTemplate.find(
    { fingerprint: { $in: fingerprintsToCheck } },
    { _id: 1, fingerprint: 1, title: 1 }
  ).lean();

  const existingMap = new Map<string, string>();
  for (const t of existingTemplates) {
    if (t.fingerprint) {
      existingMap.set(t.fingerprint, t._id.toString());
    }
  }

  for (const item of prechecked) {
    if (!item.question) continue;

    const fp = item.question.fingerprint;

    if (existingMap.has(fp)) {
      duplicates.push({
        rowIndex: item.rowIndex,
        title: item.question.title,
        fingerprint: fp,
        existingId: existingMap.get(fp)
      });
      warnings.push(`Row ${item.rowIndex} ("${item.question.title}") already exists in Question Bank.`);
      continue;
    }

    if (seenFingerprintsInBatch.has(fp)) {
      duplicates.push({
        rowIndex: item.rowIndex,
        title: item.question.title,
        fingerprint: fp
      });
      warnings.push(`Row ${item.rowIndex} ("${item.question.title}") is a duplicate within this upload batch.`);
      continue;
    }

    seenFingerprintsInBatch.add(fp);
    validQuestions.push(item.question);
  }

  return {
    totalRows: rawRows.length,
    validCount: validQuestions.length,
    invalidCount: invalidRows.length,
    duplicateCount: duplicates.length,
    validQuestions,
    invalidRows,
    duplicates,
    warnings
  };
}

/**
 * Commits approved questions into the database.
 * Creates an ImportAudit record and individual QuestionTemplates.
 */
export async function commitImport(params: {
  questions: NormalizedQuestion[];
  adminUserId: string;
  adminUsername: string;
  collegeId?: string;
  eventId?: string;
  roundNumber?: number;
  sourceFileName?: string;
  fileSizeBytes?: number;
}): Promise<{ insertedCount: number; auditId: string }> {
  const {
    questions,
    adminUserId,
    adminUsername,
    collegeId,
    eventId,
    roundNumber,
    sourceFileName = 'direct_upload',
    fileSizeBytes = 0
  } = params;

  if (questions.length === 0) {
    throw new Error('No valid questions to commit.');
  }

  let detectedFormat: 'csv' | 'xlsx' | 'json' = 'csv';
  const lowerName = sourceFileName.toLowerCase();
  if (lowerName.endsWith('.json')) detectedFormat = 'json';
  else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) detectedFormat = 'xlsx';

  const audit = await ImportAudit.create({
    importId: `imp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    eventId: eventId ? new mongoose.Types.ObjectId(eventId) : undefined,
    adminId: new mongoose.Types.ObjectId(adminUserId),
    adminUsername,
    filename: sourceFileName,
    format: detectedFormat,
    type: 'questions',
    totalCount: questions.length,
    validCount: questions.length,
    invalidCount: 0,
    duplicateCount: 0,
    status: 'completed',
    errorSummary: [],
    sourceFileDeleted: true
  });

  const docs = questions.map(q => ({
    collegeId: collegeId || undefined,
    eventId: eventId || undefined,
    roundNumber: roundNumber || undefined,
    title: q.title,
    topic: q.topic,
    language: q.language,
    type: q.type,
    difficulty: q.difficulty,
    expectedSolveTimeMinutes: q.expectedSolveTimeMinutes,
    marks: q.marks,
    skillTags: q.skillTags,
    prompt: q.prompt,
    explanation: q.explanation,
    options: q.options,
    allowedLanguages: q.allowedLanguages,
    starterCode: q.starterCode,
    testCases: q.testCases,
    fingerprint: q.fingerprint,
    status: q.status || 'published',
    hasDnaMutation: false
  }));

  const inserted = await QuestionTemplate.insertMany(docs);

  if (eventId && roundNumber) {
    const roundDocs = questions.map((q, idx) => ({
      eventId,
      collegeId: collegeId || undefined,
      roundNumber,
      orderIndex: idx + 1,
      type: q.type === 'mcq' || q.type === 'aptitude' ? 'mcq' : 'coding',
      title: q.title,
      prompt: q.prompt,
      marks: q.marks,
      options: q.options?.map(o => o.text) || [],
      correctOptionIndex: q.options?.findIndex(o => o.isCorrect) ?? 0,
      explanation: q.explanation,
      allowedLanguages: q.allowedLanguages,
      starterCode: q.starterCode,
      testCases: q.testCases.map(tc => ({
        input: tc.input,
        expectedOutput: tc.output,
        isHidden: tc.isHidden,
        weight: tc.weight
      })),
      fingerprint: q.fingerprint,
      status: 'published'
    }));

    await Question.insertMany(roundDocs);
  }

  await AuditLog.create({
    adminId: adminUserId,
    adminUsername,
    action: 'QUESTION_BULK_IMPORTED',
    targetType: 'QuestionTemplate',
    targetId: audit._id.toString(),
    details: {
      count: inserted.length,
      sourceFileName,
      eventId,
      roundNumber
    }
  });

  return {
    insertedCount: inserted.length,
    auditId: audit._id.toString()
  };
}

/**
 * Generates downloadable templates in CSV, XLSX, or JSON formats.
 */
export function generateOfficialTemplate(
  type: 'mcq' | 'coding',
  format: 'csv' | 'xlsx' | 'json'
): { buffer: Buffer; mimeType: string; fileName: string } {
  if (type === 'mcq') {
    const sampleMcq = [
      {
        title: 'Python List Mutation Bug',
        topic: 'Python Basics',
        difficulty: 'easy',
        marks: 10,
        prompt: 'What is the output of `a = [1, 2]; b = a; b.append(3); print(len(a))` in Python?',
        option_a: '2',
        option_b: '3',
        option_c: 'TypeError',
        option_d: 'None',
        correct_option: 'B',
        explanation: 'Variables a and b reference the same underlying list object in memory, so appending to b mutates a.',
        tags: 'python,lists,memory'
      },
      {
        title: 'JavaScript Type Coercion Equality',
        topic: 'JavaScript Fundamentals',
        difficulty: 'medium',
        marks: 10,
        prompt: 'What does the expression `[] == ![]` evaluate to in JavaScript?',
        option_a: 'true',
        option_b: 'false',
        option_c: 'TypeError',
        option_d: 'undefined',
        correct_option: 'A',
        explanation: 'The negation ![] coerces to false, then [] == false coerces [] to empty string and 0, resulting in 0 == 0 which is true.',
        tags: 'javascript,coercion,tricky'
      }
    ];

    if (format === 'json') {
      const buffer = Buffer.from(JSON.stringify(sampleMcq, null, 2), 'utf-8');
      return { buffer, mimeType: 'application/json', fileName: 'debugarena_mcq_template.json' };
    }

    const ws = xlsx.utils.json_to_sheet(sampleMcq);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'MCQ_Questions');

    if (format === 'csv') {
      const csvStr = xlsx.utils.sheet_to_csv(ws);
      return { buffer: Buffer.from(csvStr, 'utf-8'), mimeType: 'text/csv', fileName: 'debugarena_mcq_template.csv' };
    }

    const wbBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return {
      buffer: wbBuffer,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileName: 'debugarena_mcq_template.xlsx'
    };
  } else {
    const sampleCoding = [
      {
        title: 'Fix Off-By-One Array Traversal',
        topic: 'Arrays & Loops',
        language: 'java',
        difficulty: 'medium',
        marks: 20,
        prompt: 'The function `findMax` fails on certain inputs due to an off-by-one index loop condition. Fix the loop bounds so all elements are checked.',
        allowed_languages: 'java,python,cpp,javascript',
        testcase_1_input: '5\\n10 20 50 40 30',
        testcase_1_output: '50',
        testcase_1_weight: 10,
        testcase_1_hidden: false,
        testcase_2_input: '1\\n99',
        testcase_2_output: '99',
        testcase_2_weight: 10,
        testcase_2_hidden: true,
        explanation: 'Ensure the loop condition is i < n or i <= n - 1 rather than i < n - 1.',
        tags: 'loops,arrays,debugging'
      }
    ];

    if (format === 'json') {
      const buffer = Buffer.from(JSON.stringify(sampleCoding, null, 2), 'utf-8');
      return { buffer, mimeType: 'application/json', fileName: 'debugarena_coding_template.json' };
    }

    const ws = xlsx.utils.json_to_sheet(sampleCoding);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Coding_Questions');

    if (format === 'csv') {
      const csvStr = xlsx.utils.sheet_to_csv(ws);
      return { buffer: Buffer.from(csvStr, 'utf-8'), mimeType: 'text/csv', fileName: 'debugarena_coding_template.csv' };
    }

    const wbBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return {
      buffer: wbBuffer,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileName: 'debugarena_coding_template.xlsx'
    };
  }
}
