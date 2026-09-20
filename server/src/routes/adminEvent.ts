import { Router, Response } from 'express';
import { authenticate, requireAnyAdmin, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { College } from '../models/College.js';
import { Event } from '../models/Event.js';
import { User } from '../models/User.js';
import { DynamicRound } from '../models/DynamicRound.js';
import { Competition } from '../models/Competition.js';
import { AuditLog } from '../models/AuditLog.js';
import { CleanupAudit } from '../models/CleanupAudit.js';
import { broadcastToAdmins, broadcastToAll, emitToUser } from '../services/socketService.js';
import { finalizeEvent, setRetentionHold } from '../services/lifecycleService.js';
import { Question } from '../models/Question.js';
import { QuestionTemplate } from '../models/QuestionTemplate.js';
import { ViolationLog } from '../models/ViolationLog.js';
import { CodeMilestone } from '../models/CodeMilestone.js';
import { Attempt } from '../models/Attempt.js';
import { RoundProgress } from '../models/RoundProgress.js';
import { TieBreak } from '../models/TieBreak.js';
import { seedEventRoundQuestions } from '../services/defaultQuestions.js';
import { executeCleanupJob } from '../services/cleanupEngine.js';
import { runTestCases, executeSingleTestCase } from '../services/judgeService.js';
import { generateSecureToken, hashToken, encryptToken, decryptToken } from '../utils/tokenUtils.js';
import { finalizeParticipantRoundScore } from '../services/scoringService.js';
import { syncRoundStatus, checkAndExpireRounds } from '../services/timerService.js';

export const adminEventRouter = Router();

// Public metadata check for private admin URL (/control/:adminToken entry page)
// Does NOT leak any secrets or event code - returns only public display title/college
adminEventRouter.get('/control-info/:adminToken', async (req, res): Promise<void> => {
  try {
    const { adminToken } = req.params;
    if (!adminToken) {
      res.status(400).json({ error: 'Control token is required.' });
      return;
    }
    const tokenHash = hashToken(adminToken);
    const event = await Event.findOne({ adminAccessTokenHash: tokenHash }).populate('collegeId', 'name code');
    if (!event) {
      res.status(404).json({ error: 'Invalid or expired tournament control link.' });
      return;
    }

    const collegeObj: any = event.collegeId;
    res.json({
      success: true,
      eventName: event.name,
      collegeName: collegeObj?.name || 'Institution',
      status: event.status
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to verify control link.' });
  }
});

// All subsequent routes require authenticated admin
adminEventRouter.use(authenticate, requireAnyAdmin);

// Helper to log audit actions
async function recordAudit(
  req: AuthenticatedRequest,
  action: string,
  targetType: string,
  targetId?: string,
  details: Record<string, any> = {},
  reason?: string,
  collegeId?: any,
  eventId?: any
) {
  try {
    await AuditLog.create({
      adminId: req.user!.userId,
      adminUsername: req.user!.username,
      collegeId: collegeId || req.user!.collegeId,
      eventId: eventId || req.user!.eventId,
      action,
      targetType,
      targetId,
      details,
      reason: reason || details.reason || '',
      ipAddress: req.ip || ''
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

// -------------------- COLLEGES --------------------

// GET /api/admin/events/colleges
adminEventRouter.get('/colleges', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const filter: Record<string, any> = {};

    if (req.user?.role === 'super_admin') {
      // Global root operators see all colleges
    } else if (req.user?.collegeId) {
      // Return assigned college AND any colleges created by this user
      filter.$or = [
        { _id: req.user.collegeId },
        { createdBy: req.user.userId }
      ];
    } else if (req.user?.userId) {
      // Admin without collegeId sees colleges they created, or default college fallback
      const createdCount = await College.countDocuments({ createdBy: req.user.userId });
      if (createdCount > 0) {
        filter.createdBy = req.user.userId;
      } else {
        const defaultCol = await College.findOne().sort({ createdAt: 1 });
        if (defaultCol) filter._id = defaultCol._id;
      }
    }

    const colleges = await College.find(filter).sort({ name: 1 });
    res.json({ colleges });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch colleges' });
  }
});

// POST /api/admin/events/colleges
adminEventRouter.post('/colleges', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, code, logoUrl, primaryColor, secondaryColor, contactEmail, website, university } = req.body;
    if (!name || !code) {
      res.status(400).json({ error: 'College name and code are required' });
      return;
    }

    const cleanCode = code.toUpperCase().trim();
    const existing = await College.findOne({ code: cleanCode });
    if (existing) {
      res.status(400).json({ error: `College with code ${cleanCode} already exists` });
      return;
    }

    const college = await College.create({
      name: name.trim(),
      code: cleanCode,
      university: university || '',
      logoUrl: logoUrl || '',
      primaryColor: primaryColor || '#6366f1',
      secondaryColor: secondaryColor || '#06b6d4',
      contactEmail: contactEmail || '',
      website: website || '',
      createdBy: req.user?.userId
    });

    // If current organizer had no collegeId bound, bind to this new college
    if (req.user?.userId && !req.user.collegeId) {
      await User.findByIdAndUpdate(req.user.userId, { collegeId: college._id });
    }

    await recordAudit(req, 'COLLEGE_CREATED', 'College', college._id.toString(), { name, code: cleanCode }, '', college._id);
    res.status(201).json({ college });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create college' });
  }
});

// -------------------- EVENTS --------------------

// GET /api/admin/events
adminEventRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const filter: Record<string, any> = {};
    // Multi-Tenant Isolation: Strictly isolate events by college
    if (req.user?.collegeId) {
      filter.collegeId = req.user.collegeId;
    } else if (req.query.collegeId && req.user?.role === 'super_admin') {
      filter.collegeId = req.query.collegeId;
    } else if (req.user?.role !== 'super_admin') {
      const defaultCol = await College.findOne().sort({ createdAt: 1 });
      if (defaultCol) filter.collegeId = defaultCol._id;
    }

    const events = await Event.find(filter).populate('collegeId', 'name code logoUrl primaryColor').sort({ createdAt: -1 });

    const eventIds = events.map(e => e._id);
    const allRounds = await DynamicRound.find({ eventId: { $in: eventIds } })
      .select('eventId roundNumber title type durationMinutes questionCount totalMarks status startedAt')
      .sort({ roundNumber: 1 });

    const roundsByEventId: Record<string, any[]> = {};
    for (const r of allRounds) {
      const eid = r.eventId.toString();
      if (!roundsByEventId[eid]) roundsByEventId[eid] = [];
      roundsByEventId[eid].push(r);
    }

    const sanitizedEvents = await Promise.all(
      events.map(async (ev) => {
        let modified = false;
        let participantToken = decryptToken(ev.participantTokenCipher);
        let adminToken = decryptToken(ev.adminTokenCipher);

        if (!participantToken || !ev.participantAccessTokenHash) {
          participantToken = generateSecureToken(32);
          ev.participantAccessTokenHash = hashToken(participantToken);
          ev.participantTokenCipher = encryptToken(participantToken);
          modified = true;
        }
        if (!adminToken || !ev.adminAccessTokenHash) {
          adminToken = generateSecureToken(32);
          ev.adminAccessTokenHash = hashToken(adminToken);
          ev.adminTokenCipher = encryptToken(adminToken);
          modified = true;
        }
        if (!ev.ownerId && req.user?.userId) {
          ev.ownerId = req.user.userId as any;
          modified = true;
        }
        if (modified) {
          await ev.save();
        }

        const obj = ev.toObject();
        delete (obj as any).participantAccessTokenHash;
        delete (obj as any).adminAccessTokenHash;
        delete (obj as any).participantTokenCipher;
        delete (obj as any).adminTokenCipher;

        const evRounds = roundsByEventId[ev._id.toString()] || [];
        const r1 = evRounds.find((r: any) => r.roundNumber === 1);
        const isRound1Started = Boolean(
          (r1 && (r1.status !== 'pending' || Boolean(r1.startedAt))) ||
          ev.status === 'live' ||
          ev.status === 'completed' ||
          ev.status === 'archived'
        );

        return {
          ...obj,
          rounds: evRounds,
          isRound1Started,
          participantLink: `/join/${ev.code}`,
          adminLink: `/control/${adminToken}`
        };
      })
    );

    res.json({ events: sanitizedEvents });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// POST /api/admin/events
adminEventRouter.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      collegeId,
      name,
      code,
      description,
      bannerUrl,
      rules,
      scoringConfig,
      branding,
      initialRounds
    } = req.body;

    let effectiveCollegeId = collegeId || req.user?.collegeId;

    if (req.user?.role !== 'super_admin' && collegeId && req.user?.collegeId && collegeId.toString() !== req.user.collegeId.toString()) {
      const targetCollege = await College.findById(collegeId);
      if (targetCollege && targetCollege.createdBy?.toString() === req.user.userId?.toString()) {
        effectiveCollegeId = collegeId;
      } else {
        effectiveCollegeId = req.user.collegeId;
      }
    }

    if (!effectiveCollegeId || !name || !code) {
      res.status(400).json({ error: 'collegeId, event name, and event code are required' });
      return;
    }

    const college = await College.findById(effectiveCollegeId);
    if (!college) {
      res.status(404).json({ error: 'College not found' });
      return;
    }

    const cleanCode = code.toUpperCase().trim();
    const existing = await Event.findOne({ code: cleanCode });
    if (existing) {
      res.status(400).json({ error: `Event with code '${cleanCode}' already exists. Please choose a unique code.` });
      return;
    }

    // Mint separate cryptographically secure tokens for participant & admin links
    const participantToken = generateSecureToken(32);
    const adminToken = generateSecureToken(32);
    const participantAccessTokenHash = hashToken(participantToken);
    const adminAccessTokenHash = hashToken(adminToken);
    const participantTokenCipher = encryptToken(participantToken);
    const adminTokenCipher = encryptToken(adminToken);

    const event = await Event.create({
      collegeId: effectiveCollegeId,
      ownerId: req.user!.userId,
      name: name.trim(),
      code: cleanCode,
      description: description || '',
      bannerUrl: bannerUrl || '',
      participantAccessTokenHash,
      adminAccessTokenHash,
      participantTokenCipher,
      adminTokenCipher,
      status: 'draft',
      startedAt: null,
      rules: rules || [
        'Full-screen proctoring is strictly enforced throughout the competition.',
        'Zero negative marking on all debugging challenges.',
        'Tab switching and window minimization incur escalated security strikes.',
        'All code submissions are evaluated server-side.'
      ],
      scoringConfig: scoringConfig || {
        negativeMarking: false,
        tieBreakerPriority: ['codingScore', 'debuggingScore', 'totalTime', 'earliestSubmit'],
        autoSubmitOnTimeUp: true,
        violationLimit: 3,
        autoSubmitOnViolation: true
      },
      branding: branding || {
        customTitle: `${name} | ${college.name}`,
        signatoryName: 'Head of Department',
        signatoryTitle: 'Tournament Director'
      }
    });

    // Create initial dynamic rounds if provided
    const userProvidedRounds = (req.body.rounds && Array.isArray(req.body.rounds) && req.body.rounds.length > 0)
      ? req.body.rounds
      : initialRounds;
    let rawRounds = userProvidedRounds && Array.isArray(userProvidedRounds) && userProvidedRounds.length > 0
      ? userProvidedRounds
      : [
          { roundNumber: 1, title: 'Round 1: Rapid-Fire Debugging MCQs', type: 'mcq', durationMinutes: 15, questionCount: 10, totalMarks: 100, advancementQuota: 15, allowedLanguages: [] },
          { roundNumber: 2, title: 'Round 2: Core Bug Hunting', type: 'debugging', durationMinutes: 30, questionCount: 3, totalMarks: 100, advancementQuota: 10, allowedLanguages: ['python', 'cpp', 'java', 'c', 'javascript'] },
          { roundNumber: 3, title: 'Round 3: Advanced Algorithmic Coding', type: 'coding', durationMinutes: 45, questionCount: 2, totalMarks: 100, advancementQuota: 0, allowedLanguages: ['python', 'cpp', 'java', 'c', 'javascript'] }
        ];

    const createdRounds = [];
    for (let i = 0; i < rawRounds.length; i++) {
      const r = rawRounds[i];
      const sequentialRoundNum = i + 1;
      const isFinalRound = i === rawRounds.length - 1;

      // Determine allowedLanguages based on type
      let resolvedLanguages: string[] = [];
      if (r.type === 'coding' || r.type === 'debugging') {
        resolvedLanguages = (r.allowedLanguages && r.allowedLanguages.length > 0)
          ? r.allowedLanguages
          : ['python', 'cpp', 'java', 'c', 'javascript'];
      } else if (r.type === 'sql') {
        resolvedLanguages = (r.allowedLanguages && r.allowedLanguages.length > 0)
          ? r.allowedLanguages
          : ['sql'];
      } else {
        resolvedLanguages = r.allowedLanguages || [];
      }

      // Final round always has quota 0 (championship round)
      const resolvedQuota = isFinalRound ? 0 : (r.advancementQuota !== undefined ? Math.max(0, parseInt(r.advancementQuota, 10) || 10) : 10);
      const resolvedDuration = Math.max(1, parseInt(r.durationMinutes, 10) || 30);
      const resolvedQuestionCount = Math.max(1, parseInt(r.questionCount, 10) || 5);
      const resolvedTotalMarks = Math.max(1, parseInt(r.totalMarks, 10) || 100);
      const resolvedPassingMarks = Math.max(0, parseInt(r.passingMarks, 10) || 0);
      const resolvedNegativeMarkValue = Math.max(0, parseFloat(r.negativeMarkValue) || 0);

      const newRound = await DynamicRound.create({
        eventId: event._id,
        roundNumber: sequentialRoundNum,
        title: r.title || `Round ${sequentialRoundNum}`,
        description: r.description || '',
        type: r.type || 'debugging',
        durationMinutes: resolvedDuration,
        questionCount: resolvedQuestionCount,
        totalMarks: resolvedTotalMarks,
        passingMarks: resolvedPassingMarks,
        negativeMarkValue: resolvedNegativeMarkValue,
        allowedLanguages: resolvedLanguages,
        advancementQuota: resolvedQuota,
        advancementRule: r.advancementRule || 'top_n',
        tieResolutionStrategy: r.tieResolutionStrategy || 'expand',
        status: 'pending',
        startedAt: null,
        endedAt: null
      });
      createdRounds.push(newRound);
    }

    await recordAudit(req, 'EVENT_CREATED', 'Event', event._id.toString(), { name, code: cleanCode, roundsCount: createdRounds.length }, 'Event created in draft status. Admin must select questions before starting competition.', effectiveCollegeId, event._id);

    const eventObj = event.toObject();
    delete (eventObj as any).participantAccessTokenHash;
    delete (eventObj as any).adminAccessTokenHash;
    delete (eventObj as any).participantTokenCipher;
    delete (eventObj as any).adminTokenCipher;

    res.status(201).json({
      event: eventObj,
      rounds: createdRounds,
      participantAccessToken: participantToken,
      adminAccessToken: adminToken,
      participantLink: `/join/${cleanCode}`,
      adminLink: `/control/${adminToken}`
    });
  } catch (err: any) {
    console.error('Error creating event:', err);
    res.status(500).json({ error: 'Failed to create dynamic event' });
  }
});

