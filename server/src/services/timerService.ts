import { Round } from '../models/Round.js';
import { DynamicRound } from '../models/DynamicRound.js';
import { User } from '../models/User.js';
import { RoundProgress } from '../models/RoundProgress.js';
import { broadcastToAdmins, broadcastToParticipants, broadcastToAll, emitToUser } from './socketService.js';
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

/**
 * Authoritative check and auto-completion for an individual round document.
 * Returns true if the round was transitioned to completed.
 */
export async function syncRoundStatus(round: any): Promise<boolean> {
  if (!round || round.status !== 'active' || !round.startedAt) {
    return false;
  }

  const durationMs = (round.durationMinutes || 30) * 60 * 1000;
  const deadline = new Date(round.startedAt).getTime() + durationMs;
  const now = Date.now();

  if (now >= deadline) {
    console.log(`⏱️ Auto-completing Round ${round.roundNumber} (configured duration ${round.durationMinutes}m elapsed)`);
    round.status = 'completed';
    round.endedAt = new Date();
    await round.save();

    // Auto-finalize any participants still in_progress
    try {
      const q: any = { roundNumber: round.roundNumber, status: 'in_progress' };
      if (round.eventId) q.eventId = round.eventId;
      const activeProgress = await RoundProgress.find(q);
      for (const p of activeProgress) {
        await finalizeParticipantRoundScore(p.userId.toString(), round.roundNumber);
        emitToUser(p.userId.toString(), 'round:auto_submitted', {
          roundNumber: round.roundNumber,
          eventId: round.eventId,
          reason: 'Round time expired'
        });
      }
    } catch (err) {
      console.error('Error finalizing participants in syncRoundStatus:', err);
    }

    const eventIdStr = round.eventId?.toString();
    broadcastToAll('round:locked', {
      eventId: eventIdStr,
      roundNumber: round.roundNumber,
      message: `Round ${round.roundNumber} has concluded.`
    }, eventIdStr);
    broadcastToAll('round:completed', {
      eventId: eventIdStr,
      roundNumber: round.roundNumber
    }, eventIdStr);
    broadcastToAdmins('admin:round_locked', {
      eventId: eventIdStr,
      roundNumber: round.roundNumber,
      status: 'completed'
    }, undefined, eventIdStr);

    return true;
  }

  return false;
}

/**
 * Authoritative background sweep: checks all active dynamic and standalone rounds,
 * and automatically marks them 'completed' when their duration has elapsed.
 */
export async function checkAndExpireRounds(): Promise<void> {
  const now = Date.now();

  // 1. Dynamic Rounds (Event-based)
  try {
    const activeDynamicRounds = await DynamicRound.find({
      status: 'active',
      startedAt: { $ne: null }
    });

    for (const round of activeDynamicRounds) {
      const deadline = new Date(round.startedAt!).getTime() + (round.durationMinutes || 30) * 60 * 1000;
      if (now >= deadline) {
        await syncRoundStatus(round);
      }
    }
  } catch (err) {
    console.error('Error in checkAndExpireRounds (dynamic):', err);
  }

  // 2. Standalone / Legacy Rounds
  try {
    const activeLegacyRounds = await Round.find({
      status: 'active',
      startedAt: { $ne: null }
    });

    for (const round of activeLegacyRounds) {
      const deadline = new Date(round.startedAt!).getTime() + (round.durationMinutes || 30) * 60 * 1000;
      if (now >= deadline) {
        await syncRoundStatus(round);
      }
    }
  } catch (err) {
    console.error('Error in checkAndExpireRounds (legacy):', err);
  }
}

export function startServerTimerSweep(): void {
  if (sweepInterval) return;

  sweepInterval = setInterval(async () => {
    try {
      const now = new Date();

      // 1. Check and auto-complete any active rounds whose configured duration has expired
      await checkAndExpireRounds();

      // 2. Sweep active participant attempts whose individual endsAt deadline has elapsed
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

      // 3. Legacy fallback: populate endsAt for any active in_progress attempts missing endsAt
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
  }, 3000);
}

export function stopServerTimerSweep(): void {
  if (sweepInterval) {
    clearInterval(sweepInterval);
    sweepInterval = null;
  }
}
