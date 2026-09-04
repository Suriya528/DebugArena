import { Router, Response } from 'express';
import { authenticate, requireRole, checkNotDisqualified, AuthenticatedRequest } from '../middleware/auth.js';
import { Competition } from '../models/Competition.js';
import { Round } from '../models/Round.js';
import { Question } from '../models/Question.js';
import { Attempt } from '../models/Attempt.js';
import { RoundProgress } from '../models/RoundProgress.js';
import { ViolationLog } from '../models/ViolationLog.js';
import { TieBreak } from '../models/TieBreak.js';
import { getRemainingSeconds } from '../services/timerService.js';
import { runTestCases, sanitizeResultsForParticipant } from '../services/judgeService.js';
import { computeQuestionScore, finalizeParticipantRoundScore } from '../services/scoringService.js';
import { broadcastToAdmins } from '../services/socketService.js';

export const participantRouter = Router();

participantRouter.use(authenticate);
participantRouter.use(requireRole('participant'));
participantRouter.use(checkNotDisqualified);

// Helper to determine participant's accessible round
async function getParticipantAccessibleRound(userId: string) {
  // Check tie-break first
  const activeTieBreak = await TieBreak.findOne({
    tiedUserIds: userId,
    status: 'active'
  });

  // Check rounds 3, 2, 1 in order of advancement
  const progressList = await RoundProgress.find({ userId }).sort({ roundNumber: -1 });

  // Find the highest round the user is eligible for
  for (let r = 3; r >= 1; r--) {
    const prog = progressList.find(p => p.roundNumber === r);
    if (prog) {
      if (prog.status === 'in_progress' || prog.status === 'submitted') {
        return { roundNumber: r, progress: prog, activeTieBreak };
      }
    }
    // If user has advanced from round r-1, they are eligible for round r
    const prevProg = progressList.find(p => p.roundNumber === r - 1);
    if (prevProg && prevProg.status === 'advanced') {
      return { roundNumber: r, progress: null, activeTieBreak };
    }
  }

  // Default to Round 1 if competition allows
  return { roundNumber: 1, progress: progressList.find(p => p.roundNumber === 1) || null, activeTieBreak };
}