// POST /api/admin/events/control-enter
// Security: Private Admin URL + Correct Event Code + Authenticated Admin + Admin Role + Permission for this Event
adminEventRouter.post('/control-enter', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { adminToken, eventCode } = req.body;
    if (!adminToken || !eventCode) {
      res.status(400).json({ error: 'Both Admin Access Token and Event Key (Event Code) are required.' });
      return;
    }

    const tokenHash = hashToken(adminToken.trim());
    const event = await Event.findOne({ adminAccessTokenHash: tokenHash }).populate('collegeId', 'name code logoUrl primaryColor');
    if (!event) {
      res.status(404).json({ error: 'Invalid or expired tournament control link.' });
      return;
    }

    // Role check: Contestants can never manage tournaments
    if (req.user!.role === 'participant') {
      res.status(403).json({ error: 'Contestants are not authorized to access the Event Control Center.' });
      return;
    }

    // Event Key (Event Code) Verification
    const cleanKey = eventCode.trim().toUpperCase();
    if (event.code !== cleanKey) {
      res.status(403).json({ error: `Incorrect Event Key. Please enter the valid Event Code for "${event.name}".` });
      return;
    }

    // Permission check: Organizer must own the event or be super_admin
    const isOwner = event.ownerId && event.ownerId.toString() === req.user!.userId.toString();
    const isSuper = req.user!.role === 'super_admin';
    if (!isOwner && !isSuper) {
      res.status(403).json({ error: 'You do not have management permissions for this tournament.' });
      return;
    }

    const rounds = await DynamicRound.find({ eventId: event._id }).sort({ roundNumber: 1 });
    for (const r of rounds) {
      await syncRoundStatus(r);
    }

    const eventObj = event.toObject();
    delete (eventObj as any).participantAccessTokenHash;
    delete (eventObj as any).adminAccessTokenHash;
    delete (eventObj as any).participantTokenCipher;
    delete (eventObj as any).adminTokenCipher;

    await recordAudit(req, 'EVENT_CONTROL_ENTERED', 'Event', event._id.toString(), { code: event.code }, 'Admin entered Event Control Center via private URL', event.collegeId, event._id);

    res.json({
      success: true,
      eventId: event._id,
      event: eventObj,
      rounds,
      participantLink: `/join/${event.code}`,
      adminLink: `/control/${adminToken.trim()}`
    });
  } catch (err) {
    console.error('Failed to enter event control:', err);
    res.status(500).json({ error: 'Failed to enter Event Control Center.' });
  }
});

