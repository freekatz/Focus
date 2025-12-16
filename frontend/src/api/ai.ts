import { apiClient } from './client';

interface SummarizeResponse {
  summary: string;
  content_type: string;
}

export interface PromptResponse {
  prompt: string;
  is_default: boolean;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
}

export const aiApi = {
  summarize: (entryId: number, forceRefresh: boolean = false) =>
    apiClient.post<SummarizeResponse>(`/ai/summarize/${entryId}?force_refresh=${forceRefresh}`),

  testConnection: () =>
    apiClient.post<TestConnectionResponse>('/ai/test'),

  getPrompt: () =>
    apiClient.get<PromptResponse>('/ai/prompt'),

  updatePrompt: (prompt: string) =>
    apiClient.put<PromptResponse>('/ai/prompt', { prompt }),

  resetPrompt: () =>
    apiClient.post<PromptResponse>('/ai/prompt/reset'),
};
