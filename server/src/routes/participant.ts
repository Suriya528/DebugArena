import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { authenticate, requireRole, checkNotDisqualified, AuthenticatedRequest, AuthPayload } from '../middleware/auth.js';
import { Competition } from '../models/Competition.js';
import { Event } from '../models/Event.js';
import { Round } from '../models/Round.js';
import { Question } from '../models/Question.js';
import { Attempt } from '../models/Attempt.js';
import { RoundProgress } from '../models/RoundProgress.js';
import { ViolationLog } from '../models/ViolationLog.js';
import { TieBreak } from '../models/TieBreak.js';
import { ProcessedOperation } from '../models/ProcessedOperation.js';
import { CodeMilestone } from '../models/CodeMilestone.js';
import { DynamicRound } from '../models/DynamicRound.js';
import { ParticipantRoundResult } from '../models/ParticipantRoundResult.js';
import { getRemainingSeconds, syncRoundStatus, checkAndExpireRounds } from '../services/timerService.js';
import { runTestCases, sanitizeResultsForParticipant, sanitizeDiagnostics, summarizeTestResults } from '../services/judgeService.js';
import { computeQuestionScore, finalizeParticipantRoundScore } from '../services/scoringService.js';
import { broadcastToAdmins, broadcastToAll } from '../services/socketService.js';
import { User } from '../models/User.js';
import { QuestionTemplate } from '../models/QuestionTemplate.js';
import { generateQuestionVariant } from '../services/dnaService.js';
import { hashToken } from '../utils/tokenUtils.js';

export const participantRouter = Router();

// In-memory concurrency locks and anti-cheat debounce state
const activeEvaluationLocks = new Set<string>();
const recentViolationMap = new Map<string, { time: number; type: string; count: number }>();

function executionAssociation(params: {
  executionId: string;
  eventId?: string | Types.ObjectId;
  roundId?: { toString(): string } | string | null;
  roundNumber: number;
  questionId: string;
  attemptId?: { toString(): string } | string | null;
  language: string;
}) {
  return {
    executionId: params.executionId,
    eventId: params.eventId ? params.eventId.toString() : null,
    roundId: params.roundId ? params.roundId.toString() : null,
    roundNumber: params.roundNumber,
    questionId: params.questionId,
    attemptId: params.attemptId ? params.attemptId.toString() : null,
    language: (params.language || '').toLowerCase().trim()
  };
}

// -------------------- PUBLIC PARTICIPANT ACCESS --------------------

// GET /api/participant/access/:participantToken
// Resolves public event metadata for direct participant join link /join/:participantToken
participantRouter.get('/access/:participantToken', async (req: Request, res: Response): Promise<void> => {
  try {
    const { participantToken } = req.params;
    if (!participantToken) {
      res.status(400).json({ error: 'Participant access token is required.' });
      return;
    }

    const tokenHash = hashToken(participantToken);
    let event = await Event.findOne({ participantAccessTokenHash: tokenHash });
    if (!event) {
      event = await Event.findOne({ code: participantToken.trim().toUpperCase() });
    }
    if (!event) {
      res.status(404).json({ error: 'Invalid, expired, or deactivated competition join link.' });
      return;
    }

    let college: any = null;
    if (event.collegeId) {
      const { College } = await import('../models/College.js');
      college = await College.findById(event.collegeId);
    }

    const rounds = await DynamicRound.find({ eventId: event._id })
      .select('roundNumber title description type durationMinutes questionCount totalMarks passingMarks allowedLanguages status')
      .sort({ roundNumber: 1 });

    res.json({
      success: true,
      event: {
        _id: event._id,
        name: event.name,
        code: event.code,
        description: event.description,
        bannerUrl: event.bannerUrl,
        status: event.status,
        rules: event.rules,
        scoringConfig: event.scoringConfig,
        branding: event.branding,
        college: college
          ? {
              _id: college._id,
              name: college.name,
              code: college.code,
              primaryColor: college.primaryColor,
              secondaryColor: college.secondaryColor
            }
          : null,
        rounds
      }
    });
  } catch (err: any) {
    console.error('Failed to resolve participant access token:', err);
    res.status(500).json({ error: 'Failed to access event details.' });
  }
});

// POST /api/participant/join-by-token
// Allows a participant to join an event using the secure participant token
participantRouter.post('/join-by-token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { participantToken, username, regNo, identifier, password, name, department, year, mode } = req.body;
    const rawIdentifier = (username || regNo || identifier || '').trim();

    if (!participantToken || !rawIdentifier || !password) {
      res.status(400).json({ error: 'Participant access token, username/roll number, and password are required.' });
      return;
    }

    const tokenHash = hashToken(participantToken);
    let event = await Event.findOne({ participantAccessTokenHash: tokenHash });
    if (!event) {
      event = await Event.findOne({ code: participantToken.trim().toUpperCase() });
    }
    if (!event) {
      res.status(404).json({ error: 'Invalid or expired competition join link.' });
      return;
    }

    if (event.status !== 'registration' && event.status !== 'ready' && event.status !== 'live') {
      res.status(403).json({
        error: `Event '${event.name}' is currently ${event.status.toUpperCase()}. Registration is closed.`
      });
      return;
    }

    const cleanUpper = rawIdentifier.toUpperCase();
    const cleanLower = rawIdentifier.toLowerCase();
    const alphanumericOnly = rawIdentifier.replace(/[^a-zA-Z0-9]/g, '');
    const scopedUsername = `${event.code.toLowerCase()}_${alphanumericOnly.toLowerCase()}`;

    let user = await User.findOne({
      eventId: event._id,
      $or: [
        { username: cleanLower },
        { regNo: cleanUpper },
        { username: rawIdentifier },
        { regNo: rawIdentifier },
        { username: scopedUsername }
      ]
    });

    if (user) {
      if (user.passwordHash) {
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
          res.status(401).json({
            error: 'Invalid password. Please check your credentials and try again.'
          });
          return;
        }
      }
    } else {
      // New participant registration guard: blocked once Round 1 has started
      const round1 = await DynamicRound.findOne({ eventId: event._id, roundNumber: 1 });
      const isRound1Started = Boolean(
        (round1 && (round1.status !== 'pending' || Boolean(round1.startedAt))) ||
        event.status === 'live'
      );
      if (isRound1Started) {
        res.status(403).json({
          error: 'Registration is closed. New participants cannot register after Round 1 has started.'
        });
        return;
      }

      // If user is trying to register explicitly
      if (mode === 'register' || Boolean(name && name.trim())) {
        const cleanReg = cleanUpper || cleanLower;
        const effectiveName = (name && name.trim()) ? name.trim() : rawIdentifier;
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        try {
          user = await User.create({
            username: cleanLower,
            name: effectiveName,
            passwordHash,
            role: 'participant',
            collegeId: event.collegeId,
            eventId: event._id,
            regNo: cleanReg,
            department: (department || '').trim() || 'CSE',
            year: (year || '').trim() || 'III'
          });
        } catch (createErr: any) {
          if (createErr.code === 11000) {
            user = await User.findOne({
              eventId: event._id,
              $or: [
                { username: cleanLower },
                { regNo: cleanUpper }
              ]
            });
            if (!user) throw createErr;
          } else {
            throw createErr;
          }
        }
      } else {
        res.status(404).json({
          error: `Participant '${rawIdentifier}' was not enrolled in this assessment. Please contact your event administrator or check your credentials.`
        });
        return;
      }
    }

    if (user.isDisqualified) {
      res.status(403).json({
        error: `Participant account is disqualified: ${user.disqualificationReason || 'Security policy violation'}`
      });
      return;
    }

    const payload: AuthPayload = {
      userId: user._id.toString(),
      username: user.username,
      name: user.name,
      role: 'participant',
      collegeId: user.collegeId?.toString(),
      eventId: event._id.toString()
    };

    const token = jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '12h' });

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        regNo: user.regNo,
        department: user.department,
        year: user.year,
        eventId: event._id
      },
      event: {
        _id: event._id,
        name: event.name,
        code: event.code,
        status: event.status
      }
    });
  } catch (err: any) {
    console.error('Participant token join error:', err);
    res.status(500).json({ error: 'Failed to authenticate participant for this event.' });
  }
});

// GET /api/participant/event-info/:eventCode
// Public endpoint for previewing an event's metadata before joining
participantRouter.get('/event-info/:eventCode', async (req: Request, res: Response): Promise<void> => {
  try {
    const cleanCode = req.params.eventCode.trim().toUpperCase();
    const event = await Event.findOne({ code: cleanCode });
    if (!event) {
      res.status(404).json({ error: `Event with code '${cleanCode}' not found.` });
      return;
    }

    let college: any = null;
    if (event.collegeId) {
      const { College } = await import('../models/College.js');
      college = await College.findById(event.collegeId);
    }

    const rounds = await DynamicRound.find({ eventId: event._id })
      .select('roundNumber title description type durationMinutes questionCount totalMarks passingMarks allowedLanguages status')
      .sort({ roundNumber: 1 });

    res.json({
      success: true,
      event: {
        _id: event._id,
        name: event.name,
        code: event.code,
        description: event.description,
        bannerUrl: event.bannerUrl,
        status: event.status,
        rules: event.rules,
        scoringConfig: event.scoringConfig,
        college: college ? {
          _id: college._id,
          name: college.name,
          code: college.code,
          primaryColor: college.primaryColor,
          secondaryColor: college.secondaryColor
        } : null,
        rounds
      }
    });
  } catch (err: any) {
    console.error('Failed to get event info:', err);
    res.status(500).json({ error: 'Failed to retrieve event details' });
  }
});

