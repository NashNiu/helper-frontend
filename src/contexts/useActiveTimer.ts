import { useContext } from 'react';
import { ActiveTimerContext } from './ActiveTimerContext';
import type { ActiveTimerContextValue } from './ActiveTimerContext';

export function useActiveTimer(): ActiveTimerContextValue {
  const ctx = useContext(ActiveTimerContext);
  if (!ctx) throw new Error('useActiveTimer must be used within ActiveTimerProvider');
  return ctx;
}
