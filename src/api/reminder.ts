import { http } from './http';

export interface Reminder {
  id: number;
  message: string;
  trigger_at: string;
  is_triggered: boolean;
  created_at: string;
}

export const reminderApi = {
  getAll: (triggered?: boolean) =>
    http.get<Reminder[]>('/api/reminders', { params: triggered !== undefined ? { triggered } : {} }).then(r => r.data),
  create: (input: string) =>
    http.post<Reminder>('/api/reminders', { input }).then(r => r.data),
  markTriggered: (id: number) =>
    http.patch<Reminder>(`/api/reminders/${id}/triggered`).then(r => r.data),
  update: (id: number, data: { message?: string; trigger_at?: string }) =>
    http.patch<Reminder>(`/api/reminders/${id}`, data).then(r => r.data),
  remove: (id: number) => http.delete(`/api/reminders/${id}`),
};
