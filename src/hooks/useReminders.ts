import { useEffect, useRef, useCallback } from 'react';
import { reminderApi } from '../api/reminder';
import type { Reminder } from '../api/reminder';

// Browser setTimeout delay is stored as a 32-bit signed int; anything over 2^31-1 ms
// (~24.8 days) wraps to 0 and fires immediately. Split long delays into segments.
const MAX_DELAY = 2_147_483_647; // 2^31 - 1

export function useReminders(onTrigger: (reminder: Reminder) => void) {
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  // triggerAtRef maps reminder id → scheduled fire time (ms since epoch).
  // fireRef maps reminder id → the function that fires that reminder.
  // Both are used by the visibilitychange handler to immediately fire reminders
  // whose deadline passed while the browser was throttling or freezing JS timers.
  const triggerAtRef = useRef<Map<number, number>>(new Map());
  const fireRef = useRef<Map<number, () => void>>(new Map());
  const isMountedRef = useRef(true);

  const schedule = useCallback(
    (reminder: Reminder) => {
      // Already in flight — skip to avoid duplicate timeouts
      if (timersRef.current.has(reminder.id)) return;

      const fire = () => {
        if (!isMountedRef.current) return;
        onTrigger(reminder);
        reminderApi.markTriggered(reminder.id).catch(() => {});
        timersRef.current.delete(reminder.id);
        triggerAtRef.current.delete(reminder.id);
        fireRef.current.delete(reminder.id);
      };

      const triggerAt = new Date(reminder.trigger_at).getTime();
      if (Number.isNaN(triggerAt)) return;

      triggerAtRef.current.set(reminder.id, triggerAt);
      fireRef.current.set(reminder.id, fire);

      const armNext = () => {
        if (!isMountedRef.current) return;
        const remaining = triggerAt - Date.now();
        if (remaining <= 0) {
          fire();
          return;
        }
        const delay = Math.min(remaining, MAX_DELAY);
        const handle = setTimeout(() => {
          if (remaining > MAX_DELAY) armNext();
          else fire();
        }, delay);
        timersRef.current.set(reminder.id, handle);
      };

      armNext();
    },
    [onTrigger]
  );

  const reschedule = useCallback(
    (reminder: Reminder) => {
      const existing = timersRef.current.get(reminder.id);
      if (existing) {
        clearTimeout(existing);
        timersRef.current.delete(reminder.id);
        triggerAtRef.current.delete(reminder.id);
        fireRef.current.delete(reminder.id);
      }
      schedule(reminder);
    },
    [schedule]
  );

  const loadAndSchedule = useCallback(async () => {
    const reminders = await reminderApi.getAll(false);
    reminders.forEach(schedule);
  }, [schedule]);

  useEffect(() => {
    isMountedRef.current = true;
    const timers = timersRef.current;
    const triggerAt = triggerAtRef.current;
    const fire = fireRef.current;
    loadAndSchedule();
    return () => {
      isMountedRef.current = false;
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      triggerAt.clear();
      fire.clear();
    };
  }, [loadAndSchedule]);

  // When the page becomes visible after the browser throttled or froze JS execution,
  // immediately fire any reminders whose deadline already passed.
  useEffect(() => {
    const onVisible = () => {
      if (document.hidden) return;
      const now = Date.now();
      triggerAtRef.current.forEach((triggerAt, id) => {
        if (triggerAt > now) return;
        const handle = timersRef.current.get(id);
        if (handle !== undefined) clearTimeout(handle);
        timersRef.current.delete(id);
        const fire = fireRef.current.get(id);
        if (fire) fire();
      });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  return { scheduleOne: schedule, rescheduleOne: reschedule };
}
