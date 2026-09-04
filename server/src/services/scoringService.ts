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

export async function finalizeParticipantRoundScore(
  userId: string,
  roundNumber: number
): Promise<{ totalScore: number; timeTakenSeconds: number }> {
  const round = await Round.findOne({ roundNumber });
  let progress = await RoundProgress.findOne({ userId, roundNumber });

  if (!progress) {
    progress = new RoundProgress({
      userId,
      roundNumber,
      status: 'submitted',
      startedAt: round?.startedAt || new Date()
    });
  }

  // Calculate sum of attempts for this round
  const attempts = await Attempt.find({ userId, roundNumber });
  let totalScore = 0;
  for (const att of attempts) {
    totalScore += att.score || 0;
  }

  const now = new Date();
  const startTime = progress.startedAt || round?.startedAt || now;
  const timeTakenSeconds = Math.max(0, Math.floor((now.getTime() - new Date(startTime).getTime()) / 1000));

  progress.totalScore = totalScore;
  progress.timeTakenSeconds = timeTakenSeconds;
  progress.status = 'submitted';
  progress.submittedAt = now;
  await progress.save();

  broadcastToAdmins('admin:participant_submitted', {
    userId,
    roundNumber,
    totalScore,
    timeTakenSeconds,
    submittedAt: now
  });

  return { totalScore, timeTakenSeconds };
}
