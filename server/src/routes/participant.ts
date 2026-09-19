import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
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
import { getRemainingSeconds } from '../services/timerService.js';
import { runTestCases, sanitizeResultsForParticipant } from '../services/judgeService.js';
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

  // Find the highest round the user is eligible for
  for (let r = maxRound; r >= 1; r--) {
    const prog = progressList.find(p => p.roundNumber === r);
    if (prog) {
      if (prog.status === 'in_progress' || prog.status === 'submitted' || prog.status === 'expired' || prog.status === 'not_started') {
        return { roundNumber: r, progress: prog, activeTieBreak };
      }
    }
    // If user has advanced from round r-1, they are eligible for round r
    const prevProg = progressList.find(p => p.roundNumber === r - 1);
    if (prevProg && prevProg.status === 'advanced') {
      return { roundNumber: r, progress: prog || null, activeTieBreak };
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
      res.status(403).json({
        error: 'You have been eliminated from the competition.',
        status: 'eliminated',
        isEliminated: true
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
          starterCode: question.starterCode,
          testCases: (question.testCases || []).filter(tc => !tc.isHidden).map(tc => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            weight: tc.weight,
            isHidden: false
          })),
          timeLimitMs: question.timeLimitMs
        } : null,
        attempt: attempt || null
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

    // Section 29 Self-Healing: Heal ghost submitted/expired records (0 score & 0 attempts) for active or not_started rounds
    if (
      currentProgress &&
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
      questions = await Question.find({ eventId: req.user.eventId, roundNumber }).sort({ orderIndex: 1 });
    } else {
      questions = await Question.find({ roundNumber, eventId: null }).sort({ orderIndex: 1 });
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
    const sanitizedQuestions = questions.map(q => {
      let prompt = q.prompt;
      let starterCode = q.starterCode;
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
    if (req.user?.eventId) {
      const maxDyn = await DynamicRound.findOne({ eventId: req.user.eventId }).sort({ roundNumber: -1 });
      if (maxDyn && maxDyn.roundNumber === round.roundNumber) {
        isFinalRound = true;
      }
    }

    const isQualifiedWaitingNextRound = roundNumber > 1 && round.status !== 'active';
    // nextRoundAvailable is strictly for when participant has completed their current round but an admin has started a subsequent stage
    let nextRoundAvailable = false;
    if (currentProgress?.status === 'submitted' && !isFinalRound) {
      let nextStageRound: any = null;
      if (req.user?.eventId) {
        nextStageRound = await DynamicRound.findOne({ eventId: req.user.eventId, roundNumber: roundNumber + 1 });
      } else {
        nextStageRound = await Round.findOne({ roundNumber: roundNumber + 1 });
      }
      if (nextStageRound && nextStageRound.status === 'active') {
        const currentRoundProg = await RoundProgress.findOne({ userId, roundNumber });
        if (currentRoundProg?.status === 'advanced') {
          nextRoundAvailable = true;
        }
      }
    }

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
        status: currentProgress?.status || 'not_started',
        totalScore: currentProgress?.totalScore || 0,
        markedForReview: currentProgress?.markedForReview || [],
        violationCount: currentProgress?.violationCount || 0,
        timeTakenSeconds: currentProgress?.timeTakenSeconds || 0,
        startedAt: currentProgress?.startedAt || null,
        endsAt: currentProgress?.endsAt || null,
        canStart,
        isQualifiedWaitingNextRound,
        nextRoundAvailable,
        isFinalRound
      },
      canStart,
      isQualifiedWaitingNextRound,
      nextRoundAvailable,
      isFinalRound,
      questions: sanitizedQuestions,
      attempts: existingAttempts.map(att => ({
        questionId: att.questionId,
        selectedOption: att.selectedOption,
        code: att.code,
        language: att.language,
        score: att.score,
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

    // If round > 1, check advancement eligibility
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
    }

    // Find or create RoundProgress
    const progQuery: any = { userId, roundNumber };
    if (req.user?.eventId) progQuery.eventId = req.user.eventId;
    let progress = await RoundProgress.findOne(progQuery);
    if (!progress && !req.user?.eventId) {
      progress = await RoundProgress.findOne({ userId, roundNumber });
    }

    // Section 29 Self-Healing: Check if existing submitted/expired attempt was a 0-attempt ghost record from the old bug
    if (progress && (progress.status === 'submitted' || progress.status === 'expired') && (progress.totalScore || 0) === 0) {
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

    const targetQuestion = await Question.findById(questionId);
    if (!targetQuestion) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }
    if (req.user?.eventId && targetQuestion.eventId && targetQuestion.eventId.toString() !== req.user.eventId.toString()) {
      res.status(403).json({ error: 'Question does not belong to this competition event' });
      return;
    }

    let attempt = await Attempt.findOne({ userId, roundNumber, questionId });
    if (!attempt) {
      attempt = new Attempt({
        userId,
        roundNumber,
        questionId,
        status: 'saved'
      });
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

  // Concurrency Lock: Prevent race conditions & simultaneous run-code evaluations per user/question
  const lockKey = `run:${userId}:${questionId}`;
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

    // Support arbitrary custom input execution (LeetCode-style custom testcase playground)
    if (req.body.customInput !== undefined && req.body.customInput !== null) {
      const sanitizedCustomInput = String(req.body.customInput).slice(0, 10000);
      const customCases = [{
        input: sanitizedCustomInput,
        expectedOutput: '',
        weight: 0,
        isHidden: false
      }];
      const results = await runTestCases(code, language, customCases, question.timeLimitMs);
      const res0 = results[0] || null;
      res.json({
        success: true,
        isCustom: true,
        customResult: res0 ? {
          input: sanitizedCustomInput,
          actualOutput: res0.actual || res0.stdout || '',
          runtimeMs: res0.runtimeMs || 0,
          status: res0.compileError ? 'Compilation Error' : (res0.runtimeError ? 'Runtime Error' : 'Success'),
          compileError: res0.compileError,
          runtimeError: res0.runtimeError
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

    const results = await runTestCases(code, language, visibleCases, question.timeLimitMs);

    // Record debugging journey milestone
    await CodeMilestone.create({
      userId,
      questionId,
      roundNumber: activeRoundNumber,
      code,
      language,
      eventType: 'run',
      passedTestsCount: results.filter(r => r.passed).length,
      totalTestsCount: visibleCases.length,
      charDelta: code.length
    }).catch(() => {});

    broadcastToAdmins('admin:run_code', {
      userId,
      username: req.user!.username,
      questionId,
      language,
      resultsSummary: `${results.filter(r => r.passed).length}/${results.length} sample cases passed`
    });

    res.json({
      success: true,
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

  // Concurrency Lock: Prevent race conditions & simultaneous evaluations per user/question
  const lockKey = `${userId}:${questionId}`;
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

    const isTieBreak = roundNumber === 99;
    if (isTieBreak) {
      const activeTie = await TieBreak.findOne({ tiedUserIds: userId, status: 'active' });
      if (!activeTie) {
        res.status(400).json({ error: 'Cannot submit: No active tie-break session found' });
        return;
      }
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
      if (!round || round.status !== 'active') {
        res.status(400).json({ error: 'Cannot submit: round is not active' });
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

    const results = await runTestCases(code, language, allCases, question.timeLimitMs);

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
        roundNumber,
        questionId
      });
    }

    // Retain highest score across submissions AND preserve code for highest scoring attempt
    if (currentScore >= (attempt.score || 0)) {
      attempt.score = currentScore;
      attempt.code = code;
      attempt.language = language;
      attempt.testCaseResults = results;
    }
    attempt.submissionCount = (attempt.submissionCount || 0) + 1;
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
      userId,
      questionId,
      roundNumber,
      code,
      language,
      eventType: 'submit',
      passedTestsCount: results.filter(r => r.passed).length,
      totalTestsCount: allCases.length,
      charDelta: code.length
    }).catch(() => {});

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

    const hasCompileError = results.some(r => r.compileError);
    const hasRuntimeError = results.filter(r => !r.isHidden).some(r => r.runtimeError);
    const allPassed = results.length > 0 && results.every(r => r.passed);
    const visibleResults = results.filter(r => !r.isHidden);
    const visibleAllPassed = visibleResults.length > 0 && visibleResults.every(r => r.passed);

    let status = 'Wrong Answer';
    let message = 'Sample test cases failed.';
    if (hasCompileError) {
      status = 'Compilation Error';
      message = 'Compilation Error';
    } else if (hasRuntimeError) {
      status = 'Runtime Error';
      message = 'Runtime Error';
    } else if (allPassed) {
      status = 'Accepted';
      message = 'Accepted! All test cases passed.';
    } else if (visibleAllPassed) {
      status = 'Wrong Answer';
      message = 'Your solution failed one or more private test cases.';
    }

    const responsePayload = {
      success: true,
      status,
      message,
      score: attempt.score,
      submissionScore: currentScore,
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
    const { roundNumber, operationId, seqId, clientTimestamp } = req.body;

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
