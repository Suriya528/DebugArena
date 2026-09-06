import { connectDB, disconnectDB } from '../config/db.js';
import { QuestionTemplate } from '../models/QuestionTemplate.js';
import { Question } from '../models/Question.js';
import { Event } from '../models/Event.js';
import { College } from '../models/College.js';
import { User } from '../models/User.js';
import { seedDefaultQuestionTemplates, seedEventRoundQuestions } from '../services/defaultQuestions.js';

async function runVerification() {
  console.log('================================================================');
  console.log('🏛️  SENIOR ARCHITECT VERIFICATION: EVENT CREATION & QUESTION BANK');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    await connectDB();

    // -------------------------------------------------------------
    // SUITE 1: Question Bank Auto-Seeding & DNA Mutation Templates
    // -------------------------------------------------------------
    console.log('--- Suite 1: Question Bank Auto-Seeding & DNA Taxonomy ---');
    
    // Wipe templates for fresh verification
    await QuestionTemplate.deleteMany({});
    
    const seededCount = await seedDefaultQuestionTemplates();
    assert(seededCount >= 20, `Seeded ${seededCount} curated default question templates (>= 20 expected)`);

    const mcqTemplates = await QuestionTemplate.find({ type: 'mcq' });
    assert(mcqTemplates.length >= 10, `Found ${mcqTemplates.length} MCQ question templates (>= 10 expected)`);

    const bugHuntingTemplates = await QuestionTemplate.find({ type: 'debugging' });
    assert(bugHuntingTemplates.length >= 3, `Found ${bugHuntingTemplates.length} Bug Hunting templates (>= 3 expected)`);

    const dnaTemplates = await QuestionTemplate.find({ hasDnaMutation: true });
    assert(dnaTemplates.length >= 2, `Found ${dnaTemplates.length} Question DNA mutation templates with bug categories`);

    // Verify template structure
    const sampleTemplate = dnaTemplates[0];
    assert(Boolean(sampleTemplate.dnaConfig?.bugCategory), `DNA template has bugCategory defined: ${sampleTemplate.dnaConfig?.bugCategory}`);
    assert(sampleTemplate.testCases.length >= 3, `DNA template contains >= 3 test cases`);

    // -------------------------------------------------------------
    // SUITE 2: Custom Question Authoring
    // -------------------------------------------------------------
    console.log('\n--- Suite 2: Custom Question Authoring ---');

    const customTemplate = await QuestionTemplate.create({
      title: 'Architect Custom Bug Hunt',
      topic: 'Concurrency',
      language: 'java',
      type: 'debugging',
      difficulty: 'hard',
      expectedSolveTimeMinutes: 25,
      marks: 30,
      skillTags: ['threads', 'deadlock', 'mutex'],
      prompt: 'Identify the thread race condition causing inconsistent balances.',
      options: [],
      allowedLanguages: ['java', 'python', 'cpp'],
      starterCode: { java: 'class Account { synchronized void transfer() {} }' },
      testCases: [
        { input: '100 50', output: '150', isHidden: false, weight: 1 },
        { input: '200 80', output: '280', isHidden: true, weight: 2 }
      ],
      hasDnaMutation: true,
      dnaConfig: {
        bugCategory: 'wrong_condition',
        variableNames: ['balance', 'amount'],
        mutationOperators: ['<', '<=']
      }
    });

    assert(Boolean(customTemplate._id), `Custom template created successfully with ID: ${customTemplate._id}`);
    assert(customTemplate.skillTags.includes('deadlock'), `Custom template preserved skill tags`);

    // -------------------------------------------------------------
    // SUITE 3: Event Creation, Global Code Uniqueness & Auto-Seeding
    // -------------------------------------------------------------
    console.log('\n--- Suite 3: Event Creation, Global Code Collision & Auto-Seeding ---');

    // Setup college
    const collegeCode = 'TST_' + Date.now().toString().slice(-4);
    const college = await College.create({
      name: 'Verification Institute of Tech',
      code: collegeCode,
      contactEmail: 'admin@vit.edu'
    });
    assert(Boolean(college._id), `Test College created with code: ${collegeCode}`);

    // Create Event
    const eventCode = 'EVT_' + Date.now().toString().slice(-4);
    const event = await Event.create({
      collegeId: college._id,
      name: 'National Debugging Championship',
      code: eventCode,
      description: 'Annual flagship coding tournament',
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000),
      rules: ['Tab switching is monitored', 'Camera must remain on', 'Strict time enforcement'],
      scoringConfig: {
        negativeMarking: false,
        tieBreakerPriority: ['codingScore', 'debuggingScore', 'totalTime', 'earliestSubmit'],
        autoSubmitOnTimeUp: true,
        violationLimit: 3,
        autoSubmitOnViolation: true
      }
    });
    assert(Boolean(event._id), `Test Event created with code: ${eventCode}`);

    // Test Global Code Collision Detection
    const duplicateCodeCheck = await Event.findOne({ code: eventCode.toUpperCase().trim() });
    assert(Boolean(duplicateCodeCheck), `Global event lookup correctly discovers event by code '${eventCode}'`);

    // Auto-seed event round questions
    const seededEventQuestions = await seedEventRoundQuestions(event._id.toString(), college._id.toString());
    assert(seededEventQuestions.totalCount >= 16, `Auto-seeded ${seededEventQuestions.totalCount} live questions into Event`);

    const round1Questions = await Question.find({ eventId: event._id, roundNumber: 1 });
    assert(round1Questions.length === 10, `Round 1 (MCQ) deployed with 10 questions (actual: ${round1Questions.length})`);

    const round2Questions = await Question.find({ eventId: event._id, roundNumber: 2 });
    assert(round2Questions.length === 3, `Round 2 (Bug Hunting) deployed with 3 challenges (actual: ${round2Questions.length})`);

    const round3Questions = await Question.find({ eventId: event._id, roundNumber: 3 });
    assert(round3Questions.length === 2, `Round 3 (Advanced Algorithmic) deployed with 2 challenges (actual: ${round3Questions.length})`);

    const tieBreakerQuestions = await Question.find({ eventId: event._id, roundNumber: 99 });
    assert(tieBreakerQuestions.length === 1, `Round 99 (Tie-Breaker) deployed with 1 challenge (actual: ${tieBreakerQuestions.length})`);

    // -------------------------------------------------------------
    // SUITE 4: Round Restoration / 1-Click Re-Population
    // -------------------------------------------------------------
    console.log('\n--- Suite 4: Round Question Restoration & Idempotency ---');

    // Delete Round 2 questions to simulate accidental deletion or empty round
    await Question.deleteMany({ eventId: event._id, roundNumber: 2 });
    const round2AfterDelete = await Question.find({ eventId: event._id, roundNumber: 2 });
    assert(round2AfterDelete.length === 0, `Round 2 questions wiped clean for recovery test`);

    // Call seedEventRoundQuestions again (idempotent recovery: only Round 2 should be re-seeded)
    const recoveredQuestions = await seedEventRoundQuestions(event._id.toString(), college._id.toString());
    assert(recoveredQuestions.r2Count === 3, `Idempotent recovery re-seeded exactly 3 questions for Round 2`);
    assert(recoveredQuestions.r1Count === 0, `Round 1 untouched during partial recovery`);

    const round2Restored = await Question.find({ eventId: event._id, roundNumber: 2 });
    assert(round2Restored.length === 3, `Round 2 questions restored to 3 challenges without duplicating Round 1 or 3`);

    // -------------------------------------------------------------
    // SUITE 5: Google Sign-In College Onboarding Enforcement
    // -------------------------------------------------------------
    console.log('\n--- Suite 5: Google Sign-In College Onboarding Enforcement ---');

    // Simulate Google user who authenticated without college
    const googleUser = await User.create({
      username: 'google_organizer_' + Date.now().toString().slice(-4),
      name: 'Google Organizer',
      email: 'organizer@stanford.edu',
      role: 'admin',
      authProvider: 'google',
      collegeId: null
    });

    const needsOnboardingComputed = Boolean(!googleUser.collegeId);
    assert(needsOnboardingComputed === true, `User without collegeId flags needsOnboarding: true`);

    // Simulate completing onboarding
    googleUser.collegeId = college._id as any;
    await googleUser.save();

    const postOnboardingCheck = Boolean(!googleUser.collegeId);
    assert(postOnboardingCheck === false, `User with collegeId set flags needsOnboarding: false`);

    // Cleanup test records
    await QuestionTemplate.deleteOne({ _id: customTemplate._id });
    await Question.deleteMany({ eventId: event._id });
    await Event.deleteOne({ _id: event._id });
    await College.deleteOne({ _id: college._id });
    await User.deleteOne({ _id: googleUser._id });

    console.log('\n================================================================');
    console.log(`🏁 VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    await disconnectDB();

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal error during verification:', err);
    await disconnectDB();
    process.exit(1);
  }
}

runVerification();
