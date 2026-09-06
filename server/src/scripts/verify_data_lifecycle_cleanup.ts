import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { College } from '../models/College.js';
import { Event } from '../models/Event.js';
import { User } from '../models/User.js';
import { RoundProgress } from '../models/RoundProgress.js';
import { TieBreak } from '../models/TieBreak.js';
import { Attempt } from '../models/Attempt.js';
import { Question } from '../models/Question.js';
import { CodeMilestone } from '../models/CodeMilestone.js';
import { ViolationLog } from '../models/ViolationLog.js';
import { CleanupLock } from '../models/CleanupLock.js';
import { CleanupAudit } from '../models/CleanupAudit.js';
import { finalizeEvent, setRetentionHold, computeLeaderboardFingerprint } from '../services/lifecycleService.js';
import { executeCleanupJob } from '../services/cleanupEngine.js';
import { recalculateUserSuspicion } from '../services/suspicionService.js';

let mongod: MongoMemoryServer;

async function setup() {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  console.log('Connected to In-Memory MongoDB for Lifecycle & Cleanup Verification.');
}

async function teardown() {
  await mongoose.disconnect();
  await mongod.stop();
  console.log('MongoDB disconnected and stopped.');
}

async function runLifecycleVerification() {
  await setup();

  try {
    console.log('\n================================================================');
    console.log('🚀 RUNNING COMPREHENSIVE DATA LIFECYCLE & RETENTION TEST SUITE');
    console.log('================================================================\n');

    // 1. Seed Multi-Tenant Infrastructure
    console.log('--- TEST 1: Multi-Tenant Setup ---');
    const collegeA = await College.create({
      name: 'Alpha Institute of Tech',
      code: 'ALPHA',
      address: 'Alpha Campus'
    });
    const collegeB = await College.create({
      name: 'Beta University',
      code: 'BETA',
      address: 'Beta Campus'
    });

    const superAdmin = await User.create({
      username: 'root_admin',
      name: 'Root Admin',
      passwordHash: 'hashed123',
      role: 'super_admin'
    });

    const eventA1 = await Event.create({
      collegeId: collegeA._id,
      name: 'Alpha Hackathon 2026',
      code: 'ALPHA-HACK',
      status: 'completed',
      retentionDays: 30
    });

    const eventA2 = await Event.create({
      collegeId: collegeA._id,
      name: 'Alpha Live Debugging',
      code: 'ALPHA-LIVE',
      status: 'live'
    });

    const eventB1 = await Event.create({
      collegeId: collegeB._id,
      name: 'Beta Coding Championship',
      code: 'BETA-CODE',
      status: 'completed',
      retentionDays: 30
    });

    console.log('✅ Multi-tenant events created: A1 (completed), A2 (live), B1 (completed)');

    // 2. Seed Participants, Questions, Attempts, Milestones & Violations
    console.log('\n--- TEST 2: Seeding High-Volume Telemetry & Core Business Facts ---');
    const userA1_1 = await User.create({
      username: 'alice_alpha',
      name: 'Alice A.',
      passwordHash: 'hashed123',
      role: 'participant',
      collegeId: collegeA._id,
      eventId: eventA1._id
    });
    const userA1_2 = await User.create({
      username: 'bob_alpha',
      name: 'Bob A.',
      passwordHash: 'hashed123',
      role: 'participant',
      collegeId: collegeA._id,
      eventId: eventA1._id
    });

    // Control participant in live event A2
    const userA2_1 = await User.create({
      username: 'charlie_live',
      name: 'Charlie L.',
      passwordHash: 'hashed123',
      role: 'participant',
      collegeId: collegeA._id,
      eventId: eventA2._id
    });

    // Control participant in College B event B1
    const userB1_1 = await User.create({
      username: 'dave_beta',
      name: 'Dave B.',
      passwordHash: 'hashed123',
      role: 'participant',
      collegeId: collegeB._id,
      eventId: eventB1._id
    });

    const question = await Question.create({
      roundNumber: 1,
      orderIndex: 1,
      title: 'Fix Array Reversal',
      prompt: 'Find pointer arithmetic bug in array reversal function',
      type: 'coding',
      marks: 100,
      testCases: [{ input: '1,2,3', expectedOutput: '3,2,1', weight: 50, isHidden: false }]
    });

    // Core facts for Event A1
    await RoundProgress.create({
      userId: userA1_1._id,
      roundNumber: 1,
      totalScore: 90,
      timeTakenSeconds: 320,
      status: 'submitted',
      suspicionScore: 65,
      suspicionLevel: 'high'
    });
    await RoundProgress.create({
      userId: userA1_2._id,
      roundNumber: 1,
      totalScore: 80,
      timeTakenSeconds: 400,
      status: 'submitted',
      suspicionScore: 10,
      suspicionLevel: 'low'
    });

    await TieBreak.create({
      tiedUserIds: [userA1_1._id, userA1_2._id],
      questionId: question._id,
      status: 'completed',
      results: [
        { userId: userA1_1._id, score: 90, timeTakenSeconds: 320, resolvedRank: 1 },
        { userId: userA1_2._id, score: 80, timeTakenSeconds: 400, resolvedRank: 2 }
      ]
    });

    // Heavy operational attempts with testCaseResults (stdout, stderr, etc.)
    await Attempt.create({
      userId: userA1_1._id,
      roundNumber: 1,
      questionId: question._id,
      code: 'def reverse_array(arr): return arr[::-1]',
      score: 90,
      maxPossibleScore: 100,
      status: 'submitted',
      testCaseResults: [
        {
          passed: true,
          runtimeMs: 15,
          stdout: 'Executing test case 1 with heavy trace logs...',
          stderr: '',
          compileError: '',
          status: 'passed',
          isHidden: false,
          input: '1,2,3',
          expected: '3,2,1',
          actual: '3,2,1'
        }
      ]
    });

    // Heavy telemetry: CodeMilestones for A1, A2, and B1
    await CodeMilestone.create({
      userId: userA1_1._id,
      eventId: eventA1._id,
      questionId: question._id,
      roundNumber: 1,
      code: 'def rev',
      language: 'python',
      eventType: 'autosave'
    });
    await CodeMilestone.create({
      userId: userA1_1._id,
      eventId: eventA1._id,
      questionId: question._id,
      roundNumber: 1,
      code: 'def reverse_array(arr): return arr[::-1]',
      language: 'python',
      eventType: 'submit'
    });

    // Live telemetry for A2 (MUST NOT BE TOUCHED)
    await CodeMilestone.create({
      userId: userA2_1._id,
      eventId: eventA2._id,
      questionId: question._id,
      roundNumber: 1,
      code: 'live_test_milestone',
      language: 'python',
      eventType: 'autosave'
    });

    // Telemetry for College B (MUST NOT BE TOUCHED)
    await CodeMilestone.create({
      userId: userB1_1._id,
      eventId: eventB1._id,
      questionId: question._id,
      roundNumber: 1,
      code: 'college_b_milestone',
      language: 'python',
      eventType: 'autosave'
    });

    // Heavy telemetry: ViolationLogs for A1, A2, B1
    await ViolationLog.create({
      userId: userA1_1._id,
      eventId: eventA1._id,
      roundNumber: 1,
      type: 'tab_switch',
      details: 'Participant blurred tab to Chrome',
      suspicionPoints: 20
    });
    await ViolationLog.create({
      userId: userA1_1._id,
      eventId: eventA1._id,
      roundNumber: 1,
      type: 'fullscreen_exit',
      details: 'Participant minimized kiosk window',
      suspicionPoints: 25
    });

    // Control violations for A2 & B1
    await ViolationLog.create({
      userId: userA2_1._id,
      eventId: eventA2._id,
      roundNumber: 1,
      type: 'tab_switch',
      details: 'Live event tab switch',
      suspicionPoints: 20
    });
    await ViolationLog.create({
      userId: userB1_1._id,
      eventId: eventB1._id,
      roundNumber: 1,
      type: 'large_paste',
      details: 'College B paste strike',
      suspicionPoints: 35
    });

    console.log('✅ Core facts, telemetry, and control event data seeded.');

    // 3. Test Event Finalization State Machine
    console.log('\n--- TEST 3: Deterministic Event Finalization & Retention Anchors ---');
    const hashBeforeFinalization = await computeLeaderboardFingerprint(eventA1._id);
    console.log(`Leaderboard SHA-256 fingerprint: ${hashBeforeFinalization}`);

    const finalizeRes = await finalizeEvent(
      eventA1._id.toString(),
      collegeA._id.toString(),
      superAdmin._id.toString(),
      superAdmin.username,
      30
    );

    if (finalizeRes.event.status !== 'finalized') {
      throw new Error(`Expected status 'finalized', got '${finalizeRes.event.status}'`);
    }
    if (!finalizeRes.event.finalizedAt || !finalizeRes.event.retentionExpiresAt) {
      throw new Error('finalizedAt or retentionExpiresAt timestamp was not anchored.');
    }
    if (finalizeRes.leaderboardFingerprint !== hashBeforeFinalization) {
      throw new Error('Leaderboard fingerprint corrupted during finalization.');
    }

    const durationDays = Math.round(
      (new Date(finalizeRes.event.retentionExpiresAt).getTime() -
        new Date(finalizeRes.event.finalizedAt).getTime()) /
        86400000
    );
    if (durationDays !== 30) {
      throw new Error(`Expected 30 retention days, calculated ${durationDays}`);
    }
    console.log(`✅ Event A1 finalized successfully. Retention expiration set to 30 days ahead.`);

    // 4. Test Retention Hold Guard
    console.log('\n--- TEST 4: Academic Integrity Retention Hold Guard ---');
    // Fast forward retention expiration to simulate expired event
    await Event.findByIdAndUpdate(eventA1._id, {
      retentionExpiresAt: new Date(Date.now() - 1000 * 60)
    });

    // Activate hold
    await setRetentionHold(
      eventA1._id.toString(),
      true,
      'Academic integrity tribunal review in progress.',
      collegeA._id.toString(),
      superAdmin._id.toString(),
      superAdmin.username
    );

    const holdEvent = await Event.findById(eventA1._id);
    if (!holdEvent?.retentionHold || holdEvent.cleanupStatus !== 'hold') {
      throw new Error('Retention hold flag was not properly set.');
    }

    // Attempt cleanup on hold event
    const holdCleanupResult = await executeCleanupJob({
      eventId: eventA1._id.toString(),
      dryRun: false
    });

    if (holdCleanupResult.eventsProcessed !== 0) {
      throw new Error(
        `Expected 0 events processed due to retention hold, got ${holdCleanupResult.eventsProcessed}`
      );
    }
    console.log('✅ Retention hold strictly prevented cleanup of expired event.');

    // 5. Test Dry-Run Engine
    console.log('\n--- TEST 5: Dry-Run Cleanup Engine Simulation ---');
    // Lift retention hold
    await setRetentionHold(
      eventA1._id.toString(),
      false,
      'Tribunal review complete.',
      collegeA._id.toString(),
      superAdmin._id.toString(),
      superAdmin.username
    );

    const dryRunResult = await executeCleanupJob({
      eventId: eventA1._id.toString(),
      dryRun: true
    });

    if (!dryRunResult.isDryRun) {
      throw new Error('Expected dryRun flag to be true.');
    }
    if (dryRunResult.totalMilestones !== 2 || dryRunResult.totalViolations !== 2) {
      throw new Error(
        `Dry run miscounted records: milestones=${dryRunResult.totalMilestones}, violations=${dryRunResult.totalViolations}`
      );
    }

    // Verify ZERO documents were actually deleted in DB
    const countMilestonesAfterDryRun = await CodeMilestone.countDocuments({
      userId: userA1_1._id
    });
    const countViolationsAfterDryRun = await ViolationLog.countDocuments({
      userId: userA1_1._id
    });
    if (countMilestonesAfterDryRun !== 2 || countViolationsAfterDryRun !== 2) {
      throw new Error('Dry run mutated the database!');
    }

    const auditDryRun = await CleanupAudit.findOne({
      jobId: dryRunResult.jobId
    });
    if (!auditDryRun || !auditDryRun.isDryRun || auditDryRun.status !== 'success') {
      throw new Error('CleanupAudit record missing or incorrect for dry-run.');
    }
    console.log('✅ Dry-run computed exact telemetry counts and logged audit with 0 mutations.');

    // 6. Test Distributed Lock & Concurrency Rejection
    console.log('\n--- TEST 6: Distributed Lease Lock Concurrency Protection ---');
    // Acquire lease artificially
    await CleanupLock.create({
      lockKey: 'cleanup_engine_singleton',
      holderId: 'external_worker_99',
      acquiredAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    let lockRejected = false;
    try {
      await executeCleanupJob({ eventId: eventA1._id.toString() });
    } catch (err: any) {
      if (err.message.includes('Concurrent cleanup job is already active')) {
        lockRejected = true;
      }
    }

    if (!lockRejected) {
      throw new Error('Distributed lock failed to reject concurrent execution!');
    }

    // Release artificial lock
    await CleanupLock.deleteOne({ lockKey: 'cleanup_engine_singleton' });
    console.log('✅ Distributed lock successfully rejected concurrent cleanup execution.');

    // 7. Test Precision Live Purge & Detail Compaction
    console.log('\n--- TEST 7: Live Precision Purge & Detail Compaction ---');
    const liveCleanupResult = await executeCleanupJob({
      eventId: eventA1._id.toString(),
      dryRun: false
    });

    if (liveCleanupResult.eventsProcessed !== 1) {
      throw new Error(`Expected 1 event processed, got ${liveCleanupResult.eventsProcessed}`);
    }

    // Verify Event A1 Telemetry Purged
    const a1Milestones = await CodeMilestone.countDocuments({ userId: userA1_1._id });
    const a1Violations = await ViolationLog.countDocuments({ userId: userA1_1._id });
    if (a1Milestones !== 0 || a1Violations !== 0) {
      throw new Error(
        `Event A1 telemetry not completely deleted! Milestones: ${a1Milestones}, Violations: ${a1Violations}`
      );
    }

    // Verify Attempt Detail Compaction
    const compactedAttempt = await Attempt.findOne({
      userId: userA1_1._id,
      questionId: question._id
    });
    if (!compactedAttempt) {
      throw new Error('Attempt was deleted instead of compacted!');
    }
    if (compactedAttempt.retentionStatus !== 'compacted' || !compactedAttempt.prunedAt) {
      throw new Error('Attempt retentionStatus was not set to compacted.');
    }
    if (compactedAttempt.testCaseResults && compactedAttempt.testCaseResults.length > 0) {
      throw new Error('testCaseResults array was not unset from Attempt.');
    }
    if (
      compactedAttempt.score !== 90 ||
      compactedAttempt.code !== 'def reverse_array(arr): return arr[::-1]'
    ) {
      throw new Error('Candidate solution code or score was corrupted during compaction!');
    }

    // Verify MULTI-TENANT ISOLATION: Live Event A2 and College B Event B1 must be UNTOUCHED
    const a2Milestones = await CodeMilestone.countDocuments({ userId: userA2_1._id });
    const a2Violations = await ViolationLog.countDocuments({ userId: userA2_1._id });
    const b1Milestones = await CodeMilestone.countDocuments({ userId: userB1_1._id });
    const b1Violations = await ViolationLog.countDocuments({ userId: userB1_1._id });

    if (a2Milestones !== 1 || a2Violations !== 1) {
      throw new Error('Cross-event contamination: Live Event A2 telemetry was deleted!');
    }
    if (b1Milestones !== 1 || b1Violations !== 1) {
      throw new Error('Cross-tenant contamination: College B Event B1 telemetry was deleted!');
    }

    console.log('✅ Telemetry safely pruned; Attempt compacted; Multi-tenant boundaries strictly isolated.');

    // 8. Test Mathematical Leaderboard Invariant
    console.log('\n--- TEST 8: Mathematical Proof of Historical Leaderboard Invariant ---');
    const hashAfterCleanup = await computeLeaderboardFingerprint(eventA1._id);
    if (hashBeforeFinalization !== hashAfterCleanup) {
      throw new Error(
        `Leaderboard fingerprint mismatch! Pre: ${hashBeforeFinalization}, Post: ${hashAfterCleanup}`
      );
    }
    console.log(`✅ Mathematical Leaderboard Invariant Proven: ${hashBeforeFinalization} === ${hashAfterCleanup}`);

    // 9. Test Write-on-Read Protection (Flaw 1 Guard)
    console.log('\n--- TEST 9: Write-on-Read Protection (Suspicion Score Guard) ---');
    const suspicionReport = await recalculateUserSuspicion(userA1_1._id.toString(), 1);
    const progressAfterRecalc = await RoundProgress.findOne({ userId: userA1_1._id, roundNumber: 1 });

    if (progressAfterRecalc?.suspicionScore !== 65 || progressAfterRecalc?.suspicionLevel !== 'high') {
      throw new Error(
        `Write-on-read flaw! Suspicion score was corrupted from 65 to ${progressAfterRecalc?.suspicionScore}`
      );
    }
    if (suspicionReport.totalScore !== 65 || suspicionReport.level !== 'high') {
      throw new Error('Suspicion report failed to return frozen historical score.');
    }
    console.log('✅ Write-on-read protection confirmed: Historical suspicion score preserved at 65.');

    // 10. Test Idempotency
    console.log('\n--- TEST 10: Cleanup Engine Idempotency ---');
    const secondCleanup = await executeCleanupJob({
      eventId: eventA1._id.toString(),
      dryRun: false
    });
    if (secondCleanup.eventsProcessed !== 0) {
      throw new Error('Repeat cleanup run was not idempotent; processed already cleaned event.');
    }
    console.log('✅ Idempotency confirmed: Repeat cleanup execution performed zero operations.');

    console.log('\n================================================================');
    console.log('🏆 ALL 10 DATA LIFECYCLE & RETENTION VERIFICATION TESTS PASSED!');
    console.log('================================================================\n');
  } finally {
    await teardown();
  }
}

runLifecycleVerification().catch((err) => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