// POST /api/participant/join-by-code
// Allows a participant to join an active event using an event code, supporting idempotent reconnection
participantRouter.post('/join-by-code', async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventCode, username, regNo, identifier, password, name, department, year, mode } = req.body;
    const rawIdentifier = (username || regNo || identifier || '').trim();

    if (!eventCode || !rawIdentifier || !password) {
      res.status(400).json({ error: 'Event code, username/roll number, and password are required' });
      return;
    }

    const cleanCode = eventCode.trim().toUpperCase();
    const event = await Event.findOne({ code: cleanCode });
    if (!event) {
      res.status(404).json({ error: `Event with code '${cleanCode}' not found.` });
      return;
    }

    // State machine guard: event must allow participant entry
    if (event.status !== 'registration' && event.status !== 'ready' && event.status !== 'live') {
      res.status(403).json({
        error: `Event '${event.name}' is currently ${event.status.toUpperCase()}. Registration is closed.`
      });
      return;
    }

    const cleanUpper = rawIdentifier.toUpperCase();
    const cleanLower = rawIdentifier.toLowerCase();
    const alphanumericOnly = rawIdentifier.replace(/[^a-zA-Z0-9]/g, '');
    const scopedUsername = `${cleanCode.toLowerCase()}_${alphanumericOnly.toLowerCase()}`;

    // Reconnect Idempotency: Check if student already registered in this event
    let user = await User.findOne({
      eventId: event._id,
      $or: [
        { username: cleanLower },
        { regNo: cleanUpper },
        { username: rawIdentifier },
        { regNo: rawIdentifier },
        { username: scopedUsername }
      ]
    });

    if (user) {
      // Existing student reconnecting: Verify password
      if (user.passwordHash) {
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
          res.status(401).json({
            error: 'Invalid password. Please check your credentials and try again.'
          });
          return;
        }
      }
    } else {
      // New participant registration guard: blocked once Round 1 has started
      const round1 = await DynamicRound.findOne({ eventId: event._id, roundNumber: 1 });
      const isRound1Started = Boolean(
        (round1 && (round1.status !== 'pending' || Boolean(round1.startedAt))) ||
        event.status === 'live'
      );
      if (isRound1Started) {
        res.status(403).json({
          error: 'Registration is closed. New participants cannot register after Round 1 has started.'
        });
        return;
      }

      // New Student Registration (if explicitly registering)
      if (mode === 'register' || Boolean(name && name.trim())) {
        const cleanReg = cleanUpper || cleanLower;
        const effectiveName = (name && name.trim()) ? name.trim() : rawIdentifier;
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        try {
          user = await User.create({
            username: cleanLower,
            name: effectiveName,
            passwordHash,
            role: 'participant',
            collegeId: event.collegeId,
            eventId: event._id,
            regNo: cleanReg,
            department: (department || '').trim() || 'CSE',
            year: (year || '').trim() || 'III'
          });
        } catch (createErr: any) {
          if (createErr.code === 11000) {
            user = await User.findOne({
              eventId: event._id,
              $or: [
                { username: cleanLower },
                { regNo: cleanUpper }
              ]
            });
            if (!user) throw createErr;
          } else {
            throw createErr;
          }
        }
      } else {
        res.status(404).json({
          error: `Participant '${rawIdentifier}' was not enrolled in this assessment. Please contact your event administrator or check your credentials.`
        });
        return;
      }
    }

    if (user.isDisqualified) {
      res.status(403).json({
        error: 'You have been disqualified from this competition.',
        reason: user.disqualificationReason || 'Rule violation'
      });
      return;
    }

    const payload: AuthPayload = {
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
      name: user.name,
      collegeId: user.collegeId ? user.collegeId.toString() : undefined,
      eventId: user.eventId ? user.eventId.toString() : undefined
    };

    const token = jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        collegeId: user.collegeId,
        eventId: user.eventId,
        department: user.department,
        regNo: user.regNo
      },
      event: {
        id: event._id,
        name: event.name,
        code: event.code,
        status: event.status
      }
    });
  } catch (err: any) {
    console.error('Join by code error:', err);
    res.status(500).json({ error: 'Failed to join event with code' });
  }
});

// -------------------- AUTHENTICATED PARTICIPANT ROUTES --------------------

participantRouter.use(authenticate);
participantRouter.use(requireRole('participant'));
participantRouter.use(checkNotDisqualified);

// Helper to determine participant's accessible round
async function getParticipantAccessibleRound(userId: string, eventId?: string) {
  // Check tie-break first
  const activeTieBreak = await TieBreak.findOne({
    tiedUserIds: userId,
    status: 'active'
  });

  const progQuery: any = { userId };
  if (eventId) {
    progQuery.eventId = eventId;
  }
  const progressList = await RoundProgress.find(progQuery).sort({ roundNumber: -1 });

  let maxRound = 3;
  if (eventId) {
    const highestDyn = await DynamicRound.findOne({ eventId }).sort({ roundNumber: -1 });
    if (highestDyn && highestDyn.roundNumber > maxRound) {
      maxRound = highestDyn.roundNumber;
    }
  }

  // Find the highest round the user has progress in
  for (let r = maxRound; r >= 1; r--) {
    const prog = progressList.find(p => p.roundNumber === r);
    if (prog) {
      return { roundNumber: r, progress: prog, activeTieBreak };
    }
  }

  // Default to Round 1 if competition allows
  return { roundNumber: 1, progress: progressList.find(p => p.roundNumber === 1) || null, activeTieBreak };
}

