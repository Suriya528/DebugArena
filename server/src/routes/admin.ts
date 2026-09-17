import { Router, Response } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { authenticate, requireAnyAdmin, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { Event } from '../models/Event.js';
import { Competition } from '../models/Competition.js';
import { Round } from '../models/Round.js';
import { Question } from '../models/Question.js';
import { Attempt } from '../models/Attempt.js';
import { RoundProgress } from '../models/RoundProgress.js';
import { ViolationLog } from '../models/ViolationLog.js';
import { TieBreak } from '../models/TieBreak.js';
import { DynamicRound } from '../models/DynamicRound.js';
import { AuditLog } from '../models/AuditLog.js';
import { broadcastToParticipants, broadcastToAdmins, emitToUser } from '../services/socketService.js';
import { finalizeParticipantRoundScore } from '../services/scoringService.js';

export const adminRouter = Router();

adminRouter.use(authenticate);
adminRouter.use(requireAnyAdmin);

// GET /api/admin/competition
adminRouter.get('/competition', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let competition = await Competition.findOne();
    if (!competition) {
      competition = await Competition.create({
        title: 'DebugArena College Championship 2026',
        status: 'not_started',
        currentRoundNumber: 1
      });
    }
    res.json({ competition });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch competition' });
  }
});

// PATCH /api/admin/competition
adminRouter.patch('/competition', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, status, violationLimit, autoSubmitOnViolation, currentRoundNumber } = req.body;
    let competition = await Competition.findOne();
    if (!competition) competition = new Competition();

    if (title !== undefined) competition.title = title;
    if (status !== undefined) competition.status = status;
    if (violationLimit !== undefined) competition.violationLimit = violationLimit;
    if (autoSubmitOnViolation !== undefined) competition.autoSubmitOnViolation = autoSubmitOnViolation;
    if (currentRoundNumber !== undefined) competition.currentRoundNumber = currentRoundNumber;

    await competition.save();
    broadcastToParticipants('competition:status_change', { status: competition.status });
    broadcastToAdmins('admin:competition_update', { competition });

    res.json({ competition });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update competition' });
  }
});

// GET /api/admin/rounds
adminRouter.get('/rounds', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const rounds = await Round.find().sort({ roundNumber: 1 });
    res.json({ rounds });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rounds' });
  }
});

// POST /api/admin/rounds/:roundNumber/start
adminRouter.post('/rounds/:roundNumber/start', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const roundNumber = parseInt(req.params.roundNumber, 10);
    const eventId = (req.query.eventId as string) || req.user?.eventId;

    let dynamicRound = null;
    if (eventId) {
      dynamicRound = await DynamicRound.findOne({ eventId, roundNumber });
      if (dynamicRound) {
        dynamicRound.status = 'active';
        dynamicRound.startedAt = new Date();
        dynamicRound.endedAt = null;
        await dynamicRound.save();
      }
    }

    const round = await Round.findOne({ roundNumber });
    if (round) {
      round.status = 'active';
      round.startedAt = new Date();
      round.endedAt = null;
      await round.save();
    }

    if (!round && !dynamicRound) {
      res.status(404).json({ error: 'Round not found' });
      return;
    }

    const effectiveRound = dynamicRound || round!;

    // Update competition currentRoundNumber
    await Competition.updateOne({}, { currentRoundNumber: roundNumber, status: 'active' });

    // Mark eligible participants as in_progress (Preserving submitted or eliminated status)
    if (roundNumber === 1) {
      const userFilter: any = { role: 'participant', isDisqualified: false };
      if (req.user?.eventId) {
        userFilter.eventId = req.user.eventId;
      }
      const participants = await User.find(userFilter);
      for (const p of participants) {
        const existing = await RoundProgress.findOne({ userId: p._id, roundNumber: 1 });
        if (!existing) {
          await RoundProgress.create({
            userId: p._id,
            roundNumber: 1,
            status: 'in_progress',
            startedAt: effectiveRound.startedAt || new Date()
          });
        } else if (existing.status === 'not_started') {
          existing.status = 'in_progress';
          existing.startedAt = effectiveRound.startedAt || new Date();
          await existing.save();
        }
      }
    } else {
      // For Round 2 and 3, only advanced participants from this event start
      const userFilter: any = { role: 'participant', isDisqualified: false };
      if (req.user?.eventId) {
        userFilter.eventId = req.user.eventId;
      }
      const eligibleUsers = await User.find(userFilter).distinct('_id');

      const advancedFromPrev = await RoundProgress.find({
        userId: { $in: eligibleUsers },
        roundNumber: roundNumber - 1,
        status: 'advanced'
      });
      for (const adv of advancedFromPrev) {
        const existing = await RoundProgress.findOne({ userId: adv.userId, roundNumber });
        if (!existing) {
          await RoundProgress.create({
            userId: adv.userId,
            roundNumber,
            status: 'in_progress',
            startedAt: effectiveRound.startedAt || new Date()
          });
        } else if (existing.status === 'not_started') {
          existing.status = 'in_progress';
          existing.startedAt = effectiveRound.startedAt || new Date();
          await existing.save();
        }
      }
    }

    broadcastToParticipants('round:started', {
      roundNumber,
      title: effectiveRound.title,
      durationMinutes: effectiveRound.durationMinutes,
      startedAt: effectiveRound.startedAt
    });
    broadcastToAdmins('admin:round_started', { roundNumber });

    res.json({ success: true, round: effectiveRound });
  } catch (err) {
    console.error('Start round error:', err);
    res.status(500).json({ error: 'Failed to start round' });
  }
});

