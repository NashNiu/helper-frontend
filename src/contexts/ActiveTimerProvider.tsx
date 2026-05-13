import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Timer } from '../api/timer';
import { ActiveTimerContext, formatRemaining } from './ActiveTimerContext';
import type { ActiveTimerState } from './ActiveTimerContext';
import { showSystemNotification } from '../utils/notify';

const STORAGE_KEY = 'active-timer-state';

interface PersistedState {
  timerId: number;
  timerName: string;
  timerDurationSeconds: number;
  timerType: string;
  timerIsPreset: boolean;
  status: 'running' | 'paused';
  /** epoch ms when the countdown is expected to hit 0 (running) */
  endsAt?: number;
  /** seconds remaining at the moment of pause (paused) */
  pausedRemaining?: number;
}

function loadPersisted(): ActiveTimerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PersistedState;
    const timer: Timer = {
      id: p.timerId,
      name: p.timerName,
      duration_seconds: p.timerDurationSeconds,
      type: p.timerType,
      is_preset: p.timerIsPreset,
    };
    if (p.status === 'running' && typeof p.endsAt === 'number') {
      const remaining = Math.max(0, Math.ceil((p.endsAt - Date.now()) / 1000));
      if (remaining <= 0) {
        return { timer, remaining: 0, status: 'done', formatted: formatRemaining(0) };
      }
      return { timer, remaining, status: 'running', formatted: formatRemaining(remaining) };
    }
    if (p.status === 'paused' && typeof p.pausedRemaining === 'number') {
      const remaining = Math.max(0, Math.floor(p.pausedRemaining));
      return { timer, remaining, status: 'paused', formatted: formatRemaining(remaining) };
    }
    return null;
  } catch {
    return null;
  }
}

function persist(state: ActiveTimerState | null) {
  try {
    if (!state || state.status === 'done') {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const p: PersistedState = {
      timerId: state.timer.id,
      timerName: state.timer.name,
      timerDurationSeconds: state.timer.duration_seconds,
      timerType: state.timer.type,
      timerIsPreset: state.timer.is_preset,
      status: state.status === 'running' ? 'running' : 'paused',
    };
    if (state.status === 'running') {
      p.endsAt = Date.now() + state.remaining * 1000;
    } else {
      p.pausedRemaining = state.remaining;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export default function ActiveTimerProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveTimerState | null>(() => loadPersisted());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endsAtRef = useRef<number | null>(null);
  /** Tracks the timer.id we've already notified for, so we don't double-fire. */
  const notifiedIdRef = useRef<number | null>(null);

  const clearInterval$ = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const fireDone = useCallback((state: ActiveTimerState) => {
    if (notifiedIdRef.current === state.timer.id) return;
    notifiedIdRef.current = state.timer.id;
    const message = `「${state.timer.name}」计时结束！`;
    showSystemNotification({
      title: '⏱️ 计时结束',
      body: message,
      tag: `timer-${state.timer.id}`,
    });
    new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg').play().catch(() => {});
  }, []);

  // Tick loop: re-derives remaining from endsAtRef every second.
  const startTicking = useCallback(() => {
    clearInterval$();
    intervalRef.current = setInterval(() => {
      const endsAt = endsAtRef.current;
      if (endsAt === null) return;
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setActive(prev => {
        if (!prev) return prev;
        if (remaining <= 0) {
          clearInterval$();
          const done: ActiveTimerState = { ...prev, remaining: 0, status: 'done', formatted: formatRemaining(0) };
          persist(done);
          fireDone(done);
          return done;
        }
        if (remaining === prev.remaining) return prev;
        return { ...prev, remaining, formatted: formatRemaining(remaining) };
      });
    }, 250);
  }, [clearInterval$, fireDone]);

  // If we restored a running state on mount, immediately resume ticking.
  useEffect(() => {
    if (active?.status === 'running') {
      endsAtRef.current = Date.now() + active.remaining * 1000;
      startTicking();
    } else if (active?.status === 'done') {
      // Was completed while page was closed; emit notification now (once).
      fireDone(active);
    }
    return () => { clearInterval$(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback((timer: Timer) => {
    clearInterval$();
    notifiedIdRef.current = null;
    const remaining = timer.duration_seconds;
    endsAtRef.current = Date.now() + remaining * 1000;
    const state: ActiveTimerState = {
      timer,
      remaining,
      status: 'running',
      formatted: formatRemaining(remaining),
    };
    persist(state);
    setActive(state);
    startTicking();
  }, [clearInterval$, startTicking]);

  const pause = useCallback(() => {
    setActive(prev => {
      if (!prev || prev.status !== 'running') return prev;
      clearInterval$();
      endsAtRef.current = null;
      const paused: ActiveTimerState = { ...prev, status: 'paused' };
      persist(paused);
      return paused;
    });
  }, [clearInterval$]);

  const resume = useCallback(() => {
    setActive(prev => {
      if (!prev || prev.status !== 'paused') return prev;
      endsAtRef.current = Date.now() + prev.remaining * 1000;
      const running: ActiveTimerState = { ...prev, status: 'running' };
      persist(running);
      startTicking();
      return running;
    });
  }, [startTicking]);

  const reset = useCallback(() => {
    setActive(prev => {
      if (!prev) return prev;
      clearInterval$();
      endsAtRef.current = null;
      notifiedIdRef.current = null;
      const remaining = prev.timer.duration_seconds;
      const next: ActiveTimerState = {
        timer: prev.timer,
        remaining,
        status: 'paused',
        formatted: formatRemaining(remaining),
      };
      persist(next);
      return next;
    });
  }, [clearInterval$]);

  const clear = useCallback(() => {
    clearInterval$();
    endsAtRef.current = null;
    notifiedIdRef.current = null;
    persist(null);
    setActive(null);
  }, [clearInterval$]);

  return (
    <ActiveTimerContext.Provider value={{ active, start, pause, resume, reset, clear }}>
      {children}
    </ActiveTimerContext.Provider>
  );
}
