import { useEffect, useRef, useCallback } from 'react';
import { reminderApi } from '../api/reminder';
import type { Reminder } from '../api/reminder';

// 浏览器 setTimeout 的 delay 用 32 位有符号整数存储，超过 2^31-1 ms（约 24.8 天）
// 会被截断为 0 并立即触发。当 AI 把"明年某天"解析为 trigger_at 时就会立即误报。
// 这里把超长延迟分段：先睡 MAX_DELAY，醒来再重新调度直到真正到点。
const MAX_DELAY = 2_147_483_647; // 2^31 - 1

export function useReminders(onTrigger: (reminder: Reminder) => void) {
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const isMountedRef = useRef(true);

  const schedule = useCallback((reminder: Reminder) => {
    // 已经在排程中：跳过，避免重复 setTimeout
    if (timersRef.current.has(reminder.id)) return;

    const fire = () => {
      if (!isMountedRef.current) return;
      onTrigger(reminder);
      reminderApi.markTriggered(reminder.id).catch(() => {});
      timersRef.current.delete(reminder.id);
    };

    const triggerAt = new Date(reminder.trigger_at).getTime();
    if (Number.isNaN(triggerAt)) return; // 非法时间：直接放弃

    const armNext = () => {
      if (!isMountedRef.current) return;
      const remaining = triggerAt - Date.now();
      if (remaining <= 0) {
        fire();
        return;
      }
      const delay = Math.min(remaining, MAX_DELAY);
      const handle = setTimeout(() => {
        // 不是真到点：补一段后继续。是到点：触发。
        if (remaining > MAX_DELAY) armNext();
        else fire();
      }, delay);
      timersRef.current.set(reminder.id, handle);
    };

    armNext();
  }, [onTrigger]);

  const loadAndSchedule = useCallback(async () => {
    const reminders = await reminderApi.getAll(false);
    reminders.forEach(schedule);
  }, [schedule]);

  useEffect(() => {
    isMountedRef.current = true;
    const timers = timersRef.current;
    loadAndSchedule();
    return () => {
      isMountedRef.current = false;
      timers.forEach(t => clearTimeout(t));
      timers.clear();
    };
  }, [loadAndSchedule]);

  return { scheduleOne: schedule };
}
