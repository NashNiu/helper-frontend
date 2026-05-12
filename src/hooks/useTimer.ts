import { useState, useRef, useCallback } from 'react';

export type TimerStatus = 'idle' | 'running' | 'paused' | 'done';

export function useTimer(durationSeconds: number) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const [status, setStatus] = useState<TimerStatus>('idle');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    if (status === 'done') setRemaining(durationSeconds);
    setStatus('running');
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setStatus('done');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [status, durationSeconds]);

  const pause = useCallback(() => {
    clearInterval(intervalRef.current!);
    setStatus('paused');
  }, []);

  const reset = useCallback(() => {
    clearInterval(intervalRef.current!);
    setRemaining(durationSeconds);
    setStatus('idle');
  }, [durationSeconds]);

  const formatted = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;

  return { remaining, status, formatted, start, pause, reset };
}