// POST /api/admin/rounds/:roundNumber/lock
adminRouter.post('/rounds/:roundNumber/lock', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const roundNumber = parseInt(req.params.roundNumber, 10);
    const eventId = (req.query.eventId as string) || req.user?.eventId;

    let dynamicRound = null;
    if (eventId) {
      dynamicRound = await DynamicRound.findOne({ eventId, roundNumber });
      if (dynamicRound) {
        dynamicRound.status = 'locked';
        dynamicRound.endedAt = new Date();
        await dynamicRound.save();
      }
    }

    const round = await Round.findOne({ roundNumber });
    if (round) {
      round.status = 'locked';
      round.endedAt = new Date();
      await round.save();
    }

    if (!round && !dynamicRound) {
      res.status(404).json({ error: 'Round not found' });
      return;
    }

    const effectiveRound = dynamicRound || round!;

    // Auto-grade/sweep in_progress participants for this tenant
    const userFilter: any = { role: 'participant' };
    if (req.user?.collegeId) userFilter.collegeId = req.user.collegeId;
    if (req.user?.eventId) userFilter.eventId = req.user.eventId;
    const tenantUsers = await User.find(userFilter).select('_id');
    const tenantUserIds = tenantUsers.map(u => u._id);

    const activeParticipants = await RoundProgress.find({
      roundNumber,
      userId: { $in: tenantUserIds },
      status: { $in: ['in_progress', 'not_started'] }
    });

    for (const p of activeParticipants) {
      await finalizeParticipantRoundScore(p.userId.toString(), roundNumber);
    }

    broadcastToParticipants('round:locked', {
      roundNumber,
      message: `Round ${roundNumber} has been locked by the administrator.`
    });
    broadcastToAdmins('admin:round_locked', { roundNumber });

    res.json({ success: true, round: effectiveRound });
  } catch (err) {
    res.status(500).json({ error: 'Failed to lock round' });
  }
});

// GET /api/admin/rounds/:roundNumber/results
adminRouter.get('/rounds/:roundNumber/results', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const roundNumber = parseInt(req.params.roundNumber, 10);
    const userFilter: any = { role: 'participant' };
    const eventId = (req.query.eventId as string) || req.user?.eventId;
    const eventObjId = eventId && mongoose.Types.ObjectId.isValid(eventId) ? new mongoose.Types.ObjectId(eventId) : null;
    const eventCondition = eventObjId ? { $in: [eventId, eventObjId] } : eventId;

    if (eventId) {
      userFilter.eventId = eventCondition;
    } else if (req.user?.collegeId) {
      userFilter.collegeId = req.user.collegeId;
    }

    const tenantParticipants = await User.find(userFilter).select('_id username name isDisqualified disqualificationReason');
    const tenantUserIds = tenantParticipants.map(u => u._id);

    let roundMeta: any = null;
    let eventRounds: any[] = [];
    if (eventId) {
      roundMeta = await DynamicRound.findOne({ eventId: eventCondition, roundNumber });
      eventRounds = await DynamicRound.find({ eventId: eventCondition }).sort({ roundNumber: 1 });
    }
    if (!eventId) {
      if (!roundMeta) {
        roundMeta = await Round.findOne({ roundNumber });
      }
      if (eventRounds.length === 0) {
        eventRounds = await Round.find().sort({ roundNumber: 1 });
      }
    }

    const progressRecords = await RoundProgress.find({
      roundNumber,
      userId: { $in: tenantUserIds }
    });

    const progressMap = new Map<string, any>();
    for (const pr of progressRecords) {
      progressMap.set(pr.userId.toString(), pr);
    }

    // For round > 1, check previous round's progress to know who was advanced
    let prevRoundProgressMap = new Map<string, any>();
    if (roundNumber > 1) {
      const prevProgress = await RoundProgress.find({
        roundNumber: roundNumber - 1,
        userId: { $in: tenantUserIds }
      });
      for (const pr of prevProgress) {
        prevRoundProgressMap.set(pr.userId.toString(), pr);
      }
    }

    // Determine candidates for this stage:
    // - For Round 1: all enrolled participants in this event
    // - For Round > 1: participants who have progress in this round OR who were advanced in roundNumber - 1
    const stageCandidates = tenantParticipants.filter(p => {
      const uid = p._id.toString();
      if (progressMap.has(uid)) return true;
      if (roundNumber === 1) return true;
      const prevProg = prevRoundProgressMap.get(uid);
      return prevProg && prevProg.status === 'advanced';
    });

    const candidateRows = stageCandidates.map(p => {
      const uid = p._id.toString();
      const prog = progressMap.get(uid);
      const totalScore = prog?.totalScore || 0;
      const timeTakenSeconds = prog?.timeTakenSeconds || 0;
      const status = prog?.status || 'not_started';
      const submittedAt = prog?.submittedAt || null;
      const violationCount = prog?.violationCount || 0;

      return {
        userId: {
          _id: p._id,
          username: p.username,
          name: p.name,
          isDisqualified: p.isDisqualified,
          disqualificationReason: p.disqualificationReason
        },
        totalScore,
        timeTakenSeconds,
        status,
        submittedAt,
        violationCount
      };
    });

    // Sort: disqualified at bottom, then totalScore DESC, timeTakenSeconds ASC, submittedAt ASC
    candidateRows.sort((a, b) => {
      const aDisq = a.userId?.isDisqualified;
      const bDisq = b.userId?.isDisqualified;
      if (aDisq && !bDisq) return 1;
      if (!aDisq && bDisq) return -1;
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (a.timeTakenSeconds !== b.timeTakenSeconds) return a.timeTakenSeconds - b.timeTakenSeconds;
      const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : Infinity;
      const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : Infinity;
      return aTime - bTime;
    });

    const results = candidateRows.map((r, idx) => ({
      rank: idx + 1,
      ...r
    }));

    res.json({ roundNumber, roundMeta, rounds: eventRounds, results });
  } catch (err) {
    console.error('Get round results error:', err);
    res.status(500).json({ error: 'Failed to fetch round results' });
  }
});

