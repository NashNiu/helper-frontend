import { http } from './http';

export interface TodoImage {
  id: number;
  image_path: string;
  sort_order: number;
}
export interface Todo {
  id: number;
  content: string;
  is_done: boolean;
  images: TodoImage[];
  created_at: string;
  done_at: string | null;
}

export const todoApi = {
  getAll: () => http.get<Todo[]>('/api/todos').then((r) => r.data),
  create: (content: string, files: File[]) => {
    const fd = new FormData();
    fd.append('content', content);
    files.forEach((f) => fd.append('images', f));
    return http.post<Todo>('/api/todos', fd).then((r) => r.data);
  },
  update: (id: number, data: { content?: string; is_done?: boolean }) =>
    http.patch<Todo>(`/api/todos/${id}`, data).then((r) => r.data),
  remove: (id: number) => http.delete(`/api/todos/${id}`),
  addImages: (id: number, files: File[]) => {
    const fd = new FormData();
    files.forEach((f) => fd.append('images', f));
    return http.post<Todo>(`/api/todos/${id}/images`, fd).then((r) => r.data);
  },
  removeImage: (todoId: number, imageId: number) =>
    http.delete(`/api/todos/${todoId}/images/${imageId}`),
};
