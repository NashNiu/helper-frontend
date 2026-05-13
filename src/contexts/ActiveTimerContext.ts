import { createContext } from 'react';
import type { Timer } from '../api/timer';

export type ActiveTimerStatus = 'running' | 'paused' | 'done';

export interface ActiveTimerState {
  timer: Timer;
  remaining: number;
  status: ActiveTimerStatus;
  formatted: string;
}

export interface ActiveTimerContextValue {
  active: ActiveTimerState | null;
  start: (timer: Timer) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  clear: () => void;
}

export const ActiveTimerContext = createContext<ActiveTimerContextValue | null>(null);

export function formatRemaining(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