// GET /api/participant/round-state
participantRouter.get('/round-state', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    // Check if participant was eliminated in this event
    const elimQuery: any = { userId, status: 'eliminated' };
    if (req.user?.eventId) {
      elimQuery.eventId = req.user.eventId;
    }
    const eliminatedProg = await RoundProgress.findOne(elimQuery);
    if (eliminatedProg) {
      const pubResult = await ParticipantRoundResult.findOne({
        participantId: userId,
        roundNumber: eliminatedProg.roundNumber
      });
      res.json({
        competition: { title: 'Debug Arena', status: 'active', violationLimit: 3 },
        round: {
          roundNumber: eliminatedProg.roundNumber,
          title: `Round ${eliminatedProg.roundNumber}`,
          status: 'completed',
          durationMinutes: 30,
          remainingSeconds: 0
        },
        progress: {
          status: 'eliminated',
          totalScore: undefined,
          timeTakenSeconds: undefined,
          violationCount: eliminatedProg.violationCount || 0,
          markedForReview: [],
          canStart: false,
          isQualifiedWaitingNextRound: false,
          nextRoundAvailable: false,
          isFinalRound: false
        },
        result: {
          status: 'NOT_SELECTED',
          isPublished: pubResult?.isPublished ?? true,
          publishedAt: pubResult?.publishedAt?.toISOString() || null
        },
        isEliminated: true,
        canStart: false,
        nextRoundAvailable: false,
        questions: [],
        attempts: []
      });
      return;
    }

    const competition = await Competition.findOne() || await Competition.create({ status: 'active' });
    const computed = await getParticipantAccessibleRound(userId, req.user?.eventId);
    const requestedRound = req.query.roundNumber ? parseInt(req.query.roundNumber as string, 10) : undefined;
    const roundNumber = requestedRound || computed.roundNumber;
    const progress = computed.progress;
    const activeTieBreak = computed.activeTieBreak;

    // If active tie-break exists for user
    if (activeTieBreak) {
      const question = await Question.findById(activeTieBreak.questionId);
      const attempt = await Attempt.findOne({ userId, questionId: activeTieBreak.questionId });
      res.json({
        isTieBreak: true,
        tieBreakId: activeTieBreak._id,
        roundNumber: 99,
        status: 'active',
        remainingSeconds: Math.max(0, Math.floor(((activeTieBreak.startedAt ? new Date(activeTieBreak.startedAt).getTime() : Date.now()) + activeTieBreak.durationMinutes * 60000 - Date.now()) / 1000)),
        question: question ? {
          _id: question._id,
          type: question.type,
          title: question.title,
          prompt: question.prompt,
          inputFormat: question.inputFormat || '',
          outputFormat: question.outputFormat || '',
          constraints: question.constraints || '',
          marks: question.marks,
          allowedLanguages: question.allowedLanguages,
          starterCode: question.starterCode instanceof Map ? Object.fromEntries(question.starterCode) : (question.starterCode || {}),
          testCases: (question.testCases || []).filter(tc => !tc.isHidden).map(tc => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            weight: tc.weight,
            isHidden: false
          })),
          timeLimitMs: question.timeLimitMs
        } : null,
        attempt: attempt ? {
          ...(typeof (attempt as any).toObject === 'function' ? (attempt as any).toObject() : attempt),
          testCaseResults: sanitizeResultsForParticipant(attempt.testCaseResults || [])
        } : null
      });
      return;
    }

    let round: any = null;
    if (req.user?.eventId) {
      round = await DynamicRound.findOne({ eventId: req.user.eventId, roundNumber });
    }
    if (!round) {
      round = await Round.findOne({ roundNumber });
    }
    if (!round) {
      res.status(404).json({ error: `Round ${roundNumber} configuration not found` });
      return;
    }

    await syncRoundStatus(round);

    // Check if participant was eliminated in earlier round of this event
    if (roundNumber > 1) {
      const prevQuery: any = { userId, roundNumber: roundNumber - 1 };
      if (req.user?.eventId) {
        prevQuery.eventId = req.user.eventId;
      }
      const prevProg = await RoundProgress.findOne(prevQuery);
      if (!prevProg || prevProg.status === 'eliminated') {
        res.status(403).json({
          error: 'You are eliminated from the competition',
          status: 'eliminated'
        });
        return;
      }
      if (prevProg.status !== 'advanced') {
        res.status(403).json({
          error: 'You have not been advanced to this round yet. Please wait for the admin to announce advancements.',
          status: 'waiting_advancement'
        });
        return;
      }
    }

    // Get RoundProgress (strictly read-only: do NOT mutate or start attempt on read)
    let currentProgress = progress;
    if (!currentProgress) {
      const progQuery: any = { userId, roundNumber };
      if (req.user?.eventId) progQuery.eventId = req.user.eventId;
      currentProgress = await RoundProgress.findOne(progQuery);
      if (!currentProgress && !req.user?.eventId) {
        currentProgress = await RoundProgress.findOne({ userId, roundNumber });
      }
    }

    // Section 29 Self-Healing: Heal ghost submitted/expired records (0 score & 0 attempts & 0 time taken) for active or not_started rounds
    if (
      currentProgress &&
      (currentProgress.timeTakenSeconds || 0) === 0 &&
      (currentProgress.status === 'submitted' || currentProgress.status === 'expired') &&
      (currentProgress.totalScore || 0) === 0
    ) {
      const attemptCount = await Attempt.countDocuments({ userId, roundNumber });
      if (attemptCount === 0 && (round.status === 'active' || round.status === 'not_started')) {
        currentProgress.status = 'not_started';
        currentProgress.startedAt = null;
        currentProgress.endsAt = null;
        currentProgress.submittedAt = null;
        currentProgress.timeTakenSeconds = 0;
        await currentProgress.save();
      }
    }

    let remainingSeconds = 0;
    let deadlineAt: Date | null = null;
    const canStart = round.status === 'active' && (!currentProgress || currentProgress.status === 'not_started');

    if (!currentProgress || currentProgress.status === 'not_started') {
      // Participant has NOT started yet: full duration is available, timer is not running
      remainingSeconds = round.durationMinutes * 60;
      deadlineAt = null;
    } else if (currentProgress.status === 'in_progress') {
      // Participant is actively in progress
      const targetDeadline = currentProgress.endsAt
        ? new Date(currentProgress.endsAt).getTime()
        : (currentProgress.startedAt ? new Date(currentProgress.startedAt).getTime() + round.durationMinutes * 60000 : 0);

      const now = Date.now();
      if (targetDeadline > 0 && now >= targetDeadline) {
        // Participant's individual deadline has expired: auto-finalize
        await finalizeParticipantRoundScore(userId, roundNumber);
        currentProgress = await RoundProgress.findOne({ userId, roundNumber });
        remainingSeconds = 0;
        deadlineAt = currentProgress?.endsAt || new Date(targetDeadline);
      } else if (targetDeadline > 0) {
        remainingSeconds = Math.max(0, Math.floor((targetDeadline - now) / 1000));
        deadlineAt = currentProgress.endsAt || new Date(targetDeadline);
      } else {
        remainingSeconds = round.durationMinutes * 60;
      }
    } else {
      // Submitted, expired, or eliminated
      remainingSeconds = 0;
      deadlineAt = currentProgress.endsAt || null;
    }

    // Fetch questions for this round (Strictly isolated to candidate's event)
    let questions: any[] = [];
    if (req.user?.eventId) {
      questions = await Question.find({ eventId: req.user.eventId, roundNumber }).sort({ orderIndex: 1, _id: 1 });
    } else {
      questions = await Question.find({ roundNumber, eventId: null }).sort({ orderIndex: 1, _id: 1 });
    }

    // Lookup dynamic round for event-specific allowed languages
    let roundAllowedLanguages: string[] | null = null;
    if (req.user?.eventId) {
      const dynRound = await DynamicRound.findOne({ eventId: req.user.eventId, roundNumber });
      if (dynRound && dynRound.allowedLanguages && dynRound.allowedLanguages.length > 0) {
        roundAllowedLanguages = dynRound.allowedLanguages;
      }
    }

    const questionTemplates = await QuestionTemplate.find();

    // Sanitize questions: strip correct answers for MCQ and apply Question DNA mutation per candidate!
    const sanitizedQuestions = questions.map((q, displayIndex) => {
      let prompt = q.prompt;
      let starterCode = q.starterCode instanceof Map ? Object.fromEntries(q.starterCode) : (q.starterCode ? { ...q.starterCode } : {});
      let testCases = q.testCases || [];

      // Check if question has matching DNA template for mutation per candidate
      const matchingTemplate = questionTemplates.find(
        qt => qt.title === q.title && qt.hasDnaMutation && qt.dnaConfig
      );
      if (matchingTemplate) {
        const variant = generateQuestionVariant(matchingTemplate, userId, req.user?.eventId || 'default');
        prompt = variant.mutatedPrompt;
        if (variant.mutatedCode) {
          starterCode = { [(matchingTemplate.language || 'python').toLowerCase()]: variant.mutatedCode };
        }
        if (variant.mutatedTestCases && variant.mutatedTestCases.length > 0) {
          testCases = variant.mutatedTestCases.map(tc => ({
            input: tc.input,
            expectedOutput: tc.output,
            weight: tc.weight,
            isHidden: tc.isHidden
          }));
        }
      }

      if (q.type === 'mcq') {
        return {
          _id: q._id,
          roundNumber: q.roundNumber,
          type: q.type,
          orderIndex: q.orderIndex,
          displayNumber: displayIndex + 1,
          title: q.title,
          prompt,
          marks: q.marks,
          options: q.options
        };
      } else {
        return {
          _id: q._id,
          roundNumber: q.roundNumber,
          type: q.type,
          orderIndex: q.orderIndex,
          displayNumber: displayIndex + 1,
          title: q.title,
          prompt,
          inputFormat: q.inputFormat || '',
          outputFormat: q.outputFormat || '',
          constraints: q.constraints || '',
          marks: q.marks,
          allowedLanguages: roundAllowedLanguages || q.allowedLanguages || ['python', 'cpp', 'java', 'c', 'javascript'],
          starterCode,
          testCases: testCases.filter((tc: any) => !tc.isHidden).map((tc: any) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput || tc.output,
            weight: tc.weight,
            isHidden: false
          })),
          timeLimitMs: q.timeLimitMs,
          memoryLimitMb: q.memoryLimitMb
        };
      }
    });

    // Fetch existing attempts for this participant in this round
    const existingAttempts = await Attempt.find({ userId, roundNumber });

    let eventTitle = competition.title;
    let eventStatus: string = competition.status;
    let effectiveViolationLimit = competition.violationLimit;

    if (req.user?.eventId) {
      const event = await Event.findById(req.user.eventId).select('name status scoringConfig');
      if (event) {
        eventTitle = event.name;
        eventStatus = event.status;
        if (event.scoringConfig?.violationLimit) {
          effectiveViolationLimit = event.scoringConfig.violationLimit;
        }
      }
    }

    let isFinalRound = false;
    let hasNextRound = false;
    let nextRoundId: string | null = null;

    if (req.user?.eventId) {
      const allRounds = await DynamicRound.find({ eventId: req.user.eventId }).sort({ roundNumber: 1 });
      const currentIdx = allRounds.findIndex(r => r.roundNumber === round.roundNumber);
      if (currentIdx !== -1 && currentIdx === allRounds.length - 1) {
        isFinalRound = true;
      } else if (currentIdx !== -1 && currentIdx < allRounds.length - 1) {
        hasNextRound = true;
        nextRoundId = allRounds[currentIdx + 1]._id.toString();
      } else if (allRounds.length > 0 && round.roundNumber >= allRounds[allRounds.length - 1].roundNumber) {
        isFinalRound = true;
      }
    } else {
      const allRounds = await Round.find().sort({ roundNumber: 1 });
      const currentIdx = allRounds.findIndex(r => r.roundNumber === round.roundNumber);
      if (currentIdx !== -1 && currentIdx === allRounds.length - 1) {
        isFinalRound = true;
      } else if (currentIdx !== -1 && currentIdx < allRounds.length - 1) {
        hasNextRound = true;
        nextRoundId = (allRounds[currentIdx + 1] as any)._id?.toString() || null;
      } else if (allRounds.length > 0 && round.roundNumber >= allRounds[allRounds.length - 1].roundNumber) {
        isFinalRound = true;
      }
    }

    // --- Result Publication Integration ---
    // Look up the participant's published result for this round
    const resultQuery: any = { participantId: userId, roundNumber };
    if (req.user?.eventId) {
      const eventObjId = new (await import('mongoose')).default.Types.ObjectId(req.user.eventId);
      resultQuery.$or = [{ eventId: req.user.eventId }, { eventId: eventObjId }];
      delete resultQuery.eventId;
    }
    const participantResult = await ParticipantRoundResult.findOne(resultQuery);

    // Derive result status for participant
    // CRITICAL: Participant ONLY sees their result AFTER admin publishes
    let resultData: { status: 'RESULT_PENDING' | 'SELECTED' | 'NOT_SELECTED'; isPublished: boolean; publishedAt?: string | null } | null = null;
    const progressStatus = currentProgress?.status || 'not_started';
    const isConcluded = ['submitted', 'expired', 'advanced', 'eliminated'].includes(progressStatus);

    if (isConcluded) {
      if (participantResult && participantResult.isPublished) {
        resultData = {
          status: participantResult.selectionStatus as 'SELECTED' | 'NOT_SELECTED',
          isPublished: true,
          publishedAt: participantResult.publishedAt?.toISOString() || null
        };
      } else {
        resultData = {
          status: 'RESULT_PENDING',
          isPublished: false,
          publishedAt: null
        };
      }
    }

    // nextRoundAvailable: Only when result is PUBLISHED + SELECTED + next round is active
    let nextRoundAvailable = false;
    const isQualifiedWaitingNextRound = false; // Deprecated - replaced by result-based flow
    if (resultData?.status === 'SELECTED' && resultData.isPublished && !isFinalRound) {
      let nextStageRound: any = null;
      if (req.user?.eventId) {
        nextStageRound = await DynamicRound.findOne({ eventId: req.user.eventId, roundNumber: roundNumber + 1 });
      } else {
        nextStageRound = await Round.findOne({ roundNumber: roundNumber + 1 });
      }
      if (nextStageRound && nextStageRound.status === 'active') {
        nextRoundAvailable = true;
      }
    }

    // --- Privacy: Strip scores/times from concluded states ---
    // Participants must NEVER see their scores before official results
    const shouldStripScores = isConcluded;

    res.json({
      competition: {
        title: eventTitle,
        status: eventStatus,
        violationLimit: effectiveViolationLimit
      },
      round: {
        roundNumber: round.roundNumber,
        title: round.title,
        description: round.description,
        type: round.type,
        durationMinutes: round.durationMinutes,
        status: round.status,
        startedAt: currentProgress?.startedAt || null,
        deadlineAt,
        remainingSeconds
      },
      progress: {
        status: progressStatus,
        totalScore: shouldStripScores ? undefined : (currentProgress?.totalScore || 0),
        markedForReview: currentProgress?.markedForReview || [],
        violationCount: currentProgress?.violationCount || 0,
        timeTakenSeconds: shouldStripScores ? undefined : (currentProgress?.timeTakenSeconds || 0),
        startedAt: currentProgress?.startedAt || null,
        endsAt: currentProgress?.endsAt || null,
        canStart,
        isQualifiedWaitingNextRound,
        nextRoundAvailable,
        isFinalRound,
        hasNextRound,
        nextRoundId
      },
      result: resultData,
      canStart,
      isQualifiedWaitingNextRound,
      nextRoundAvailable,
      isFinalRound,
      hasNextRound,
      nextRoundId,
      questions: sanitizedQuestions,
      attempts: existingAttempts.map(att => ({
        questionId: att.questionId,
        selectedOption: att.selectedOption,
        code: att.code,
        language: att.language,
        score: shouldStripScores ? undefined : att.score,
        status: att.status,
        lastSavedAt: att.lastSavedAt,
        testCaseResults: sanitizeResultsForParticipant(att.testCaseResults || [])
      }))
    });
  } catch (err: any) {
    console.error('Error fetching round state:', err);
    res.status(500).json({ error: 'Server error retrieving round state' });
  }
});

