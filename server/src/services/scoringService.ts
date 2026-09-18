import mongoose from 'mongoose';
import { Question } from '../models/Question.js';
import { Attempt } from '../models/Attempt.js';
import { Round } from '../models/Round.js';
import { RoundProgress } from '../models/RoundProgress.js';
import { DynamicRound } from '../models/DynamicRound.js';
import { User } from '../models/User.js';
import { Event } from '../models/Event.js';
import { broadcastToAdmins } from './socketService.js';

export async function computeQuestionScore(
  questionId: string | mongoose.Types.ObjectId,
  attempt: { selectedOption?: number | null; testCaseResults?: Array<{ passed: boolean }> },
  scoringConfig?: { negativeMarking?: boolean }
): Promise<{ score: number; maxScore: number }> {
  const question = await Question.findById(questionId);
  if (!question) return { score: 0, maxScore: 0 };

  if (question.type === 'mcq') {
    const isCorrect = attempt.selectedOption === question.correctOptionIndex;
    let score = isCorrect ? question.marks : 0;
    if (!isCorrect && scoringConfig?.negativeMarking && attempt.selectedOption !== null && attempt.selectedOption !== undefined) {
      score = -Math.round(question.marks * 0.25);
    }
    return {
      score,
      maxScore: question.marks
    };
  } else {
    // Coding
    let totalScore = 0;
    let maxScore = 0;
    const testCases = question.testCases || [];

    testCases.forEach((tc, idx) => {
      const weight = tc.weight !== undefined ? tc.weight : 10;
      maxScore += weight;
      if (attempt.testCaseResults && attempt.testCaseResults[idx]?.passed) {
        totalScore += weight;
      }
    });

    return { score: totalScore, maxScore: maxScore || question.marks };
  }
}

export async function finalizeParticipantRoundScore(
  userId: string,
  roundNumber: number,
  forceRecalculateTime: boolean = false
): Promise<{ totalScore: number; timeTakenSeconds: number }> {
  // Check if participant is in a dynamic event round
  const user = await User.findById(userId);
  let effectiveRound: { startedAt: Date | null; durationMinutes: number } | null = null;
  let scoringConfig: any = null;

  if (user?.eventId) {
    const [dynRound, event] = await Promise.all([
      DynamicRound.findOne({ eventId: user.eventId, roundNumber }),
      Event.findById(user.eventId).select('scoringConfig')
    ]);
    if (dynRound) {
      effectiveRound = { startedAt: dynRound.startedAt, durationMinutes: dynRound.durationMinutes };
    }
    if (event?.scoringConfig) {
      scoringConfig = event.scoringConfig;
    }
  }

  if (!effectiveRound) {
    const round = await Round.findOne({ roundNumber });
    if (round) {
      effectiveRound = { startedAt: round.startedAt, durationMinutes: round.durationMinutes };
    }
  }

  let progress = await RoundProgress.findOne({ userId, roundNumber });

  if (!progress) {
    progress = new RoundProgress({
      userId,
      eventId: user?.eventId,
      roundNumber,
      status: 'submitted',
      startedAt: effectiveRound?.startedAt || new Date()
    });
  } else if (!progress.eventId && user?.eventId) {
    progress.eventId = user.eventId as any;
  }

  // Universal MCQ Auto-Grading: Ensure all saved MCQ attempts are evaluated before aggregating total score
  const attempts = await Attempt.find({ userId, roundNumber });
  for (const att of attempts) {
    if (att.selectedOption !== null && att.selectedOption !== undefined) {
      const { score } = await computeQuestionScore(att.questionId, att, scoringConfig);
      att.score = score;
      att.status = 'submitted';
      await att.save();
    }
  }

  // Calculate sum of attempts for this round
  let totalScore = 0;
  for (const att of attempts) {
    totalScore += att.score || 0;
  }

  const now = new Date();
  const maxDurationSec = (effectiveRound?.durationMinutes || 30) * 60;
  const startTime = progress.startedAt || effectiveRound?.startedAt || now;

  // Idempotency: If already submitted, preserve initial submission timestamp and duration unless force-recalculated
  let timeTakenSeconds = progress.timeTakenSeconds;
  let submittedAt = progress.submittedAt || now;

  if (progress.status !== 'submitted' || forceRecalculateTime || !progress.submittedAt) {
    const rawElapsed = Math.max(0, Math.floor((now.getTime() - new Date(startTime).getTime()) / 1000));
    timeTakenSeconds = Math.min(maxDurationSec, rawElapsed);
    submittedAt = now;
  }

  progress.totalScore = totalScore;
  progress.timeTakenSeconds = timeTakenSeconds;
  if (progress.status !== 'eliminated') {
    progress.status = 'submitted';
  }
  progress.submittedAt = submittedAt;
  await progress.save();

  broadcastToAdmins('admin:participant_submitted', {
    userId,
    roundNumber,
    totalScore,
    timeTakenSeconds,
    submittedAt
  });

  return { totalScore, timeTakenSeconds };
}