// POST /api/admin/rounds/:roundNumber/advance
// Admin selects who advances to next round, everyone else in tenant is marked eliminated
adminRouter.post('/rounds/:roundNumber/advance', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const roundNumber = parseInt(req.params.roundNumber, 10);
    const { participantIds, eventId: bodyEventId } = req.body; // Array of user ID strings

    if (!Array.isArray(participantIds)) {
      res.status(400).json({ error: 'participantIds array is required' });
      return;
    }

    const eventId = bodyEventId || req.user?.eventId;
    const eventObjId = eventId && mongoose.Types.ObjectId.isValid(eventId) ? new mongoose.Types.ObjectId(eventId) : null;
    const eventCondition = eventObjId ? { $in: [eventId, eventObjId] } : eventId;

    const userFilter: any = { role: 'participant' };
    if (eventId) {
      userFilter.eventId = eventCondition;
    } else if (req.user?.collegeId) {
      userFilter.collegeId = req.user.collegeId;
    }
    const tenantUsers = await User.find(userFilter).select('_id');
    const tenantUserIds = tenantUsers.map(u => u._id);

    // Mark selected participants as 'advanced' in current round (upserting if not present)
    for (const pId of participantIds) {
      await RoundProgress.findOneAndUpdate(
        { roundNumber, userId: pId },
        { $set: { status: 'advanced' } },
        { upsert: true }
      );
    }

    // Mark non-selected participants of this event who took or were eligible for this round as 'eliminated'
    const participantIdStrings = new Set(participantIds.map(id => id.toString()));
    const nonSelectedIds = tenantUserIds.filter(id => !participantIdStrings.has(id.toString()));
    for (const pId of nonSelectedIds) {
      await RoundProgress.findOneAndUpdate(
        { roundNumber, userId: pId },
        { $set: { status: 'eliminated' } },
        { upsert: true }
      );
    }

    broadcastToAdmins('admin:participants_advanced', {
      roundNumber,
      advancedCount: participantIds.length
    });

    broadcastToParticipants('round:advancement_announced', {
      roundNumber,
      advancedUserIds: participantIds
    });

    let nextRoundMeta: any = null;
    if (eventId) {
      nextRoundMeta = await DynamicRound.findOne({ eventId: eventCondition, roundNumber: roundNumber + 1 });
    }
    const nextStageName = nextRoundMeta?.title
      ? `Stage ${roundNumber + 1} (${nextRoundMeta.title})`
      : `Round ${roundNumber + 1}`;

    res.json({
      success: true,
      message: `Advanced ${participantIds.length} participants to ${nextStageName}`
    });
  } catch (err) {
    console.error('Advance error:', err);
    res.status(500).json({ error: 'Failed to advance participants' });
  }
});

