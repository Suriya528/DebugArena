import crypto from 'crypto';
import mongoose, { Types } from 'mongoose';
import { Event, IEvent } from '../models/Event.js';
import { User } from '../models/User.js';
import { CodeMilestone } from '../models/CodeMilestone.js';
import { ViolationLog } from '../models/ViolationLog.js';
import { Attempt } from '../models/Attempt.js';
import { CleanupLock } from '../models/CleanupLock.js';
import { CleanupAudit, ICleanupAudit } from '../models/CleanupAudit.js';
import { computeLeaderboardFingerprint } from './lifecycleService.js';
import { broadcastToAdmins } from './socketService.js';

export interface ICleanupOptions {
  eventId?: string;
  collegeId?: string;
  dryRun?: boolean;
  actorId?: string;
  actorUsername?: string;
  batchSize?: number;
}

export interface ICleanupResult {
  jobId: string;
  isDryRun: boolean;
  eventsProcessed: number;
  totalMilestones: number;
  totalViolations: number;
  totalAttemptsCompacted: number;
  totalBytesReclaimed: number;
  audits: ICleanupAudit[];
}

const LOCK_KEY = 'cleanup_engine_singleton';
const LEASE_DURATION_MS = 10 * 60 * 1000; // 10 minutes
const HEARTBEAT_INTERVAL_MS = 30 * 1000; // 30 seconds

/**
 * Sleeps for the specified number of milliseconds to yield CPU and DB I/O.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Splits an array into smaller chunks.
 */
function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Acquires a distributed lease lock on CleanupLock.
 */
async function acquireDistributedLock(workerId: string): Promise<boolean> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LEASE_DURATION_MS);

  try {
    const lock = await CleanupLock.findOneAndUpdate(
      {
        lockKey: LOCK_KEY,
        $or: [{ expiresAt: { $lt: now } }, { holderId: workerId }]
      },
      {
        $set: {
          holderId: workerId,
          acquiredAt: now,
          expiresAt
        }
      },
      { upsert: true, new: true }
    );

    return !!lock && lock.holderId === workerId;
  } catch (err: any) {
    // Duplicate key error (E11000) indicates lock is currently held by another worker
    return false;
  }
}

/**
 * Extends the distributed lease lock expiration (heartbeat).
 */
async function renewDistributedLock(workerId: string): Promise<boolean> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LEASE_DURATION_MS);

  const updated = await CleanupLock.findOneAndUpdate(
    { lockKey: LOCK_KEY, holderId: workerId },
    { $set: { expiresAt } }
  );

  return !!updated;
}

/**
 * Releases the distributed lock.
 */
async function releaseDistributedLock(workerId: string): Promise<void> {
  try {
    await CleanupLock.deleteOne({ lockKey: LOCK_KEY, holderId: workerId });
  } catch (err) {
    // Ignore errors during release
  }
}

/**
 * Executes a deterministic, audited data retention and cleanup job.
 * Enforces distributed leasing, pre/post leaderboard hash preservation,
 * and user-chunked batch processing.
 */