// GET /api/admin/events/manage/:adminToken (legacy compatibility)
adminEventRouter.get('/manage/:adminToken', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { adminToken } = req.params;
    if (!adminToken) {
      res.status(400).json({ error: 'Admin access token is required' });
      return;
    }
    const tokenHash = hashToken(adminToken);
    const event = await Event.findOne({ adminAccessTokenHash: tokenHash }).populate('collegeId', 'name code logoUrl primaryColor');
    if (!event) {
      res.status(404).json({ error: 'Invalid or expired admin management link' });
      return;
    }

    // Authorization: User must be an administrator and the event owner or super_admin
    const isOwner = event.ownerId && event.ownerId.toString() === req.user!.userId.toString();
    const isSuper = req.user!.role === 'super_admin';
    if (!isOwner && !isSuper) {
      res.status(403).json({ error: 'You are not authorized to manage this event.' });
      return;
    }

    const rounds = await DynamicRound.find({ eventId: event._id }).sort({ roundNumber: 1 });
    for (const r of rounds) {
      await syncRoundStatus(r);
    }

    const eventObj = event.toObject();
    delete (eventObj as any).participantAccessTokenHash;
    delete (eventObj as any).adminAccessTokenHash;
    delete (eventObj as any).participantTokenCipher;
    delete (eventObj as any).adminTokenCipher;

    res.json({
      event: eventObj,
      rounds,
      participantLink: `/join/${event.code}`,
      adminLink: `/control/${adminToken}`
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to access event management' });
  }
});

// POST /api/admin/events/:eventId/regenerate-admin-link
adminEventRouter.post('/:eventId/regenerate-admin-link', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const isOwner = event.ownerId && event.ownerId.toString() === req.user!.userId.toString();
    const isSuper = req.user!.role === 'super_admin';
    if (!isOwner && !isSuper) {
      res.status(403).json({ error: 'Only the event owner or super admin can regenerate admin link' });
      return;
    }

    const newAdminToken = generateSecureToken(32);
    event.adminAccessTokenHash = hashToken(newAdminToken);
    event.adminTokenCipher = encryptToken(newAdminToken);
    await event.save();

    await recordAudit(req, 'EVENT_ADMIN_LINK_REGENERATED', 'Event', event._id.toString(), {}, 'Old admin link invalidated, new token generated', event.collegeId, event._id);

    res.json({
      message: 'Admin management link regenerated successfully. Old link has been invalidated.',
      adminAccessToken: newAdminToken,
      adminLink: `/control/${newAdminToken}`
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to regenerate admin link' });
  }
});

// POST /api/admin/events/:eventId/validate
adminEventRouter.post('/:eventId/validate', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    const rounds = await DynamicRound.find({ eventId: event._id }).sort({ roundNumber: 1 });
    if (rounds.length === 0) {
      errors.push('Event must have at least one competition round configured.');
    }

    let totalQuestions = 0;
    for (const round of rounds) {
      const selectedIds = Array.isArray(round.selectedQuestionIds) ? round.selectedQuestionIds : [];
      const qCount = selectedIds.length;
      totalQuestions += qCount;
      if (qCount === 0) {
        errors.push(`Round ${round.roundNumber} ("${round.title}") has 0 questions selected. Admin must select questions from the Master Question Bank.`);
      } else if (qCount < round.questionCount) {
        errors.push(`Round ${round.roundNumber} ("${round.title}") requires ${round.questionCount} questions but only ${qCount} are selected (${round.questionCount - qCount} more required).`);
      }
      if (round.durationMinutes <= 0) {
        errors.push(`Round ${round.roundNumber} duration must be greater than 0 minutes.`);
      }
    }

    const participantCount = await User.countDocuments({ eventId: event._id, role: 'participant' });
    if (participantCount === 0) {
      warnings.push('No participants have registered or been added to this event yet.');
    }

    const isValid = errors.length === 0;
    event.isSetupValid = isValid;
    event.validationErrors = errors;
    if (isValid && event.status === 'draft') {
      event.status = 'ready';
    }
    await event.save();

    res.json({
      isValid,
      status: event.status,
      errors,
      warnings,
      checklist: {
        roundsConfigured: rounds.length > 0,
        roundsCount: rounds.length,
        questionsConfigured: totalQuestions > 0,
        totalQuestions,
        participantsCount: participantCount,
        scoringConfigured: Boolean(event.scoringConfig)
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to validate event setup' });
  }
});

// POST /api/admin/events/:eventId/publish
adminEventRouter.post('/:eventId/publish', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const rounds = await DynamicRound.find({ eventId: event._id }).sort({ roundNumber: 1 });
    for (const r of rounds) {
      const selectedIds = Array.isArray(r.selectedQuestionIds) ? r.selectedQuestionIds : [];
      const targetCount = r.questionCount || (r.type === 'mcq' ? 10 : 3);
      if (selectedIds.length < targetCount) {
        res.status(400).json({
          error: `Cannot publish event. No individual round can start until every configured round has its complete question set. Round ${r.roundNumber} requires ${targetCount} questions but only ${selectedIds.length} are selected.`,
          incompleteRound: r.roundNumber
        });
        return;
      }
    }

    event.status = 'live';
    event.publishedAt = new Date();
    if (!event.startedAt) event.startedAt = new Date();
    await event.save();

    broadcastToAll('event:published', { eventId: event._id, name: event.name });
    res.json({ message: 'Event published and is now LIVE', event });
  } catch (err) {
    res.status(500).json({ error: 'Failed to publish event' });
  }
});

