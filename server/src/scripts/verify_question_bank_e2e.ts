import http from 'http';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { connectDB, disconnectDB } from '../config/db.js';
import { College } from '../models/College.js';
import { Event } from '../models/Event.js';
import { DynamicRound } from '../models/DynamicRound.js';
import { QuestionTemplate } from '../models/QuestionTemplate.js';
import { User } from '../models/User.js';
import { adminQuestionBankRouter } from '../routes/adminQuestionBank.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { ENV } from '../config/env.js';

const PORT = 5099;
const API = `http://localhost:${PORT}/api`;

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    throw new Error(msg);
  } else {
    console.log(`  ✅ ${msg}`);
  }
}

async function runVerification() {
  console.log('🏛️ ========================================================');
  console.log('🏛️ QUESTION BANK REFLECTION & FULL CRUD E2E VERIFICATION');
  console.log('🏛️ ========================================================\n');

  await connectDB();
  console.log('📦 Connected to MongoDB');

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(tenantContext as any);
  app.use('/api/admin/questions/bank', adminQuestionBankRouter);

  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(PORT, () => resolve()));
  console.log(`🚀 Test Server running on port ${PORT}\n`);

  try {
    let college = await College.findOne({ code: 'QB-E2E-TEST' });
    if (!college) {
      college = await College.create({
        name: 'Question Bank E2E College',
        code: 'QB-E2E-TEST',
        primaryColor: '#6366f1'
      });
    }

    let adminUser = await User.findOne({ email: 'admin@qb.test' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Admin QB',
        username: 'admin_qb_test',
        email: 'admin@qb.test',
        passwordHash: 'dummy_hash',
        role: 'super_admin',
        collegeId: college._id
      });
    }

    const adminToken = jwt.sign(
      {
        userId: adminUser._id.toString(),
        username: adminUser.username,
        role: 'super_admin',
        collegeId: college._id.toString()
      },
      ENV.JWT_SECRET,
      { expiresIn: '2h' }
    );

    const client = axios.create({
      baseURL: API,
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // Initial baseline counts
    const initialBankRes = await client.get('/admin/questions/bank');
    const initialTotal = initialBankRes.data.grandTotal;
    const initialMcqCount = initialBankRes.data.countsByType?.mcq || 0;
    const initialCodingCount = initialBankRes.data.countsByType?.coding || 0;
    const initialSqlCount = initialBankRes.data.countsByType?.sql || 0;
    const initialDebuggingCount = initialBankRes.data.countsByType?.debugging || 0;
    console.log(`Baseline totals: Total=${initialTotal}, MCQ=${initialMcqCount}, Coding=${initialCodingCount}, SQL=${initialSqlCount}, Debugging=${initialDebuggingCount}\n`);

    // =========================================================================
    // TEST A: MCQ CREATION -> INSTANT REFLECTION -> EDIT -> DELETE
    // =========================================================================
    console.log('--- TEST A: MCQ Creation, Reflection & Search ---');

    const mcqPayload = {
      title: 'E2E Test MCQ: Off By One Array Loop',
      topic: 'Arrays',
      type: 'mcq',
      difficulty: 'easy',
      marks: 10,
      expectedSolveTimeMinutes: 5,
      skillTags: ['arrays', 'e2e_test'],
      prompt: 'What is the output when looping from 0 to array.length inclusive in Java?',
      explanation: 'IndexOutOfBoundsException occurs because index equals length.',
      options: [
        { text: 'Prints all elements correctly', isCorrect: false },
        { text: 'ArrayIndexOutOfBoundsException thrown', isCorrect: true },
        { text: 'Compilation error', isCorrect: false },
        { text: 'Infinite loop', isCorrect: false }
      ]
    };

    const createMcqRes = await client.post('/admin/questions/bank', mcqPayload);
    assert(createMcqRes.status === 201, 'POST /admin/questions/bank returned 201 Created');
    assert(Boolean(createMcqRes.data.template?._id), 'Response contains created template with valid _id');
    const mcqId = createMcqRes.data.template._id;

    // Verify MongoDB document
    const mcqInDb = await QuestionTemplate.findById(mcqId);
    assert(Boolean(mcqInDb), 'Question persisted in MongoDB QuestionTemplate collection');
    assert(mcqInDb?.title === mcqPayload.title, 'Title stored exactly in database');
    assert(mcqInDb?.options?.length === 4, 'All 4 MCQ options stored in database');
    assert(mcqInDb?.options?.[1]?.isCorrect === true, 'Correct option flag preserved');

    // Verify Question Bank API reflects new question immediately without manual refresh
    const getMcqBankRes = await client.get('/admin/questions/bank', {
      params: { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' }
    });
    assert(getMcqBankRes.status === 200, 'GET /admin/questions/bank returned 200 OK');
    assert(getMcqBankRes.data.questions[0]._id === mcqId, 'Newly created MCQ appears as FIRST item on page 1');
    assert(getMcqBankRes.data.grandTotal === initialTotal + 1, 'Total question count increased immediately by 1');
    assert(getMcqBankRes.data.countsByType.mcq === initialMcqCount + 1, 'MCQ type count increased immediately by 1');

    // Verify Search
    const searchRes = await client.get('/admin/questions/bank', {
      params: { search: 'Off By One Array Loop' }
    });
    assert(searchRes.data.questions.some((q: any) => q._id === mcqId), 'Search finds newly created question');

    // Verify Type Filter with exactType
    const filterMcqRes = await client.get('/admin/questions/bank', {
      params: { type: 'mcq', exactType: 'true' }
    });
    assert(filterMcqRes.data.questions.every((q: any) => q.type === 'mcq'), 'Type filter strictly returns MCQ questions');
    assert(filterMcqRes.data.questions.some((q: any) => q._id === mcqId), 'Newly created MCQ found under MCQ filter');

    // Edit MCQ
    const updateMcqRes = await client.put(`/admin/questions/bank/${mcqId}`, {
      ...mcqPayload,
      title: 'E2E Test MCQ: Off By One Array Loop (Updated)'
    });
    assert(updateMcqRes.status === 200, 'PUT /admin/questions/bank/:templateId returned 200 OK');

    const verifyUpdatedMcq = await client.get(`/admin/questions/bank/${mcqId}`);
    assert(verifyUpdatedMcq.data.template.title.includes('(Updated)'), 'Updated title immediately reflected in API');

    // Delete MCQ
    const deleteMcqRes = await client.delete(`/admin/questions/bank/${mcqId}`);
    assert(deleteMcqRes.status === 200, 'DELETE /admin/questions/bank/:templateId succeeded');
    const deletedCheck = await QuestionTemplate.findById(mcqId);
    assert(deletedCheck === null, 'MCQ removed from database');
    console.log('✅ TEST A PASSED\n');

    // =========================================================================
    // TEST B: CODING WITH ALL 5 LANGUAGES (C, C++, Python, Java, JavaScript)
    // =========================================================================
    console.log('--- TEST B: Coding Challenge with C, C++, Python, Java, JavaScript ---');

    const codingPayload = {
      title: 'E2E Coding: Two Sum Problem',
      topic: 'Arrays',
      type: 'coding',
      difficulty: 'medium',
      marks: 25,
      expectedSolveTimeMinutes: 10,
      skillTags: ['arrays', 'hash_table'],
      prompt: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
      inputFormat: 'N target\na1 a2 ... aN',
      outputFormat: 'i j',
      constraints: '2 <= N <= 10^4\n-10^9 <= nums[i] <= 10^9',
      timeLimitMs: 2000,
      memoryLimitMb: 256,
      allowedLanguages: ['c', 'cpp', 'python', 'java', 'javascript'],
      starterCode: {
        c: '// C Starter Code\n#include <stdio.h>\nint main() { return 0; }',
        cpp: '// C++ Starter Code\n#include <iostream>\nusing namespace std;\nint main() { return 0; }',
        python: '# Python Starter Code\nimport sys\ndef main(): pass',
        java: '// Java Starter Code\nimport java.util.*;\npublic class Solution { public static void main(String[] args) {} }',
        javascript: '// JavaScript Starter Code\nconst fs = require("fs");\nfunction main() {}'
      },
      testCases: [
        { input: '4 9\n2 7 11 15', output: '0 1', isHidden: false, weight: 10 },
        { input: '3 6\n3 2 4', output: '1 2', isHidden: true, weight: 15 }
      ]
    };

    const createCodingRes = await client.post('/admin/questions/bank', codingPayload);
    assert(createCodingRes.status === 201, 'POST coding challenge returned 201');
    const codingId = createCodingRes.data.template._id;

    // Verify all 5 languages stored independently in database
    const codingInDb = await QuestionTemplate.findById(codingId);
    assert(Boolean(codingInDb), 'Coding question stored in database');
    assert(codingInDb?.inputFormat === codingPayload.inputFormat, 'inputFormat persisted');
    assert(codingInDb?.outputFormat === codingPayload.outputFormat, 'outputFormat persisted');
    assert(codingInDb?.constraints === codingPayload.constraints, 'constraints persisted');
    assert(codingInDb?.timeLimitMs === 2000, 'timeLimitMs persisted');
    assert(codingInDb?.memoryLimitMb === 256, 'memoryLimitMb persisted');

    // Check language codes in DB
    const dbCodes = codingInDb?.starterCode instanceof Map
      ? Object.fromEntries(codingInDb.starterCode)
      : (codingInDb?.starterCode as any);
    assert(dbCodes.c.includes('// C Starter Code'), 'C starter code independently preserved');
    assert(dbCodes.cpp.includes('// C++ Starter Code'), 'C++ starter code independently preserved');
    assert(dbCodes.python.includes('# Python Starter Code'), 'Python starter code independently preserved');
    assert(dbCodes.java.includes('// Java Starter Code'), 'Java starter code independently preserved');
    assert(dbCodes.javascript.includes('// JavaScript Starter Code'), 'JavaScript starter code independently preserved');

    // Verify Coding count increment
    const getCodingBank = await client.get('/admin/questions/bank', {
      params: { type: 'coding', exactType: 'true' }
    });
    assert(getCodingBank.data.questions.every((q: any) => q.type === 'coding'), 'exactType strictly filters coding only');
    assert(getCodingBank.data.questions.some((q: any) => q._id === codingId), 'Created coding question immediately in list');

    // Clean up
    await client.delete(`/admin/questions/bank/${codingId}`);
    console.log('✅ TEST B PASSED\n');

    // =========================================================================
    // TEST C: SQL CHALLENGE
    // =========================================================================
    console.log('--- TEST C: SQL Challenge Creation & Reflection ---');

    const sqlPayload = {
      title: 'E2E SQL: High Earner Department Query',
      topic: 'SQL',
      type: 'sql',
      difficulty: 'medium',
      marks: 20,
      prompt: 'Find employees who have the highest salary in each of the departments.',
      allowedLanguages: ['sql'],
      starterCode: {
        sql: 'SELECT Department.name AS Department, Employee.name AS Employee, Salary FROM Employee;'
      },
      testCases: [
        { input: 'CREATE TABLE Employee (id INT, name VARCHAR(20), salary INT);', output: 'IT|Max|90000\nHR|Joe|85000', isHidden: false, weight: 20 }
      ]
    };

    const createSqlRes = await client.post('/admin/questions/bank', sqlPayload);
    assert(createSqlRes.status === 201, 'POST SQL challenge returned 201');
    const sqlId = createSqlRes.data.template._id;

    const sqlInDb = await QuestionTemplate.findById(sqlId);
    assert(Boolean(sqlInDb), 'SQL question in database');
    assert(sqlInDb?.type === 'sql', 'Type is sql');

    const getSqlBank = await client.get('/admin/questions/bank', {
      params: { type: 'sql', exactType: 'true' }
    });
    assert(getSqlBank.data.questions.some((q: any) => q._id === sqlId), 'SQL challenge immediately in bank list');

    await client.delete(`/admin/questions/bank/${sqlId}`);
    console.log('✅ TEST C PASSED\n');

    // =========================================================================
    // TEST D: DEBUGGING CHALLENGE
    // =========================================================================
    console.log('--- TEST D: Buggy Debugging Challenge Creation & Reflection ---');

    const debugPayload = {
      title: 'E2E Debugging: Fix Boundary Condition in Sliding Window',
      topic: 'Sliding Window',
      type: 'debugging',
      difficulty: 'hard',
      marks: 30,
      prompt: 'The provided sliding window algorithm subtracts an incorrect index when advancing the window.',
      inputFormat: 'N K\na1 ... aN',
      outputFormat: 'Max Sum',
      allowedLanguages: ['java', 'python', 'cpp', 'c', 'javascript'],
      starterCode: {
        java: '// Buggy Java Code: windowSum -= arr[i - k + 1];',
        python: '# Buggy Python Code: window_sum -= arr[i - k + 1]',
        cpp: '// Buggy C++ Code: window_sum -= arr[i - k + 1];',
        c: '// Buggy C Code: window_sum -= arr[i - k + 1];',
        javascript: '// Buggy JS Code: windowSum -= arr[i - k + 1];'
      },
      testCases: [
        { input: '5 3\n1 2 3 4 5', output: '12', isHidden: false, weight: 30 }
      ]
    };

    const createDebugRes = await client.post('/admin/questions/bank', debugPayload);
    assert(createDebugRes.status === 201, 'POST debugging challenge returned 201');
    const debugId = createDebugRes.data.template._id;

    const debugInDb = await QuestionTemplate.findById(debugId);
    assert(Boolean(debugInDb), 'Debugging challenge stored in DB');
    assert(debugInDb?.type === 'debugging', 'Type is debugging');

    const getDebugBank = await client.get('/admin/questions/bank', {
      params: { type: 'debugging', exactType: 'true' }
    });
    assert(getDebugBank.data.questions.some((q: any) => q._id === debugId), 'Debugging challenge immediately reflected');

    await client.delete(`/admin/questions/bank/${debugId}`);
    console.log('✅ TEST D PASSED\n');

    // =========================================================================
    // TEST E: USAGE FILTER (USED vs UNUSED)
    // =========================================================================
    console.log('--- TEST E: Usage Filter (Used in Tournaments vs Unused) ---');

    const usedFilterRes = await client.get('/admin/questions/bank', {
      params: { usage: 'used' }
    });
    assert(usedFilterRes.status === 200, 'GET with usage=used returned 200');
    // If any questions are used, they must have usedInEvents with length > 0
    if (usedFilterRes.data.questions.length > 0) {
      assert(
        usedFilterRes.data.questions.every((q: any) => q.usedInEvents && q.usedInEvents.length > 0),
        'All questions returned with usage=used are assigned to tournaments'
      );
    }

    const unusedFilterRes = await client.get('/admin/questions/bank', {
      params: { usage: 'unused' }
    });
    assert(unusedFilterRes.status === 200, 'GET with usage=unused returned 200');
    if (unusedFilterRes.data.questions.length > 0) {
      assert(
        unusedFilterRes.data.questions.every((q: any) => !q.usedInEvents || q.usedInEvents.length === 0),
        'All questions returned with usage=unused have zero tournament assignments'
      );
    }
    console.log('✅ TEST E PASSED\n');

    console.log('🎉 ========================================================');
    console.log('🎉 ALL QUESTION BANK END-TO-END TESTS PASSED SUCCESSFULLY!');
    console.log('🎉 ========================================================');
  } finally {
    server.close();
    await disconnectDB();
  }
}

runVerification().catch(err => {
  console.error('❌ E2E Verification failed:', err);
  process.exit(1);
});
