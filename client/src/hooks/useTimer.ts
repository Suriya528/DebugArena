import { useState, useEffect, useRef } from 'react';

interface UseTimerProps {
  serverRemainingSeconds: number;
  isActive: boolean;
  onExpire?: () => void;
}

export function useTimer({ serverRemainingSeconds, isActive, onExpire }: UseTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(serverRemainingSeconds);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  // Resync when server remaining time updates
  useEffect(() => {
    setRemainingSeconds(serverRemainingSeconds);
  }, [serverRemainingSeconds]);

  useEffect(() => {
    if (!isActive || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (onExpireRef.current) {
            onExpireRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, remainingSeconds]);

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
