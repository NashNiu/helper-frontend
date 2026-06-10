import { http } from './http';
import type { Category } from './category';

export interface CategoryRel {
  id: number;
  name: string;
  parent_id: number | null;
  parent: { id: number; name: string } | null;
}

export interface FinanceRecord {
  id: number;
  raw_input: string;
  category: string;
  sub_category: string | null;
  category_id: number;
  category_rel: CategoryRel | null;
  amount: number;
  note: string | null;
  happened_at: string;
  created_at: string;
  image_path: string | null;
}

export interface ParsedFinanceDraft {
  category: string;
  sub_category: string;
  amount: number;
  note: string | null;
  happened_at: string;
  suggested_category_id: number;
}

export interface FromImageRecordInput {
  category_id: number;
  amount: number;
  note: string | null;
  happened_at: string;
}

export const financeApi = {
  getAll: (from?: number, to?: number) =>
    http.get<FinanceRecord[]>('/api/finance', { params: { from, to } }).then((r) => r.data),
  create: (input: string) =>
    http
      .post<{ records: FinanceRecord[]; new_categories: Category[] }>('/api/finance', { input })
      .then((r) => r.data),
  update: (
    id: number,
    data: {
      amount?: number;
      note?: string | null;
      happened_at?: string;
      category_id?: number;
    }
  ) => http.patch<FinanceRecord>(`/api/finance/${id}`, data).then((r) => r.data),
  remove: (id: number) => http.delete(`/api/finance/${id}`),

  parseImage: (file: File) => {
    const fd = new FormData();
    fd.append('image', file);
    return http
      .post<{ relevant: boolean; message?: string; records: ParsedFinanceDraft[] }>(
        '/api/finance/parse-image',
        fd
      )
      .then((r) => r.data);
  },

  createFromImage: (file: File, records: FromImageRecordInput[]) => {
    const fd = new FormData();
    fd.append('image', file);
    fd.append('records', JSON.stringify(records));
    return http
      .post<{ records: FinanceRecord[] }>('/api/finance/from-image', fd)
      .then((r) => r.data);
  },
};