// POST /api/participant/rounds/:roundNumber/start and POST /api/participant/start-round
// Authoritative Server-Side Participant Attempt Initialization
participantRouter.post(['/rounds/:roundNumber/start', '/start-round'], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const roundNumber = parseInt(req.params.roundNumber || req.body.roundNumber, 10);
    if (isNaN(roundNumber)) {
      res.status(400).json({ error: 'Valid roundNumber is required' });
      return;
    }

    const user = await User.findById(userId);
    if (user?.isDisqualified) {
      res.status(403).json({ error: 'Participant is disqualified' });
      return;
    }

    // Check if participant was eliminated in this event
    const elimQuery: any = { userId, status: 'eliminated' };
    if (req.user?.eventId) {
      elimQuery.eventId = req.user.eventId;
    }
    const eliminatedProg = await RoundProgress.findOne(elimQuery);
    if (eliminatedProg) {
      res.status(403).json({ error: 'You have been eliminated from the competition.', status: 'eliminated' });
      return;
    }

    // Find the round (dynamic round for event, or global round)
    let round: any = null;
    if (req.user?.eventId) {
      round = await DynamicRound.findOne({ eventId: req.user.eventId, roundNumber });
    }
    if (!round) {
      round = await Round.findOne({ roundNumber });
    }
    if (!round) {
      res.status(404).json({ error: `Round ${roundNumber} not found` });
      return;
    }

    // If round > 1, check advancement eligibility first
    if (roundNumber > 1) {
      const prevQuery: any = { userId, roundNumber: roundNumber - 1 };
      if (req.user?.eventId) {
        prevQuery.eventId = req.user.eventId;
      }
      const prevProg = await RoundProgress.findOne(prevQuery);
      if (!prevProg || prevProg.status !== 'advanced') {
        res.status(403).json({
          error: 'You have not been advanced to this round yet.',
          status: 'waiting_advancement'
        });
        return;
      }

      // Additionally verify that the previous round's result was PUBLISHED as SELECTED
      const prevResultQuery: any = { participantId: userId, roundNumber: roundNumber - 1 };
      if (req.user?.eventId) {
        const mongoose = (await import('mongoose')).default;
        const eventObjId = new mongoose.Types.ObjectId(req.user.eventId);
        prevResultQuery.$or = [{ eventId: req.user.eventId }, { eventId: eventObjId }];
      }
      const prevResult = await ParticipantRoundResult.findOne(prevResultQuery);
      if (!prevResult || !prevResult.isPublished || prevResult.selectionStatus !== 'SELECTED') {
        res.status(403).json({
          error: 'Results for the previous round have not been published yet. Please wait for the organizer to announce results.',
          status: 'waiting_results'
        });
        return;
      }
    }

    await syncRoundStatus(round);

    if (round.status !== 'active') {
      res.status(400).json({
        error: `Cannot start Round ${roundNumber}: round is currently '${round.status}'. Waiting for admin to start.`,
        roundStatus: round.status
      });
      return;
    }

    // Verify question presence & quota before participant starts
    const qFilter: Record<string, any> = { roundNumber };
    if (req.user?.eventId) qFilter.eventId = req.user.eventId;
    const qCount = await Question.countDocuments(qFilter);
    const targetCount = (round.questionCount !== undefined ? round.questionCount : null) || (roundNumber === 1 ? 10 : (round.type === 'mcq' ? 10 : 3));
    if (qCount < targetCount) {
      res.status(400).json({
        error: `Cannot start Round ${roundNumber}. Administrator has not assigned all required questions (${qCount}/${targetCount}).`,
        roundNumber,
        requiredCount: targetCount,
        assignedCount: qCount
      });
      return;
    }

    // Find or create RoundProgress
    const progQuery: any = { userId, roundNumber };
    if (req.user?.eventId) progQuery.eventId = req.user.eventId;
    let progress = await RoundProgress.findOne(progQuery);
    if (!progress && !req.user?.eventId) {
      progress = await RoundProgress.findOne({ userId, roundNumber });
    }

    // Section 29 Self-Healing: Check if existing submitted/expired attempt was a 0-attempt ghost record from the old bug
    if (progress && (progress.timeTakenSeconds || 0) === 0 && (progress.status === 'submitted' || progress.status === 'expired') && (progress.totalScore || 0) === 0) {
      const attemptCount = await Attempt.countDocuments({ userId, roundNumber });
      if (attemptCount === 0) {
        // Heal ghost record to not_started so participant can start their real attempt
        progress.status = 'not_started';
        progress.startedAt = null;
        progress.endsAt = null;
        progress.submittedAt = null;
        progress.timeTakenSeconds = 0;
        await progress.save();
      }
    }

    if (progress && (progress.status === 'submitted' || progress.status === 'expired' || progress.status === 'eliminated')) {
      res.status(400).json({
        error: `Cannot start Round ${roundNumber}: attempt already completed (${progress.status}).`,
        status: progress.status
      });
      return;
    }

    // Idempotency: Double-click or reopen in second tab while in progress
    if (progress && progress.status === 'in_progress' && progress.startedAt) {
      const endsAt = progress.endsAt || new Date(new Date(progress.startedAt).getTime() + round.durationMinutes * 60000);
      const remainingSeconds = Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000));
      res.json({
        success: true,
        message: 'Round attempt already in progress',
        status: 'in_progress',
        startedAt: progress.startedAt,
        endsAt,
        remainingSeconds,
        durationMinutes: round.durationMinutes,
        idempotent: true
      });
      return;
    }

    // New Attempt Start: set authoritative server timestamps
    const now = new Date();
    const durationMinutes = round.durationMinutes || 30;
    const durationMs = durationMinutes * 60 * 1000;
    const endsAt = new Date(now.getTime() + durationMs);

    if (!progress) {
      progress = await RoundProgress.create({
        userId,
        eventId: req.user?.eventId,
        roundNumber,
        status: 'in_progress',
        startedAt: now,
        endsAt: endsAt
      });
    } else {
      progress.status = 'in_progress';
      progress.startedAt = now;
      progress.endsAt = endsAt;
      if (!progress.eventId && req.user?.eventId) {
        progress.eventId = req.user.eventId as any;
      }
      await progress.save();
    }

    broadcastToAdmins('admin:participant_started_round', {
      userId,
      username: req.user!.username,
      roundNumber,
      startedAt: now,
      endsAt: endsAt,
      eventId: req.user?.eventId
    });

    res.json({
      success: true,
      message: `Round ${roundNumber} started successfully`,
      status: 'in_progress',
      startedAt: progress.startedAt,
      endsAt: progress.endsAt,
      remainingSeconds: durationMinutes * 60,
      durationMinutes
    });
  } catch (err: any) {
    console.error('Error starting round attempt:', err);
    res.status(500).json({ error: 'Internal server error while starting round' });
  }
});

// POST /api/participant/save-answer
participantRouter.post('/save-answer', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { questionId, roundNumber, selectedOption, code, language, operationId, seqId, clientTimestamp } = req.body;

    if (!questionId || !roundNumber) {
      res.status(400).json({ error: 'questionId and roundNumber are required' });
      return;
    }

    // Idempotency check
    if (operationId) {
      const existingOp = await ProcessedOperation.findOne({ operationId });
      if (existingOp) {
        res.json({ ...existingOp.resultPayload, deduplicated: true });
        return;
      }
    }

    const targetQuestion = await Question.findById(questionId);
    if (!targetQuestion) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }
    if (req.user?.eventId && targetQuestion.eventId && targetQuestion.eventId.toString() !== req.user.eventId.toString()) {
      res.status(403).json({ error: 'Question does not belong to this competition event' });
      return;
    }
    if (targetQuestion.roundNumber !== roundNumber) {
      res.status(403).json({ error: 'Question does not belong to this round' });
      return;
    }

    const isTieBreak = roundNumber === 99;
    if (isTieBreak) {
      const activeTie = await TieBreak.findOne({ tiedUserIds: userId, status: 'active' });
      if (!activeTie) {
        res.status(400).json({ error: 'No active tie-break session found' });
        return;
      }
    } else {
      // Check participant round attempt state
      const progress = await RoundProgress.findOne({ userId, roundNumber });
      if (!progress || progress.status === 'not_started') {
        res.status(400).json({ error: 'Cannot save answer: Round has not been started yet.' });
        return;
      }
      if (progress.status === 'submitted' || progress.status === 'expired' || progress.status === 'eliminated') {
        res.status(403).json({ error: `Cannot save answer: round status is ${progress.status}` });
        return;
      }
      if (progress.status !== 'in_progress') {
        res.status(400).json({ error: 'Cannot save answer: round attempt is not in progress' });
        return;
      }

      let round: any = null;
      if (req.user?.eventId) {
        round = await DynamicRound.findOne({ eventId: req.user.eventId, roundNumber });
      }
      if (!round) {
        round = await Round.findOne({ roundNumber });
      }
      if (round) {
        await syncRoundStatus(round);
      }
      if (!round || round.status !== 'active') {
        res.status(400).json({ error: 'This round is not currently active' });
        return;
      }

      // Check personal attempt expiry (with 5s network grace period)
      const deadline = progress.endsAt
        ? new Date(progress.endsAt).getTime()
        : (progress.startedAt ? new Date(progress.startedAt).getTime() + (round?.durationMinutes || 30) * 60000 : 0);
      if (deadline > 0 && Date.now() > deadline + 5000) {
        res.status(400).json({ error: 'Time expired: Round duration has elapsed.' });
        return;
      }
    }

    let attempt = await Attempt.findOne({ userId, roundNumber, questionId });
    if (!attempt) {
      attempt = new Attempt({
        userId,
        ...(req.user?.eventId ? { eventId: req.user.eventId } : {}),
        roundNumber,
        questionId,
        status: 'saved'
      });
    }

    if (!attempt.eventId && req.user?.eventId) {
      attempt.eventId = req.user.eventId as any;
    }

    if (selectedOption !== undefined) {
      attempt.selectedOption = selectedOption;
    }
    if (code !== undefined) {
      attempt.code = code;
    }
    if (language !== undefined) {
      attempt.language = language;
    }

    attempt.status = 'saved';
    attempt.lastSavedAt = new Date();
    await attempt.save();

    const responsePayload = { success: true, savedAt: attempt.lastSavedAt };

    if (operationId) {
      await ProcessedOperation.create({
        operationId,
        userId,
        roundNumber,
        questionId,
        actionType: 'save_answer',
        seqId,
        clientTimestamp,
        resultPayload: responsePayload
      }).catch(() => {});
    }

    res.json(responsePayload);
  } catch (err) {
    console.error('Save answer error:', err);
    res.status(500).json({ error: 'Failed to save answer' });
  }
});

