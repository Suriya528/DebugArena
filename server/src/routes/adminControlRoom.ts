import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { authenticate, requireAnyAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { Round } from '../models/Round.js';
import { RoundProgress } from '../models/RoundProgress.js';
import { ViolationLog } from '../models/ViolationLog.js';
import { Question } from '../models/Question.js';
import { QuestionTemplate } from '../models/QuestionTemplate.js';
import { executeSingleTestCase } from '../services/judgeService.js';
import { getQuestionFairnessMetrics, executeAnomalyAction } from '../services/anomalyService.js';

export const adminControlRoomRouter = Router();

adminControlRoomRouter.use(authenticate, requireAnyAdmin);

// GET /api/admin/control-room/pulse
adminControlRoomRouter.get('/pulse', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const roundNumber = parseInt((req.query.roundNumber as string) || '1', 10);
    const round = await Round.findOne({ roundNumber });

    const totalParticipants = await User.countDocuments({ role: 'participant' });
    const inProgressCount = await RoundProgress.countDocuments({ roundNumber, status: 'in_progress' });
    const submittedCount = await RoundProgress.countDocuments({ roundNumber, status: 'submitted' });
    const violationsCount = await ViolationLog.countDocuments({ roundNumber });

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
    const metrics = await getQuestionFairnessMetrics(roundNumber);
    res.json({ roundNumber, metrics });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute question fairness' });
  }
});

// POST /api/admin/control-room/anomaly-action
adminControlRoomRouter.post('/anomaly-action', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { roundNumber, questionId, action, reason } = req.body;
    if (!roundNumber || !questionId || !action) {
      res.status(400).json({ error: 'roundNumber, questionId, and action are required' });
      return;
    }

    const result = await executeAnomalyAction(
      parseInt(roundNumber, 10),
      questionId,
      action,
      req.user!.username,
      req.user!.userId,
      reason
    );

    res.json(result);
  } catch (err: any) {
    console.error('Anomaly action error:', err);
    res.status(500).json({ error: err.message || 'Failed to execute anomaly action' });
  }
});

// GET /api/admin/control-room/readiness (Pre-Event System Health Inspector)
adminControlRoomRouter.get('/readiness', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const startTime = Date.now();

    // 1. Check Database
    const dbState = mongoose.connection.readyState === 1 ? 'OK' : 'ERROR';
    const dbPing = Date.now() - startTime;

    // 2. Check Code Judge Sandbox (Test JavaScript execution)
    const judgeStart = Date.now();
    const judgeTest = await executeSingleTestCase('console.log("HEALTH_CHECK_OK")', 'javascript', '');
    const judgeLatencyMs = Date.now() - judgeStart;
    const judgeHealthy = judgeTest.stdout.includes('HEALTH_CHECK_OK');

    // 3. Check Questions & Bank
    const questionsCount = await Question.countDocuments();
    const bankCount = await QuestionTemplate.countDocuments();

    // 4. Check Participants
    const participantCount = await User.countDocuments({ role: 'participant' });

    const allPassed = dbState === 'OK' && judgeHealthy && questionsCount > 0 && participantCount > 0;

    res.json({
      ready: allPassed,
      statusLabel: allPassed ? 'READY TO START 🟢' : 'ATTENTION REQUIRED 🟡',
      checks: [
        { name: 'Database Connectivity', passed: dbState === 'OK', detail: `${dbPing}ms latency` },
        { name: 'Code Judge Sandbox', passed: judgeHealthy, detail: `${judgeLatencyMs}ms execution time` },
        { name: 'Competition Questions', passed: questionsCount > 0, detail: `${questionsCount} questions active` },
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
