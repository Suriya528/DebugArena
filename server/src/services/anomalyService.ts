import { Attempt } from '../models/Attempt.js';
import { Question } from '../models/Question.js';
import { RoundProgress } from '../models/RoundProgress.js';
import { User } from '../models/User.js';
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

export async function getQuestionFairnessMetrics(roundNumber: number, collegeId?: string, eventId?: string): Promise<QuestionFairnessMetric[]> {
  const qFilter: any = { roundNumber };
  if (eventId) qFilter.eventId = eventId;
  const questions = await Question.find(qFilter).sort({ orderIndex: 1 });
  const metrics: QuestionFairnessMetric[] = [];

  const userFilter: any = { role: 'participant' };
  if (collegeId) userFilter.collegeId = collegeId;
  if (eventId) userFilter.eventId = eventId;
  const tenantUserIds = await User.find(userFilter).distinct('_id');

  for (const q of questions) {
    const attFilter: any = { roundNumber, questionId: q._id };
    if (tenantUserIds.length > 0) attFilter.userId = { $in: tenantUserIds };
    const attempts = await Attempt.find(attFilter);
    const totalAttempts = attempts.length;
    const passCount = attempts.filter(a => a.score && a.score >= q.marks * 0.7).length;
    const passRate = totalAttempts > 0 ? Math.round((passCount / totalAttempts) * 100) : 100;

    let totalDuration = 0;
    attempts.forEach(a => {
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
  reason: string = 'Statistical outlier anomaly detected',
  collegeId?: string,
  eventId?: string
): Promise<{ success: boolean; affectedCount: number; message: string }> {
  const question = await Question.findById(questionId);
  if (!question) {
    throw new Error('Question not found');
  }

  const userFilter: any = { role: 'participant' };
  if (collegeId) userFilter.collegeId = collegeId;
  if (eventId) userFilter.eventId = eventId;
  const tenantUserIds = await User.find(userFilter).distinct('_id');

  const attemptFilter: any = { roundNumber, questionId };
  if (tenantUserIds.length > 0) attemptFilter.userId = { $in: tenantUserIds };

  const progressFilter: any = { roundNumber };
  if (tenantUserIds.length > 0) progressFilter.userId = { $in: tenantUserIds };

  let affectedCount = 0;

  if (action === 'give_full_marks') {
    // 1. Bulk update existing tenant attempts for this question
    const updateRes = await Attempt.updateMany(
      attemptFilter,
      { score: question.marks, status: 'submitted' }
    );
    affectedCount = updateRes.modifiedCount;

    // 2. Ensure all tenant participants in this round have an attempt with full marks
    const allProgress = await RoundProgress.find(progressFilter);
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
      collegeId,
      eventId,
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
    }, collegeId);

    broadcastToAll('leaderboard:updated', { roundNumber });

    return {
      success: true,
      affectedCount,
      message: `Full marks (${question.marks} pts) awarded to all ${affectedCount} participants for "${question.title}". Leaderboard recalculated.`
    };
  }

  if (action === 'disable_question') {
    const updateRes = await Attempt.updateMany(
      attemptFilter,
      { score: 0 }
    );
    affectedCount = updateRes.modifiedCount;

    const allProgress = await RoundProgress.find(progressFilter);
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
