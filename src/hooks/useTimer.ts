import { useState, useRef, useCallback, useEffect } from 'react';

export type TimerStatus = 'idle' | 'running' | 'paused' | 'done';

export function useTimer(durationSeconds: number, onDone?: () => void) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const [status, setStatus] = useState<TimerStatus>('idle');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { clearInterval(intervalRef.current ?? undefined); };
  }, []);

  const start = useCallback(() => {
    if (status === 'running') return;
    let current = status === 'done' ? durationSeconds : remaining;
    if (status === 'done') setRemaining(durationSeconds);
    setStatus('running');
    intervalRef.current = setInterval(() => {
      current = Math.max(0, current - 1);
      if (current <= 0) {
        clearInterval(intervalRef.current ?? undefined);
        intervalRef.current = null;
        setRemaining(0);
        setStatus('done');
        onDoneRef.current?.();
      } else {
        setRemaining(current);
      }
    }, 1000);
  }, [status, durationSeconds, remaining]);

  const pause = useCallback(() => {
    clearInterval(intervalRef.current ?? undefined);
    setStatus('paused');
  }, []);

  const reset = useCallback(() => {
    clearInterval(intervalRef.current ?? undefined);
    setRemaining(durationSeconds);
    setStatus('idle');
  }, [durationSeconds]);

  const formatted = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;

  return { remaining, status, formatted, start, pause, reset };
}
