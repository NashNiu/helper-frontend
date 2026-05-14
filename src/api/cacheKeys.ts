/**
 * useResource 缓存 key 集中定义；散落各处的字符串容易拼错导致缓存命中失败。
 */
export const CACHE_KEYS = {
  reminders: 'reminders:all',
  todos: 'todos:all',
  finance: (from: string) => `finance:since:${from}`,
  timers: 'timers:all',
} as const;
