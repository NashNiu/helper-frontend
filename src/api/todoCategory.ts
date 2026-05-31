import { http } from './http';

export interface TodoCategory {
  id: number;
  name: string;
}

export const todoCategoryApi = {
  getAll: (): Promise<TodoCategory[]> =>
    http.get<TodoCategory[]>('/api/todo-categories').then((r) => r.data),

  create: (name: string): Promise<TodoCategory> =>
    http.post<TodoCategory>('/api/todo-categories', { name }).then((r) => r.data),

  rename: (id: number, name: string): Promise<TodoCategory> =>
    http.patch<TodoCategory>(`/api/todo-categories/${id}`, { name }).then((r) => r.data),

  remove: (id: number): Promise<void> =>
    http.delete(`/api/todo-categories/${id}`).then(() => undefined),
};