// POST /api/admin/events/:eventId/start
adminEventRouter.post('/:eventId/start', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const rounds = await DynamicRound.find({ eventId: event._id }).sort({ roundNumber: 1 });
    if (rounds.length === 0) {
      res.status(400).json({ error: 'Cannot start event. At least one competition round must be configured.' });
      return;
    }

    const incompleteRounds: Array<{ roundNumber: number; title: string; assignedCount: number; requiredCount: number; missingCount: number }> = [];
    for (const r of rounds) {
      const selectedIds = Array.isArray(r.selectedQuestionIds) ? r.selectedQuestionIds : [];
      const runtimeQCount = await Question.countDocuments({ eventId: event._id, roundNumber: r.roundNumber });
      const assignedCount = Math.max(selectedIds.length, runtimeQCount);
      const targetCount = r.questionCount || (r.type === 'mcq' ? 10 : 3);
      if (assignedCount < targetCount) {
        incompleteRounds.push({
          roundNumber: r.roundNumber,
          title: r.title,
          assignedCount,
          requiredCount: targetCount,
          missingCount: Math.max(0, targetCount - assignedCount)
        });
      }
    }

    if (incompleteRounds.length > 0) {
      const summaryList = incompleteRounds
        .map(r => `Round ${r.roundNumber} ("${r.title}"): ${r.assignedCount}/${r.requiredCount} questions selected (${r.missingCount} more required)`)
        .join('; ');
      res.status(400).json({
        error: `Cannot start event. No individual round can start until every configured round has its complete question set. Please select questions for incomplete rounds: ${summaryList}`,
        incompleteRounds
      });
      return;
    }

    const now = new Date();
    event.status = 'live';
    event.startedAt = now;
    event.isSetupValid = true;
    await event.save();

    const round1 = await DynamicRound.findOne({ eventId: event._id, roundNumber: 1 });
    if (round1) {
      round1.status = 'active';
      round1.startedAt = now;
      await round1.save();
    }

    // Keep Competition model in sync with live event
    await Competition.findOneAndUpdate(
      {},
      {
        title: event.name,
        currentRoundNumber: 1,
        status: 'active',
        violationLimit: event.scoringConfig?.violationLimit || 3,
        autoSubmitOnViolation: true
      },
      { upsert: true }
    );

    const eventIdStr = event._id.toString();
    broadcastToAll('event:started', { eventId: event._id, startedAt: now, currentRound: 1 }, eventIdStr);
    if (round1) {
      broadcastToAll('round:started', {
        eventId: eventIdStr,
        roundNumber: 1,
        title: round1.title,
        type: round1.type,
        durationMinutes: round1.durationMinutes,
        startedAt: now
      }, eventIdStr);
    }

    await recordAudit(req, 'EVENT_STARTED', 'Event', event._id.toString(), { startedAt: now, roundsCount: rounds.length }, '', event.collegeId, event._id);

    res.json({ message: 'Event is now LIVE!', event, startedAt: now });
  } catch (err) {
    console.error('Start event error:', err);
    res.status(500).json({ error: 'Failed to start event' });
  }
});

// POST /api/admin/events/:eventId/populate-round-questions
adminEventRouter.post('/:eventId/populate-round-questions', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const seededStats = await seedEventRoundQuestions(event._id, event.collegeId);
    res.json({
      success: true,
      message: `Standard questions populated for event: R1=${seededStats.r1Count}, R2=${seededStats.r2Count}, R3=${seededStats.r3Count}`,
      stats: seededStats
    });
  } catch (err: any) {
    console.error('Error populating event round questions:', err);
    res.status(500).json({ error: 'Failed to populate round questions' });
  }
});

// GET /api/admin/events/:eventId
adminEventRouter.get('/:eventId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId).populate('collegeId');
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    // Multi-Tenant Isolation: Ensure event belongs to user's college
    if (req.user?.collegeId) {
      const evCollegeId = typeof event.collegeId === 'object' ? (event.collegeId as any)._id : event.collegeId;
      if (evCollegeId && evCollegeId.toString() !== req.user.collegeId.toString()) {
        res.status(404).json({ error: 'Event not found' });
        return;
      }
    }

    const rounds = await DynamicRound.find({ eventId }).sort({ roundNumber: 1 });
    for (const r of rounds) {
      await syncRoundStatus(r);
    }

    let allRoundsQuestionsReady = rounds.length > 0;
    const unreadyRounds: Array<{ roundNumber: number; title: string; assignedQuestionCount: number; targetQuestionCount: number; missingQuestionCount: number }> = [];
    const enrichedRounds = await Promise.all(
      rounds.map(async (r) => {
        const selectedIds = Array.isArray(r.selectedQuestionIds) ? r.selectedQuestionIds : [];
        const runtimeQCount = await Question.countDocuments({ eventId: event._id, roundNumber: r.roundNumber });
        const targetQuestionCount = r.questionCount || (r.type === 'mcq' ? 10 : 3);
        const assignedQuestionCount = Math.max(selectedIds.length, runtimeQCount);
        const missingQuestionCount = Math.max(0, targetQuestionCount - assignedQuestionCount);
        const isQuestionReady = assignedQuestionCount >= targetQuestionCount && missingQuestionCount === 0;

        if (!isQuestionReady) {
          allRoundsQuestionsReady = false;
          unreadyRounds.push({
            roundNumber: r.roundNumber,
            title: r.title,
            assignedQuestionCount,
            targetQuestionCount,
            missingQuestionCount
          });
        }
        return {
          ...r.toObject(),
          selectedQuestionIds: selectedIds,
          assignedQuestionCount,
          targetQuestionCount,
          missingQuestionCount,
          isQuestionReady
        };
      })
    );

    const eventObj = event.toObject();
    let adminToken: string | null = null;
    if (event.adminTokenCipher) {
      try {
        adminToken = decryptToken(event.adminTokenCipher);
      } catch {}
    }
    (eventObj as any).participantLink = `/join/${event.code}`;
    (eventObj as any).adminLink = adminToken ? `/control/${adminToken}` : null;
    delete (eventObj as any).participantAccessTokenHash;
    delete (eventObj as any).adminAccessTokenHash;
    delete (eventObj as any).participantTokenCipher;
    delete (eventObj as any).adminTokenCipher;

    const r1 = enrichedRounds.find((r: any) => r.roundNumber === 1);
    const isRound1Started = Boolean(
      (r1 && (r1.status !== 'pending' || Boolean(r1.startedAt))) ||
      event.status === 'live' ||
      event.status === 'completed' ||
      event.status === 'archived'
    );
    (eventObj as any).isRound1Started = isRound1Started;

    res.json({
      event: eventObj,
      rounds: enrichedRounds,
      isRound1Started,
      allRoundsQuestionsReady,
      unreadyRounds,
      participantLink: `/join/${event.code}`,
      adminLink: (eventObj as any).adminLink
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch event details' });
  }
});

