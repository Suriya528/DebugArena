import { ViolationLog } from '../models/ViolationLog.js';
import { RoundProgress } from '../models/RoundProgress.js';
import { User } from '../models/User.js';
import { Event } from '../models/Event.js';

export interface ISuspicionReport {
  userId: string;
  totalScore: number;
  level: 'low' | 'elevated' | 'high' | 'critical';
  factors: {
    tabSwitches: number;
    fullscreenExits: number;
    largePastes: number;
    rapidSolves: number;
  };
  evidenceLogs: Array<{
    id: string;
    type: string;
    points: number;
    details: string;
    timestamp: Date;
  }>;
}

export async function recalculateUserSuspicion(userId: string, roundNumber: number): Promise<ISuspicionReport> {
  const progress = await RoundProgress.findOne({ userId, roundNumber });

  // Check if event is finalized or cleaned
  const user = await User.findById(userId).select('eventId');
  let isEventSealed = false;
  if (user?.eventId) {
    const event = await Event.findById(user.eventId).select('status cleanupStatus');
    if (
      event &&
      (event.status === 'finalized' || event.status === 'cleaned' || event.cleanupStatus === 'completed')
    ) {
      isEventSealed = true;
    }
  }

  const logs = await ViolationLog.find({ userId, roundNumber }).sort({ timestamp: -1 });

  // If the event is finalized or if raw violation logs were already cleaned up,
  // preserve the permanent, frozen suspicion score in RoundProgress and never overwrite it.
  if (isEventSealed || (logs.length === 0 && progress && (progress.suspicionScore || 0) > 0)) {
    return {
      userId,
      totalScore: progress?.suspicionScore || 0,
      level: progress?.suspicionLevel || 'low',
      factors: {
        tabSwitches: 0,
        fullscreenExits: 0,
        largePastes: 0,
        rapidSolves: 0
      },
      evidenceLogs: logs.map((l) => ({
        id: l._id.toString(),
        type: l.type,
        points: l.suspicionPoints || 15,
        details: l.details || '',
        timestamp: l.timestamp
      }))
    };
  }

  let totalPoints = 0;
  let tabSwitches = 0;
  let fullscreenExits = 0;
  let largePastes = 0;
  let rapidSolves = 0;

  logs.forEach(log => {
    let pts = log.suspicionPoints;
    if (!pts) {
      if (log.type === 'tab_switch' || log.type === 'window_blur') pts = 20;
      else if (log.type === 'fullscreen_exit') pts = 25;
      else if (log.type === 'large_paste') pts = 35;
      else if (log.type === 'rapid_solve_anomaly') pts = 40;
      else pts = 15;
    }
    totalPoints += pts;

    if (log.type === 'tab_switch' || log.type === 'window_blur') tabSwitches++;
    else if (log.type === 'fullscreen_exit') fullscreenExits++;
    else if (log.type === 'large_paste') largePastes++;
    else if (log.type === 'rapid_solve_anomaly') rapidSolves++;
  });

  // Clamp suspicion score between 0 and 100
  const normalizedScore = Math.min(100, Math.max(0, totalPoints));

  let level: 'low' | 'elevated' | 'high' | 'critical' = 'low';
  if (normalizedScore >= 75) level = 'critical';
  else if (normalizedScore >= 45) level = 'high';
  else if (normalizedScore >= 20) level = 'elevated';

  await RoundProgress.findOneAndUpdate(
    { userId, roundNumber },
    { suspicionScore: normalizedScore, suspicionLevel: level }
  );

  return {
    userId,
    totalScore: normalizedScore,
    level,
    factors: {
      tabSwitches,
      fullscreenExits,
      largePastes,
      rapidSolves
    },
    evidenceLogs: logs.map(l => ({
      id: l._id.toString(),
      type: l.type,
      points: l.suspicionPoints || 15,
      details: l.details || '',
      timestamp: l.timestamp
    }))
  };
}