// POST /api/admin/rounds/:roundNumber/auto-advance
// Automatically evaluates participants against configured round quota, resolves ties, excludes disqualified users, and advances the top N
adminRouter.post('/rounds/:roundNumber/auto-advance', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const roundNumber = parseInt(req.params.roundNumber, 10);
    const { quota: bodyQuota, eventId: bodyEventId, tieStrategy = 'expand', forceOverride = false } = req.body;

    const eventId = bodyEventId || req.user?.eventId;
    const eventObjId = eventId && mongoose.Types.ObjectId.isValid(eventId) ? new mongoose.Types.ObjectId(eventId) : null;
    const eventCondition = eventObjId ? { $in: [eventId, eventObjId] } : eventId;

    // Check if next round is already active
    let nextRound: any = null;
    if (eventId) {
      nextRound = await DynamicRound.findOne({ eventId: eventCondition, roundNumber: roundNumber + 1 });
    }
    if (!eventId && !nextRound) {
      nextRound = await Round.findOne({ roundNumber: roundNumber + 1 });
    }
    if (nextRound && nextRound.status === 'active' && !forceOverride) {
      const nextTitle = nextRound.title ? `Stage ${roundNumber + 1} (${nextRound.title})` : `Round ${roundNumber + 1}`;
      res.status(400).json({
        error: `${nextTitle} is already active! Re-advancement requires emergency forceOverride confirmation.`
      });
      return;
    }

    // Lookup dynamic round for quota if not explicitly passed
    let effectiveQuota = bodyQuota;
    let effectiveTieStrategy = tieStrategy;
    if (eventId) {
      const dynRound = await DynamicRound.findOne({ eventId: eventCondition, roundNumber });
      if (dynRound) {
        if (!effectiveQuota && dynRound.advancementQuota > 0) {
          effectiveQuota = dynRound.advancementQuota;
        }
        if (dynRound.tieResolutionStrategy) {
          effectiveTieStrategy = dynRound.tieResolutionStrategy;
        }
      }
    }

    // Default fallback quota if unspecified
    const quota = effectiveQuota && effectiveQuota > 0 ? effectiveQuota : 15;

    // Fetch all eligible (non-disqualified) participants in this event
    const userFilter: any = { role: 'participant', isDisqualified: false };
    if (eventId) {
      userFilter.eventId = eventCondition;
    } else if (req.user?.collegeId) {
      userFilter.collegeId = req.user.collegeId;
    }
    const eligibleParticipants = await User.find(userFilter);
    const eligibleUserIds = eligibleParticipants.map(u => u._id);

    // Fetch round progress for this round
    const progressList = await RoundProgress.find({
      roundNumber,
      userId: { $in: eligibleUserIds }
    }).populate('userId', 'username name isDisqualified');

    // Only consider participants who took the round
    const activeProgress = progressList.filter(p => p.userId && !(p.userId as any).isDisqualified);

    // Sort by totalScore DESC, timeTakenSeconds ASC, submittedAt ASC
    activeProgress.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (a.timeTakenSeconds !== b.timeTakenSeconds) return a.timeTakenSeconds - b.timeTakenSeconds;
      const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : Infinity;
      const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : Infinity;
      return aTime - bTime;
    });

    // Auto-Advancement with Boundary Tie Handling
    let selectedProgress: typeof activeProgress = [];
    let cutoffTieDetected = false;

    if (activeProgress.length <= quota) {
      selectedProgress = [...activeProgress];
    } else {
      selectedProgress = activeProgress.slice(0, quota);
      const lastSelected = selectedProgress[selectedProgress.length - 1];

      // Check for ties at the boundary
      const boundaryScore = lastSelected.totalScore;
      const boundaryTime = lastSelected.timeTakenSeconds;
      const boundarySubmittedAt = lastSelected.submittedAt ? new Date(lastSelected.submittedAt).getTime() : 0;

      const tiedCandidates = activeProgress.slice(quota).filter(
        p => p.totalScore === boundaryScore && p.timeTakenSeconds === boundaryTime
      );

      if (tiedCandidates.length > 0) {
        cutoffTieDetected = true;
        if (effectiveTieStrategy === 'expand') {
          // Rule: expand — automatically advance tied candidates beyond quota
          selectedProgress = selectedProgress.concat(tiedCandidates);
        } else if (effectiveTieStrategy === 'strict') {
          // Rule: strict — trim everyone sharing the boundary score/time to strictly obey <= quota
          selectedProgress = selectedProgress.filter(
            p => !(p.totalScore === boundaryScore && p.timeTakenSeconds === boundaryTime)
          );
        } else if (effectiveTieStrategy === 'earliest_submission') {
          // Rule: earliest_submission — already ordered by submittedAt.
          // Check if any candidate has the exact same submittedAt as lastSelected
          const exactTiedCandidates = tiedCandidates.filter(
            p => (p.submittedAt ? new Date(p.submittedAt).getTime() : 0) === boundarySubmittedAt
          );
          if (exactTiedCandidates.length === 0) {
            cutoffTieDetected = false; // Successfully resolved by submission timestamp
          }
        }
      }
    }

    const advancedUserIds = selectedProgress.map(p => (p.userId as any)._id || p.userId);
    const advancedIdStrings = advancedUserIds.map(id => id.toString());

    // Mark selected as advanced
    for (const uId of advancedUserIds) {
      await RoundProgress.findOneAndUpdate(
        { roundNumber, userId: uId },
        { $set: { status: 'advanced' } },
        { upsert: true }
      );
    }

    // Mark non-selected participants for this round as eliminated
    const nonSelectedEligible = eligibleUserIds.filter(id => !advancedIdStrings.includes(id.toString()));
    for (const uId of nonSelectedEligible) {
      await RoundProgress.findOneAndUpdate(
        { roundNumber, userId: uId },
        { $set: { status: 'eliminated' } },
        { upsert: true }
      );
    }

    // Socket Notifications
    broadcastToAdmins('admin:participants_advanced', {
      roundNumber,
      advancedCount: advancedUserIds.length,
      quota,
      cutoffTieDetected,
      tieExpanded: selectedProgress.length > quota
    });

    broadcastToParticipants('round:advancement_announced', {
      roundNumber,
      advancedUserIds: advancedIdStrings
    });

    // Record Audit Log
    try {
      await AuditLog.create({
        adminId: req.user!.userId,
        adminUsername: req.user!.username,
        eventId: eventId,
        action: 'AUTO_ADVANCEMENT_EXECUTED',
        targetType: 'DynamicRound',
        targetId: roundNumber.toString(),
        details: {
          roundNumber,
          quota,
          advancedCount: advancedUserIds.length,
          cutoffTieDetected,
          tieStrategy: effectiveTieStrategy,
          advancedUserIds: advancedIdStrings
        },
        reason: `Auto-advancement with quota ${quota} completed`
      });
    } catch (auditErr) {
      console.warn('Could not write audit log for auto-advancement:', auditErr);
    }

    const nextStageName = nextRound?.title ? `Stage ${roundNumber + 1} (${nextRound.title})` : `Round ${roundNumber + 1}`;
    res.json({
      success: true,
      message: `Auto-advanced ${advancedUserIds.length} participants into ${nextStageName}`,
      advancedCount: advancedUserIds.length,
      cutoffTieDetected,
      expanded: selectedProgress.length > quota,
      tieExpanded: selectedProgress.length > quota,
      targetQuota: quota
    });
  } catch (err) {
    console.error('Auto-advance error:', err);
    res.status(500).json({ error: 'Failed to auto-advance participants' });
  }
});

