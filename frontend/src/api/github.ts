import { apiClient } from './client';

export interface GitHubRepoAnalysisResponse {
  url: string;
  name: string;
  description: string;
  stars: number;
  readme_available: boolean;
  analysis: string;
  error: string | null;
}

export interface GitHubBatchAnalysisResponse {
  analyses: GitHubRepoAnalysisResponse[];
  total: number;
  successful: number;
}

export const githubApi = {
  analyzeRepository: (url: string) =>
    apiClient.post<GitHubRepoAnalysisResponse>('/github/analyze', { url }),

  analyzeRepositoriesBatch: (urls: string[]) =>
    apiClient.post<GitHubBatchAnalysisResponse>('/github/analyze/batch', { urls }),
};