// POST /api/participant/mark-review
participantRouter.post('/mark-review', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { questionId, roundNumber, marked } = req.body;

    const progress = await RoundProgress.findOne({ userId, roundNumber });
    if (!progress) {
      res.status(404).json({ error: 'Round progress not found' });
      return;
    }

    const index = progress.markedForReview.findIndex(q => q.toString() === questionId);
    if (marked && index === -1) {
      progress.markedForReview.push(questionId);
    } else if (!marked && index !== -1) {
      progress.markedForReview.splice(index, 1);
    }

    await progress.save();
    res.json({ success: true, markedForReview: progress.markedForReview });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update review flag' });
  }
});

// POST /api/participant/run-code
participantRouter.post('/run-code', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { questionId, code, language, roundNumber } = req.body;

  // Scope the lock to the same participant/event/round/question/language. This
  // prevents an execution response for one coding context from blocking or
  // being confused with another context.
  const lockKey = `run:${userId}:${req.user?.eventId || 'legacy'}:${roundNumber || 'unknown'}:${questionId}:${String(language || '').toLowerCase().trim()}`;
  if (activeEvaluationLocks.has(lockKey)) {
    res.status(429).json({ error: 'Code execution is already running. Please wait.' });
    return;
  }
  activeEvaluationLocks.add(lockKey);

  try {
    // Reject run-code if participant was eliminated
    const eliminatedCheck = await RoundProgress.findOne({ userId, status: 'eliminated' });
    if (eliminatedCheck) {
      res.status(403).json({ error: 'You are eliminated from the competition' });
      return;
    }

    const activeRoundNumber = roundNumber || 2;
    // Check participant round attempt state
    const progress = await RoundProgress.findOne({ userId, roundNumber: activeRoundNumber });
    if (!progress || progress.status === 'not_started') {
      res.status(400).json({ error: 'Cannot run code: Round has not been started yet.' });
      return;
    }
    if (progress.status === 'submitted' || progress.status === 'expired' || progress.status === 'eliminated') {
      res.status(403).json({ error: `Cannot run code: round status is ${progress.status}` });
      return;
    }
    if (progress.status !== 'in_progress') {
      res.status(400).json({ error: 'Cannot run code: round attempt is not in progress.' });
      return;
    }

    // Check round active status and server-authoritative timer deadline
    let round: any = null;
    if (req.user?.eventId) {
      round = await DynamicRound.findOne({ eventId: req.user.eventId, roundNumber: activeRoundNumber });
    }
    if (!round) {
      round = await Round.findOne({ roundNumber: activeRoundNumber });
    }
    if (round) {
      await syncRoundStatus(round);
    }
    if (!round || round.status !== 'active') {
      res.status(400).json({ error: 'Cannot run code: round is not active' });
      return;
    }

    // Check personal attempt expiry (with 5s network grace period)
    const deadline = progress.endsAt
      ? new Date(progress.endsAt).getTime()
      : (progress.startedAt ? new Date(progress.startedAt).getTime() + (round?.durationMinutes || 30) * 60000 : 0);
    if (deadline > 0 && Date.now() > deadline + 5000) {
      res.status(400).json({ error: 'Round time expired. Submission is no longer accepted.' });
      return;
    }

    const question = await Question.findById(questionId);
    if (!question || (question.type !== 'coding' && question.type !== 'debugging' && question.type !== 'sql')) {
      res.status(404).json({ error: 'Question not found or not executable' });
      return;
    }

    if (req.user?.eventId && question.eventId && question.eventId.toString() !== req.user.eventId.toString()) {
      res.status(403).json({ error: 'Question does not belong to this competition event' });
      return;
    }
    if (question.roundNumber !== activeRoundNumber) {
      res.status(403).json({ error: 'Question does not belong to this round' });
      return;
    }

    // Validate language against permitted languages for this round
    let allowedLangs = question.allowedLanguages && question.allowedLanguages.length > 0
      ? question.allowedLanguages
      : (question.type === 'sql' ? ['sql'] : ['python', 'cpp', 'java', 'c', 'javascript']);

    if (req.user?.eventId) {
      const dynRound = await DynamicRound.findOne({ eventId: req.user.eventId, roundNumber: activeRoundNumber });
      if (dynRound && dynRound.allowedLanguages && dynRound.allowedLanguages.length > 0) {
        allowedLangs = dynRound.allowedLanguages;
      }
    }
    if (question.type === 'sql' && !allowedLangs.includes('sql')) {
      allowedLangs = [...allowedLangs, 'sql'];
    }

    const normalizedLang = (language || '').toLowerCase().trim();
    if (!allowedLangs.map(l => l.toLowerCase()).includes(normalizedLang)) {
      res.status(400).json({
        error: `Language '${language}' is not permitted for this round. Allowed: ${allowedLangs.join(', ')}`
      });
      return;
    }

    const executionId = randomUUID();

    // A run is a first-class execution even before a formal submission. Create
    // or refresh its draft attempt so every persisted execution has a concrete
    // attempt ID as well as event/round/question/language context. Do not
    // overwrite the code retained for an already submitted best-score attempt;
    // the CodeMilestone below records this transient run independently.
    let executionAttempt = await Attempt.findOne({ userId, roundNumber: activeRoundNumber, questionId });
    if (!executionAttempt) {
      executionAttempt = new Attempt({
        userId,
        ...(req.user?.eventId ? { eventId: req.user.eventId } : {}),
        roundNumber: activeRoundNumber,
        questionId,
        code,
        language: normalizedLang,
        status: 'saved'
      });
    } else {
      if (!executionAttempt.eventId && req.user?.eventId) executionAttempt.eventId = req.user.eventId as any;
      if (executionAttempt.status !== 'submitted') {
        executionAttempt.code = code;
        executionAttempt.language = normalizedLang;
        if (executionAttempt.status === 'unattempted') executionAttempt.status = 'saved';
        executionAttempt.lastSavedAt = new Date();
      }
    }
    executionAttempt.lastExecutionId = executionId;
    executionAttempt.lastExecutionAt = new Date();
    await executionAttempt.save();

    // Support arbitrary custom input execution (LeetCode-style custom testcase playground)
    if (req.body.customInput !== undefined && req.body.customInput !== null) {
      const sanitizedCustomInput = String(req.body.customInput).slice(0, 10000);
      const customCases = [{
        input: sanitizedCustomInput,
        expectedOutput: '',
        weight: 0,
        isHidden: false
      }];
      const results = await runTestCases(code, normalizedLang, customCases, question.timeLimitMs, question.memoryLimitMb);
      const res0 = results[0] || null;
      const customSummary = summarizeTestResults(results, question.timeLimitMs);
      const association = executionAssociation({
        executionId,
        eventId: req.user?.eventId,
        roundId: round._id,
        roundNumber: activeRoundNumber,
        questionId,
        attemptId: executionAttempt._id,
        language: normalizedLang
      });

      await CodeMilestone.create({
        executionId,
        userId,
        eventId: req.user?.eventId,
        roundId: round._id,
        questionId,
        attemptId: executionAttempt._id,
        roundNumber: activeRoundNumber,
        code,
        language: normalizedLang,
        eventType: 'run',
        passedTestsCount: 0,
        totalTestsCount: 0,
        charDelta: code.length,
        metadata: { mode: 'custom', verdict: customSummary.status }
      });

      res.json({
        success: true,
        isCustom: true,
        execution: association,
        customResult: res0 ? {
          input: sanitizedCustomInput,
          actualOutput: res0.actual || res0.stdout || '',
          runtimeMs: res0.runtimeMs || 0,
          // No expected output is supplied for a custom run, so successful
          // execution is "Executed" rather than a misleading Accepted/WA.
          status: res0.status === 'passed' || res0.status === 'failed' ? 'Executed' : customSummary.status,
          compileError: res0.compileError ? sanitizeDiagnostics(res0.compileError) : undefined,
          syntaxError: res0.syntaxError ? sanitizeDiagnostics(res0.syntaxError) : undefined,
          runtimeError: res0.runtimeError ? sanitizeDiagnostics(res0.runtimeError) : undefined,
          memoryError: res0.memoryError ? sanitizeDiagnostics(res0.memoryError) : undefined,
          executionError: res0.executionError ? sanitizeDiagnostics(res0.executionError) : undefined
        } : null
      });
      return;
    }

    // Evaluate against candidate's specific Question DNA variant if template is mutated
    let visibleCases = (question.testCases || []).filter(tc => !tc.isHidden);
    const questionTemplate = await QuestionTemplate.findOne({ title: question.title, hasDnaMutation: true });
    if (questionTemplate && questionTemplate.dnaConfig) {
      const variant = generateQuestionVariant(questionTemplate, userId, req.user?.eventId || 'default');
      if (variant.mutatedTestCases && variant.mutatedTestCases.length > 0) {
        visibleCases = variant.mutatedTestCases.filter(tc => !tc.isHidden).map(tc => ({
          input: tc.input,
          expectedOutput: tc.output,
          weight: tc.weight,
          isHidden: false
        }));
      }
    }

    const results = await runTestCases(code, normalizedLang, visibleCases, question.timeLimitMs, question.memoryLimitMb);
    const summary = summarizeTestResults(results, question.timeLimitMs);
    const association = executionAssociation({
      executionId,
      eventId: req.user?.eventId,
      roundId: round._id,
      roundNumber: activeRoundNumber,
      questionId,
      attemptId: executionAttempt._id,
      language: normalizedLang
    });

    // Record debugging journey milestone
    await CodeMilestone.create({
      executionId,
      userId,
      eventId: req.user?.eventId,
      roundId: round._id,
      questionId,
      attemptId: executionAttempt._id,
      roundNumber: activeRoundNumber,
      code,
      language: normalizedLang,
      eventType: 'run',
      passedTestsCount: results.filter(r => r.passed).length,
      totalTestsCount: visibleCases.length,
      charDelta: code.length,
      metadata: { verdict: summary.status }
    });

    broadcastToAdmins('admin:run_code', {
      userId,
      username: req.user!.username,
      questionId,
      language: normalizedLang,
      resultsSummary: `${results.filter(r => r.passed).length}/${results.length} sample cases passed`
    });

    const visibleTotal = results.length;
    const visiblePassed = results.filter(r => r.passed).length;
    const visibleFailed = visibleTotal - visiblePassed;

    res.json({
      success: true,
      status: summary.status,
      message: summary.message,
      language: normalizedLang,
      execution: association,
      compileOutput: summary.compileOutput,
      runtimeOutput: summary.runtimeOutput,
      executionOutput: summary.executionOutput,
      timeLimitMs: question.timeLimitMs || 3000,
      memoryLimitMb: question.memoryLimitMb || 256,
      visibleTests: {
        total: visibleTotal,
        passed: visiblePassed,
        failed: visibleFailed,
        status: visibleTotal > 0 ? (visibleFailed === 0 ? 'PASSED' : 'FAILED') : 'PASSED'
      },
      results: sanitizeResultsForParticipant(results)
    });
  } catch (err: any) {
    console.error('Run code error:', err);
    res.status(500).json({ error: 'Error during code execution' });
  } finally {
    activeEvaluationLocks.delete(lockKey);
  }
});

