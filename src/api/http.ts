import axios, { AxiosError } from 'axios';

/**
 * 全局 axios 实例。所有 api/*.ts 都从这里 import 后使用，避免重复散落 baseURL 与拦截器配置。
 */
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? '',
  timeout: 30_000,
});

/**
 * 把后端 NestJS 的 { message, statusCode } 错误体解出来变成 ApiError 抛出，
 * 上层组件能拿到具体提示，不再只能显示"失败"。
 */
export class ApiError extends Error {
  readonly status: number;
  readonly original: unknown;
  constructor(message: string, status: number, original?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.original = original;
  }
}

function extractMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object') {
    const d = data as { message?: unknown };
    if (Array.isArray(d.message)) {
      return d.message.filter(m => typeof m === 'string').join('；') || fallback;
    }
    if (typeof d.message === 'string' && d.message.trim()) return d.message;
  }
  return fallback;
}

/** 从未知 err 取出可显示的消息，未知错误兜底为 fallback。 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

http.interceptors.response.use(
  res => res,
  (err: AxiosError) => {
    const status = err.response?.status ?? 0;
    if (err.code === 'ECONNABORTED' || err.message === 'Network Error') {
      throw new ApiError('网络请求超时，请检查连接后重试', status, err);
    }
    const fallback = status >= 500 ? '服务器开了个小差，请稍后再试' : '请求失败';
    throw new ApiError(extractMessage(err.response?.data, fallback), status, err);
  },
);
