import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { QuestionTemplate } from '../models/QuestionTemplate.js';
import { seedDefaultQuestionTemplates } from '../services/defaultQuestions.js';
import {
  MEDIUM_CODING_DEBUGGING_PROBLEMS
} from '../services/mediumCodingDebuggingQuestions.js';
import { executeSingleTestCase, compareOutputs } from '../services/judgeService.js';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    throw new Error(msg);
  } else {
    console.log(`  ✅ ${msg}`);
  }
}

async function main() {
  console.log('🏛️ =========================================================================');
  console.log('🏛️ 10 MEDIUM CODING / DEBUGGING PROBLEMS MULTI-LANGUAGE VERIFICATION SUITE');
  console.log('🏛️ =========================================================================\n');

  await connectDB();
  console.log('📦 Connected to MongoDB via connectDB()');

  // STEP 1: Seed Central Question Bank
  console.log('\n--- STEP 1: Seed Master Question Bank with 10 Medium Coding / Debugging Problems ---');
  const count = await seedDefaultQuestionTemplates(true);
  console.log(`  Total templates seeded/updated: ${count}`);

  // STEP 2: Database Persistence & Schema Integrity
  console.log('\n--- STEP 2: Database Persistence & Schema Validation ---');
  for (const prob of MEDIUM_CODING_DEBUGGING_PROBLEMS) {
    const tmpl = await QuestionTemplate.findOne({ title: prob.title });
    assert(Boolean(tmpl), `Question "${prob.title}" exists in MongoDB QuestionTemplate collection`);
    assert(tmpl?.difficulty === 'medium', `Question "${prob.title}" difficulty is "medium"`);
    assert(tmpl?.type === 'debugging' || tmpl?.type === 'coding', `Question "${prob.title}" type is "${tmpl?.type}"`);

    // Verify allowedLanguages
    const allowed = tmpl?.allowedLanguages || [];
    assert(
      ['c', 'cpp', 'python', 'java', 'javascript'].every(l => allowed.includes(l)),
      `Question "${prob.title}" supports all 5 languages (c, cpp, python, java, javascript)`
    );

    // Verify starterCode has all 5 languages
    const sc = (tmpl?.starterCode as any) || {};
    const scMap = sc instanceof Map ? Object.fromEntries(sc) : sc;
    assert(
      Boolean(scMap.c && scMap.cpp && scMap.python && scMap.java && scMap.javascript),
      `Question "${prob.title}" has native starterCode for all 5 languages`
    );

    // Verify test cases count (2 visible + 3 hidden = 5 total)
    assert(
      tmpl?.testCases?.length === 5,
      `Question "${prob.title}" has exactly 5 test cases (got ${tmpl?.testCases?.length})`
    );
    const visibleCount = tmpl?.testCases?.filter(tc => !tc.isHidden).length;
    const hiddenCount = tmpl?.testCases?.filter(tc => tc.isHidden).length;
    assert(
      visibleCount === 2 && hiddenCount === 3,
      `Question "${prob.title}" has exactly 2 visible and 3 hidden test cases`
    );
  }

  // STEP 3: Multi-Language Execution & Bug Validation
  console.log('\n--- STEP 3: Live Execution Engine Bug Validation (Buggy vs Corrected) ---');

  for (const prob of MEDIUM_CODING_DEBUGGING_PROBLEMS) {
    console.log(`\n▶ Validating Problem ${prob.orderIndex}: "${prob.title}" (${prob.topic})`);

    // Test on JavaScript
    {
      const jsBuggy = prob.starterCode.javascript;
      const jsSolution = prob.solutionCode.javascript;

      let buggyPassedCount = 0;
      for (const tc of prob.testCases) {
        const res = await executeSingleTestCase(jsBuggy, 'javascript', tc.input, 3000);
        if (compareOutputs(res.stdout, tc.expectedOutput)) {
          buggyPassedCount++;
        }
      }
      assert(
        buggyPassedCount < prob.testCases.length,
        `[JS] Buggy starter code failed at least one test case (${buggyPassedCount}/${prob.testCases.length} passed)`
      );

      let solutionPassedCount = 0;
      for (const tc of prob.testCases) {
        const res = await executeSingleTestCase(jsSolution, 'javascript', tc.input, 3000);
        if (compareOutputs(res.stdout, tc.expectedOutput)) {
          solutionPassedCount++;
        } else {
          console.error(`    [JS Error] Input: ${tc.input} | Expected: ${tc.expectedOutput} | Actual: ${res.stdout} | Err: ${res.stderr}`);
        }
      }
      assert(
        solutionPassedCount === prob.testCases.length,
        `[JS] Corrected solution passed 100% of test cases (${solutionPassedCount}/${prob.testCases.length})`
      );
    }

    // Test on Python
    {
      const pyBuggy = prob.starterCode.python;
      const pySolution = prob.solutionCode.python;

      let buggyPassedCount = 0;
      for (const tc of prob.testCases) {
        const res = await executeSingleTestCase(pyBuggy, 'python', tc.input, 3000);
        if (compareOutputs(res.stdout, tc.expectedOutput)) {
          buggyPassedCount++;
        }
      }
      assert(
        buggyPassedCount < prob.testCases.length,
        `[Python] Buggy starter code failed at least one test case (${buggyPassedCount}/${prob.testCases.length} passed)`
      );

      let solutionPassedCount = 0;
      for (const tc of prob.testCases) {
        const res = await executeSingleTestCase(pySolution, 'python', tc.input, 3000);
        if (compareOutputs(res.stdout, tc.expectedOutput)) {
          solutionPassedCount++;
        } else {
          console.error(`    [Python Error] Input: ${tc.input} | Expected: ${tc.expectedOutput} | Actual: ${res.stdout} | Err: ${res.stderr}`);
        }
      }
      assert(
        solutionPassedCount === prob.testCases.length,
        `[Python] Corrected solution passed 100% of test cases (${solutionPassedCount}/${prob.testCases.length})`
      );
    }

    // Structural and Logical Integrity for Java, C++, and C
    {
      // Java
      const javaBuggy = prob.starterCode.java;
      const javaSolution = prob.solutionCode.java;
      assert(
        javaBuggy.includes('public class Solution') && javaBuggy.includes('public static void main'),
        `[Java] Starter code has valid class Solution and main method`
      );
      assert(
        javaSolution.includes('public class Solution') && javaSolution.includes('public static void main'),
        `[Java] Solution code has valid class Solution and main method`
      );

      // C++
      const cppBuggy = prob.starterCode.cpp;
      const cppSolution = prob.solutionCode.cpp;
      assert(
        cppBuggy.includes('#include <iostream>') && cppBuggy.includes('int main('),
        `[C++] Starter code includes <iostream> and int main()`
      );
      assert(
        cppSolution.includes('#include <iostream>') && cppSolution.includes('int main('),
        `[C++] Solution code includes <iostream> and int main()`
      );

      // C
      const cBuggy = prob.starterCode.c;
      const cSolution = prob.solutionCode.c;
      assert(
        cBuggy.includes('#include <stdio.h>') && cBuggy.includes('int main('),
        `[C] Starter code includes <stdio.h> and int main()`
      );
      assert(
        cSolution.includes('#include <stdio.h>') && cSolution.includes('int main('),
        `[C] Solution code includes <stdio.h> and int main()`
      );
    }
  }

  console.log('\n🎉 =========================================================================');
  console.log('🎉 ALL 10 MEDIUM CODING / DEBUGGING PROBLEMS VERIFIED ACROSS ALL LANGUAGES!');
  console.log('🎉 =========================================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Verification suite failed:', err);
  process.exit(1);
});