// POST /api/participant/submit-code
participantRouter.post('/submit-code', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { questionId, code, language, roundNumber, operationId, seqId, clientTimestamp } = req.body;

  // Scope a submission lock to its full execution context. A different event,
  // round, question, or language must never inherit this request's result.
  const lockKey = `submit:${userId}:${req.user?.eventId || 'legacy'}:${roundNumber}:${questionId}:${String(language || '').toLowerCase().trim()}`;
  if (activeEvaluationLocks.has(lockKey)) {
    res.status(429).json({ error: 'Code submission is currently being evaluated. Please wait.' });
    return;
  }
  activeEvaluationLocks.add(lockKey);

  try {
    if (operationId) {
      const existingOp = await ProcessedOperation.findOne({ operationId });
      if (existingOp) {
        res.json({ ...existingOp.resultPayload, deduplicated: true });
        return;
      }
    }

    let executionRound: any = null;
    const isTieBreak = roundNumber === 99;
    if (isTieBreak) {
      const activeTie = await TieBreak.findOne({ tiedUserIds: userId, status: 'active' });
      if (!activeTie) {
        res.status(400).json({ error: 'Cannot submit: No active tie-break session found' });
        return;
      }
      executionRound = activeTie;
    } else {
      // Check participant round attempt state
      const progress = await RoundProgress.findOne({ userId, roundNumber });
      if (!progress || progress.status === 'not_started') {
        res.status(400).json({ error: 'Cannot submit code: Round has not been started yet.' });
        return;
      }
      if (progress.status === 'submitted' || progress.status === 'expired' || progress.status === 'eliminated') {
        res.status(403).json({ error: `Cannot submit code: round status is ${progress.status}` });
        return;
      }
      if (progress.status !== 'in_progress') {
        res.status(400).json({ error: 'Cannot submit code: round attempt is not in progress.' });
        return;
      }

      let round: any = null;
      if (req.user?.eventId) {
        round = await DynamicRound.findOne({ eventId: req.user.eventId, roundNumber });
      }
      if (!round) {
        round = await Round.findOne({ roundNumber });
      }
      // Authoritative server-side check: auto-complete round if duration elapsed
      if (round) await syncRoundStatus(round);

      if (!round || round.status !== 'active') {
        res.status(400).json({ error: 'Cannot submit: round is not active' });
        return;
      }
      executionRound = round;

      // Check personal attempt expiry (with 5s network grace period)
      const deadline = progress.endsAt
        ? new Date(progress.endsAt).getTime()
        : (progress.startedAt ? new Date(progress.startedAt).getTime() + (round?.durationMinutes || 30) * 60000 : 0);
      if (deadline > 0 && Date.now() > deadline + 5000) {
        res.status(400).json({ error: 'Round time expired. Submission is no longer accepted.' });
        return;
      }
    }

    const question = await Question.findById(questionId);
    if (!question || (question.type !== 'coding' && question.type !== 'debugging' && question.type !== 'sql')) {
      res.status(404).json({ error: 'Question not found or not executable' });
      return;
    }

    if (req.user?.eventId && question.eventId && question.eventId.toString() !== req.user.eventId.toString()) {
      res.status(403).json({ error: 'Question does not belong to this competition event' });
      return;
    }
    if (question.roundNumber !== roundNumber) {
      res.status(403).json({ error: 'Question does not belong to this round' });
      return;
    }

    // Validate language against permitted languages for this round
    let allowedSubmitLangs = question.allowedLanguages && question.allowedLanguages.length > 0
      ? question.allowedLanguages
      : (question.type === 'sql' ? ['sql'] : ['python', 'cpp', 'java', 'c', 'javascript']);

    if (req.user?.eventId && !isTieBreak) {
      const dynRound = await DynamicRound.findOne({ eventId: req.user.eventId, roundNumber });
      if (dynRound && dynRound.allowedLanguages && dynRound.allowedLanguages.length > 0) {
        allowedSubmitLangs = dynRound.allowedLanguages;
      }
    }
    if (question.type === 'sql' && !allowedSubmitLangs.includes('sql')) {
      allowedSubmitLangs = [...allowedSubmitLangs, 'sql'];
    }

    const normalizedSubmitLang = (language || '').toLowerCase().trim();
    if (!allowedSubmitLangs.map(l => l.toLowerCase()).includes(normalizedSubmitLang)) {
      res.status(400).json({
        error: `Language '${language}' is not permitted for this round. Allowed: ${allowedSubmitLangs.join(', ')}`
      });
      return;
    }

    const executionId = randomUUID();

    // Execute against candidate's specific Question DNA variant if template is mutated
    let allCases = question.testCases || [];
    const questionTemplate = await QuestionTemplate.findOne({ title: question.title, hasDnaMutation: true });
    if (questionTemplate && questionTemplate.dnaConfig) {
      const variant = generateQuestionVariant(questionTemplate, userId, req.user?.eventId || 'default');
      if (variant.mutatedTestCases && variant.mutatedTestCases.length > 0) {
        allCases = variant.mutatedTestCases.map(tc => ({
          input: tc.input,
          expectedOutput: tc.output,
          weight: tc.weight,
          isHidden: tc.isHidden
        }));
      }
    }

    const results = await runTestCases(code, normalizedSubmitLang, allCases, question.timeLimitMs, question.memoryLimitMb);

    // Compute score: sum of weight for passed cases
    let currentScore = 0;
    allCases.forEach((tc, idx) => {
      if (results[idx]?.passed) {
        currentScore += tc.weight;
      }
    });

    let attempt = await Attempt.findOne({ userId, roundNumber, questionId });
    if (!attempt) {
      attempt = new Attempt({
        userId,
        ...(req.user?.eventId ? { eventId: req.user.eventId } : {}),
        roundNumber,
        questionId
      });
    }

    if (!attempt.eventId && req.user?.eventId) {
      attempt.eventId = req.user.eventId as any;
    }

    // Retain highest score across submissions AND preserve code for highest scoring attempt
    if (currentScore >= (attempt.score || 0)) {
      attempt.score = currentScore;
      attempt.code = code;
      attempt.language = normalizedSubmitLang;
      attempt.testCaseResults = results;
    }
    attempt.submissionCount = (attempt.submissionCount || 0) + 1;
    attempt.lastExecutionId = executionId;
    attempt.lastExecutionAt = new Date();
    attempt.status = 'submitted';
    attempt.lastSubmittedAt = new Date();
    await attempt.save();

    // Dynamically update RoundProgress.totalScore so live scoreboard shows real-time points during coding rounds
    let participantTotalRoundScore = 0;
    if (roundNumber !== 99) {
      const allRoundAttempts = await Attempt.find({ userId, roundNumber });
      for (const att of allRoundAttempts) {
        participantTotalRoundScore += att.score || 0;
      }
      await RoundProgress.findOneAndUpdate(
        { userId, roundNumber },
        {
          $set: {
            totalScore: participantTotalRoundScore,
            ...(req.user?.eventId ? { eventId: req.user.eventId } : {})
          }
        },
        { upsert: false }
      );
    }

    // Record debugging journey milestone
    await CodeMilestone.create({
      executionId,
      userId,
      eventId: req.user?.eventId,
      roundId: executionRound?._id,
      questionId,
      attemptId: attempt._id,
      roundNumber,
      code,
      language: normalizedSubmitLang,
      eventType: 'submit',
      passedTestsCount: results.filter(r => r.passed).length,
      totalTestsCount: allCases.length,
      charDelta: code.length,
      metadata: { operationId: operationId || null }
    });

    const eventIdStr = req.user?.eventId ? req.user.eventId.toString() : undefined;
    const collegeIdStr = req.user?.collegeId ? req.user.collegeId.toString() : undefined;

    broadcastToAdmins('admin:submit_code', {
      userId,
      username: req.user!.username,
      questionId,
      score: currentScore,
      bestScore: attempt.score,
      roundTotalScore: participantTotalRoundScore,
      passedCount: results.filter(r => r.passed).length,
      totalCount: results.length,
      roundNumber,
      eventId: eventIdStr
    }, collegeIdStr, eventIdStr);

    broadcastToAdmins('admin:leaderboard_update', {
      userId,
      roundNumber,
      totalScore: participantTotalRoundScore,
      eventId: eventIdStr
    }, collegeIdStr, eventIdStr);

    const evaluation = summarizeTestResults(results, question.timeLimitMs || 3000);
    const visibleResults = results.filter(r => !r.isHidden);
    const hiddenResults = results.filter(r => r.isHidden);
    const visibleAllPassed = visibleResults.length > 0 && visibleResults.every(r => r.passed);

    let status = evaluation.status;
    let message = evaluation.message;
    if (status === 'Wrong Answer' && visibleAllPassed) {
      const hiddenFailures = hiddenResults.filter(r => !r.passed).length;
      message = `Passed all visible sample cases, but failed ${hiddenFailures} hidden test case${hiddenFailures === 1 ? '' : 's'}.`;
    }

    const totalCount = results.length;
    const passedCount = results.filter(r => r.passed).length;
    const failedCount = totalCount - passedCount;
    const hiddenTotalCount = hiddenResults.length;
    const hiddenFailedCount = hiddenResults.filter(r => !r.passed).length;
    const hiddenPassedCount = hiddenTotalCount - hiddenFailedCount;

    const totalRuntimeMs = results.reduce((acc, r) => acc + (r.runtimeMs || 0), 0);
    const avgRuntimeMs = results.length > 0 ? Math.round(totalRuntimeMs / results.length) : 0;
    const maxRuntimeMs = results.reduce((max, r) => Math.max(max, r.runtimeMs || 0), 0);

    const failedHiddenIndices: number[] = [];
    hiddenResults.forEach((tc, idx) => {
      if (!tc.passed) {
        failedHiddenIndices.push(idx + 1);
      }
    });

    const visibleTotal = visibleResults.length;
    const visiblePassed = visibleResults.filter(r => r.passed).length;
    const visibleFailed = visibleTotal - visiblePassed;
    const association = executionAssociation({
      executionId,
      eventId: req.user?.eventId,
      roundId: executionRound?._id,
      roundNumber,
      questionId,
      attemptId: attempt._id,
      language: normalizedSubmitLang
    });

    const responsePayload = {
      success: true,
      status,
      message,
      execution: association,
      score: attempt.score,
      submissionScore: currentScore,
      language: normalizedSubmitLang,
      passedCount,
      totalCount,
      failedCount,
      hiddenTotalCount,
      hiddenFailedCount,
      hiddenPassedCount,
      failedHiddenIndices,
      hiddenTests: {
        total: hiddenTotalCount,
        passed: hiddenPassedCount,
        failed: hiddenFailedCount,
        status: (hiddenTotalCount > 0 ? (hiddenFailedCount === 0 ? 'PASSED' : 'FAILED') : 'PASSED') as 'PASSED' | 'FAILED'
      },
      visibleTests: {
        total: visibleTotal,
        passed: visiblePassed,
        failed: visibleFailed,
        status: (visibleTotal > 0 ? (visibleFailed === 0 ? 'PASSED' : 'FAILED') : 'PASSED') as 'PASSED' | 'FAILED'
      },
      avgRuntimeMs,
      maxRuntimeMs,
      timeLimitMs: question.timeLimitMs || 3000,
      memoryLimitMb: question.memoryLimitMb || 256,
      compileOutput: evaluation.compileOutput,
      runtimeOutput: evaluation.runtimeOutput,
      executionOutput: evaluation.executionOutput,
      results: sanitizeResultsForParticipant(results)
    };

    if (operationId) {
      await ProcessedOperation.create({
        operationId,
        userId,
        roundNumber,
        questionId,
        actionType: 'submit_code',
        seqId,
        clientTimestamp,
        resultPayload: responsePayload
      }).catch(() => {});
    }

    res.json(responsePayload);
  } catch (err) {
    console.error('Submit code error:', err);
    res.status(500).json({ error: 'Error submitting code' });
  } finally {
    activeEvaluationLocks.delete(lockKey);
  }
});