// PUT /api/admin/events/:eventId (Controlled edit respecting freeze lock)
adminEventRouter.put('/:eventId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { name, description, rules, scoringConfig, branding, status, overrideReason } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    // Multi-Tenant Isolation: Ensure event belongs to user's college
    if (req.user?.collegeId && event.collegeId.toString() !== req.user.collegeId.toString()) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    // Status lock: Finalized or cleaned events are strictly immutable
    if (event.status === 'finalized' || event.status === 'cleaned') {
      res.status(409).json({
        error: `Event is ${event.status.toUpperCase()} and locked against configuration changes.`
      });
      return;
    }

    if (event.status === 'frozen' && !overrideReason) {
      res.status(403).json({
        error: 'Event is FROZEN. Modifying active configurations requires an emergency override rationale.'
      });
      return;
    }

    if (name) event.name = name.trim();
    if (description !== undefined) event.description = description;
    if (rules) event.rules = rules;
    if (scoringConfig) event.scoringConfig = { ...event.scoringConfig, ...scoringConfig };
    if (branding) event.branding = { ...event.branding, ...branding };

    // Enforce legal lifecycle transitions
    if (status && status !== event.status) {
      const allowedTransitions: Record<string, string[]> = {
        draft: ['registration', 'ready', 'live'],
        registration: ['ready', 'draft', 'live'],
        ready: ['live', 'draft'],
        live: ['frozen', 'completed'],
        frozen: ['live', 'completed'],
        completed: ['finalizing', 'finalized']
      };

      const validTargets = allowedTransitions[event.status] || [];
      if (!validTargets.includes(status)) {
        res.status(400).json({
          error: `Illegal status transition from '${event.status}' to '${status}'.`
        });
        return;
      }
      event.status = status as any;
    }

    await event.save();

    await recordAudit(
      req,
      event.status === 'frozen' ? 'EVENT_EMERGENCY_OVERRIDE' : 'EVENT_UPDATED',
      'Event',
      eventId,
      { changes: req.body },
      overrideReason || '',
      event.collegeId,
      event._id
    );

    res.json({ event });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// DELETE /api/admin/events/:eventId
// Deletes an event and cascade-purges its associated dynamic rounds, questions, violations, and participant sessions
adminEventRouter.delete('/:eventId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    // Authorization: Super Admin or Admin of the Event's College
    const isSuperAdmin = req.user?.role === 'super_admin';
    const isCollegeAdmin = Boolean(
      req.user?.collegeId && event.collegeId && event.collegeId.toString() === req.user.collegeId.toString()
    );

    if (!isSuperAdmin && !isCollegeAdmin) {
      res.status(403).json({ error: 'You do not have permission to delete this event.' });
      return;
    }

    // Cascade Cleanup: Resolve participants and questions first to cleanly purge attempts and progress
    const participants = await User.find({ eventId, role: 'participant' }).select('_id');
    const participantIds = participants.map(u => u._id);
    const questions = await Question.find({ eventId }).select('_id');
    const questionIds = questions.map(q => q._id);

    await Promise.all([
      DynamicRound.deleteMany({ eventId }),
      Question.deleteMany({ eventId }),
      ViolationLog.deleteMany({ $or: [{ eventId }, { userId: { $in: participantIds } }] }),
      CodeMilestone.deleteMany({ $or: [{ eventId }, { userId: { $in: participantIds } }, { questionId: { $in: questionIds } }] }),
      Competition.deleteMany({ eventId }),
      Attempt.deleteMany({ $or: [{ userId: { $in: participantIds } }, { questionId: { $in: questionIds } }] }),
      RoundProgress.deleteMany({ userId: { $in: participantIds } }),
      TieBreak.deleteMany({ $or: [{ userId: { $in: participantIds } }, { tiedUserIds: { $in: participantIds } }, { questionId: { $in: questionIds } }] }),
      User.deleteMany({ _id: { $in: participantIds } }),
      User.updateMany({ eventId }, { $unset: { eventId: 1 } })
    ]);

    await Event.findByIdAndDelete(eventId);

    await recordAudit(
      req,
      'EVENT_DELETED',
      'Event',
      eventId,
      { name: event.name, code: event.code, collegeId: event.collegeId },
      'Event deleted by administrator with cascade cleanup',
      event.collegeId,
      undefined
    );

    // Broadcast to connected admin sessions and participants
    broadcastToAdmins('event:deleted', { eventId });
    participantIds.forEach(pId => {
      emitToUser(pId.toString(), 'event:deleted', { eventId });
    });

    res.json({
      success: true,
      message: `Event "${event.name}" (${event.code}) and all associated rounds/questions have been deleted successfully.`
    });
  } catch (err: any) {
    console.error('Error deleting event:', err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});


// POST /api/admin/events/:eventId/freeze
adminEventRouter.post('/:eventId/freeze', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    // Multi-Tenant Isolation: Ensure event belongs to user's college
    if (req.user?.collegeId && event.collegeId.toString() !== req.user.collegeId.toString()) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    event.status = 'frozen';
    await event.save();
    await DynamicRound.updateMany({ eventId }, { isFrozen: true });

    await recordAudit(req, 'EVENT_FROZEN', 'Event', eventId, {}, 'Event locked against structural edits', event.collegeId, event._id);
    broadcastToAdmins('admin:event_frozen', { eventId });
    res.json({ message: 'Event successfully frozen', event });
  } catch (err) {
    res.status(500).json({ error: 'Failed to freeze event' });
  }
});

// POST /api/admin/events/:eventId/unfreeze
adminEventRouter.post('/:eventId/unfreeze', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { reason } = req.body;
    if (!reason) {
      res.status(400).json({ error: 'An explicit audit reason is required to unfreeze an event' });
      return;
    }

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    // Multi-Tenant Isolation: Ensure event belongs to user's college
    if (req.user?.collegeId && event.collegeId.toString() !== req.user.collegeId.toString()) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    event.status = 'live';
    await event.save();
    await DynamicRound.updateMany({ eventId }, { isFrozen: false });

    await recordAudit(req, 'EVENT_UNFROZEN', 'Event', eventId, {}, reason, event.collegeId, event._id);
    broadcastToAdmins('admin:event_unfrozen', { eventId, reason });
    res.json({ message: 'Event unfreezed with logged rationale', event });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unfreeze event' });
  }
});

// -------------------- DYNAMIC ROUNDS --------------------

// POST /api/admin/events/:eventId/rounds
adminEventRouter.post('/:eventId/rounds', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      eventId
    } = req.params;
    const {
      title,
      description,
      type,
      durationMinutes,
      questionCount,
      totalMarks,
      passingMarks,
      negativeMarkValue,
      allowedLanguages,
      advancementQuota,
      advancementRule,
      tieResolutionStrategy
    } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    if (req.user?.collegeId && event.collegeId.toString() !== req.user.collegeId.toString()) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    if (event.status === 'frozen') {
      res.status(403).json({ error: 'Cannot add rounds to a FROZEN event' });
      return;
    }

    // Auto calculate next round number
    const maxRound = await DynamicRound.findOne({ eventId }).sort({ roundNumber: -1 });
    const nextRoundNumber = maxRound ? maxRound.roundNumber + 1 : 1;

    let resolvedLanguages: string[] = [];
    if (type === 'coding' || type === 'debugging') {
      resolvedLanguages = (allowedLanguages && allowedLanguages.length > 0)
        ? allowedLanguages
        : ['python', 'cpp', 'java', 'c', 'javascript'];
    } else if (type === 'sql') {
      resolvedLanguages = (allowedLanguages && allowedLanguages.length > 0)
        ? allowedLanguages
        : ['sql'];
    } else {
      resolvedLanguages = allowedLanguages || [];
    }

    const round = await DynamicRound.create({
      eventId,
      roundNumber: nextRoundNumber,
      title: title || `Round ${nextRoundNumber}`,
      description: description || '',
      type: type || 'debugging',
      durationMinutes: durationMinutes || 30,
      questionCount: questionCount || 5,
      totalMarks: totalMarks || 100,
      passingMarks: passingMarks || 0,
      negativeMarkValue: negativeMarkValue || 0,
      allowedLanguages: resolvedLanguages,
      advancementQuota: advancementQuota !== undefined ? advancementQuota : 0,
      advancementRule: advancementRule || 'top_n',
      tieResolutionStrategy: tieResolutionStrategy || 'expand',
      status: 'pending'
    });

    await recordAudit(req, 'ROUND_CREATED', 'DynamicRound', round._id.toString(), { roundNumber: nextRoundNumber, type, title, advancementQuota, allowedLanguages: resolvedLanguages }, '', event.collegeId, eventId);
    res.status(201).json({ round });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create round' });
  }
});