// GET /api/participant/round-state
participantRouter.get('/round-state', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    // Check if participant was eliminated in any round
    const eliminatedProg = await RoundProgress.findOne({ userId, status: 'eliminated' });
    if (eliminatedProg) {
      res.status(403).json({
        error: 'You have been eliminated from the competition.',
        status: 'eliminated'
      });
      return;
    }

    const competition = await Competition.findOne() || await Competition.create({ status: 'active' });
    const { roundNumber, progress, activeTieBreak } = await getParticipantAccessibleRound(userId);

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
          marks: question.marks,
          allowedLanguages: question.allowedLanguages,
          starterCode: question.starterCode,
          testCases: (question.testCases || []).filter(tc => !tc.isHidden),
          timeLimitMs: question.timeLimitMs
        } : null,
        attempt: attempt || null
      });
      return;
    }

    const round = await Round.findOne({ roundNumber });
    if (!round) {
      res.status(404).json({ error: `Round ${roundNumber} configuration not found` });
      return;
    }

    // Check if participant was eliminated in earlier round
    if (roundNumber > 1) {
      const prevProg = await RoundProgress.findOne({ userId, roundNumber: roundNumber - 1 });
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

    // Determine remaining time from server
    let remainingSeconds = 0;
    if (round.status === 'active' && round.startedAt) {
      remainingSeconds = getRemainingSeconds(round);
    }

    // Get or initialize RoundProgress
    let currentProgress = progress;
    if (!currentProgress) {
      currentProgress = await RoundProgress.create({
        userId,
        roundNumber,
        status: round.status === 'active' ? 'in_progress' : 'not_started',
        startedAt: round.status === 'active' ? (round.startedAt || new Date()) : null
      });
    } else if (currentProgress.status === 'not_started' && round.status === 'active') {
      currentProgress.status = 'in_progress';
      currentProgress.startedAt = round.startedAt || new Date();
      await currentProgress.save();
    }

    // Fetch questions for this round
    const questions = await Question.find({ roundNumber }).sort({ orderIndex: 1 });

    // Sanitize questions: strip correct answers for MCQ and hidden test cases for Coding!
    const sanitizedQuestions = questions.map(q => {
      if (q.type === 'mcq') {
        return {
          _id: q._id,
          roundNumber: q.roundNumber,
          type: q.type,
          orderIndex: q.orderIndex,
          title: q.title,
          prompt: q.prompt,
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
          prompt: q.prompt,
          marks: q.marks,
          allowedLanguages: q.allowedLanguages,
          starterCode: q.starterCode,
          testCases: (q.testCases || []).filter(tc => !tc.isHidden).map(tc => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
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

    res.json({
      competition: {
        title: competition.title,
        status: competition.status,
        violationLimit: competition.violationLimit
      },
      round: {
        roundNumber: round.roundNumber,
        title: round.title,
        description: round.description,
        type: round.type,
        durationMinutes: round.durationMinutes,
        status: round.status,
        startedAt: round.startedAt,
        remainingSeconds
      },
      progress: {
        status: currentProgress.status,
        totalScore: currentProgress.totalScore,
        markedForReview: currentProgress.markedForReview,
        violationCount: currentProgress.violationCount,
        timeTakenSeconds: currentProgress.timeTakenSeconds
      },
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

// POST /api/participant/save-answer
participantRouter.post('/save-answer', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { questionId, roundNumber, selectedOption, code, language } = req.body;

    if (!questionId || !roundNumber) {
      res.status(400).json({ error: 'questionId and roundNumber are required' });
      return;
    }

    const round = await Round.findOne({ roundNumber });
    if (!round || round.status !== 'active') {
      res.status(400).json({ error: 'This round is not currently active' });
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

    res.json({ success: true, savedAt: attempt.lastSavedAt });
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
  try {
    const userId = req.user!.userId;
    const { questionId, code, language } = req.body;

    const question = await Question.findById(questionId);
    if (!question || question.type !== 'coding') {
      res.status(404).json({ error: 'Coding question not found' });
      return;
    }

    // Run only visible test cases
    const visibleCases = (question.testCases || []).filter(tc => !tc.isHidden);
    const results = await runTestCases(code, language, visibleCases, question.timeLimitMs);

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
  }
});

// POST /api/participant/submit-code
participantRouter.post('/submit-code', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { questionId, code, language, roundNumber } = req.body;

    const round = await Round.findOne({ roundNumber });
    if (!round || round.status !== 'active') {
      res.status(400).json({ error: 'Cannot submit: round is not active' });
      return;
    }

    const question = await Question.findById(questionId);
    if (!question || question.type !== 'coding') {
      res.status(404).json({ error: 'Coding question not found' });
      return;
    }

    // Execute against all test cases (visible + hidden)
    const allCases = question.testCases || [];
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

    attempt.code = code;
    attempt.language = language;
    attempt.testCaseResults = results;
    attempt.submissionCount = (attempt.submissionCount || 0) + 1;
    attempt.status = 'submitted';
    attempt.lastSubmittedAt = new Date();

    // Retain highest score across submissions for this question
    if (currentScore > (attempt.score || 0)) {
      attempt.score = currentScore;
    }
    await attempt.save();

    broadcastToAdmins('admin:submit_code', {
      userId,
      username: req.user!.username,
      questionId,
      score: currentScore,
      bestScore: attempt.score,
      passedCount: results.filter(r => r.passed).length,
      totalCount: results.length
    });

    res.json({
      success: true,
      score: attempt.score,
      submissionScore: currentScore,
      results: sanitizeResultsForParticipant(results)
    });
  } catch (err) {
    console.error('Submit code error:', err);
    res.status(500).json({ error: 'Error submitting code' });
  }
});

// POST /api/participant/submit-round
participantRouter.post('/submit-round', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { roundNumber } = req.body;

    const round = await Round.findOne({ roundNumber });
    if (!round) {
      res.status(404).json({ error: 'Round not found' });
      return;
    }

    // Auto-grade MCQs if Round 1
    if (round.type === 'mcq') {
      const questions = await Question.find({ roundNumber });
      for (const q of questions) {
        const attempt = await Attempt.findOne({ userId, roundNumber, questionId: q._id });
        if (attempt && attempt.selectedOption !== null && attempt.selectedOption !== undefined) {
          const { score } = await computeQuestionScore(q._id, attempt);
          attempt.score = score;
          attempt.status = 'submitted';
          await attempt.save();
        }
      }
    }

    const { totalScore, timeTakenSeconds } = await finalizeParticipantRoundScore(userId, roundNumber);

    res.json({
      success: true,
      message: `Round ${roundNumber} submitted successfully`,
      totalScore,
      timeTakenSeconds
    });
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

    const competition = await Competition.findOne();
    const violationLimit = competition?.violationLimit || 3;
    const autoSubmit = competition?.autoSubmitOnViolation ?? true;

    await ViolationLog.create({
      userId,
      roundNumber: roundNumber || 1,
      type: type || 'fullscreen_exit',
      details
    });

    const progress = await RoundProgress.findOne({ userId, roundNumber });
    let violationCount = 1;
    if (progress) {
      progress.violationCount = (progress.violationCount || 0) + 1;
      violationCount = progress.violationCount;
      await progress.save();
    }

    broadcastToAdmins('admin:violation_logged', {
      userId,
      username: req.user!.username,
      roundNumber,
      type,
      violationCount,
      timestamp: new Date()
    });

    let autoSubmitted = false;
    if (autoSubmit && violationCount >= violationLimit) {
      if (progress && progress.status === 'in_progress') {
        await finalizeParticipantRoundScore(userId, roundNumber);
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

// POST /api/participant/sync-batch (Offline recovery endpoint)
participantRouter.post('/sync-batch', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { updates } = req.body; // Array of { questionId, roundNumber, selectedOption, code, language }

    if (Array.isArray(updates)) {
      for (const item of updates) {
        let attempt = await Attempt.findOne({ userId, roundNumber: item.roundNumber, questionId: item.questionId });
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
        attempt.lastSavedAt = new Date();
        await attempt.save();
      }
    }

    res.json({ success: true, syncedCount: (updates || []).length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to sync offline batch' });
  }
});
