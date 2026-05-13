import axios from 'axios';

export type AssistantType = 'reminder' | 'timer' | 'todo' | 'finance';

export const classifyApi = {
  classify: (input: string) =>
    axios.post<{ type: AssistantType }>('/api/classify', { input }).then(r => r.data),
};