// GET /api/admin/participants
adminRouter.get('/participants', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userFilter: any = { role: 'participant' };
    if (req.user?.collegeId) userFilter.collegeId = req.user.collegeId;
    if (req.query.eventId) {
      userFilter.eventId = req.query.eventId;
    } else if (req.user?.eventId) {
      userFilter.eventId = req.user.eventId;
    }

    const participants = await User.find(userFilter).populate('eventId', 'name code').sort({ createdAt: -1 });
    const participantIds = participants.map(p => p._id);
    const progressList = await RoundProgress.find({ userId: { $in: participantIds } });
    const violations = await ViolationLog.find({ userId: { $in: participantIds } });

    const participantData = participants.map(p => {
      const userProgress = progressList.filter(pr => pr.userId.toString() === p._id.toString());
      const userViolations = violations.filter(v => v.userId.toString() === p._id.toString());
      const totalScore = userProgress.reduce((sum, pr) => sum + pr.totalScore, 0);

      return {
        id: p._id,
        username: p.username,
        name: p.name,
        department: p.department,
        year: p.year,
        regNo: p.regNo,
        eventId: p.eventId?._id || p.eventId,
        eventName: (p.eventId as any)?.name || 'General Tournament',
        eventCode: (p.eventId as any)?.code || null,
        isDisqualified: p.isDisqualified,
        disqualificationReason: p.disqualificationReason,
        rounds: userProgress.map(pr => ({
          roundNumber: pr.roundNumber,
          status: pr.status,
          score: pr.totalScore,
          timeTakenSeconds: pr.timeTakenSeconds,
          violationCount: pr.violationCount
        })),
        totalScore,
        violationCount: userViolations.length,
        createdAt: p.createdAt
      };
    });

    res.json({ participants: participantData });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch participants' });
  }
});

// POST /api/admin/participants
adminRouter.post('/participants', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { username, password, name, department, year, regNo, eventId: bodyEventId } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    let effectiveEventId = bodyEventId || req.user?.eventId;
    if (!effectiveEventId) {
      const latestEvent = await Event.findOne({
        $or: [
          { ownerId: req.user!.userId },
          { collegeId: req.user?.collegeId }
        ]
      }).sort({ createdAt: -1 });
      if (latestEvent) {
        effectiveEventId = latestEvent._id.toString();
      }
    }

    const cleanUsername = username.toLowerCase().trim();
    const effectiveName = (name && name.trim()) ? name.trim() : cleanUsername;
    const cleanRegNo = (regNo || cleanUsername).trim().toUpperCase();

    // Event-scoped duplicate check: allow same username in different tournaments
    const duplicateQuery: any = {
      role: 'participant',
      $or: [{ username: cleanUsername }, { regNo: cleanRegNo }]
    };
    if (effectiveEventId) {
      duplicateQuery.eventId = effectiveEventId;
    }

    const existing = await User.findOne(duplicateQuery);
    if (existing) {
      res.status(409).json({
        error: `Participant '${cleanUsername}' already exists in this event.`
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: cleanUsername,
      name: effectiveName,
      passwordHash,
      role: 'participant',
      collegeId: req.user?.collegeId,
      eventId: effectiveEventId,
      department: department ? String(department).trim() : 'CSE',
      year: year ? String(year).trim() : 'III',
      regNo: cleanRegNo,
      status: 'active'
    });

    res.status(201).json({
      success: true,
      participant: {
        id: user._id,
        username: user.username,
        name: user.name,
        department: user.department,
        year: user.year,
        regNo: user.regNo,
        eventId: user.eventId
      }
    });
  } catch (err: any) {
    console.error('Failed to create participant:', err);
    res.status(500).json({ error: err.message || 'Failed to create participant' });
  }
});

