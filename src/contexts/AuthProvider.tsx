import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getStoredToken,
  setStoredToken,
  UNAUTHORIZED_EVENT,
} from '../api/http';
import { authApi, type AuthUser } from '../api/auth';
import { invalidateAll } from '../hooks/useResource';
import { AuthContext, type AuthContextValue } from './AuthContext';

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthContextValue['status']>(
    () => (getStoredToken() ? 'initializing' : 'unauthenticated'),
  );

  /**
   * 启动时如果有 token，拉一次 /auth/me 确认有效。
   * 失败会通过 http 拦截器的 401 事件统一走 logout。
   */
  useEffect(() => {
    if (status !== 'initializing') return;
    let cancelled = false;
    authApi
      .me()
      .then((u) => {
        if (cancelled) return;
        setUser(u);
        setStatus('authenticated');
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
        setStoredToken(null);
        setStatus('unauthenticated');
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  const performLogout = useCallback(() => {
    setStoredToken(null);
    setUser(null);
    invalidateAll();
    setStatus('unauthenticated');
  }, []);

  useEffect(() => {
    const onUnauthorized = () => {
      performLogout();
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    };
  }, [performLogout]);

  const login = useCallback(async (identifier: string, password: string) => {
    const result = await authApi.login(identifier, password);
    setStoredToken(result.access_token);
    invalidateAll();
    setUser(result.user);
    setStatus('authenticated');
  }, []);

  const register = useCallback(
    async (input: { username: string; email: string; password: string }) => {
      const result = await authApi.register(input);
      setStoredToken(result.access_token);
      invalidateAll();
      setUser(result.user);
      setStatus('authenticated');
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      login,
      register,
      logout: performLogout,
    }),
    [user, status, login, register, performLogout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
