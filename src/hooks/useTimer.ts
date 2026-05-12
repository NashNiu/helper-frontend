import { useState, useRef, useCallback, useEffect } from 'react';

export type TimerStatus = 'idle' | 'running' | 'paused' | 'done';

export function useTimer(durationSeconds: number) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const [status, setStatus] = useState<TimerStatus>('idle');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => { clearInterval(intervalRef.current ?? undefined); };
  }, []);

  // Detect completion: when remaining hits 0 and we're running, stop
  useEffect(() => {
    if (remaining === 0 && status === 'running') {
      clearInterval(intervalRef.current ?? undefined);
      setStatus('done');
    }
  }, [remaining, status]);

  const start = useCallback(() => {
    if (status === 'running') return;
    if (status === 'done') setRemaining(durationSeconds);
    setStatus('running');
    intervalRef.current = setInterval(() => {
      setRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
  }, [status, durationSeconds]);

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