// POST /api/participant/log-paste
participantRouter.post('/log-paste', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { questionId, roundNumber, textLength, pastedText } = req.body;

    // Check if large paste anomaly
    if (textLength >= 80) {
      await ViolationLog.create({
        userId,
        roundNumber: roundNumber || 2,
        type: 'large_paste',
        details: `Bulk paste of ${textLength} characters detected`,
        suspicionPoints: 35
      });
      broadcastToAdmins('admin:suspicion_alert', {
        userId,
        username: req.user!.username,
        type: 'large_paste',
        textLength
      });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log paste' });
  }
});

// POST /api/participant/submit-round
participantRouter.post('/submit-round', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { roundNumber, codingSubmissions, operationId, seqId, clientTimestamp } = req.body;

    if (operationId) {
      const existingOp = await ProcessedOperation.findOne({ operationId });
      if (existingOp) {
        res.json({ ...existingOp.resultPayload, deduplicated: true });
        return;
      }
    }

    // Guard against submitting an unstarted, eliminated, or submitted round
    const existingProgress = await RoundProgress.findOne({ userId, roundNumber });
    if (!existingProgress || existingProgress.status === 'not_started') {
      res.status(400).json({ error: 'Cannot submit round: You have not started this round yet.' });
      return;
    }
    if (existingProgress.status === 'eliminated') {
      res.status(403).json({ error: 'Cannot submit round: candidate was eliminated from this competition.' });
      return;
    }
    if (existingProgress.status === 'submitted') {
      res.json({
        success: true,
        message: `Round ${roundNumber} already submitted`,
        totalScore: existingProgress.totalScore,
        timeTakenSeconds: existingProgress.timeTakenSeconds,
        alreadySubmitted: true
      });
      return;
    }
    if (existingProgress.status === 'expired') {
      res.status(400).json({ error: 'Round time expired. Submission is no longer accepted.' });
      return;
    }
    if (existingProgress.status !== 'in_progress') {
      res.status(400).json({ error: `Cannot submit round: round attempt is ${existingProgress.status}.` });
      return;
    }

    let round: any = null;
    if (req.user?.eventId) {
      round = await DynamicRound.findOne({ eventId: req.user.eventId, roundNumber });
    }
    if (!round) {
      round = await Round.findOne({ roundNumber });
    }
    if (!round) {
      res.status(404).json({ error: 'Round not found' });
      return;
    }
    await syncRoundStatus(round);
    if (round.status !== 'active') {
      res.status(400).json({ error: 'Cannot submit round: round is not active.' });
      return;
    }

    const deadline = existingProgress.endsAt
      ? new Date(existingProgress.endsAt).getTime()
      : (existingProgress.startedAt
        ? new Date(existingProgress.startedAt).getTime() + (round.durationMinutes || 30) * 60000
        : 0);
    if (deadline > 0 && Date.now() > deadline + 5000) {
      res.status(400).json({ error: 'Round time expired. Submission is no longer accepted.' });
      return;
    }

    // Auto-evaluate coding questions from latest unsaved client drafts submitted with the round
    if (Array.isArray(codingSubmissions) && codingSubmissions.length > 0) {
      for (const sub of codingSubmissions) {
        if (!sub || typeof sub !== 'object' || typeof sub.questionId !== 'string' || typeof sub.code !== 'string' || typeof sub.language !== 'string') {
          res.status(400).json({ error: 'Each submitted coding draft must include questionId, code, and language.' });
          return;
        }
        if (!Types.ObjectId.isValid(sub.questionId)) {
          res.status(400).json({ error: 'A submitted coding draft has an invalid question ID.' });
          return;
        }
        const question = await Question.findById(sub.questionId);
        if (!question || !['coding', 'debugging', 'sql'].includes(question.type) || question.roundNumber !== roundNumber) {
          res.status(400).json({ error: 'A submitted coding draft does not belong to an executable question in this round.' });
          return;
        }
        if (req.user?.eventId && question.eventId && question.eventId.toString() !== req.user.eventId.toString()) {
          res.status(403).json({ error: 'A submitted coding draft does not belong to this competition event.' });
          return;
        }

        const lang = sub.language.toLowerCase().trim();
        let allowedLanguages = question.allowedLanguages && question.allowedLanguages.length > 0
          ? question.allowedLanguages
          : (question.type === 'sql' ? ['sql'] : ['python', 'cpp', 'java', 'c', 'javascript']);
        if (req.user?.eventId && Array.isArray(round.allowedLanguages) && round.allowedLanguages.length > 0) {
          allowedLanguages = round.allowedLanguages;
        }
        if (question.type === 'sql' && !allowedLanguages.map((value: string) => value.toLowerCase()).includes('sql')) {
          allowedLanguages = [...allowedLanguages, 'sql'];
        }
        if (!lang || !allowedLanguages.map((value: string) => value.toLowerCase()).includes(lang)) {
          res.status(400).json({
            error: `Language '${sub.language}' is not permitted for this round. Allowed: ${allowedLanguages.join(', ')}`
          });
          return;
        }

        let attempt = await Attempt.findOne({ userId, questionId: sub.questionId, roundNumber });
        const allCases = question.testCases || [];
        const executionId = randomUUID();
        const results = await runTestCases(sub.code, lang, allCases, question.timeLimitMs, question.memoryLimitMb);
        const evaluation = summarizeTestResults(results, question.timeLimitMs || 3000);
        const passedCount = results.filter(r => r.passed).length;
        const currentScore = Math.round((passedCount / (allCases.length || 1)) * (question.marks || 25));

        if (!attempt) {
          attempt = new Attempt({
            userId,
            ...(req.user?.eventId ? { eventId: req.user.eventId } : {}),
            questionId: sub.questionId,
            roundNumber,
            score: currentScore,
            code: sub.code,
            language: lang,
            testCaseResults: results,
            status: 'submitted',
            submissionCount: 1,
            lastSubmittedAt: new Date()
          });
        } else {
          if (!attempt.eventId && req.user?.eventId) {
            attempt.eventId = req.user.eventId as any;
          }
          if (currentScore >= (attempt.score || 0)) {
            attempt.score = currentScore;
            attempt.code = sub.code;
            attempt.language = lang;
            attempt.testCaseResults = results;
          }
          attempt.status = 'submitted';
          attempt.submissionCount = (attempt.submissionCount || 0) + 1;
          attempt.lastSubmittedAt = new Date();
        }
        attempt.lastExecutionId = executionId;
        attempt.lastExecutionAt = new Date();
        await attempt.save();

        await CodeMilestone.create({
          executionId,
          userId,
          eventId: req.user?.eventId,
          roundId: round._id,
          questionId: sub.questionId,
          attemptId: attempt._id,
          roundNumber,
          code: sub.code,
          language: lang,
          eventType: 'submit',
          passedTestsCount: passedCount,
          totalTestsCount: allCases.length,
          charDelta: sub.code.length,
          metadata: { source: 'submit_round', verdict: evaluation.status }
        });
      }
    }

    // Auto-grade MCQs: Evaluate all MCQ attempts for this participant in this round
    const userAttempts = await Attempt.find({ userId, roundNumber });
    for (const attempt of userAttempts) {
      if (attempt.selectedOption !== null && attempt.selectedOption !== undefined) {
        const { score } = await computeQuestionScore(attempt.questionId, attempt);
        attempt.score = score;
        attempt.status = 'submitted';
        await attempt.save();
      }
    }

    const { totalScore, timeTakenSeconds } = await finalizeParticipantRoundScore(userId, roundNumber);

    // Auto-complete round if all active participants in this event have finished/submitted
    if (req.user?.eventId) {
      try {
        const eventParticipants = await User.find({
          role: 'participant',
          eventId: req.user.eventId,
          isDisqualified: false
        }).select('_id');

        const totalParticipants = eventParticipants.length;
        const participantIds = eventParticipants.map(u => u._id);

        const finishedParticipants = await RoundProgress.countDocuments({
          userId: { $in: participantIds },
          roundNumber,
          status: { $in: ['submitted', 'eliminated'] }
        });

        if (totalParticipants > 0 && finishedParticipants >= totalParticipants) {
          const dynRound = await DynamicRound.findOne({ eventId: req.user.eventId, roundNumber });
          if (dynRound && dynRound.status !== 'completed') {
            dynRound.status = 'completed';
            dynRound.endedAt = new Date();
            await dynRound.save();
            broadcastToAll('round:locked', {
              eventId: req.user.eventId,
              roundNumber,
              message: `Round ${roundNumber} has concluded.`
            });
            broadcastToAll('round:completed', { eventId: req.user.eventId, roundNumber });
            broadcastToAdmins('admin:round_locked', { eventId: req.user.eventId, roundNumber, status: 'completed' });
          }
        }
      } catch (checkErr) {
        console.error('Auto-round completion check error:', checkErr);
      }
    }

    const responsePayload = {
      success: true,
      message: `Round ${roundNumber} submitted successfully`,
      totalScore,
      timeTakenSeconds
    };

    if (operationId) {
      await ProcessedOperation.create({
        operationId,
        userId,
        roundNumber,
        actionType: 'submit_round',
        seqId,
        clientTimestamp,
        resultPayload: responsePayload
      }).catch(() => {});
    }

    res.json(responsePayload);
  } catch (err) {
    console.error('Submit round error:', err);
    res.status(500).json({ error: 'Failed to submit round' });
  }
});