// PUT /api/admin/events/:eventId/rounds/:roundNumber
adminEventRouter.put('/:eventId/rounds/:roundNumber', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId, roundNumber } = req.params;
    const {
      title,
      description,
      type,
      durationMinutes,
      questionCount,
      totalMarks,
      passingMarks,
      negativeMarkValue,
      allowedLanguages,
      advancementQuota,
      advancementRule,
      tieResolutionStrategy,
      overrideReason
    } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    if (req.user?.collegeId && event.collegeId.toString() !== req.user.collegeId.toString()) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    if (event.status === 'frozen' && !overrideReason) {
      res.status(403).json({ error: 'Event is frozen. Emergency override rationale required.' });
      return;
    }

    const round = await DynamicRound.findOne({ eventId, roundNumber: parseInt(roundNumber, 10) });
    if (!round) {
      res.status(404).json({ error: 'Round not found' });
      return;
    }

    if (title) round.title = title.trim();
    if (description !== undefined) round.description = description;
    if (type) round.type = type;
    if (durationMinutes) round.durationMinutes = durationMinutes;
    if (questionCount) round.questionCount = questionCount;
    if (totalMarks) round.totalMarks = totalMarks;
    if (passingMarks !== undefined) round.passingMarks = passingMarks;
    if (negativeMarkValue !== undefined) round.negativeMarkValue = negativeMarkValue;
    if (allowedLanguages !== undefined) round.allowedLanguages = allowedLanguages;
    if (advancementQuota !== undefined) round.advancementQuota = advancementQuota;
    if (advancementRule) round.advancementRule = advancementRule;
    if (tieResolutionStrategy) round.tieResolutionStrategy = tieResolutionStrategy;

    await round.save();

    await recordAudit(req, 'ROUND_UPDATED', 'DynamicRound', round._id.toString(), { changes: req.body }, overrideReason, event.collegeId, eventId);
    res.json({ round });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update round' });
  }
});

// PUT /api/admin/events/:eventId/rounds/:roundNumber/questions
// Explicit question selection for an event round (Single Source of Truth)
adminEventRouter.put('/:eventId/rounds/:roundNumber/questions', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId, roundNumber } = req.params;
    const parsedRound = parseInt(roundNumber, 10);
    const rawIds = req.body.questionIds || req.body.questionTemplateIds;
    if (!Array.isArray(rawIds)) {
      res.status(400).json({ error: 'questionIds must be an array of QuestionTemplate IDs' });
      return;
    }
    const questionIds = rawIds;

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    // Status lock: Cannot modify questions if tournament is live, completed, or finalized
    if (event.status === 'live' || event.status === 'completed' || event.status === 'finalized' || event.status === 'cleaned') {
      res.status(403).json({ error: `Cannot modify round questions: Tournament is currently ${event.status.toUpperCase()}` });
      return;
    }

    const round = await DynamicRound.findOne({ eventId, roundNumber: parsedRound });
    if (!round) {
      res.status(404).json({ error: 'Round not found' });
      return;
    }

    if (round.status === 'active' || round.status === 'completed' || round.status === 'locked') {
      res.status(403).json({ error: `Cannot modify round questions: Round ${parsedRound} is already ${round.status.toUpperCase()}` });
      return;
    }

    const requiredCount = round.questionCount;
    if (questionIds.length > requiredCount) {
      res.status(400).json({
        error: `Round quota exceeded. Maximum allowed is ${requiredCount} questions, but ${questionIds.length} were provided.`,
        requiredCount,
        providedCount: questionIds.length
      });
      return;
    }

    // Check duplicate IDs in payload
    const uniqueIds = new Set(questionIds.map(id => id.toString()));
    if (uniqueIds.size !== questionIds.length) {
      res.status(400).json({ error: 'Duplicate question IDs detected in selection. Each question can only be selected once per round.' });
      return;
    }

    // Fetch all QuestionTemplates with Tenant Isolation check
    const templateFilter: any = { _id: { $in: questionIds } };
    if (req.user?.role !== 'super_admin' && req.user?.collegeId) {
      templateFilter.$or = [
        { collegeId: null },
        { collegeId: { $exists: false } },
        { collegeId: req.user.collegeId }
      ];
    }
    const templates = await QuestionTemplate.find(templateFilter);
    if (templates.length !== questionIds.length) {
      res.status(400).json({ error: 'One or more selected questions could not be found or are not authorized for your organization in the Master Question Bank.' });
      return;
    }

    // Validate type invariant for each template
    for (const tmpl of templates) {
      let isTypeMatch = false;
      if (round.type === 'mcq') {
        isTypeMatch = tmpl.type === 'mcq' || (tmpl.type === 'aptitude' && Array.isArray(tmpl.options) && tmpl.options.length > 0);
      } else if (round.type === 'coding' || round.type === 'debugging') {
        // Unified coding type: Coding rounds accept any coding problem (standard or debug mode) or legacy debugging
        isTypeMatch = tmpl.type === 'coding' || tmpl.type === 'debugging';
      } else if (round.type === 'sql') {
        isTypeMatch = tmpl.type === 'sql';
      } else {
        isTypeMatch = tmpl.type === round.type;
      }

      if (!isTypeMatch) {
        res.status(400).json({
          error: `Question "${tmpl.title}" is of type "${tmpl.type}", which does not match round type "${round.type}".`
        });
        return;
      }
    }

    // Cross-round duplication prevention within same event
    const otherRounds = await DynamicRound.find({
      eventId,
      roundNumber: { $ne: parsedRound }
    });

    const otherAssignedMap = new Map<string, number>();
    for (const r of otherRounds) {
      if (Array.isArray(r.selectedQuestionIds)) {
        for (const qid of r.selectedQuestionIds) {
          otherAssignedMap.set(qid.toString(), r.roundNumber);
        }
      }
    }

    for (const qid of questionIds) {
      const qidStr = qid.toString();
      if (otherAssignedMap.has(qidStr)) {
        const otherRoundNum = otherAssignedMap.get(qidStr);
        const dupTmpl = templates.find(t => t._id.toString() === qidStr);
        res.status(400).json({
          error: `Question "${dupTmpl?.title || qidStr}" is already assigned to Round ${otherRoundNum} in this tournament. Cross-round question duplication is not allowed.`
        });
        return;
      }
    }

    // Update single source of truth: DynamicRound.selectedQuestionIds
    round.selectedQuestionIds = questionIds as any;
    await round.save();

    // Synchronize runtime Question documents for participant execution
    const existingQuestions = await Question.find({ eventId, roundNumber: parsedRound });
    const existingByTmplId = new Map<string, any>();
    for (const eq of existingQuestions) {
      if (eq.templateId) {
        existingByTmplId.set(eq.templateId.toString(), eq);
      }
    }

    // Remove questions no longer in selectedQuestionIds
    for (const eq of existingQuestions) {
      if (!eq.templateId || !uniqueIds.has(eq.templateId.toString())) {
        await Question.findByIdAndDelete(eq._id);
      }
    }

    // Synchronize/Create in exact order of questionIds
    const templateMap = new Map(templates.map(t => [t._id.toString(), t]));
    let order = 0;
    for (const qid of questionIds) {
      order += 1;
      const tmpl = templateMap.get(qid.toString())!;
      const existing = existingByTmplId.get(qid.toString());

      const isMcq = tmpl.type === 'mcq' || (tmpl.type === 'aptitude' && tmpl.options && tmpl.options.length > 0);
      const isCoding = tmpl.type === 'coding' || tmpl.type === 'debugging';
      const questionPayload: any = {
        roundNumber: parsedRound,
        orderIndex: order,
        eventId: event._id,
        collegeId: event.collegeId,
        templateId: tmpl._id,
        type: isMcq ? 'mcq' : (tmpl.type === 'sql' ? 'sql' : 'coding'),
        codingMode: tmpl.codingMode || (tmpl.type === 'debugging' ? 'debug' : 'standard'),
        title: tmpl.title,
        prompt: tmpl.prompt,
        inputFormat: tmpl.inputFormat || '',
        outputFormat: tmpl.outputFormat || '',
        constraints: tmpl.constraints || '',
        marks: tmpl.marks || (isMcq ? 10 : 25),
        options: tmpl.options?.map(o => o.text) || [],
        correctOptionIndex: tmpl.options?.findIndex(o => o.isCorrect) ?? 0,
        explanation: tmpl.explanation || '',
        allowedLanguages: tmpl.allowedLanguages && tmpl.allowedLanguages.length > 0
          ? tmpl.allowedLanguages
          : (round.allowedLanguages || ['python', 'cpp', 'java', 'c', 'javascript']),
        starterCode: tmpl.starterCode instanceof Map ? Object.fromEntries(tmpl.starterCode) : (tmpl.starterCode || {}),
        solutionCode: (tmpl as any).solutionCode instanceof Map ? Object.fromEntries((tmpl as any).solutionCode) : ((tmpl as any).solutionCode || {}),
        testCases: (tmpl.testCases || []).map(tc => ({
          input: tc.input,
          expectedOutput: tc.output,
          isHidden: tc.isHidden,
          weight: tc.weight
        }))
      };

      if (existing) {
        Object.assign(existing, questionPayload);
        await existing.save();
      } else {
        await Question.create(questionPayload);
      }
    }

    // Audit trail
    await AuditLog.create({
      adminId: req.user!.userId,
      adminUsername: req.user!.username,
      action: 'ROUND_QUESTIONS_CONFIGURED',
      targetType: 'DynamicRound',
      targetId: round._id.toString(),
      details: { eventId, roundNumber: parsedRound, selectedCount: questionIds.length }
    });

    res.json({
      success: true,
      message: `Successfully configured ${questionIds.length} questions for Round ${parsedRound}`,
      roundNumber: parsedRound,
      selectedCount: questionIds.length,
      requiredCount: round.questionCount,
      selectedQuestionIds: round.selectedQuestionIds
    });
  } catch (err: any) {
    console.error('Failed to configure round questions:', err);
    res.status(500).json({ error: 'Failed to configure round questions' });
  }
});

