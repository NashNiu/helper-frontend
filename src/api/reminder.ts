import axios from 'axios';

export interface Reminder {
  id: number;
  message: string;
  trigger_at: string;
  is_triggered: boolean;
  created_at: string;
}

export const reminderApi = {
  getAll: (triggered?: boolean) =>
    axios.get<Reminder[]>('/api/reminders', { params: triggered !== undefined ? { triggered } : {} }).then(r => r.data),
  create: (input: string) =>
    axios.post<Reminder>('/api/reminders', { input }).then(r => r.data),
  markTriggered: (id: number) =>
    axios.patch<Reminder>(`/api/reminders/${id}/triggered`).then(r => r.data),
  remove: (id: number) => axios.delete(`/api/reminders/${id}`),
};
