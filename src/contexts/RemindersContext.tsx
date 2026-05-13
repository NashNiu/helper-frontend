import { createContext } from 'react';
import type { Reminder } from '../api/reminder';

export interface RemindersContextValue {
  scheduleOne: (reminder: Reminder) => void;
}

export const RemindersContext = createContext<RemindersContextValue | null>(null);