// POST /api/admin/events/:eventId/rounds/:roundNumber/start
adminEventRouter.post('/:eventId/rounds/:roundNumber/start', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId, roundNumber } = req.params;
    const parsedRound = parseInt(roundNumber, 10);

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    if (req.user?.collegeId && event.collegeId.toString() !== req.user.collegeId.toString()) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const round = await DynamicRound.findOne({ eventId, roundNumber: parsedRound });
    if (!round) {
      res.status(404).json({ error: 'Round not found' });
      return;
    }

    // Verify question presence & quota for this specific round before starting
    const selectedIds = Array.isArray(round.selectedQuestionIds) ? round.selectedQuestionIds : [];
    const runtimeQCount = await Question.countDocuments({ eventId, roundNumber: parsedRound });
    const assignedCount = Math.max(selectedIds.length, runtimeQCount);
    const targetCount = round.questionCount || (round.type === 'mcq' ? 10 : 3);
    if (assignedCount < targetCount) {
      res.status(400).json({
        error: `Cannot start Round ${parsedRound}. Administrator has not assigned all required questions (${assignedCount}/${targetCount}). Please select questions for Round ${parsedRound}.`,
        roundNumber: parsedRound,
        requiredCount: targetCount,
        assignedCount
      });
      return;
    }

    round.status = 'active';
    round.startedAt = new Date();
    await round.save();

    event.status = 'live';
    if (!event.startedAt) {
      event.startedAt = new Date();
    }
    await event.save();

    // Sync Competition model
    await Competition.findOneAndUpdate(
      {},
      {
        title: event.name,
        currentRoundNumber: parsedRound,
        status: 'active',
        violationLimit: event.scoringConfig?.violationLimit || 3,
        autoSubmitOnViolation: true
      },
      { upsert: true }
    );

    // Initialize eligible participants as not_started and heal ghost records with 0 attempts
    const userFilter: any = { role: 'participant', eventId, isDisqualified: false };
    if (parsedRound === 1) {
      const participants = await User.find(userFilter);
      for (const p of participants) {
        const existing = await RoundProgress.findOne({ userId: p._id, roundNumber: 1, eventId });
        if (!existing) {
          await RoundProgress.create({
            userId: p._id,
            eventId,
            roundNumber: 1,
            status: 'not_started',
            startedAt: null,
            endsAt: null
          });
        } else if (
          (existing.status === 'submitted' || existing.status === 'expired' || existing.status === 'in_progress') &&
          (existing.totalScore || 0) === 0
        ) {
          const count = await Attempt.countDocuments({ userId: p._id, roundNumber: 1 });
          if (count === 0) {
            existing.status = 'not_started';
            existing.startedAt = null;
            existing.endsAt = null;
            existing.submittedAt = null;
            existing.timeTakenSeconds = 0;
            await existing.save();
          }
        }
      }
    } else {
      const eligibleUsers = await User.find(userFilter).distinct('_id');
      const advancedFromPrev = await RoundProgress.find({
        userId: { $in: eligibleUsers },
        roundNumber: parsedRound - 1,
        status: 'advanced'
      });
      for (const adv of advancedFromPrev) {
        const existing = await RoundProgress.findOne({ userId: adv.userId, roundNumber: parsedRound, eventId });
        if (!existing) {
          await RoundProgress.create({
            userId: adv.userId,
            eventId,
            roundNumber: parsedRound,
            status: 'not_started',
            startedAt: null,
            endsAt: null
          });
        } else if (
          (existing.status === 'submitted' || existing.status === 'expired' || existing.status === 'in_progress') &&
          (existing.totalScore || 0) === 0
        ) {
          const count = await Attempt.countDocuments({ userId: adv.userId, roundNumber: parsedRound });
          if (count === 0) {
            existing.status = 'not_started';
            existing.startedAt = null;
            existing.endsAt = null;
            existing.submittedAt = null;
            existing.timeTakenSeconds = 0;
            await existing.save();
          }
        }
      }
    }

    await recordAudit(req, 'ROUND_STARTED', 'DynamicRound', round._id.toString(), { roundNumber: parsedRound }, '', event.collegeId, eventId);

    broadcastToAll('round:started', {
      eventId,
      roundNumber: parsedRound,
      title: round.title,
      type: round.type,
      durationMinutes: round.durationMinutes,
      startedAt: round.startedAt
    }, eventId);

    res.json({ message: `Round ${parsedRound} started successfully`, round });
  } catch (err) {
    res.status(500).json({ error: 'Failed to start round' });
  }
});

