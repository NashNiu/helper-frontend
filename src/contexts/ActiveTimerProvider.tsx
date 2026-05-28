import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Timer } from '../api/timer';
import { ActiveTimerContext, formatRemaining } from './ActiveTimerContext';
import type { ActiveTimerState, PomodoroMeta } from './ActiveTimerContext';
import { showSystemNotification } from '../utils/notify';

const STORAGE_KEY = 'active-timer-state';
const NOTIFIED_KEY = 'active-timer-notified-id';

interface PersistedState {
  timerId: number;
  timerName: string;
  timerDurationSeconds: number;
  timerType: string;
  timerIsPreset: boolean;
  timerCreatedAt: string;
  status: 'running' | 'paused';
  endsAt?: number;
  pausedRemaining?: number;
  pomodoro?: PomodoroMeta;
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
      created_at: p.timerCreatedAt ?? new Date(0).toISOString(),
    };
    const pomodoro = p.pomodoro as PomodoroMeta | undefined;
    if (p.status === 'running' && typeof p.endsAt === 'number') {
      const remaining = Math.max(0, Math.ceil((p.endsAt - Date.now()) / 1000));
      if (remaining <= 0) {
        return { timer, remaining: 0, status: 'done', formatted: formatRemaining(0), pomodoro };
      }
      return {
        timer,
        remaining,
        status: 'running',
        formatted: formatRemaining(remaining),
        pomodoro,
      };
    }
    if (p.status === 'paused' && typeof p.pausedRemaining === 'number') {
      const remaining = Math.max(0, Math.floor(p.pausedRemaining));
      return {
        timer,
        remaining,
        status: 'paused',
        formatted: formatRemaining(remaining),
        pomodoro,
      };
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
      timerCreatedAt: state.timer.created_at,
      status: state.status === 'running' ? 'running' : 'paused',
      pomodoro: state.pomodoro,
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

function loadNotifiedId(): number | null {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function persistNotifiedId(id: number | null) {
  try {
    if (id === null) localStorage.removeItem(NOTIFIED_KEY);
    else localStorage.setItem(NOTIFIED_KEY, String(id));
  } catch {
    /* ignore */
  }
}

function beep() {
  new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg').play().catch(() => {});
}

export default function ActiveTimerProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveTimerState | null>(() => loadPersisted());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endsAtRef = useRef<number | null>(null);
  const notifiedIdRef = useRef<number | null>(loadNotifiedId());
  // Tracks which pomodoro phase transition we've already handled to prevent duplicates
  const pomodoroTransitionKeyRef = useRef<string | null>(null);

  const clearInterval$ = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const fireDone = useCallback((state: ActiveTimerState) => {
    if (notifiedIdRef.current === state.timer.id) return;
    notifiedIdRef.current = state.timer.id;
    persistNotifiedId(state.timer.id);
    showSystemNotification({
      title: '⏱️ 计时结束',
      body: `「${state.timer.name}」计时结束！`,
      tag: `timer-${state.timer.id}`,
    });
    beep();
  }, []);

  const startTicking = useCallback(() => {
    clearInterval$();
    intervalRef.current = setInterval(() => {
      const endsAt = endsAtRef.current;
      if (endsAt === null) return;
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setActive((prev) => {
        if (!prev) return prev;
        if (remaining <= 0) {
          clearInterval$();
          const done: ActiveTimerState = {
            ...prev,
            remaining: 0,
            status: 'done',
            formatted: formatRemaining(0),
          };
          persist(done);
          // Pomodoro transitions are handled by the useEffect below
          if (!prev.pomodoro) fireDone(done);
          return done;
        }
        if (remaining === prev.remaining) return prev;
        return { ...prev, remaining, formatted: formatRemaining(remaining) };
      });
    }, 500);
  }, [clearInterval$, fireDone]);

  // Notify when a Pomodoro phase ends — no auto-transition, user must confirm
  useEffect(() => {
    if (!active || active.status !== 'done' || !active.pomodoro) return;
    const { pomodoro } = active;
    const key = `${pomodoro.phase}-${pomodoro.currentCycle}-${pomodoro.totalCycles}`;
    if (pomodoroTransitionKeyRef.current === key) return;
    pomodoroTransitionKeyRef.current = key;

    if (pomodoro.phase === 'work') {
      if (pomodoro.currentCycle >= pomodoro.totalCycles) {
        showSystemNotification({
          title: '全部完成',
          body: `${pomodoro.totalCycles} 轮番茄钟已完成，辛苦了！`,
          tag: 'pomodoro-all-done',
        });
      } else {
        showSystemNotification({
          title: '工作阶段结束',
          body: `第 ${pomodoro.currentCycle} 轮完成，确认后开始休息`,
          tag: 'pomodoro-work-done',
        });
      }
    } else {
      showSystemNotification({
        title: '休息结束',
        body: `确认后开始第 ${pomodoro.currentCycle + 1} 轮工作`,
        tag: 'pomodoro-break-done',
      });
    }
    beep();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    active?.status,
    active?.pomodoro?.phase,
    active?.pomodoro?.currentCycle,
    active?.pomodoro?.totalCycles,
  ]);

  useEffect(() => {
    if (active?.status === 'running') {
      endsAtRef.current = Date.now() + active.remaining * 1000;
      startTicking();
    } else if (active?.status === 'done' && !active.pomodoro) {
      fireDone(active);
    }
    return () => {
      clearInterval$();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(
    (timer: Timer) => {
      clearInterval$();
      notifiedIdRef.current = null;
      pomodoroTransitionKeyRef.current = null;
      persistNotifiedId(null);
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
    },
    [clearInterval$, startTicking]
  );

  const startPomodoro = useCallback(
    (workTimer: Timer, breakTimer: Timer, cycles: number) => {
      clearInterval$();
      notifiedIdRef.current = null;
      pomodoroTransitionKeyRef.current = null;
      persistNotifiedId(null);
      const remaining = workTimer.duration_seconds;
      endsAtRef.current = Date.now() + remaining * 1000;
      const state: ActiveTimerState = {
        timer: workTimer,
        remaining,
        status: 'running',
        formatted: formatRemaining(remaining),
        pomodoro: {
          totalCycles: cycles,
          currentCycle: 1,
          phase: 'work',
          workTimer,
          breakTimer,
        },
      };
      persist(state);
      setActive(state);
      startTicking();
    },
    [clearInterval$, startTicking]
  );

  const pause = useCallback(() => {
    setActive((prev) => {
      if (!prev || prev.status !== 'running') return prev;
      clearInterval$();
      endsAtRef.current = null;
      const paused: ActiveTimerState = { ...prev, status: 'paused' };
      persist(paused);
      return paused;
    });
  }, [clearInterval$]);

  const resume = useCallback(() => {
    setActive((prev) => {
      if (!prev || prev.status !== 'paused') return prev;
      endsAtRef.current = Date.now() + prev.remaining * 1000;
      const running: ActiveTimerState = { ...prev, status: 'running' };
      persist(running);
      startTicking();
      return running;
    });
  }, [startTicking]);

  const reset = useCallback(() => {
    setActive((prev) => {
      if (!prev) return prev;
      clearInterval$();
      endsAtRef.current = null;
      notifiedIdRef.current = null;
      pomodoroTransitionKeyRef.current = null;
      persistNotifiedId(null);
      const remaining = prev.timer.duration_seconds;
      const next: ActiveTimerState = {
        ...prev,
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
    pomodoroTransitionKeyRef.current = null;
    persistNotifiedId(null);
    persist(null);
    setActive(null);
  }, [clearInterval$]);

  const advancePomodoro = useCallback(() => {
    setActive((prev) => {
      if (!prev || prev.status !== 'done' || !prev.pomodoro) return prev;
      const { pomodoro } = prev;
      pomodoroTransitionKeyRef.current = null;
      notifiedIdRef.current = null;
      persistNotifiedId(null);

      let nextState: ActiveTimerState;
      if (pomodoro.phase === 'work') {
        const remaining = pomodoro.breakTimer.duration_seconds;
        nextState = {
          timer: pomodoro.breakTimer,
          remaining,
          status: 'running',
          formatted: formatRemaining(remaining),
          pomodoro: { ...pomodoro, phase: 'break' },
        };
      } else {
        const nextCycle = pomodoro.currentCycle + 1;
        const remaining = pomodoro.workTimer.duration_seconds;
        nextState = {
          timer: pomodoro.workTimer,
          remaining,
          status: 'running',
          formatted: formatRemaining(remaining),
          pomodoro: { ...pomodoro, currentCycle: nextCycle, phase: 'work' },
        };
      }
      endsAtRef.current = Date.now() + nextState.remaining * 1000;
      persist(nextState);
      startTicking();
      return nextState;
    });
  }, [startTicking]);

  return (
    <ActiveTimerContext.Provider
      value={{ active, start, startPomodoro, pause, resume, reset, clear, advancePomodoro }}
    >
      {children}
    </ActiveTimerContext.Provider>
  );
}
