import { createContext } from 'react';
import type { Timer } from '../api/timer';

export type ActiveTimerStatus = 'running' | 'paused' | 'done';

export interface PomodoroMeta {
  totalCycles: number;
  currentCycle: number;
  phase: 'work' | 'break';
  workTimer: Timer;
  breakTimer: Timer;
}

export interface ActiveTimerState {
  timer: Timer;
  remaining: number;
  status: ActiveTimerStatus;
  formatted: string;
  pomodoro?: PomodoroMeta;
}

export interface ActiveTimerContextValue {
  active: ActiveTimerState | null;
  start: (timer: Timer) => void;
  startPomodoro: (workTimer: Timer, breakTimer: Timer, cycles: number) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  clear: () => void;
  advancePomodoro: () => void;
}

export const ActiveTimerContext = createContext<ActiveTimerContextValue | null>(null);

export function formatRemaining(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