// POST /api/admin/participants/bulk
adminRouter.post('/participants/bulk', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { participants, eventId: bodyEventId } = req.body;
    if (!Array.isArray(participants) || participants.length === 0) {
      res.status(400).json({ error: 'Array of participants is required' });
      return;
    }

    let effectiveEventId = bodyEventId || req.user?.eventId;
    if (!effectiveEventId) {
      const latestEvent = await Event.findOne({
        $or: [
          { ownerId: req.user!.userId },
          { collegeId: req.user?.collegeId }
        ]
      }).sort({ createdAt: -1 });
      if (latestEvent) {
        effectiveEventId = latestEvent._id.toString();
      }
    }

    const created = [];
    const errors = [];

    for (const item of participants) {
      try {
        if (!item.username || !item.password) {
          errors.push({ item, error: 'Missing username or password' });
          continue;
        }

        const cleanUsername = item.username.toLowerCase().trim();
        const effectiveName = (item.name && item.name.trim()) ? item.name.trim() : cleanUsername;
        const cleanRegNo = (item.regNo || cleanUsername).trim().toUpperCase();

        const duplicateQuery: any = {
          role: 'participant',
          $or: [{ username: cleanUsername }, { regNo: cleanRegNo }]
        };
        if (effectiveEventId) duplicateQuery.eventId = effectiveEventId;

        const existing = await User.findOne(duplicateQuery);
        if (existing) {
          errors.push({ item, error: `Participant '${cleanUsername}' already exists in this tournament` });
          continue;
        }

        const passwordHash = await bcrypt.hash(item.password, 10);
        const user = await User.create({
          username: cleanUsername,
          name: effectiveName,
          passwordHash,
          role: 'participant',
          collegeId: req.user?.collegeId,
          eventId: effectiveEventId,
          department: item.department ? String(item.department).trim() : 'CSE',
          year: item.year ? String(item.year).trim() : 'III',
          regNo: cleanRegNo,
          status: 'active'
        });
        created.push({ id: user._id, username: user.username, name: user.name, regNo: user.regNo });
      } catch (e: any) {
        errors.push({ item, error: e.message });
      }
    }

    res.json({
      success: true,
      createdCount: created.length,
      errorCount: errors.length,
      created,
      errors
    });
  } catch (err: any) {
    console.error('Failed to bulk import participants:', err);
    res.status(500).json({ error: err.message || 'Failed to bulk import participants' });
  }
});

// PATCH /api/admin/participants/:id/disqualify
adminRouter.patch('/participants/:id/disqualify', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { isDisqualified, reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (req.user?.collegeId && user.collegeId?.toString() !== req.user.collegeId.toString()) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    user.isDisqualified = isDisqualified;
    user.disqualificationReason = isDisqualified ? (reason || 'Disqualified by Administrator') : undefined;
    await user.save();

    broadcastToAdmins('admin:participant_disqualified', {
      userId: user._id,
      username: user.username,
      isDisqualified,
      reason: user.disqualificationReason
    });

    if (isDisqualified) {
      emitToUser(user._id.toString(), 'participant:disqualified', {
        reason: user.disqualificationReason
      });
    }

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update disqualification status' });
  }
});

