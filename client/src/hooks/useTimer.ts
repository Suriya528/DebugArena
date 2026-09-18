import { useState, useEffect, useRef } from 'react';
import { syncTimeWithServer, getCalibratedNow } from '../services/api.js';

interface UseTimerProps {
  serverRemainingSeconds: number;
  deadlineAt?: string | Date | null;
  isActive: boolean;
  onExpire?: () => void;
}

export function useTimer({ serverRemainingSeconds, deadlineAt, isActive, onExpire }: UseTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(serverRemainingSeconds);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const getTargetTime = () => {
    if (deadlineAt) {
      return new Date(deadlineAt).getTime();
    }
    return getCalibratedNow() + serverRemainingSeconds * 1000;
  };

  const targetEndTimeRef = useRef<number>(getTargetTime());

  // Sync server clock calibration on mount
  useEffect(() => {
    syncTimeWithServer().then(() => {
      targetEndTimeRef.current = getTargetTime();
    });
  }, []);

  // Resync when server remaining time or deadline updates
  useEffect(() => {
    targetEndTimeRef.current = getTargetTime();
    setRemainingSeconds(serverRemainingSeconds);
  }, [serverRemainingSeconds, deadlineAt]);

  useEffect(() => {
    if (!isActive) return;

    // Periodic time tick against calibrated target end time
    const interval = setInterval(() => {
      const calibratedNow = getCalibratedNow();
      const diffMs = targetEndTimeRef.current - calibratedNow;
      const diffSec = Math.max(0, Math.ceil(diffMs / 1000));

      setRemainingSeconds(diffSec);

      if (diffSec <= 0) {
        clearInterval(interval);
        if (onExpireRef.current) {
          onExpireRef.current();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isUrgent = remainingSeconds > 0 && remainingSeconds < 180; // under 3 minutes
  const isExpired = remainingSeconds <= 0;

  return {
    remainingSeconds,
    formattedTime,
    isUrgent,
    isExpired
  };
}
