import { Round } from '../models/Round.js';
import { DynamicRound } from '../models/DynamicRound.js';
import { User } from '../models/User.js';
import { RoundProgress } from '../models/RoundProgress.js';
import { broadcastToAdmins, broadcastToParticipants, emitToUser } from './socketService.js';
import { finalizeParticipantRoundScore } from './scoringService.js';

let sweepInterval: NodeJS.Timeout | null = null;

export function getRemainingSeconds(round: { status: string; startedAt: Date | null; durationMinutes: number }): number {
  if (round.status !== 'active' || !round.startedAt) {
    return 0;
  }
  const deadline = new Date(round.startedAt).getTime() + round.durationMinutes * 60 * 1000;
  const now = Date.now();
  return Math.max(0, Math.floor((deadline - now) / 1000));
}

export function startServerTimerSweep(): void {
  if (sweepInterval) return;

  sweepInterval = setInterval(async () => {
    try {
      const now = new Date();

      // 1. Sweep active participant attempts whose individual endsAt deadline has elapsed
      const expiredParticipants = await RoundProgress.find({
        status: 'in_progress',
        endsAt: { $ne: null, $lte: now }
      });

      for (const progress of expiredParticipants) {
        console.log(`⏱️ Participant ${progress.userId} deadline reached for Round ${progress.roundNumber}. Auto-finalizing attempt.`);
        await finalizeParticipantRoundScore(progress.userId.toString(), progress.roundNumber);

        emitToUser(progress.userId.toString(), 'round:auto_submitted', {
          roundNumber: progress.roundNumber,
          eventId: progress.eventId,
          reason: 'Time expired'
        });

        broadcastToAdmins('admin:participant_auto_submitted', {
          userId: progress.userId,
          roundNumber: progress.roundNumber,
          eventId: progress.eventId,
          reason: 'Time expired'
        });
      }

      // 2. Legacy fallback: populate endsAt for any active in_progress attempts missing endsAt
      const missingEndsAtList = await RoundProgress.find({
        status: 'in_progress',
        startedAt: { $ne: null },
        endsAt: null
      });

      for (const p of missingEndsAtList) {
        let durationMinutes = 30;
        if (p.eventId) {
          const dyn = await DynamicRound.findOne({ eventId: p.eventId, roundNumber: p.roundNumber });
          if (dyn?.durationMinutes) durationMinutes = dyn.durationMinutes;
        } else {
          const r = await Round.findOne({ roundNumber: p.roundNumber });
          if (r?.durationMinutes) durationMinutes = r.durationMinutes;
        }
        p.endsAt = new Date(new Date(p.startedAt!).getTime() + durationMinutes * 60 * 1000);
        await p.save();
      }
    } catch (err) {
      console.error('Error in timer sweep:', err);
    }
  }, 5000);
}

export function stopServerTimerSweep(): void {
  if (sweepInterval) {
    clearInterval(sweepInterval);
    sweepInterval = null;
  }
}
