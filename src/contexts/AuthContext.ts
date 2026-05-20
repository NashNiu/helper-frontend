import { createContext } from 'react';
import type { AuthUser } from '../api/auth';

export interface AuthContextValue {
  user: AuthUser | null;
  status: 'initializing' | 'authenticated' | 'unauthenticated';
  login: (identifier: string, password: string) => Promise<void>;
  register: (input: {
    username: string;
    email: string;
    password: string;
    code: string;
  }) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