// POST /api/admin/events/:eventId/rounds/:roundNumber/lock (or /finish)
const lockRoundHandler = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId, roundNumber } = req.params;
    const parsedRound = parseInt(roundNumber, 10);

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    if (req.user?.collegeId && event.collegeId.toString() !== req.user.collegeId.toString()) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const round = await DynamicRound.findOne({ eventId, roundNumber: parsedRound });
    if (!round) {
      res.status(404).json({ error: 'Round not found' });
      return;
    }

    round.status = 'completed';
    round.endedAt = new Date();
    await round.save();

    // Auto-grade/sweep strictly in_progress participants for this event (never sweep not_started)
    const userFilter: any = { role: 'participant', eventId };
    const eventParticipants = await User.find(userFilter).select('_id');
    const participantIds = eventParticipants.map(u => u._id);

    const activeParticipants = await RoundProgress.find({
      roundNumber: parsedRound,
      userId: { $in: participantIds },
      status: 'in_progress'
    });

    for (const p of activeParticipants) {
      await finalizeParticipantRoundScore(p.userId.toString(), parsedRound);
    }

    await recordAudit(req, 'ROUND_COMPLETED', 'DynamicRound', round._id.toString(), { roundNumber: parsedRound }, 'Round concluded and marked completed by admin', event.collegeId, eventId);

    broadcastToAll('round:locked', {
      eventId,
      roundNumber: parsedRound,
      message: `Round ${parsedRound} has concluded.`
    }, eventId);
    broadcastToAll('round:completed', {
      eventId,
      roundNumber: parsedRound
    }, eventId);
    broadcastToAdmins('admin:round_locked', { eventId, roundNumber: parsedRound, status: 'completed' }, event.collegeId?.toString(), eventId);

    res.json({ message: `Round ${parsedRound} completed and finalized successfully`, round });
  } catch (err) {
    console.error('Lock round error:', err);
    res.status(500).json({ error: 'Failed to lock round' });
  }
};

adminEventRouter.post('/:eventId/rounds/:roundNumber/lock', lockRoundHandler);
adminEventRouter.post('/:eventId/rounds/:roundNumber/finish', lockRoundHandler);

// -------------------- AUDIT LOGS --------------------

// GET /api/admin/events/:eventId/audit-logs
adminEventRouter.get('/:eventId/audit-logs', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    if (req.user?.collegeId && event.collegeId.toString() !== req.user.collegeId.toString()) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const logs = await AuditLog.find({ eventId }).sort({ createdAt: -1 }).limit(100);
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// -------------------- EVENT DATA LIFECYCLE & RETENTION --------------------

// POST /api/admin/events/:eventId/finalize
// Finalizes event, computes cryptographic leaderboard fingerprint, and sets retention expiration
adminEventRouter.post(
  '/:eventId/finalize',
  requireRole(['college_admin', 'super_admin']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { eventId } = req.params;
      const { retentionDays } = req.body;

      const result = await finalizeEvent(
        eventId,
        req.user?.collegeId,
        req.user?.userId,
        req.user?.username,
        retentionDays
      );

      res.json({
        success: true,
        message: 'Event successfully finalized and sealed.',
        event: result.event,
        leaderboardFingerprint: result.leaderboardFingerprint,
        participantCount: result.participantCount
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to finalize event' });
    }
  }
);

// PATCH /api/admin/events/:eventId/retention-hold
// Places or lifts an academic integrity retention hold
adminEventRouter.patch(
  '/:eventId/retention-hold',
  requireRole(['college_admin', 'super_admin']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { eventId } = req.params;
      const { hold, reason } = req.body;

      if (typeof hold !== 'boolean') {
        res.status(400).json({ error: "'hold' boolean is required" });
        return;
      }

      const updated = await setRetentionHold(
        eventId,
        hold,
        reason || '',
        req.user?.collegeId,
        req.user?.userId,
        req.user?.username
      );

      res.json({
        success: true,
        message: hold ? 'Retention hold activated.' : 'Retention hold lifted.',
        event: updated
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update retention hold' });
    }
  }
);

// POST /api/admin/events/cleanup/run
// Triggers cleanup engine for expired events (dry-run or live)
adminEventRouter.post(
  '/cleanup/run',
  requireRole('super_admin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { eventId, dryRun, batchSize } = req.body;

      const result = await executeCleanupJob({
        eventId,
        dryRun,
        batchSize,
        actorId: req.user?.userId,
        actorUsername: req.user?.username
      });

      res.json({
        success: true,
        result
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to execute cleanup job' });
    }
  }
);

// GET /api/admin/events/cleanup/audits
// Fetches audit history for retention cleanup jobs
adminEventRouter.get(
  '/cleanup/audits',
  requireRole(['college_admin', 'super_admin']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const filter: any = {};
      if (req.user?.role === 'college_admin' && req.user?.collegeId) {
        filter.collegeId = req.user.collegeId;
      } else if (req.query.collegeId) {
        filter.collegeId = req.query.collegeId;
      }

      if (req.query.eventId) {
        filter.eventId = req.query.eventId;
      }

      const audits = await CleanupAudit.find(filter).sort({ createdAt: -1 }).limit(50);
      res.json({ audits });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve cleanup audits' });
    }
  }
);

// GET /api/admin/events/:eventId/sandbox-preview
// Provides admin with dry-run event structure and questions for testing without timer/kiosk constraints
adminEventRouter.get('/:eventId/sandbox-preview', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    // Multi-tenant check
    if (req.user?.role !== 'super_admin' && req.user?.collegeId && event.collegeId.toString() !== req.user.collegeId) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const rounds = await DynamicRound.find({ eventId }).sort({ roundNumber: 1 });
    for (const r of rounds) {
      await syncRoundStatus(r);
    }
    const questions = await Question.find({ eventId }).sort({ roundNumber: 1, orderIndex: 1 });

    res.json({
      success: true,
      event: {
        _id: event._id,
        name: event.name,
        code: event.code,
        status: event.status,
        rules: event.rules
      },
      rounds,
      questions
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch sandbox preview' });
  }
});

// POST /api/admin/events/sandbox-run
// Allows admin to test-execute code or custom stdin without creating Attempt, Progress, or Leaderboard records
adminEventRouter.post('/sandbox-run', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { code, language, questionId, customStdin } = req.body;
    if (!code || !language) {
      res.status(400).json({ error: 'Code and language are required' });
      return;
    }

    // If customStdin is provided, run arbitrary stdin test
    if (customStdin !== undefined && customStdin !== null) {
      const execResult = await executeSingleTestCase(code, language, String(customStdin), 3000);
      res.json({
        success: true,
        type: 'custom_stdin',
        result: {
          stdout: execResult.stdout,
          stderr: execResult.stderr,
          compileError: execResult.compileError,
          runtimeError: execResult.runtimeError,
          timeout: execResult.timeout,
          runtimeMs: execResult.runtimeMs,
          status: execResult.compileError ? 'compile_error' : execResult.timeout ? 'timeout' : execResult.runtimeError ? 'runtime_error' : 'success'
        }
      });
      return;
    }

    // Otherwise, run against official question test cases if questionId provided
    if (questionId) {
      const question = await Question.findById(questionId);
      if (!question) {
        res.status(404).json({ error: 'Question not found' });
        return;
      }

      const testCases = question.testCases || [];
      const testResults = await runTestCases(code, language, testCases, question.timeLimitMs || 3000);

      const passedCount = testResults.filter(r => r.passed).length;
      res.json({
        success: true,
        type: 'test_cases',
        totalTestCases: testCases.length,
        passedTestCases: passedCount,
        allPassed: passedCount === testCases.length,
        results: testResults
      });
      return;
    }

    // Fallback: run execution with empty input
    const execResult = await executeSingleTestCase(code, language, '', 3000);
    res.json({
      success: true,
      type: 'dry_run',
      result: execResult
    });
  } catch (err: any) {
    console.error('Failed to run sandbox test:', err);
    res.status(500).json({ error: err.message || 'Failed to execute code' });
  }
});

