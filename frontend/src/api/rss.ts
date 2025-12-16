import { apiClient } from './client';

export interface RssParseResponse {
  title: string;
  description?: string;
  url: string;
  feed_url: string;
  icon_url?: string;
}

export interface RssCreateRequest {
  name: string;
  url: string;
  category: string;
  description?: string;
  website_url?: string;
}

export interface RssSource {
  id: number;
  name: string;
  url: string;
  category: string;
  description?: string;
  icon_url?: string;
  created_at: string;
}

export interface RssFetchResponse {
  success: boolean;
  fetched_count: number;
  new_count: number;
  error?: string;
}

export interface RssDeleteResponse {
  source_name: string;
  deleted_entries: number;
  preserved_entries: number;
}

export interface RssUpdateRequest {
  name?: string;
  url?: string;
  category?: string;
  description?: string;
  website_url?: string;
  is_active?: boolean;
  fetch_interval?: number;
}

export const rssApi = {
  // Parse RSS URL to extract feed info
  parseUrl: (url: string) =>
    apiClient.post<RssParseResponse>('/rss/validate', { url }),

  // Create a new RSS source
  create: (data: RssCreateRequest) =>
    apiClient.post<RssSource>('/rss', data),

  // Manually trigger fetch for a specific RSS source
  fetch: (rssId: number) =>
    apiClient.post<RssFetchResponse>(`/rss/${rssId}/fetch`),

  // Update RSS source
  update: (rssId: number, data: RssUpdateRequest) =>
    apiClient.put<RssSource>(`/rss/${rssId}`, data),

  // Delete RSS source (preserves favorite/interested entries)
  delete: (rssId: number) =>
    apiClient.delete(`/rss/${rssId}`),
};
