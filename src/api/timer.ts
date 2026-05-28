import { http } from './http';

export interface Timer {
  id: number;
  name: string;
  duration_seconds: number;
  type: string;
  is_preset: boolean;
  created_at: string;
}

export const timerApi = {
  getAll: () => http.get<Timer[]>('/api/timers').then((r) => r.data),
  create: (name: string, duration_seconds: number) =>
    http.post<Timer>('/api/timers', { name, duration_seconds }).then((r) => r.data),
  createFromText: (input: string) =>
    http.post<Timer>('/api/timers/parse', { input }).then((r) => r.data),
  remove: (id: number) => http.delete(`/api/timers/${id}`),
};