// POST /api/participant/log-violation
participantRouter.post('/log-violation', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { roundNumber, type, details } = req.body;

    // Prioritize Event-scoped scoringConfig for dynamic multi-tenant events, fallback to legacy Competition
    let violationLimit = 3;
    let autoSubmit = true;
    if (req.user?.eventId) {
      const event = await Event.findById(req.user.eventId).select('scoringConfig');
      if (event?.scoringConfig?.violationLimit) {
        violationLimit = event.scoringConfig.violationLimit;
      }
      if (event?.scoringConfig?.autoSubmitOnViolation !== undefined) {
        autoSubmit = event.scoringConfig.autoSubmitOnViolation;
      }
    } else {
      const competition = await Competition.findOne();
      if (competition?.violationLimit) violationLimit = competition.violationLimit;
      if (competition?.autoSubmitOnViolation !== undefined) autoSubmit = competition.autoSubmitOnViolation;
    }

    // Absolute Proctoring Guard: Disarm proctoring immediately if round is submitted or completed
    const progress = await RoundProgress.findOne({ userId, roundNumber });
    if (progress && progress.status !== 'in_progress') {
      res.json({
        success: true,
        ignored: true,
        message: 'Proctoring is disarmed for rounds not actively in progress',
        violationCount: progress.violationCount || 0,
        violationLimit,
        autoSubmitted: false
      });
      return;
    }

    // Anti-cheat Coalescing/Debounce: Ignore duplicate simultaneous blur and visibilitychange within 1.5s
    const now = Date.now();
    const lastLog = recentViolationMap.get(userId);
    if (lastLog && (now - lastLog.time < 1500)) {
      const isWindowOrTab = (type === 'tab_switch' || type === 'window_blur') && (lastLog.type === 'tab_switch' || lastLog.type === 'window_blur');
      if (isWindowOrTab || lastLog.type === type) {
        res.json({
          success: true,
          deduped: true,
          violationCount: lastLog.count,
          violationLimit,
          autoSubmitted: false
        });
        return;
      }
    }

    await ViolationLog.create({
      userId,
      eventId: req.user?.eventId ? new Types.ObjectId(req.user.eventId) : undefined,
      roundNumber: roundNumber || 1,
      type: type || 'fullscreen_exit',
      details
    });

    let violationCount = 1;
    if (progress) {
      // Intentional breach triage: tab_switch and window_blur incur a 2-strike penalty
      const strikeIncrement = (type === 'tab_switch' || type === 'window_blur') ? 2 : 1;
      progress.violationCount = (progress.violationCount || 0) + strikeIncrement;
      violationCount = progress.violationCount;
      await progress.save();
    }

    recentViolationMap.set(userId, { time: now, type: type || 'fullscreen_exit', count: violationCount });

    broadcastToAdmins('admin:violation_logged', {
      userId,
      username: req.user!.username,
      roundNumber,
      type,
      violationCount,
      isSevere: type === 'tab_switch' || type === 'window_blur',
      timestamp: new Date()
    });

    let autoSubmitted = false;
    if (autoSubmit && violationCount >= violationLimit) {
      if (progress && progress.status === 'in_progress') {
        await finalizeParticipantRoundScore(userId, roundNumber);
        progress.status = 'eliminated';
        await progress.save();

        // Disqualify cheating candidate on the User model
        await User.findByIdAndUpdate(userId, {
          isDisqualified: true,
          disqualificationReason: `Proctoring violation limit (${violationLimit}) exceeded`
        });
        autoSubmitted = true;
      }
    }

    res.json({
      success: true,
      violationCount,
      violationLimit,
      autoSubmitted
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log violation' });
  }
});

// POST /api/participant/sync-batch (Offline recovery endpoint with conflict-safe deduplication & deadline grace enforcement)
participantRouter.post('/sync-batch', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { updates } = req.body; // Array of { questionId, roundNumber, selectedOption, code, language, operationId, seqId, timestamp }

    let processedCount = 0;
    if (Array.isArray(updates)) {
      for (const item of updates) {
        if (item.operationId) {
          const existing = await ProcessedOperation.findOne({ operationId: item.operationId });
          if (existing) {
            continue; // Already processed, skip deduplicated
          }
        }

        const rNum = item.roundNumber;
        let r: any = null;
        if (req.user?.eventId) {
          r = await DynamicRound.findOne({ eventId: req.user.eventId, roundNumber: rNum });
        }
        if (!r) {
          r = await Round.findOne({ roundNumber: rNum });
        }

        // Deadline Grace Check: Reject offline sync if round was locked and client timestamp exceeds 15-second grace window
        if (r && r.status === 'locked' && r.endedAt) {
          const clientTime = item.timestamp || Date.now();
          const graceDeadline = new Date(r.endedAt).getTime() + 15000;
          if (clientTime > graceDeadline) {
            console.warn(`[Sync-Batch] Rejecting late offline update for Q:${item.questionId} beyond 15s grace.`);
            continue;
          }
        }

        // Check if participant already submitted or was eliminated
        const prog = await RoundProgress.findOne({ userId, roundNumber: rNum });
        if (prog && (prog.status === 'submitted' || prog.status === 'eliminated')) {
          continue; // Cannot update after submission or elimination
        }

        const updateTime = item.timestamp ? new Date(item.timestamp) : new Date();
        let attempt = await Attempt.findOne({ userId, roundNumber: item.roundNumber, questionId: item.questionId });
        if (attempt && attempt.lastSavedAt && attempt.lastSavedAt > updateTime) {
          // Last-Write-Wins: Newer server revision exists, skip stale offline packet
          continue;
        }
        if (!attempt) {
          attempt = new Attempt({
            userId,
            roundNumber: item.roundNumber,
            questionId: item.questionId,
            status: 'saved'
          });
        }
        if (item.selectedOption !== undefined) attempt.selectedOption = item.selectedOption;
        if (item.code !== undefined) attempt.code = item.code;
        if (item.language !== undefined) attempt.language = item.language;
        attempt.lastSavedAt = updateTime;
        await attempt.save();

        if (item.operationId) {
          await ProcessedOperation.create({
            operationId: item.operationId,
            userId,
            roundNumber: item.roundNumber,
            questionId: item.questionId,
            actionType: 'sync_item',
            seqId: item.seqId,
            clientTimestamp: item.timestamp,
            resultPayload: { savedAt: attempt.lastSavedAt }
          }).catch(() => {});
        }
        processedCount++;
      }
    }

    res.json({ success: true, syncedCount: processedCount, totalReceived: (updates || []).length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to sync offline batch' });
  }
});
