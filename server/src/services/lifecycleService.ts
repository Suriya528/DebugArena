import crypto from 'crypto';
import mongoose, { Types } from 'mongoose';
import { Event, IEvent } from '../models/Event.js';
import { User } from '../models/User.js';
import { RoundProgress } from '../models/RoundProgress.js';
import { TieBreak } from '../models/TieBreak.js';
import { Attempt } from '../models/Attempt.js';
import { AuditLog } from '../models/AuditLog.js';
import { broadcastToAdmins } from './socketService.js';

export interface IFinalizeResult {
  event: IEvent;
  leaderboardFingerprint: string;
  participantCount: number;
}

/**
 * Computes a deterministic SHA-256 fingerprint of the official tournament standings
 * based strictly on permanent facts: User (identity & rank), RoundProgress (scores), and TieBreak.
 */
export async function computeLeaderboardFingerprint(eventId: string | Types.ObjectId): Promise<string> {
  const eId = new mongoose.Types.ObjectId(eventId.toString());
  const participants = await User.find({ eventId: eId, role: 'participant' })
    .select('_id username isDisqualified')
    .sort({ _id: 1 })
    .lean();

  const userIds = participants.map((p) => p._id);

  const progressRecords = await RoundProgress.find({ userId: { $in: userIds } })
    .select('userId roundNumber totalScore timeTakenSeconds status suspicionScore')
    .sort({ userId: 1, roundNumber: 1 })
    .lean();

  const tieBreaks = await TieBreak.find({ tiedUserIds: { $in: userIds } })
    .select('questionId status results')
    .lean();

  const canonicalPayload = {
    eventId: eId.toString(),
    participants: participants.map((p) => ({
      id: p._id.toString(),
      u: p.username,
      d: !!p.isDisqualified
    })),
    progress: progressRecords.map((pr) => ({
      u: pr.userId.toString(),
      rn: pr.roundNumber,
      s: pr.totalScore,
      t: pr.timeTakenSeconds,
      st: pr.status,
      susp: pr.suspicionScore || 0
    })),
    tieBreaks: tieBreaks.map((tb) => ({
      q: tb.questionId.toString(),
      st: tb.status,
      results: (tb.results || []).map((r) => ({
        u: r.userId.toString(),
        s: r.score,
        t: r.timeTakenSeconds,
        rk: r.resolvedRank
      }))
    }))
  };

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(canonicalPayload))
    .digest('hex');
}

/**
 * Formally seals and finalizes a tournament event, transitioning it to read-only
 * and calculating the deterministic retention expiration date for telemetry cleanup.
 */
export async function finalizeEvent(
  eventId: string,
  collegeId?: string,
  actorId?: string,
  actorUsername: string = 'System Admin',
  retentionDays: number = 30
): Promise<IFinalizeResult> {
  const query: any = { _id: eventId };
  if (collegeId) query.collegeId = collegeId;

  const event = await Event.findOne(query);
  if (!event) {
    throw new Error('Event not found or unauthorized for this tenant.');
  }

  if (event.status === 'finalized' || event.status === 'cleaned') {
    throw new Error(`Event is already ${event.status}. Cannot re-finalize.`);
  }

  // Pre-condition: Event must be completed or frozen before finalization
  if (event.status !== 'completed' && event.status !== 'frozen') {
    throw new Error(
      `Cannot finalize event in '${event.status}' state. Event must be 'completed' or 'frozen' first.`
    );
  }

  // Pre-condition: Verify no attempts are stuck in 'evaluating' or 'pending'
  const participants = await User.find({ eventId: event._id, role: 'participant' }).select('_id');
  const userIds = participants.map((p) => p._id);

  const pendingAttempts = await Attempt.countDocuments({
    userId: { $in: userIds },
    status: { $in: ['evaluating', 'pending'] as any }
  });

  if (pendingAttempts > 0) {
    throw new Error(
      `Cannot finalize event: ${pendingAttempts} submissions are still being evaluated by the judge.`
    );
  }

  const finalizedAt = new Date();
  const effectiveRetentionDays = Math.max(1, retentionDays || 30);
  const retentionExpiresAt = new Date(finalizedAt.getTime() + effectiveRetentionDays * 86400000);

  const fingerprint = await computeLeaderboardFingerprint(event._id);

  event.status = 'finalized';
  event.finalizedAt = finalizedAt;
  event.retentionDays = effectiveRetentionDays;
  event.retentionExpiresAt = retentionExpiresAt;
  event.retentionPolicyVersion = 1;
  event.cleanupStatus = 'none';
  await event.save();

  // Audit record
  if (actorId) {
    await AuditLog.create({
      adminId: new Types.ObjectId(actorId),
      adminUsername: actorUsername,
      collegeId: event.collegeId,
      eventId: event._id,
      action: 'EVENT_FINALIZED',
      targetType: 'Event',
      targetId: event._id.toString(),
      details: {
        retentionDays: effectiveRetentionDays,
        retentionExpiresAt,
        leaderboardFingerprint: fingerprint,
        participantCount: userIds.length
      },
      reason: 'Official tournament finalization and retention anchor established.'
    });
  }

  broadcastToAdmins('admin:event_finalized', {
    eventId: event._id.toString(),
    finalizedAt,
    retentionExpiresAt
  });

  return {
    event,
    leaderboardFingerprint: fingerprint,
    participantCount: userIds.length
  };
}

/**
 * Toggles an academic integrity retention hold on an event, preventing cleanup.
 */
export async function setRetentionHold(
  eventId: string,
  hold: boolean,
  reason: string,
  collegeId?: string,
  actorId?: string,
  actorUsername: string = 'System Admin'
): Promise<IEvent> {
  const query: any = { _id: eventId };
  if (collegeId) query.collegeId = collegeId;

  const event = await Event.findOne(query);
  if (!event) {
    throw new Error('Event not found or unauthorized.');
  }

  if (hold && !reason) {
    throw new Error('A documented reason is required to activate a retention hold.');
  }

  event.retentionHold = hold;
  event.retentionHoldReason = hold ? reason : '';

  if (hold) {
    if (event.cleanupStatus !== 'completed') {
      event.cleanupStatus = 'hold';
    }
  } else {
    // Check if expired
    const isExpired = event.retentionExpiresAt && new Date() >= new Date(event.retentionExpiresAt);
    if (event.cleanupStatus === 'hold') {
      event.cleanupStatus = isExpired ? 'eligible' : 'none';
    }
  }

  await event.save();

  if (actorId) {
    await AuditLog.create({
      adminId: new Types.ObjectId(actorId),
      adminUsername: actorUsername,
      collegeId: event.collegeId,
      eventId: event._id,
      action: hold ? 'RETENTION_HOLD_PLACED' : 'RETENTION_HOLD_REMOVED',
      targetType: 'Event',
      targetId: event._id.toString(),
      details: { hold, reason },
      reason
    });
  }

  broadcastToAdmins('admin:retention_hold_updated', {
    eventId: event._id.toString(),
    retentionHold: hold,
    reason
  });

  return event;
}
