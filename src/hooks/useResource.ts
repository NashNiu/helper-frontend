import { useEffect, useState, useCallback } from 'react';

/**
 * 轻量级共享缓存 hook：
 *   - 同一个 key 在多个组件之间共享数据，切页不重新拉
 *   - 默认有 30s 的"新鲜期"，过期才会重新 fetch
 *   - 暴露 `mutate(key, value)` 让其他地方主动更新缓存（如创建后插入新行）
 *   - 暴露 `invalidate(key)` 标记缓存失效，下一次 useResource 触发重拉
 */

interface CacheEntry<T> {
  data?: T;
  error?: unknown;
  fetchedAt: number;
  promise?: Promise<T>;
  listeners: Set<() => void>;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getOrCreate<T>(key: string): CacheEntry<T> {
  let entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) {
    entry = { fetchedAt: 0, listeners: new Set() };
    cache.set(key, entry);
  }
  return entry;
}

function notify(entry: CacheEntry<unknown>): void {
  entry.listeners.forEach((fn) => {
    fn();
  });
}

export function mutate<T>(key: string, data: T): void {
  const entry = getOrCreate<T>(key);
  entry.data = data;
  entry.error = undefined;
  entry.fetchedAt = Date.now();
  notify(entry);
}

export function invalidate(key: string): void {
  const entry = cache.get(key);
  if (!entry) return;
  entry.fetchedAt = 0;
  notify(entry);
}

/**
 * 切换登录账号或登出时调用：清空所有缓存数据，避免上一位用户的列表泄露到下一位。
 * 保留 listeners 让仍挂载的组件下次拉取新用户的数据。
 */
export function invalidateAll(): void {
  for (const entry of cache.values()) {
    entry.data = undefined;
    entry.error = undefined;
    entry.fetchedAt = 0;
    notify(entry);
  }
}

export interface UseResourceOptions {
  /** 缓存新鲜期，毫秒，默认 30s。0 表示永不自动失效（仍可手动 invalidate） */
  ttlMs?: number;
}

interface UseResourceResult<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useResource<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseResourceOptions = {}
): UseResourceResult<T> {
  const ttl = options.ttlMs ?? 30_000;

  // 初值从 cache 同步取出（lazy init 不触发额外 render）
  const [data, setData] = useState<T | undefined>(() => getOrCreate<T>(key).data);
  const [error, setError] = useState<unknown>(() => getOrCreate<T>(key).error);
  const [loading, setLoading] = useState<boolean>(() => {
    const e = getOrCreate<T>(key);
    return !e.data && !e.error;
  });

  const refresh = useCallback(async () => {
    const e = getOrCreate<T>(key);
    if (e.promise) {
      await e.promise;
      return;
    }
    const p = (async () => {
      try {
        const result = await fetcher();
        e.data = result;
        e.error = undefined;
        e.fetchedAt = Date.now();
        notify(e);
        return result;
      } catch (err) {
        e.error = err;
        notify(e);
        throw err;
      } finally {
        e.promise = undefined;
      }
    })();
    e.promise = p;
    notify(e); // loading -> true
    await p.catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // 订阅缓存 + 必要时触发首次 fetch
  useEffect(() => {
    const e = getOrCreate<T>(key);
    const sync = () => {
      setData(e.data);
      setError(e.error);
      setLoading(Boolean(e.promise));
      const fresh = e.data !== undefined && (ttl === 0 || Date.now() - e.fetchedAt < ttl);
      if (!fresh && !e.promise) {
        void refresh();
      }
    };
    e.listeners.add(sync);

    const isFresh = e.data !== undefined && (ttl === 0 || Date.now() - e.fetchedAt < ttl);
    if (!isFresh && !e.promise) {
      void refresh();
    }
    return () => {
      e.listeners.delete(sync);
    };
  }, [key, ttl, refresh]);

  return { data, error, loading, refresh };
}