export async function executeCleanupJob(options: ICleanupOptions = {}): Promise<ICleanupResult> {
  const jobId = `cleanup-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const workerId = `worker-${process.pid}-${jobId}`;
  const isDryRun = options.dryRun ?? (process.env.DATA_CLEANUP_DRY_RUN === 'true');
  const userBatchSize = options.batchSize || 50;
  const actorId = options.actorId || 'SYSTEM_SCHEDULER';
  const audits: ICleanupAudit[] = [];

  // 1. Acquire Distributed Lock
  const lockAcquired = await acquireDistributedLock(workerId);
  if (!lockAcquired) {
    throw new Error('Concurrent cleanup job is already active. Lease lock acquisition rejected.');
  }

  // 2. Start Heartbeat Timer
  const heartbeatTimer = setInterval(async () => {
    try {
      await renewDistributedLock(workerId);
    } catch (err) {
      console.warn('[CleanupEngine] Heartbeat renewal warning:', err);
    }
  }, HEARTBEAT_INTERVAL_MS);

  let totalMilestones = 0;
  let totalViolations = 0;
  let totalAttemptsCompacted = 0;
  let totalBytesReclaimed = 0;
  let eventsProcessed = 0;

  try {
    // 3. Discover Candidate Events
    const query: any = {};
    if (options.eventId) {
      query._id = options.eventId;
    } else {
      query.status = 'finalized';
      query.cleanupStatus = { $in: ['none', 'eligible'] };
      query.retentionHold = false;
      query.retentionExpiresAt = { $lte: new Date() };
    }

    if (options.collegeId) {
      query.collegeId = options.collegeId;
    }

    const candidateEvents = await Event.find(query);

    for (const event of candidateEvents) {
      // PRE-FLIGHT COMPOSITE PREDICATE VALIDATION
      if (event.status !== 'finalized') {
        continue;
      }
      if (event.retentionHold) {
        continue;
      }
      if (!event.retentionExpiresAt || new Date() < new Date(event.retentionExpiresAt)) {
        continue;
      }

      eventsProcessed++;

      // Compute Pre-Flight Leaderboard Hash
      const hashBefore = await computeLeaderboardFingerprint(event._id);

      const audit = new CleanupAudit({
        jobId,
        collegeId: event.collegeId,
        eventId: event._id,
        executedBy: actorId,
        isDryRun,
        policyVersion: event.retentionPolicyVersion || 1,
        startedAt: new Date(),
        status: 'running',
        leaderboardHashBefore: hashBefore,
        recordsScanned: { milestones: 0, violations: 0, attempts: 0 },
        recordsPruned: { milestones: 0, violations: 0, attempts: 0 },
        bytesReclaimedEstimated: 0
      });
      await audit.save();

      // Find all participants for this event (Multi-tenant scoped)
      const participants = await User.find({
        eventId: event._id,
        role: 'participant'
      }).select('_id');

      const userIds = participants.map((p) => p._id);
      const userChunks = chunkArray(userIds, userBatchSize);

      let eventMilestones = 0;
      let eventViolations = 0;
      let eventAttempts = 0;

      for (const chunk of userChunks) {
        // Milestone Pruning
        const milestoneCount = await CodeMilestone.countDocuments({ userId: { $in: chunk } });
        eventMilestones += milestoneCount;

        if (!isDryRun && milestoneCount > 0) {
          await CodeMilestone.deleteMany({ userId: { $in: chunk } });
        }

        // ViolationLog Pruning
        const violationCount = await ViolationLog.countDocuments({ userId: { $in: chunk } });
        eventViolations += violationCount;

        if (!isDryRun && violationCount > 0) {
          await ViolationLog.deleteMany({ userId: { $in: chunk } });
        }

        // Attempt Compaction
        const attemptCount = await Attempt.countDocuments({
          userId: { $in: chunk },
          retentionStatus: { $ne: 'compacted' }
        });
        eventAttempts += attemptCount;

        if (!isDryRun && attemptCount > 0) {
          await Attempt.updateMany(
            {
              userId: { $in: chunk },
              retentionStatus: { $ne: 'compacted' }
            },
            {
              $set: {
                retentionStatus: 'compacted',
                prunedAt: new Date()
              },
              $unset: { testCaseResults: 1 }
            }
          );
        }

        // Yield I/O to avoid starvation of live event traffic
        await sleep(50);
      }

      // Estimate Reclaimed Storage
      // CodeMilestone: ~1000 bytes, ViolationLog: ~300 bytes, Attempt test traces: ~2500 bytes
      const eventBytes =
        eventMilestones * 1000 + eventViolations * 300 + eventAttempts * 2500;

      totalMilestones += eventMilestones;
      totalViolations += eventViolations;
      totalAttemptsCompacted += eventAttempts;
      totalBytesReclaimed += eventBytes;

      // Post-Flight Leaderboard Verification
      const hashAfter = await computeLeaderboardFingerprint(event._id);

      audit.recordsScanned = {
        milestones: eventMilestones,
        violations: eventViolations,
        attempts: eventAttempts
      };
      audit.recordsPruned = {
        milestones: isDryRun ? 0 : eventMilestones,
        violations: isDryRun ? 0 : eventViolations,
        attempts: isDryRun ? 0 : eventAttempts
      };
      audit.bytesReclaimedEstimated = eventBytes;
      audit.leaderboardHashAfter = hashAfter;
      audit.completedAt = new Date();

      if (hashBefore !== hashAfter) {
        // Critical Integrity Alert: Leaderboard hash mismatch!
        audit.status = 'integrity_alert';
        audit.error = `CRITICAL: Leaderboard fingerprint mismatch! Before: ${hashBefore}, After: ${hashAfter}`;
        await audit.save();

        event.cleanupStatus = 'failed_verification';
        event.retentionHold = true;
        event.retentionHoldReason = 'Automated hold: Leaderboard fingerprint mismatch during cleanup.';
        await event.save();

        throw new Error(
          `Integrity failure on event ${event._id}: Leaderboard fingerprint changed during cleanup.`
        );
      }

      audit.status = 'success';
      await audit.save();
      audits.push(audit);

      if (!isDryRun) {
        event.cleanupStatus = 'completed';
        event.status = 'cleaned';
        event.cleanedAt = new Date();
        event.cleanupStats = {
          milestonesDeleted: eventMilestones,
          violationsDeleted: eventViolations,
          attemptsPruned: eventAttempts,
          reclaimedBytesEstimated: eventBytes
        };
        await event.save();

        broadcastToAdmins('admin:event_cleaned', {
          eventId: event._id.toString(),
          stats: event.cleanupStats
        });
      }
    }
  } finally {
    clearInterval(heartbeatTimer);
    await releaseDistributedLock(workerId);
  }

  return {
    jobId,
    isDryRun,
    eventsProcessed,
    totalMilestones,
    totalViolations,
    totalAttemptsCompacted,
    totalBytesReclaimed,
    audits
  };
}
