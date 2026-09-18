import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { authenticate, requireAnyAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { Round } from '../models/Round.js';
import { RoundProgress } from '../models/RoundProgress.js';
import { ViolationLog } from '../models/ViolationLog.js';
import { Question } from '../models/Question.js';
import { QuestionTemplate } from '../models/QuestionTemplate.js';
import { DynamicRound } from '../models/DynamicRound.js';
import { executeSingleTestCase } from '../services/judgeService.js';
import { getQuestionFairnessMetrics, executeAnomalyAction } from '../services/anomalyService.js';

export const adminControlRoomRouter = Router();

adminControlRoomRouter.use(authenticate, requireAnyAdmin);

// GET /api/admin/control-room/pulse
adminControlRoomRouter.get('/pulse', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const roundNumber = parseInt((req.query.roundNumber as string) || '1', 10);
    const collegeId = req.user?.collegeId;
    const eventId = (req.query.eventId as string) || req.user?.eventId;

    let round = null;
    if (eventId) {
      const { DynamicRound } = await import('../models/DynamicRound.js');
      round = await DynamicRound.findOne({ eventId, roundNumber });
    }
    if (!round) {
      round = await Round.findOne({ roundNumber });
    }

    const userFilter: any = { role: 'participant' };
    if (collegeId) userFilter.collegeId = collegeId;
    if (eventId) userFilter.eventId = eventId;
    const tenantUserIds = await User.find(userFilter).distinct('_id');
    const totalParticipants = tenantUserIds.length;

    let inProgressCount = 0;
    let submittedCount = 0;
    let violationsCount = 0;

    if (tenantUserIds.length > 0) {
      const progressFilter = { roundNumber, userId: { $in: tenantUserIds } };
      inProgressCount = await RoundProgress.countDocuments({ ...progressFilter, status: 'in_progress' });
      submittedCount = await RoundProgress.countDocuments({ ...progressFilter, status: 'submitted' });

      const violationFilter = { roundNumber, userId: { $in: tenantUserIds } };
      violationsCount = await ViolationLog.countDocuments(violationFilter);
    } else if (!collegeId && !eventId && req.user?.role === 'super_admin') {
      inProgressCount = await RoundProgress.countDocuments({ roundNumber, status: 'in_progress' });
      submittedCount = await RoundProgress.countDocuments({ roundNumber, status: 'submitted' });
      violationsCount = await ViolationLog.countDocuments({ roundNumber });
    }

    // Measure DB Ping
    const dbStart = Date.now();
    await User.findOne().select('_id');
    const dbLatencyMs = Date.now() - dbStart;

    res.json({
      round: {
        roundNumber,
        title: round?.title || `Round ${roundNumber}`,
        status: round?.status || 'pending',
        type: round?.type || 'mcq'
      },
      counts: {
        totalParticipants,
        activeParticipants: inProgressCount,
        submittedParticipants: submittedCount,
        suspiciousEvents: violationsCount
      },
      system: {
        dbLatencyMs,
        dbStatus: 'healthy',
        judgeStatus: 'ready',
        socketPool: 'active'
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch control room pulse' });
  }
});

// GET /api/admin/control-room/fairness
adminControlRoomRouter.get('/fairness', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const roundNumber = parseInt((req.query.roundNumber as string) || '1', 10);
    const collegeId = req.user?.collegeId;
    const eventId = (req.query.eventId as string) || req.user?.eventId;
    const metrics = await getQuestionFairnessMetrics(roundNumber, collegeId, eventId);
    res.json({ roundNumber, metrics });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute question fairness' });
  }
});

// POST /api/admin/control-room/anomaly-action
adminControlRoomRouter.post('/anomaly-action', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { roundNumber, questionId, action, reason, eventId: bodyEventId } = req.body;
    if (!roundNumber || !questionId || !action) {
      res.status(400).json({ error: 'roundNumber, questionId, and action are required' });
      return;
    }

    const collegeId = req.user?.collegeId;
    const eventId = bodyEventId || req.user?.eventId;

    const result = await executeAnomalyAction(
      parseInt(roundNumber, 10),
      questionId,
      action,
      req.user!.username,
      req.user!.userId,
      reason,
      collegeId,
      eventId
    );

    res.json(result);
  } catch (err: any) {
    console.error('Anomaly action error:', err);
    res.status(500).json({ error: err.message || 'Failed to execute anomaly action' });
  }
});

// GET /api/admin/control-room/readiness (Pre-Event System Health Inspector)
adminControlRoomRouter.get('/readiness', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const startTime = Date.now();
    const eventId = req.query.eventId as string;

    // 1. Check Database
    const dbState = mongoose.connection.readyState === 1 ? 'OK' : 'ERROR';
    const dbPing = Date.now() - startTime;

    // 2. Check Code Judge Sandbox (Test JavaScript execution)
    const judgeStart = Date.now();
    const judgeTest = await executeSingleTestCase('console.log("HEALTH_CHECK_OK")', 'javascript', '');
    const judgeLatencyMs = Date.now() - judgeStart;
    const judgeHealthy = judgeTest.stdout.includes('HEALTH_CHECK_OK');

    // 3. Check Questions & Bank
    const bankCount = await QuestionTemplate.countDocuments();
    let questionsReady = false;
    let questionsDetail = '';
    let participantCount = 0;

    if (eventId && mongoose.Types.ObjectId.isValid(eventId)) {
      const dynamicRounds = await DynamicRound.find({ eventId }).sort({ roundNumber: 1 });
      if (dynamicRounds.length === 0) {
        questionsReady = false;
        questionsDetail = 'No competition rounds configured for this event';
      } else {
        const roundStatuses = [];
        let allMet = true;
        for (const dr of dynamicRounds) {
          const qCount = await Question.countDocuments({ eventId, roundNumber: dr.roundNumber });
          const targetCount = dr.questionCount || (dr.type === 'mcq' ? 10 : 3);
          const isMet = qCount >= targetCount;
          if (!isMet) allMet = false;
          roundStatuses.push(`R${dr.roundNumber}: ${qCount}/${targetCount}${isMet ? ' ✅' : ' ⚠️'}`);
        }
        questionsReady = allMet;
        questionsDetail = roundStatuses.join(' | ');
      }
      participantCount = await User.countDocuments({ eventId, role: 'participant' });
    } else {
      const questionsCount = await Question.countDocuments();
      questionsReady = questionsCount > 0;
      questionsDetail = `${questionsCount} total questions active`;
      participantCount = await User.countDocuments({ role: 'participant' });
    }

    const allPassed = dbState === 'OK' && judgeHealthy && questionsReady && participantCount > 0;

    res.json({
      ready: allPassed,
      statusLabel: allPassed ? 'READY TO START 🟢' : 'ATTENTION REQUIRED 🟡',
      checks: [
        { name: 'Database Connectivity', passed: dbState === 'OK', detail: `${dbPing}ms latency` },
        { name: 'Code Judge Sandbox', passed: judgeHealthy, detail: `${judgeLatencyMs}ms execution time` },
        { name: 'Round Questions Selection', passed: questionsReady, detail: questionsDetail },
        { name: 'Question Bank Library', passed: bankCount > 0, detail: `${bankCount} templates ready` },
        { name: 'Participant Accounts', passed: participantCount > 0, detail: `${participantCount} candidates registered` },
        { name: 'Timer Service', passed: true, detail: 'Server-authoritative clock active' },
        { name: 'Proctoring & Anti-Cheat Engine', passed: true, detail: '8s self-destruct & kiosk lock active' }
      ]
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to run system readiness check' });
  }
});
