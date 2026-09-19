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
import { Question } from '../models/Question.js';
import { QuestionTemplate } from '../models/QuestionTemplate.js';
import { User } from '../models/User.js';
import { Attempt } from '../models/Attempt.js';
import { RoundProgress } from '../models/RoundProgress.js';
import { adminRouter } from '../routes/admin.js';
import { adminEventRouter } from '../routes/adminEvent.js';
import { adminQuestionBankRouter } from '../routes/adminQuestionBank.js';
import { participantRouter } from '../routes/participant.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { ENV } from '../config/env.js';
import {
  executeSingleTestCase,
  runTestCases,
  compareOutputs,
  normalizeOutput,
  validateCodeSecurity
} from '../services/judgeService.js';

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
  console.log('🏛️ =========================================================================');
  console.log('🏛️ CRITICAL ONLINE JUDGE / MULTI-LANGUAGE & SQL / DEBUGGING VALIDATION SUITE');
  console.log('🏛️ =========================================================================\n');

  await connectDB();
  console.log('📦 Connected to MongoDB');

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(tenantContext as any);
  app.use('/api/admin', adminRouter);
  app.use('/api/admin/events', adminEventRouter);
  app.use('/api/admin/questions/bank', adminQuestionBankRouter);
  app.use('/api/participant', participantRouter);

  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(PORT, () => resolve()));
  console.log(`🚀 Test Server running on port ${PORT}\n`);

  try {
    // -------------------------------------------------------------------------
    // PART 1: UNIT TEST THE JUDGE ENGINE ON ALL 4 LANGUAGES & ERROR STATES
    // -------------------------------------------------------------------------
    console.log('\n=============================================================');
    console.log('PART 1: CODING ENGINE — MULTI-LANGUAGE MATRIX & ERROR STATES');
    console.log('=============================================================');

    // 1.1 PYTHON TESTING
    console.log('\n--- 1.1 PYTHON (Python 3.14) ---');
    const pyCorrect = `import sys
lines = sys.stdin.read().split()
if lines:
    a, b = int(lines[0]), int(lines[1])
    print(a + b)
`;
    const pyWrong = `print(999)`;
    const pyCompileErr = `def solve(:\n    print(1)`;
    const pyRuntimeErr = `print(1 / 0)`;
    const pyTimeout = `while True:\n    pass`;

    const pyResCorrect = await executeSingleTestCase(pyCorrect, 'python', '15 25', 3000);
    assert(pyResCorrect.stdout === '40' && !pyResCorrect.runtimeError && !pyResCorrect.compileError, 'Python correct code produced expected output (40)');

    const pyResWrong = await executeSingleTestCase(pyWrong, 'python', '15 25', 3000);
    assert(pyResWrong.stdout === '999', 'Python wrong answer output captured (999)');

    const pyResCompileErr = await executeSingleTestCase(pyCompileErr, 'python', '15 25', 3000);
    assert(Boolean(pyResCompileErr.compileError), `Python syntax error detected as compileError (${pyResCompileErr.compileError?.split('\n')[0]})`);

    const pyResRuntimeErr = await executeSingleTestCase(pyRuntimeErr, 'python', '15 25', 3000);
    assert(Boolean(pyResRuntimeErr.runtimeError) && pyResRuntimeErr.runtimeError.includes('ZeroDivisionError'), 'Python division by zero detected as runtimeError');

    const pyResTimeout = await executeSingleTestCase(pyTimeout, 'python', '15 25', 1000);
    assert(pyResTimeout.timeout === true, 'Python infinite loop detected as timeout');

    // 1.2 JAVASCRIPT / NODE.JS TESTING
    console.log('\n--- 1.2 JAVASCRIPT (Node.js v24) ---');
    const jsCorrect = `const fs = require('fs');
const [a, b] = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/).map(Number);
console.log(a + b);
`;
    const jsWrong = `console.log(1234);`;
    const jsCompileErr = `function solve() { console.log( };`;
    const jsRuntimeErr = `const obj = null; console.log(obj.nonExistentProperty);`;
    const jsTimeout = `while(true) {}`;

    const jsResCorrect = await executeSingleTestCase(jsCorrect, 'javascript', '30 40', 3000);
    assert(jsResCorrect.stdout === '70' && !jsResCorrect.runtimeError && !jsResCorrect.compileError, 'JavaScript correct code produced expected output (70)');

    const jsResWrong = await executeSingleTestCase(jsWrong, 'javascript', '30 40', 3000);
    assert(jsResWrong.stdout === '1234', 'JavaScript wrong answer output captured (1234)');

    const jsResCompileErr = await executeSingleTestCase(jsCompileErr, 'javascript', '30 40', 3000);
    assert(Boolean(jsResCompileErr.compileError), 'JavaScript SyntaxError detected as compileError');

    const jsResRuntimeErr = await executeSingleTestCase(jsRuntimeErr, 'javascript', '30 40', 3000);
    assert(Boolean(jsResRuntimeErr.runtimeError) && jsResRuntimeErr.runtimeError.includes('TypeError'), 'JavaScript TypeError detected as runtimeError');

    const jsResTimeout = await executeSingleTestCase(jsTimeout, 'javascript', '30 40', 1000);
    assert(jsResTimeout.timeout === true, 'JavaScript infinite loop detected as timeout');

    // 1.3 JAVA TESTING (javac + java OpenJDK 17)
    console.log('\n--- 1.3 JAVA (OpenJDK 17) ---');
    const javaCorrect = `import java.util.Scanner;
public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int a = sc.nextInt();
            int b = sc.nextInt();
            System.out.println(a + b);
        }
    }
}
`;
    const javaWrong = `public class Solution { public static void main(String[] args) { System.out.println(5555); } }`;
    const javaCompileErr = `public class Solution { public static void main(String[] args) { int a = "string_cannot_be_int"; } }`;
    const javaRuntimeErr = `public class Solution { public static void main(String[] args) { String s = null; System.out.println(s.length()); } }`;
    const javaTimeout = `public class Solution { public static void main(String[] args) { while(true){} } }`;

    const javaResCorrect = await executeSingleTestCase(javaCorrect, 'java', '100 200', 4000);
    assert(javaResCorrect.stdout === '300' && !javaResCorrect.runtimeError && !javaResCorrect.compileError, 'Java correct code compiled and produced expected output (300)');

    const javaResWrong = await executeSingleTestCase(javaWrong, 'java', '100 200', 4000);
    assert(javaResWrong.stdout === '5555', 'Java wrong answer output captured (5555)');

    const javaResCompileErr = await executeSingleTestCase(javaCompileErr, 'java', '100 200', 4000);
    assert(Boolean(javaResCompileErr.compileError) && javaResCompileErr.compileError.includes('incompatible types'), 'Java type mismatch detected as compileError');

    const javaResRuntimeErr = await executeSingleTestCase(javaRuntimeErr, 'java', '100 200', 4000);
    assert(Boolean(javaResRuntimeErr.runtimeError) && javaResRuntimeErr.runtimeError.includes('NullPointerException'), 'Java NullPointerException detected as runtimeError');

    const javaResTimeout = await executeSingleTestCase(javaTimeout, 'java', '100 200', 1200);
    assert(javaResTimeout.timeout === true, 'Java infinite loop detected as timeout');

    // 1.4 C++ TESTING (g++ MinGW UCRT)
    console.log('\n--- 1.4 C++ (MinGW g++) ---');
    const cppCorrect = `#include <iostream>
using namespace std;
int main() {
    int a, b;
    if (cin >> a >> b) {
        cout << (a + b) << endl;
    }
    return 0;
}
`;
    const cppWrong = `#include <iostream>\nusing namespace std;\nint main() { cout << 8888 << endl; return 0; }`;
    const cppCompileErr = `#include <iostream>\nint main() { undeclared_var = 10; return 0; }`;
    const cppRuntimeErr = `#include <iostream>\n#include <stdexcept>\nint main() { throw std::runtime_error("Fatal custom exception"); return 0; }`;
    const cppTimeout = `int main() { while(1) {} return 0; }`;

    const cppResCorrect = await executeSingleTestCase(cppCorrect, 'cpp', '250 150', 4000);
    assert(cppResCorrect.stdout === '400' && !cppResCorrect.runtimeError && !cppResCorrect.compileError, 'C++ correct code compiled and produced expected output (400)');

    const cppResWrong = await executeSingleTestCase(cppWrong, 'cpp', '250 150', 4000);
    assert(cppResWrong.stdout === '8888', 'C++ wrong answer output captured (8888)');

    const cppResCompileErr = await executeSingleTestCase(cppCompileErr, 'cpp', '250 150', 4000);
    assert(Boolean(cppResCompileErr.compileError), 'C++ undeclared identifier detected as compileError');

    const cppResRuntimeErr = await executeSingleTestCase(cppRuntimeErr, 'cpp', '250 150', 4000);
    assert(Boolean(cppResRuntimeErr.runtimeError), 'C++ unhandled exception detected as runtimeError');

    const cppResTimeout = await executeSingleTestCase(cppTimeout, 'cpp', '250 150', 1200);
    assert(cppResTimeout.timeout === true, 'C++ infinite loop detected as timeout');

    // -------------------------------------------------------------------------
    // PART 2: INPUT / OUTPUT NORMALIZATION & TCS-NQT PREVENTION
    // -------------------------------------------------------------------------
    console.log('\n=============================================================');
    console.log('PART 2: I/O NORMALIZATION & TCS-NQT FAILURE PREVENTION');
    console.log('=============================================================');

    assert(compareOutputs('42\r\n', '42'), 'Handles CRLF carriage return trailing newlines');
    assert(compareOutputs('42   \n', '42'), 'Handles trailing spaces on single-line output');
    assert(compareOutputs('line 1   \nline 2   \n', 'line 1\nline 2'), 'Handles trailing spaces on multi-line output');
    assert(compareOutputs('  1   2   3  ', '1 2 3'), 'Token-wise comparison handles spacing differences in arrays');
    assert(compareOutputs('3.14159265', '3.14159265'), 'Exact floating point match');
    assert(compareOutputs('yes', 'YES'), 'Case-insensitive boolean output match');
    assert(compareOutputs('null', 'NULL'), 'Case-insensitive NULL keyword match');
    assert(!compareOutputs('42', '43'), 'Rejects truly different output');

    // Large Input Test (10,000 integers)
    const largeNumbers = Array.from({ length: 1000 }, (_, i) => i + 1).join(' ');
    const expectedSum = (1000 * 1001) / 2; // 500500
    const pySumLarge = `import sys
nums = list(map(int, sys.stdin.read().split()))
print(sum(nums))
`;
    const largeRes = await executeSingleTestCase(pySumLarge, 'python', largeNumbers, 3000);
    assert(largeRes.stdout === expectedSum.toString(), `Large input (1000 integers) processed correctly: sum = ${expectedSum}`);

    // -------------------------------------------------------------------------
    // PART 3: SQL ENGINE REAL DATABASE EXECUTION
    // -------------------------------------------------------------------------
    console.log('\n=============================================================');
    console.log('PART 3: SQL ENGINE REAL IN-MEMORY DATABASE EXECUTION');
    console.log('=============================================================');

    // 3.1 SELECT with WHERE and ORDER BY
    const sqlSetup1 = `
CREATE TABLE Employee (id INT PRIMARY KEY, name TEXT, salary INT);
INSERT INTO Employee VALUES (1, 'Alice', 60000), (2, 'Bob', 80000), (3, 'Charlie', 75000);
`;
    const sqlQuery1 = `SELECT name, salary FROM Employee WHERE salary >= 70000 ORDER BY salary DESC;`;
    const sqlRes1 = await executeSingleTestCase(sqlQuery1, 'sql', sqlSetup1, 3000);
    assert(sqlRes1.stdout.includes('Bob, 80000') && sqlRes1.stdout.includes('Charlie, 75000'), 'SQL SELECT with WHERE & ORDER BY executed successfully');

    // 3.2 JOIN between two tables
    const sqlSetup2 = `
CREATE TABLE Customers (id INT PRIMARY KEY, name TEXT);
CREATE TABLE Orders (id INT PRIMARY KEY, customerId INT, amount INT);
INSERT INTO Customers VALUES (1, 'Max'), (2, 'Sam'), (3, 'Henry');
INSERT INTO Orders VALUES (101, 1, 500), (102, 1, 300), (103, 3, 700);
`;
    const sqlQuery2 = `
SELECT c.name, SUM(o.amount) AS total_spent
FROM Customers c
JOIN Orders o ON c.id = o.customerId
GROUP BY c.id, c.name
ORDER BY total_spent DESC;
`;
    const sqlRes2 = await executeSingleTestCase(sqlQuery2, 'sql', sqlSetup2, 3000);
    assert(sqlRes2.stdout.includes('Max, 800') && sqlRes2.stdout.includes('Henry, 700'), 'SQL JOIN and aggregate SUM executed successfully');

    // 3.3 GROUP BY and HAVING (Duplicate email detection)
    const sqlSetup3 = `
CREATE TABLE Person (id INT PRIMARY KEY, email TEXT);
INSERT INTO Person VALUES (1, 'a@b.com'), (2, 'c@d.com'), (3, 'a@b.com');
`;
    const sqlQuery3 = `SELECT email FROM Person GROUP BY email HAVING COUNT(id) > 1;`;
    const sqlRes3 = await executeSingleTestCase(sqlQuery3, 'sql', sqlSetup3, 3000);
    assert(sqlRes3.stdout.includes('a@b.com'), 'SQL GROUP BY with HAVING duplicate detection executed successfully');

    // 3.4 Subquery (Second highest salary)
    const sqlSetup4 = `
CREATE TABLE Emp (id INT PRIMARY KEY, salary INT);
INSERT INTO Emp VALUES (1, 100), (2, 200), (3, 300);
`;
    const sqlQuery4 = `SELECT MAX(salary) AS SecondHighestSalary FROM Emp WHERE salary < (SELECT MAX(salary) FROM Emp);`;
    const sqlRes4 = await executeSingleTestCase(sqlQuery4, 'sql', sqlSetup4, 3000);
    assert(sqlRes4.stdout.includes('SecondHighestSalary') && sqlRes4.stdout.includes('200'), 'SQL subquery for second highest salary executed successfully');

    // 3.5 Window Function (DENSE_RANK() OVER)
    const sqlQuery5 = `
SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) as rnk FROM Emp;
`;
    const sqlRes5 = await executeSingleTestCase(sqlQuery5, 'sql', sqlSetup4, 3000);
    assert(sqlRes5.stdout.includes('300, 1') && sqlRes5.stdout.includes('200, 2'), 'SQL window function DENSE_RANK() OVER executed successfully');

    // 3.6 SQL Syntax & Semantic Error Handling
    const sqlQueryInvalid = `SELECT nonexistent_col FROM Emp;`;
    const sqlResInvalid = await executeSingleTestCase(sqlQueryInvalid, 'sql', sqlSetup4, 3000);
    assert(Boolean(sqlResInvalid.runtimeError) && sqlResInvalid.runtimeError.includes('no such column'), 'SQL invalid column returned clean runtime error');

    // -------------------------------------------------------------------------
    // PART 4: DEBUGGING ROUND — BUGGY STARTER PROGRAM & REAL TESTCASE JUDGING
    // -------------------------------------------------------------------------
    console.log('\n=============================================================');
    console.log('PART 4: DEBUGGING ROUND — BUGGY STARTER EXECUTION & FIXES');
    console.log('=============================================================');

    // Problem: Find Max in array.
    // Intentionally buggy Python code: starts max_val at 0 (fails for negative numbers)
    const buggyPythonCode = `import sys
nums = list(map(int, sys.stdin.read().split()))
if nums:
    max_val = 0  # BUG: fails when all numbers are negative!
    for x in nums:
        if x > max_val:
            max_val = x
    print(max_val)
`;
    // Corrected Python code
    const fixedPythonCode = `import sys
nums = list(map(int, sys.stdin.read().split()))
if nums:
    max_val = nums[0]  # FIXED: initialized with first element
    for x in nums:
        if x > max_val:
            max_val = x
    print(max_val)
`;
    const debugTestCases = [
      { input: '5 10 3 8', expectedOutput: '10', isHidden: false, weight: 10 },
      { input: '-10 -5 -20 -1', expectedOutput: '-1', isHidden: true, weight: 15 }
    ];

    // Buggy code evaluation
    const buggyResults = await runTestCases(buggyPythonCode, 'python', debugTestCases, 3000);
    assert(buggyResults[0].passed === true, 'Buggy code passed sample test with positive numbers');
    assert(buggyResults[1].passed === false, 'Buggy code correctly failed hidden test with negative numbers');

    // Fixed code evaluation
    const fixedResults = await runTestCases(fixedPythonCode, 'python', debugTestCases, 3000);
    assert(fixedResults[0].passed === true && fixedResults[1].passed === true, 'Corrected code passed both sample and hidden tests');

    // Non-string based verification: alternative valid solution using built-in max()
    const alternativeFixedCode = `import sys
nums = list(map(int, sys.stdin.read().split()))
if nums:
    print(max(nums))
`;
    const altResults = await runTestCases(alternativeFixedCode, 'python', debugTestCases, 3000);
    assert(altResults.every(r => r.passed), 'Alternative valid implementation passed tests (verifies evaluation is NOT string-matching based)');

    // -------------------------------------------------------------------------
    // PART 5: END-TO-END PARTICIPANT LIFECYCLE & API FLOW
    // -------------------------------------------------------------------------
    console.log('\n=============================================================');
    console.log('PART 5: END-TO-END PARTICIPANT LIFECYCLE (API INTEGRATION)');
    console.log('=============================================================');

    // 5.1 Setup College & Admin
    let college = await College.findOne({ code: 'JUDGE-TEST' });
    if (!college) {
      college = await College.create({
        name: 'Judge Validation College',
        code: 'JUDGE-TEST',
        primaryColor: '#6366f1'
      });
    }

    let adminUser = await User.findOne({ email: 'admin@judge.test' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Admin Judge',
        username: 'admin_judge_test',
        email: 'admin@judge.test',
        passwordHash: 'dummy_hash',
        role: 'college_admin',
        collegeId: college._id
      });
    }

    const adminToken = jwt.sign(
      { userId: adminUser._id, username: adminUser.username, role: 'college_admin', collegeId: college._id },
      ENV.JWT_SECRET,
      { expiresIn: '2h' }
    );
    const adminHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };

    // 5.2 Create Coding Question Template with Sample & Hidden Test Cases
    const codingTemplate = await QuestionTemplate.create({
      title: `E2E Coding Sum ${Date.now()}`,
      prompt: 'Given two integers a and b, output their sum.',
      type: 'coding',
      difficulty: 'easy',
      topic: 'Algorithms',
      marks: 30,
      allowedLanguages: ['python', 'javascript', 'java', 'cpp'],
      starterCode: {
        python: 'import sys\n# Write your solution here\n',
        javascript: 'const fs = require("fs");\n// Write your solution here\n',
        java: 'import java.util.Scanner;\npublic class Solution {\n    public static void main(String[] args) {\n    }\n}\n',
        cpp: '#include <iostream>\nusing namespace std;\nint main() {\n    return 0;\n}\n'
      },
      testCases: [
        { input: '10 20', output: '30', isHidden: false, weight: 10 },
        { input: '100 -50', output: '50', isHidden: true, weight: 20 }
      ]
    });

    // 5.3 Create Debugging Question Template
    const debugTemplate = await QuestionTemplate.create({
      title: `E2E Debug Max ${Date.now()}`,
      prompt: 'Fix the bug in the program so that it correctly computes the maximum integer.',
      type: 'debugging',
      difficulty: 'easy',
      topic: 'Debugging',
      marks: 25,
      allowedLanguages: ['python', 'cpp', 'java'],
      starterCode: {
        python: buggyPythonCode,
        cpp: `#include <iostream>\nusing namespace std;\nint main() { int a, b; cin >> a >> b; cout << a << endl; return 0; }\n`
      },
      testCases: [
        { input: '5 10', output: '10', isHidden: false, weight: 10 },
        { input: '-2 -8', output: '-2', isHidden: true, weight: 15 }
      ]
    });

    // 5.4 Create SQL Question Template
    const sqlTemplate = await QuestionTemplate.create({
      title: `E2E SQL Department Max ${Date.now()}`,
      prompt: 'Write an SQL query to select all departments with average salary above 50,000.',
      type: 'sql',
      difficulty: 'medium',
      topic: 'SQL',
      marks: 25,
      allowedLanguages: ['sql'],
      testCases: [
        {
          input: `
CREATE TABLE Department (id INT PRIMARY KEY, name TEXT);
CREATE TABLE Emp (id INT PRIMARY KEY, deptId INT, salary INT);
INSERT INTO Department VALUES (1, 'Eng'), (2, 'HR');
INSERT INTO Emp VALUES (1, 1, 80000), (2, 1, 90000), (3, 2, 40000);
`,
          output: 'name\nEng',
          isHidden: false,
          weight: 15
        },
        {
          input: `
CREATE TABLE Department (id INT PRIMARY KEY, name TEXT);
CREATE TABLE Emp (id INT PRIMARY KEY, deptId INT, salary INT);
INSERT INTO Department VALUES (1, 'Sales'), (2, 'Marketing');
INSERT INTO Emp VALUES (1, 1, 55000), (2, 2, 45000);
`,
          output: 'name\nSales',
          isHidden: true,
          weight: 10
        }
      ]
    });

    // 5.5 Create Tournament with 3 Rounds
    const eventName = `E2E Judge Arena Tournament ${Date.now()}`;
    const eventCode = `JUDGE${Date.now().toString().slice(-4)}`;
    const createEventRes = await axios.post(
      `${API}/admin/events`,
      {
        collegeId: college._id.toString(),
        name: eventName,
        code: eventCode,
        rounds: [
          { roundNumber: 1, title: 'Coding Round', type: 'coding', durationMinutes: 30, questionCount: 1, totalMarks: 30 },
          { roundNumber: 2, title: 'Debugging Round', type: 'debugging', durationMinutes: 30, questionCount: 1, totalMarks: 25 },
          { roundNumber: 3, title: 'SQL Round', type: 'sql', durationMinutes: 30, questionCount: 1, totalMarks: 25 }
        ]
      },
      adminHeaders
    );
    const eventId = createEventRes.data.event.id || createEventRes.data.event._id;

    // Assign questions to all 3 rounds
    await axios.put(`${API}/admin/events/${eventId}/rounds/1/questions`, { questionIds: [codingTemplate._id.toString()] }, adminHeaders);
    await axios.put(`${API}/admin/events/${eventId}/rounds/2/questions`, { questionIds: [debugTemplate._id.toString()] }, adminHeaders);
    await axios.put(`${API}/admin/events/${eventId}/rounds/3/questions`, { questionIds: [sqlTemplate._id.toString()] }, adminHeaders);

    // Start Event and Rounds
    await axios.post(`${API}/admin/events/${eventId}/start`, {}, adminHeaders);
    await axios.post(`${API}/admin/events/${eventId}/rounds/1/start`, {}, adminHeaders);

    // 5.6 Create Participant & Login
    const partUsername = `candidate_${Date.now()}`;
    const participant = await User.create({
      name: 'Test Candidate',
      username: partUsername,
      email: `${partUsername}@test.com`,
      passwordHash: 'dummy_hash',
      role: 'participant',
      collegeId: college._id,
      eventId
    });

    const partToken = jwt.sign(
      { userId: participant._id, username: participant.username, role: 'participant', collegeId: college._id, eventId },
      ENV.JWT_SECRET,
      { expiresIn: '2h' }
    );
    const partHeaders = { headers: { Authorization: `Bearer ${partToken}` } };

    // 5.7 Participant fetches questions for Round 1
    const roundStateRes = await axios.get(`${API}/participant/round-state`, partHeaders);
    assert(roundStateRes.status === 200, 'GET /participant/round-state returned 200 OK');
    const deliveredQ1 = roundStateRes.data.questions[0];
    assert(deliveredQ1.testCases.length === 1, 'Only visible sample test cases delivered (1 sample case)');
    assert(deliveredQ1.testCases[0].isHidden === false, 'Sample test case has isHidden === false');
    assert(deliveredQ1.starterCode.python !== undefined, 'Language-specific starter code present for Python');
    assert(deliveredQ1.starterCode.java !== undefined, 'Language-specific starter code present for Java');

    // 5.8 Participant runs sample test cases via /run-code
    const runSampleRes = await axios.post(
      `${API}/participant/run-code`,
      {
        questionId: deliveredQ1._id,
        code: pyCorrect,
        language: 'python',
        roundNumber: 1
      },
      partHeaders
    );
    assert(runSampleRes.status === 200, 'POST /participant/run-code succeeded with 200 OK');
    assert(runSampleRes.data.results.length === 1, 'Run code evaluated exactly the visible sample test cases');
    assert(runSampleRes.data.results[0].passed === true, 'Sample test case passed');
    assert(runSampleRes.data.results[0].actual === '30', 'Actual output 30 returned for sample test');

    // 5.9 Participant submits final solution via /submit-code
    const submitRes = await axios.post(
      `${API}/participant/submit-code`,
      {
        questionId: deliveredQ1._id,
        code: pyCorrect,
        language: 'python',
        roundNumber: 1
      },
      partHeaders
    );
    assert(submitRes.status === 200, 'POST /participant/submit-code succeeded with 200 OK');
    assert(submitRes.data.score === 30, 'Participant received full score (30 points)');
    assert(submitRes.data.results.length === 2, 'Evaluated all 2 test cases (1 sample + 1 hidden)');

    // 5.10 Verify Hidden Test Case Isolation: Hidden input/expected must NEVER be exposed in API
    const hiddenCaseResult = submitRes.data.results[1];
    assert(hiddenCaseResult.isHidden === true, 'Second testcase is marked isHidden');
    assert(hiddenCaseResult.input === undefined, 'Hidden testcase input was strictly omitted from response');
    assert(hiddenCaseResult.expected === undefined, 'Hidden testcase expected output was strictly omitted from response');
    assert(hiddenCaseResult.actual === undefined, 'Hidden testcase actual output was strictly omitted from response');
    assert(hiddenCaseResult.passed === true, 'Hidden testcase evaluated and passed');

    // 5.11 Verify Java Submission in Round 1
    const submitJavaRes = await axios.post(
      `${API}/participant/submit-code`,
      {
        questionId: deliveredQ1._id,
        code: javaCorrect,
        language: 'java',
        roundNumber: 1
      },
      partHeaders
    );
    assert(submitJavaRes.status === 200, 'Java submission succeeded');
    assert(submitJavaRes.data.score === 30, 'Java submission received full score (30 points)');

    // 5.12 Verify C++ Submission in Round 1
    const submitCppRes = await axios.post(
      `${API}/participant/submit-code`,
      {
        questionId: deliveredQ1._id,
        code: cppCorrect,
        language: 'cpp',
        roundNumber: 1
      },
      partHeaders
    );
    assert(submitCppRes.status === 200, 'C++ submission succeeded');
    assert(submitCppRes.data.score === 30, 'C++ submission received full score (30 points)');

    // 5.13 Advance to Round 2 (Debugging Round)
    await DynamicRound.updateOne({ eventId, roundNumber: 1 }, { status: 'completed' });
    await RoundProgress.updateOne({ userId: participant._id, roundNumber: 1 }, { status: 'advanced' });
    await axios.post(`${API}/admin/events/${eventId}/rounds/2/start`, {}, adminHeaders);

    const round2StateRes = await axios.get(`${API}/participant/round-state?roundNumber=2`, partHeaders);
    assert(round2StateRes.status === 200, 'GET /participant/round-state for Round 2 returned 200 OK');
    const debugQ = round2StateRes.data.questions[0];
    assert(debugQ.type === 'debugging', 'Round 2 question is of type debugging');
    assert(debugQ.starterCode.python.includes('max_val = 0'), 'Participant received the intentionally buggy starter program');

    // Submit corrected debugging program
    const debugSubmitRes = await axios.post(
      `${API}/participant/submit-code`,
      {
        questionId: debugQ._id,
        code: `import sys\nnums = list(map(int, sys.stdin.read().split()))\nif nums: print(max(nums))`,
        language: 'python',
        roundNumber: 2
      },
      partHeaders
    );
    assert(debugSubmitRes.status === 200, 'Debugging submission succeeded');
    assert(debugSubmitRes.data.score === 25, 'Corrected debugging program received full score (25 points)');

    // 5.14 Advance to Round 3 (SQL Round)
    await DynamicRound.updateOne({ eventId, roundNumber: 2 }, { status: 'completed' });
    await RoundProgress.updateOne({ userId: participant._id, roundNumber: 2 }, { status: 'advanced' });
    await axios.post(`${API}/admin/events/${eventId}/rounds/3/start`, {}, adminHeaders);

    const round3StateRes = await axios.get(`${API}/participant/round-state?roundNumber=3`, partHeaders);
    assert(round3StateRes.status === 200, 'GET /participant/round-state for Round 3 returned 200 OK');
    const sqlQ = round3StateRes.data.questions[0];
    assert(sqlQ.type === 'sql', 'Round 3 question is of type sql');

    const correctSqlQuery = `
SELECT d.name
FROM Department d
JOIN Emp e ON d.id = e.deptId
GROUP BY d.id, d.name
HAVING AVG(e.salary) > 50000;
`;
    const sqlSubmitRes = await axios.post(
      `${API}/participant/submit-code`,
      {
        questionId: sqlQ._id,
        code: correctSqlQuery,
        language: 'sql',
        roundNumber: 3
      },
      partHeaders
    );
    assert(sqlSubmitRes.status === 200, 'SQL submission evaluated against test database successfully');
    assert(sqlSubmitRes.data.score === 25, 'SQL query received full score (25 points)');
    assert(sqlSubmitRes.data.results.every((r: any) => r.passed), 'SQL query passed both sample and hidden test databases');

    console.log('\n🎉 =========================================================================');
    console.log('🎉 ALL CODING, SQL, AND DEBUGGING ONLINE JUDGE VALIDATION TESTS PASSED!');
    console.log('🎉 =========================================================================\n');

  } finally {
    server.close();
    await disconnectDB();
  }
}

runVerification().catch(err => {
  console.error('\n❌ VERIFICATION FAILED:', err.message);
  if (err.response) {
    console.error('Response status:', err.response.status);
    console.error('Response data:', err.response.data);
  }
  process.exit(1);
});
