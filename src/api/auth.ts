import { http } from './http';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  created_at: string;
}

export interface LoginResult {
  access_token: string;
  user: AuthUser;
}

export const authApi = {
  sendVerificationCode: (email: string) =>
    http
      .post('/api/auth/send-verification-code', { email })
      .then(() => undefined),

  register: (data: {
    username: string;
    email: string;
    password: string;
    code: string;
  }) => http.post<LoginResult>('/api/auth/register', data).then((r) => r.data),

  login: (identifier: string, password: string) =>
    http
      .post<LoginResult>('/api/auth/login', { identifier, password })
      .then((r) => r.data),

  me: () => http.get<AuthUser>('/api/auth/me').then((r) => r.data),

  forgotPassword: (email: string) =>
    http.post('/api/auth/forgot-password', { email }).then(() => undefined),

  resetPassword: (token: string, password: string) =>
    http
      .post('/api/auth/reset-password', { token, password })
      .then(() => undefined),
};
