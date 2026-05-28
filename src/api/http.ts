import axios, { AxiosError } from 'axios';

/**
 * 全局 axios 实例。所有 api/*.ts 都从这里 import 后使用，避免重复散落 baseURL 与拦截器配置。
 */
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? '',
  timeout: 30_000,
});

export const TOKEN_STORAGE_KEY = 'helper.auth.token';

/** 仅供 AuthContext 在登录/登出时同步给 axios，不要散落到业务代码里读 localStorage。 */
export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* 隐私模式或配额异常时静默忽略 */
  }
}

/** 收到 401 时由 http 派发，AuthProvider 监听后会清账号、跳登录页。 */
export const UNAUTHORIZED_EVENT = 'helper:auth:unauthorized';

http.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
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
      return d.message.filter((m) => typeof m === 'string').join('；') || fallback;
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
  (res) => res,
  (err: AxiosError) => {
    const status = err.response?.status ?? 0;
    if (status === 401) {
      // /auth/login 自身的 401 是"密码错"，不应触发全局登出
      const url = err.config?.url ?? '';
      if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
        setStoredToken(null);
        try {
          window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
        } catch {
          /* SSR 或无 window 时静默 */
        }
      }
    }
    if (err.code === 'ECONNABORTED' || err.message === 'Network Error') {
      throw new ApiError('网络请求超时，请检查连接后重试', status, err);
    }
    const fallback = status >= 500 ? '服务器开了个小差，请稍后再试' : '请求失败';
    throw new ApiError(extractMessage(err.response?.data, fallback), status, err);
  }
);
