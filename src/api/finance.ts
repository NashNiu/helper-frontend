import { http } from './http';

export interface FinanceRecord {
  id: number; raw_input: string; category: string;
  amount: number; note: string | null; happened_at: string; created_at: string;
}

export const financeApi = {
  getAll: (from?: string, to?: string) =>
    http.get<FinanceRecord[]>('/api/finance', { params: { from, to } }).then(r => r.data),
  create: (input: string) =>
    http.post<FinanceRecord>('/api/finance', { input }).then(r => r.data),
  remove: (id: number) => http.delete(`/api/finance/${id}`),
};
