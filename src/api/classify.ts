import { http } from './http';

export type AssistantType = 'reminder' | 'timer' | 'todo' | 'finance';

export const classifyApi = {
  classify: (input: string) =>
    http.post<{ types: AssistantType[] }>('/api/classify', { input }).then(r => r.data),
};
