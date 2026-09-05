import mongoose from 'mongoose';
import { Question } from '../models/Question.js';
import { Attempt } from '../models/Attempt.js';
import { Round } from '../models/Round.js';
import { RoundProgress } from '../models/RoundProgress.js';
import { broadcastToAdmins } from './socketService.js';

export async function computeQuestionScore(
  questionId: string | mongoose.Types.ObjectId,
  attempt: { selectedOption?: number | null; testCaseResults?: Array<{ passed: boolean }> }
): Promise<{ score: number; maxScore: number }> {
  const question = await Question.findById(questionId);
  if (!question) return { score: 0, maxScore: 0 };

  if (question.type === 'mcq') {
    const isCorrect = attempt.selectedOption === question.correctOptionIndex;
    return {
      score: isCorrect ? question.marks : 0, // Strictly NO negative marking
      maxScore: question.marks
    };
  } else {
    // Coding
    let totalScore = 0;
    let maxScore = 0;
    const testCases = question.testCases || [];

    testCases.forEach((tc, idx) => {
      maxScore += tc.weight;
      if (attempt.testCaseResults && attempt.testCaseResults[idx]?.passed) {
        totalScore += tc.weight;
      }
    });

    return { score: totalScore, maxScore: maxScore || question.marks };
  }
}

import { DynamicRound } from '../models/DynamicRound.js';
import { User } from '../models/User.js';

export async function finalizeParticipantRoundScore(
  userId: string,
  roundNumber: number,
  forceRecalculateTime: boolean = false
): Promise<{ totalScore: number; timeTakenSeconds: number }> {
  // Check if participant is in a dynamic event round
  const user = await User.findById(userId);
  let effectiveRound: { startedAt: Date | null; durationMinutes: number } | null = null;

  if (user?.eventId) {
    const dynRound = await DynamicRound.findOne({ eventId: user.eventId, roundNumber });
    if (dynRound) {
      effectiveRound = { startedAt: dynRound.startedAt, durationMinutes: dynRound.durationMinutes };
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
      roundNumber,
      status: 'submitted',
      startedAt: effectiveRound?.startedAt || new Date()
    });
  }

  // Calculate sum of attempts for this round
  const attempts = await Attempt.find({ userId, roundNumber });
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
  progress.status = 'submitted';
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