// POST /api/admin/participants/:id/reset-attempt
adminRouter.post('/participants/:id/reset-attempt', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { roundNumber } = req.body;
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (req.user?.collegeId && user.collegeId?.toString() !== req.user.collegeId.toString()) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await Attempt.deleteMany({ userId, roundNumber });
    await RoundProgress.deleteOne({ userId, roundNumber });
    await ViolationLog.deleteMany({ userId, roundNumber });

    res.json({ success: true, message: `Reset attempt for Round ${roundNumber}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset attempt' });
  }
});

// GET /api/admin/questions
adminRouter.get('/questions', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const roundNumber = req.query.roundNumber ? parseInt(req.query.roundNumber as string, 10) : undefined;
    const eventId = req.query.eventId as string | undefined;

    const filter: Record<string, any> = {};
    if (roundNumber) filter.roundNumber = roundNumber;
    if (eventId) {
      filter.$or = [{ eventId }, { eventId: null }, { eventId: { $exists: false } }];
    }

    let questions = await Question.find(filter).sort({ roundNumber: 1, orderIndex: 1 });
    if (questions.length === 0 && roundNumber) {
      questions = await Question.find({ roundNumber }).sort({ orderIndex: 1 });
    }

    res.json({ questions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// POST /api/admin/questions/seed-round
adminRouter.post('/questions/seed-round', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { roundNumber, eventId } = req.body;
    if (!roundNumber) {
      res.status(400).json({ error: 'roundNumber is required' });
      return;
    }

    const { DEFAULT_ROUND_1_MCQS, DEFAULT_ROUND_2_CODING, DEFAULT_ROUND_3_CODING, DEFAULT_TIE_BREAKER_QUESTION } = await import('../services/defaultQuestions.js');
    let sourceQuestions: any[] = [];
    if (roundNumber === 1) sourceQuestions = DEFAULT_ROUND_1_MCQS;
    else if (roundNumber === 2) sourceQuestions = DEFAULT_ROUND_2_CODING;
    else if (roundNumber === 3) sourceQuestions = DEFAULT_ROUND_3_CODING;
    else if (roundNumber === 99) sourceQuestions = [DEFAULT_TIE_BREAKER_QUESTION];

    const targetEventId = eventId || req.user?.eventId;
    const targetCollegeId = req.user?.collegeId;

    const created = await Question.create(
      sourceQuestions.map(q => ({
        ...q,
        roundNumber,
        eventId: targetEventId,
        collegeId: targetCollegeId
      }))
    );

    res.json({ success: true, count: created.length, questions: created });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to seed round questions' });
  }
});

// POST /api/admin/questions
adminRouter.post('/questions', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const data = { ...req.body };
    if (!data.collegeId && req.user?.collegeId) {
      data.collegeId = req.user.collegeId;
    }
    if (!data.collegeId && data.eventId) {
      const evt = await Event.findById(data.eventId);
      if (evt?.collegeId) data.collegeId = evt.collegeId;
    }
    const question = await Question.create(data);
    res.json({ success: true, question });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create question' });
  }
});

// PUT /api/admin/questions/:id
adminRouter.put('/questions/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const question = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, question });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update question' });
  }
});

// DELETE /api/admin/questions/:id
adminRouter.delete('/questions/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await Question.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Question deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// GET /api/admin/tiebreak/check
// Identifies participants tied on BOTH total score AND total time taken
adminRouter.get('/tiebreak/check', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userFilter: any = { role: 'participant' };
    const eventId = (req.query.eventId as string) || req.user?.eventId;
    const eventObjId = eventId && mongoose.Types.ObjectId.isValid(eventId) ? new mongoose.Types.ObjectId(eventId) : null;
    const eventCondition = eventObjId ? { $in: [eventId, eventObjId] } : eventId;

    if (eventId) {
      userFilter.eventId = eventCondition;
    } else if (req.user?.collegeId) {
      userFilter.collegeId = req.user.collegeId;
    }
    const tenantParticipants = await User.find(userFilter).select('_id');
    const tenantUserIds = tenantParticipants.map(u => u._id);

    let finalRoundNumber = 3;
    if (eventId) {
      const highestRound = await DynamicRound.findOne({ eventId: eventCondition }).sort({ roundNumber: -1 });
      if (highestRound) {
        finalRoundNumber = highestRound.roundNumber;
      }
    }

    // Get all final stage participants for tenant
    const round3Progress = await RoundProgress.find({ roundNumber: finalRoundNumber, userId: { $in: tenantUserIds } })
      .populate('userId', 'username name');

    // Aggregate total score and total time across all rounds
    const allProgress = await RoundProgress.find({ userId: { $in: tenantUserIds } })
      .populate('userId', 'username name isDisqualified');

    const participantTotals = new Map<string, {
      userId: any;
      username: string;
      name: string;
      totalScore: number;
      totalTimeSeconds: number;
      r3Score: number;
      isDisqualified: boolean;
    }>();

    for (const pr of allProgress) {
      if (!pr.userId || (pr.userId as any).isDisqualified) continue;
      const uid = (pr.userId as any)._id.toString();
      const existing = participantTotals.get(uid) || {
        userId: (pr.userId as any)._id,
        username: (pr.userId as any).username,
        name: (pr.userId as any).name,
        totalScore: 0,
        totalTimeSeconds: 0,
        r3Score: 0,
        isDisqualified: (pr.userId as any).isDisqualified
      };

      existing.totalScore += pr.totalScore;
      existing.totalTimeSeconds += pr.timeTakenSeconds;
      if (pr.roundNumber === finalRoundNumber) existing.r3Score = pr.totalScore;
      participantTotals.set(uid, existing);
    }

    const participants = Array.from(participantTotals.values());

    // Group by totalScore and totalTimeSeconds
    const groups = new Map<string, typeof participants>();
    for (const p of participants) {
      const key = `${p.totalScore}_${p.totalTimeSeconds}`;
      const list = groups.get(key) || [];
      list.push(p);
      groups.set(key, list);
    }

    // Tied groups with >= 2 participants
    const tiedGroups = Array.from(groups.values()).filter(g => g.length >= 2);

    res.json({
      hasTies: tiedGroups.length > 0,
      tiedGroups
    });
  } catch (err) {
    console.error('Check tie-break error:', err);
    res.status(500).json({ error: 'Failed to check tie-break status' });
  }
});

// POST /api/admin/tiebreak/trigger
adminRouter.post('/tiebreak/trigger', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tiedUserIds, questionId, durationMinutes } = req.body;

    const tieBreak = await TieBreak.create({
      tiedUserIds,
      questionId,
      durationMinutes: durationMinutes || 15,
      status: 'active',
      startedAt: new Date(),
      results: []
    });

    broadcastToParticipants('tiebreak:started', {
      tieBreakId: tieBreak._id,
      tiedUserIds,
      durationMinutes: tieBreak.durationMinutes
    });

    res.json({ success: true, tieBreak });
  } catch (err) {
    res.status(500).json({ error: 'Failed to trigger tie-break' });
  }
});

// POST /api/admin/tiebreak/resolve
adminRouter.post('/tiebreak/resolve', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tieBreakId, resolvedOrder } = req.body; // Array of { userId, resolvedRank }
    const tieBreak = await TieBreak.findById(tieBreakId);
    if (!tieBreak) {
      res.status(404).json({ error: 'TieBreak session not found' });
      return;
    }

    tieBreak.status = 'completed';
    tieBreak.endedAt = new Date();
    tieBreak.results = resolvedOrder.map((item: any) => ({
      userId: item.userId,
      score: item.score || 0,
      timeTakenSeconds: item.timeTakenSeconds || 0,
      resolvedRank: item.resolvedRank
    }));
    await tieBreak.save();

    res.json({ success: true, tieBreak });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resolve tie-break' });
  }
});

// GET /api/admin/leaderboard
// Comprehensive leaderboard based on the event's configured rounds with scores, time, and tiebreak reordering
adminRouter.get('/leaderboard', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userFilter: any = { role: 'participant' };
    const eventId = (req.query.eventId as string) || req.user?.eventId;
    const eventObjId = eventId && mongoose.Types.ObjectId.isValid(eventId) ? new mongoose.Types.ObjectId(eventId) : null;
    const eventCondition = eventObjId ? { $in: [eventId, eventObjId] } : eventId;

    if (eventId) {
      userFilter.eventId = eventCondition;
    } else if (req.user?.collegeId) {
      userFilter.collegeId = req.user.collegeId;
    }

    // Fetch the actual rounds for this event
    let eventRounds: any[] = [];
    if (eventId) {
      eventRounds = await DynamicRound.find({ eventId: eventCondition })
        .select('roundNumber title type durationMinutes totalMarks passingMarks status')
        .sort({ roundNumber: 1 });
    }
    if (!eventId && (!eventRounds || eventRounds.length === 0)) {
      const fallbackRounds = await Round.find().select('roundNumber title type durationMinutes status').sort({ roundNumber: 1 });
      eventRounds = fallbackRounds.map(r => ({
        roundNumber: r.roundNumber,
        title: r.title,
        type: r.type,
        durationMinutes: r.durationMinutes,
        totalMarks: r.roundNumber === 1 ? 100 : r.roundNumber === 2 ? 150 : 200,
        status: r.status
      }));
    }

    const participants = await User.find(userFilter);
    const participantIds = participants.map(p => p._id);
    const allProgress = await RoundProgress.find({ userId: { $in: participantIds } });
    const tieBreaks = await TieBreak.find({ status: 'completed', tiedUserIds: { $in: participantIds } });

    const eventRoundNums = new Set(eventRounds.map(er => er.roundNumber));

    const rows = participants.map(p => {
      const userProg = allProgress.filter(pr => pr.userId.toString() === p._id.toString());

      // Map scores and metrics for every configured round
      const roundBreakdown: Record<number, any> = {};
      const roundScores: Record<number, number> = {};
      const roundTimes: Record<number, number> = {};

      for (const er of eventRounds) {
        const prog = userProg.find(pr => pr.roundNumber === er.roundNumber);
        const score = prog?.totalScore || 0;
        const timeSec = prog?.timeTakenSeconds || 0;
        const status = prog?.status || 'not_started';
        roundScores[er.roundNumber] = score;
        roundTimes[er.roundNumber] = timeSec;
        roundBreakdown[er.roundNumber] = {
          roundNumber: er.roundNumber,
          title: er.title,
          type: er.type,
          score,
          timeSeconds: timeSec,
          status,
          violationCount: prog?.violationCount || 0
        };
      }

      // Legacy fallback fields (r1Score, r2Score, r3Score)
      const r1Score = roundScores[1] || 0;
      const r2Score = roundScores[2] || 0;
      const r3Score = roundScores[3] || 0;
      const r1Time = roundTimes[1] || 0;
      const r2Time = roundTimes[2] || 0;
      const r3Time = roundTimes[3] || 0;

      // Dynamic total score & time strictly across this event's configured rounds
      const regularProg = eventRoundNums.size > 0
        ? userProg.filter(pr => eventRoundNums.has(pr.roundNumber))
        : userProg.filter(pr => pr.roundNumber !== 99);
      const totalScore = regularProg.reduce((acc, curr) => acc + (curr.totalScore || 0), 0);
      const totalTimeSeconds = regularProg.reduce((acc, curr) => acc + (curr.timeTakenSeconds || 0), 0);

      // Check tie-break resolved rank
      let tieBreakRankOffset = 0;
      for (const tb of tieBreaks) {
        const match = tb.results.find(r => r.userId.toString() === p._id.toString());
        if (match) {
          tieBreakRankOffset = match.resolvedRank;
        }
      }

      const sortedProg = [...regularProg].sort((a, b) => b.roundNumber - a.roundNumber);
      const lastStatus = sortedProg[0]?.status || 'not_started';

      return {
        userId: p._id,
        username: p.username,
        name: p.name,
        isDisqualified: p.isDisqualified,
        r1Score,
        r2Score,
        r3Score,
        roundScores,
        roundTimes,
        roundBreakdown,
        totalScore,
        r1Time,
        r2Time,
        r3Time,
        totalTimeSeconds,
        tieBreakRankOffset,
        lastStatus
      };
    });

    // Sort leaderboard: disqualified at bottom, then totalScore DESC, then tieBreakRankOffset ASC (if present), then totalTimeSeconds ASC
    rows.sort((a, b) => {
      if (a.isDisqualified && !b.isDisqualified) return 1;
      if (!a.isDisqualified && b.isDisqualified) return -1;
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (a.tieBreakRankOffset && b.tieBreakRankOffset) {
        return a.tieBreakRankOffset - b.tieBreakRankOffset;
      }
      return a.totalTimeSeconds - b.totalTimeSeconds;
    });

    const rankedRows = rows.map((r, i) => ({
      rank: i + 1,
      ...r
    }));

    res.json({
      rounds: eventRounds,
      leaderboard: rankedRows
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to generate leaderboard' });
  }
});
