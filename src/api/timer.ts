import axios from 'axios';

export interface Timer {
  id: number;
  name: string;
  duration_seconds: number;
  type: string;
  is_preset: boolean;
}

export const timerApi = {
  getAll: () => axios.get<Timer[]>('/api/timers').then(r => r.data),
  create: (name: string, duration_seconds: number) =>
    axios.post<Timer>('/api/timers', { name, duration_seconds }).then(r => r.data),
  createFromText: (input: string) =>
    axios.post<Timer>('/api/timers/parse', { input }).then(r => r.data),
  remove: (id: number) => axios.delete(`/api/timers/${id}`),
};
