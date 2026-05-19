import { createContext } from 'react';
import type { AuthUser } from '../api/auth';

export interface AuthContextValue {
  user: AuthUser | null;
  /** undefined 表示初始 me() 还没回；null 表示未登录；具体值 = 已登录。 */
  status: 'initializing' | 'authenticated' | 'unauthenticated';
  login: (identifier: string, password: string) => Promise<void>;
  register: (input: {
    username: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
