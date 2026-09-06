import { Router, Response } from 'express';
import { authenticate, requireAnyAdmin, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { College } from '../models/College.js';
import { Event } from '../models/Event.js';
import { User } from '../models/User.js';
import { DynamicRound } from '../models/DynamicRound.js';
import { Competition } from '../models/Competition.js';
import { AuditLog } from '../models/AuditLog.js';
import { CleanupAudit } from '../models/CleanupAudit.js';
import { broadcastToAdmins, broadcastToAll } from '../services/socketService.js';
import { finalizeEvent, setRetentionHold } from '../services/lifecycleService.js';
import { executeCleanupJob } from '../services/cleanupEngine.js';
import { seedEventRoundQuestions } from '../services/defaultQuestions.js';

export const adminEventRouter = Router();

// All routes require authenticated admin
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
    res.json({ events });
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

    // Multi-Tenant Isolation & College Resolution:
    // 1. Super admin can create event under any college
    // 2. User can create event under a college they created (createdBy == req.user.userId)
    // 3. User can create event under their assigned college (collegeId == req.user.collegeId)
    // 4. Fallback to assigned college or provided collegeId
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

    const event = await Event.create({
      collegeId: effectiveCollegeId,
      name: name.trim(),
      code: cleanCode,
      description: description || '',
      bannerUrl: bannerUrl || '',
      status: 'ready',
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
        certificateTitle: `Certificate of Achievement — ${name}`,
        signatoryName: 'Head of Department',
        signatoryTitle: 'Tournament Director'
      },
      certificateConfig: {
        enabled: req.body.certificateConfig?.enabled === true,
        useDefaultTemplate: req.body.certificateConfig?.useDefaultTemplate !== false || !req.body.certificateConfig?.customTemplateUrl?.trim(),
        customTemplateUrl: req.body.certificateConfig?.customTemplateUrl?.trim() || '',
        textColorMode: req.body.certificateConfig?.textColorMode || 'auto',
        primaryColor: req.body.certificateConfig?.primaryColor || '#f59e0b',
        issuerName: req.body.certificateConfig?.issuerName || 'Head of Department',
        issuerTitle: req.body.certificateConfig?.issuerTitle || 'DebugArena Organizing Committee',
        includeQrVerification: req.body.certificateConfig?.enabled === true ? (req.body.certificateConfig?.includeQrVerification !== false) : false
      }
    });

    // Create initial dynamic rounds if provided
    let rawRounds = initialRounds && Array.isArray(initialRounds) && initialRounds.length > 0
      ? initialRounds
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
        status: sequentialRoundNum === 1 ? 'active' : 'pending',
        startedAt: sequentialRoundNum === 1 ? new Date() : null
      });
      createdRounds.push(newRound);
    }

    // Auto-seed standard curated questions for this event's rounds (Round 1 MCQs, Round 2 Coding, Round 3 Coding, Tie-Breaker)
    await seedEventRoundQuestions(event._id, effectiveCollegeId);

    // Keep Competition model in sync with latest event
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

    await recordAudit(req, 'EVENT_CREATED', 'Event', event._id.toString(), { name, code: cleanCode, roundsCount: createdRounds.length }, '', effectiveCollegeId, event._id);
    res.status(201).json({ event, rounds: createdRounds });
  } catch (err: any) {
    console.error('Error creating event:', err);
    res.status(500).json({ error: 'Failed to create dynamic event' });
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
    res.json({ event, rounds });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch event details' });
  }
});

// PUT /api/admin/events/:eventId (Controlled edit respecting freeze lock)
adminEventRouter.put('/:eventId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { name, description, rules, scoringConfig, branding, certificateConfig, status, overrideReason } = req.body;

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
    if (certificateConfig) event.certificateConfig = { ...event.certificateConfig, ...certificateConfig };

    // Enforce legal lifecycle transitions
    if (status && status !== event.status) {
      const allowedTransitions: Record<string, string[]> = {
        draft: ['registration', 'ready'],
        registration: ['ready', 'draft'],
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

// PATCH /api/admin/events/:eventId/toggle-certificates
adminEventRouter.patch('/:eventId/toggle-certificates', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { enabled } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    if (req.user?.collegeId && event.collegeId.toString() !== req.user.collegeId.toString()) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const currentConfig = event.certificateConfig || {
      enabled: false,
      useDefaultTemplate: true,
      customTemplateUrl: '',
      textColorMode: 'auto',
      primaryColor: '#f59e0b',
      issuerName: 'Head of Department',
      issuerTitle: 'DebugArena Organizing Committee',
      includeQrVerification: true
    };

    const targetEnabled = typeof enabled === 'boolean' ? enabled : !currentConfig.enabled;
    event.certificateConfig = {
      ...currentConfig,
      enabled: targetEnabled
    };

    await event.save();

    await recordAudit(
      req,
      targetEnabled ? 'EVENT_CERTIFICATES_ACTIVATED' : 'EVENT_CERTIFICATES_DEACTIVATED',
      'Event',
      eventId,
      { certificatesEnabled: targetEnabled },
      '',
      event.collegeId,
      event._id
    );

    res.json({ success: true, event });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle certificate status' });
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

    round.status = 'active';
    round.startedAt = new Date();
    await round.save();

    event.status = 'live';
    await event.save();

    await recordAudit(req, 'ROUND_STARTED', 'DynamicRound', round._id.toString(), { roundNumber: parsedRound }, '', event.collegeId, eventId);

    broadcastToAll('round:started', {
      eventId,
      roundNumber: parsedRound,
      title: round.title,
      type: round.type,
      durationMinutes: round.durationMinutes,
      startedAt: round.startedAt
    });

    res.json({ message: `Round ${parsedRound} started successfully`, round });
  } catch (err) {
    res.status(500).json({ error: 'Failed to start round' });
  }
});

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
