import { Attempt } from '../models/Attempt.js';
import { Question } from '../models/Question.js';
import { RoundProgress } from '../models/RoundProgress.js';
import { AuditLog } from '../models/AuditLog.js';
import { broadcastToAdmins, broadcastToAll } from './socketService.js';
import { finalizeParticipantRoundScore } from './scoringService.js';

export interface QuestionFairnessMetric {
  questionId: string;
  orderIndex: number;
  title: string;
  marks: number;
  type: string;
  totalAttempts: number;
  passCount: number;
  passRate: number; // 0 - 100%
  avgSolveTimeSeconds: number;
  health: 'normal' | 'review' | 'critical';
  anomalyReason?: string;
  isActionApplied?: boolean;
}

export async function getQuestionFairnessMetrics(roundNumber: number): Promise<QuestionFairnessMetric[]> {
  const questions = await Question.find({ roundNumber }).sort({ orderIndex: 1 });
  const metrics: QuestionFairnessMetric[] = [];

  for (const q of questions) {
    const attempts = await Attempt.find({ roundNumber, questionId: q._id });
    const totalAttempts = attempts.length;
    const passCount = attempts.filter(a => a.score && a.score >= q.marks * 0.7).length;
    const passRate = totalAttempts > 0 ? Math.round((passCount / totalAttempts) * 100) : 100;

    let totalDuration = 0;
    attempts.forEach(a => {
      // Mock average solve time calculation based on saved attempts
      totalDuration += 300; // default 5m
    });
    const avgSolveTimeSeconds = totalAttempts > 0 ? Math.round(totalDuration / totalAttempts) : 0;

    let health: 'normal' | 'review' | 'critical' = 'normal';
    let anomalyReason: string | undefined;

    if (totalAttempts >= 3) {
      if (passRate < 25) {
        health = 'critical';
        anomalyReason = `Severe statistical anomaly: Pass rate is ${passRate}% (<25%). Potential erroneous test case or ambiguous constraint.`;
      } else if (passRate < 45) {
        health = 'review';
        anomalyReason = `Below average pass rate (${passRate}%). Review recommended.`;
      }
    }

    metrics.push({
      questionId: q._id.toString(),
      orderIndex: q.orderIndex,
      title: q.title,
      marks: q.marks,
      type: q.type,
      totalAttempts,
      passCount,
      passRate,
      avgSolveTimeSeconds,
      health,
      anomalyReason
    });
  }

  return metrics;
}

export async function executeAnomalyAction(
  roundNumber: number,
  questionId: string,
  action: 'give_full_marks' | 'disable_question' | 'recalculate_scores',
  adminUsername: string,
  adminId: string,
  reason: string = 'Statistical outlier anomaly detected'
): Promise<{ success: boolean; affectedCount: number; message: string }> {
  const question = await Question.findById(questionId);
  if (!question) {
    throw new Error('Question not found');
  }

  let affectedCount = 0;

  if (action === 'give_full_marks') {
    // 1. Bulk update all existing attempts for this question to award full marks
    const updateRes = await Attempt.updateMany(
      { roundNumber, questionId },
      { score: question.marks, status: 'submitted' }
    );
    affectedCount = updateRes.modifiedCount;

    // 2. Also ensure any participants in this round have an attempt with full marks
    const allProgress = await RoundProgress.find({ roundNumber });
    for (const prog of allProgress) {
      const existing = await Attempt.findOne({ userId: prog.userId, roundNumber, questionId });
      if (!existing) {
        await Attempt.create({
          userId: prog.userId,
          roundNumber,
          questionId,
          score: question.marks,
          status: 'submitted'
        });
        affectedCount++;
      }
      // 3. Recalculate participant's total round score
      await finalizeParticipantRoundScore(prog.userId.toString(), roundNumber);
    }

    await AuditLog.create({
      adminId,
      adminUsername,
      action: 'ANOMALY_FULL_MARKS_AWARDED',
      targetType: 'Question',
      targetId: questionId,
      details: { questionTitle: question.title, marks: question.marks, affectedCount },
      reason
    });

    broadcastToAdmins('admin:anomaly_resolved', {
      questionId,
      action,
      questionTitle: question.title,
      affectedCount
    });

    broadcastToAll('leaderboard:updated', { roundNumber });

    return {
      success: true,
      affectedCount,
      message: `Full marks (${question.marks} pts) awarded to all ${affectedCount} participants for "${question.title}". Leaderboard recalculated.`
    };
  }

  if (action === 'disable_question') {
    // Zero out score contribution or drop question
    const updateRes = await Attempt.updateMany(
      { roundNumber, questionId },
      { score: 0 }
    );
    affectedCount = updateRes.modifiedCount;

    const allProgress = await RoundProgress.find({ roundNumber });
    for (const prog of allProgress) {
      await finalizeParticipantRoundScore(prog.userId.toString(), roundNumber);
    }

    await AuditLog.create({
      adminId,
      adminUsername,
      action: 'ANOMALY_QUESTION_DISABLED',
      targetType: 'Question',
      targetId: questionId,
      details: { questionTitle: question.title, affectedCount },
      reason
    });

    broadcastToAll('leaderboard:updated', { roundNumber });

    return {
      success: true,
      affectedCount,
      message: `Question "${question.title}" disabled and exempt from scoring. Scores recalculated.`
    };
  }

  if (action === 'recalculate_scores') {
    const allProgress = await RoundProgress.find({ roundNumber });
    for (const prog of allProgress) {
      await finalizeParticipantRoundScore(prog.userId.toString(), roundNumber);
      affectedCount++;
    }

    broadcastToAll('leaderboard:updated', { roundNumber });

    return {
      success: true,
      affectedCount,
      message: `Recalculated scores for ${affectedCount} participants.`
    };
  }

  throw new Error('Unknown anomaly action');
}
