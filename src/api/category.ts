import { http } from './http';

export interface Category {
  id: number;
  name: string;
  is_builtin: boolean;
  parent_id: number | null;
}

export interface CategoryTree extends Omit<Category, 'parent_id'> {
  parent_id: null;
  children: Array<Omit<Category, 'parent_id'> & { parent_id: number }>;
}

export const categoryApi = {
  getAll: () =>
    http.get<CategoryTree[]>('/api/categories').then((r) => r.data),
  create: (name: string, parent_id?: number) =>
    http.post<Category>('/api/categories', { name, parent_id }).then((r) => r.data),
  rename: (id: number, name: string) =>
    http.patch<Category>(`/api/categories/${id}`, { name }).then((r) => r.data),
  remove: (id: number) => http.delete(`/api/categories/${id}`),
};
