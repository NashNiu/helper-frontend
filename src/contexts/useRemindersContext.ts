import { useContext } from 'react';
import { RemindersContext } from './RemindersContext';
import type { RemindersContextValue } from './RemindersContext';

export function useRemindersContext(): RemindersContextValue {
  const ctx = useContext(RemindersContext);
  if (!ctx) throw new Error('useRemindersContext must be used within RemindersProvider');
  return ctx;
}
