import { Router, Response } from 'express';
import { authenticate, requireAnyAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { College } from '../models/College.js';
import { Event } from '../models/Event.js';
import { DynamicRound } from '../models/DynamicRound.js';
import { AuditLog } from '../models/AuditLog.js';
import { broadcastToAdmins, broadcastToAll } from '../services/socketService.js';

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
adminEventRouter.get('/colleges', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const colleges = await College.find().sort({ name: 1 });
    res.json({ colleges });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch colleges' });
  }
});

// POST /api/admin/events/colleges
adminEventRouter.post('/colleges', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, code, logoUrl, primaryColor, secondaryColor, contactEmail, website } = req.body;
    if (!name || !code) {
      res.status(400).json({ error: 'College name and code are required' });
      return;
    }

    const existing = await College.findOne({ code: code.toUpperCase().trim() });
    if (existing) {
      res.status(400).json({ error: `College with code ${code.toUpperCase()} already exists` });
      return;
    }

    const college = await College.create({
      name: name.trim(),
      code: code.toUpperCase().trim(),
      logoUrl: logoUrl || '',
      primaryColor: primaryColor || '#6366f1',
      secondaryColor: secondaryColor || '#06b6d4',
      contactEmail: contactEmail || '',
      website: website || ''
    });

    await recordAudit(req, 'COLLEGE_CREATED', 'College', college._id.toString(), { name, code }, '', college._id);
    res.status(201).json({ college });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create college' });
  }
});

// -------------------- EVENTS --------------------

// GET /api/admin/events
adminEventRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { collegeId } = req.query;
    const filter: Record<string, any> = {};
    if (collegeId) filter.collegeId = collegeId;

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

    if (!collegeId || !name || !code) {
      res.status(400).json({ error: 'collegeId, event name, and event code are required' });
      return;
    }

    const college = await College.findById(collegeId);
    if (!college) {
      res.status(404).json({ error: 'College not found' });
      return;
    }

    const existing = await Event.findOne({ collegeId, code: code.toUpperCase().trim() });
    if (existing) {
      res.status(400).json({ error: `Event with code ${code} already exists for this college` });
      return;
    }

    const event = await Event.create({
      collegeId,
      name: name.trim(),
      code: code.toUpperCase().trim(),
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
      certificateConfig: req.body.certificateConfig || {
        useDefaultTemplate: true,
        customTemplateUrl: '',
        textColorMode: 'auto',
        primaryColor: '#f59e0b',
        issuerName: 'Head of Department',
        issuerTitle: 'DebugArena Organizing Committee',
        includeQrVerification: true
      }
    });

    // Create initial dynamic rounds if provided
    const roundsList = initialRounds || [
      { roundNumber: 1, title: 'Round 1: Rapid-Fire Debugging MCQs', type: 'mcq', durationMinutes: 15, questionCount: 10, totalMarks: 100, advancementQuota: 15 },
      { roundNumber: 2, title: 'Round 2: Core Bug Hunting', type: 'debugging', durationMinutes: 30, questionCount: 3, totalMarks: 100, advancementQuota: 10 },
      { roundNumber: 3, title: 'Round 3: Advanced Algorithmic Coding', type: 'coding', durationMinutes: 45, questionCount: 2, totalMarks: 100, advancementQuota: 0 }
    ];

    const createdRounds = [];
    for (const r of roundsList) {
      const newRound = await DynamicRound.create({
        eventId: event._id,
        roundNumber: r.roundNumber,
        title: r.title,
        description: r.description || '',
        type: r.type,
        durationMinutes: r.durationMinutes || 30,
        questionCount: r.questionCount || 5,
        totalMarks: r.totalMarks || 100,
        passingMarks: r.passingMarks || 0,
        negativeMarkValue: r.negativeMarkValue || 0,
        advancementQuota: r.advancementQuota !== undefined ? r.advancementQuota : (r.roundNumber === 1 ? 15 : r.roundNumber === 2 ? 10 : 0),
        advancementRule: r.advancementRule || 'top_n',
        tieResolutionStrategy: r.tieResolutionStrategy || 'expand',
        status: r.roundNumber === 1 ? 'active' : 'pending',
        startedAt: r.roundNumber === 1 ? new Date() : null
      });
      createdRounds.push(newRound);
    }

    await recordAudit(req, 'EVENT_CREATED', 'Event', event._id.toString(), { name, code, roundsCount: createdRounds.length }, '', collegeId, event._id);
    res.status(201).json({ event, rounds: createdRounds });
  } catch (err: any) {
    console.error('Error creating event:', err);
    res.status(500).json({ error: 'Failed to create dynamic event' });
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
    if (status) event.status = status;

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

// POST /api/admin/events/:eventId/freeze
adminEventRouter.post('/:eventId/freeze', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event) {
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
      advancementQuota,
      advancementRule,
      tieResolutionStrategy
    } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
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
      advancementQuota: advancementQuota !== undefined ? advancementQuota : 0,
      advancementRule: advancementRule || 'top_n',
      tieResolutionStrategy: tieResolutionStrategy || 'expand',
      status: 'pending'
    });

    await recordAudit(req, 'ROUND_CREATED', 'DynamicRound', round._id.toString(), { roundNumber: nextRoundNumber, type, title, advancementQuota }, '', event.collegeId, eventId);
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
      advancementQuota,
      advancementRule,
      tieResolutionStrategy,
      overrideReason
    } = req.body;

    const event = await Event.findById(eventId);
    if (event?.status === 'frozen' && !overrideReason) {
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
    if (advancementQuota !== undefined) round.advancementQuota = advancementQuota;
    if (advancementRule) round.advancementRule = advancementRule;
    if (tieResolutionStrategy) round.tieResolutionStrategy = tieResolutionStrategy;

    await round.save();

    await recordAudit(req, 'ROUND_UPDATED', 'DynamicRound', round._id.toString(), { changes: req.body }, overrideReason, event?.collegeId, eventId);
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

    const round = await DynamicRound.findOne({ eventId, roundNumber: parsedRound });
    if (!round) {
      res.status(404).json({ error: 'Round not found' });
      return;
    }

    round.status = 'active';
    round.startedAt = new Date();
    await round.save();

    const event = await Event.findById(eventId);
    if (event) {
      event.status = 'live';
      await event.save();
    }

    await recordAudit(req, 'ROUND_STARTED', 'DynamicRound', round._id.toString(), { roundNumber: parsedRound }, '', event?.collegeId, eventId);

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
    const logs = await AuditLog.find({ eventId }).sort({ createdAt: -1 }).limit(100);
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});
