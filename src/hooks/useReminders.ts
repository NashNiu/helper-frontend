import { useEffect, useRef, useCallback } from 'react';
import { reminderApi, Reminder } from '../api/reminder';

export function useReminders(onTrigger: (reminder: Reminder) => void) {
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const schedule = useCallback((reminder: Reminder) => {
    const delay = new Date(reminder.trigger_at).getTime() - Date.now();
    if (timersRef.current.has(reminder.id)) return;
    if (delay <= 0) {
      onTrigger(reminder);
      reminderApi.markTriggered(reminder.id).catch(() => {});
      return;
    }
    const t = setTimeout(async () => {
      onTrigger(reminder);
      await reminderApi.markTriggered(reminder.id).catch(() => {});
      timersRef.current.delete(reminder.id);
    }, delay);
    timersRef.current.set(reminder.id, t);
  }, [onTrigger]);

  const loadAndSchedule = useCallback(async () => {
    const reminders = await reminderApi.getAll(false);
    reminders.forEach(schedule);
  }, [schedule]);

  useEffect(() => {
    loadAndSchedule();
    return () => {
      timersRef.current.forEach(t => clearTimeout(t));
    };
  }, [loadAndSchedule]);

  return { scheduleOne: schedule };
}
