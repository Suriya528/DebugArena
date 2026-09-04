import { Round } from '../models/Round.js';
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
      const activeRounds = await Round.find({ status: 'active' });

      for (const round of activeRounds) {
        if (!round.startedAt) continue;

        const remaining = getRemainingSeconds(round);

        if (remaining <= 0) {
          console.log(`⏱️ Round ${round.roundNumber} deadline reached. Auto-locking and sweeping submissions.`);
          round.status = 'locked';
          round.endedAt = new Date();
          await round.save();

          broadcastToParticipants('round:locked', {
            roundNumber: round.roundNumber,
            message: `Round ${round.roundNumber} has concluded.`
          });

          broadcastToAdmins('admin:round_locked', {
            roundNumber: round.roundNumber
          });

          // Sweep all in_progress participants for this round
          const inProgressList = await RoundProgress.find({
            roundNumber: round.roundNumber,
            status: { $in: ['in_progress', 'not_started'] }
          });

          for (const progress of inProgressList) {
            await finalizeParticipantRoundScore(progress.userId.toString(), round.roundNumber);
            emitToUser(progress.userId.toString(), 'round:auto_submitted', {
              roundNumber: round.roundNumber,
              reason: 'Time expired'
            });
          }
        }
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
