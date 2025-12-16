import { apiClient } from './client';
import type { Entry, EntryListResponse, EntryStatus, EntryStatsResponse } from '../types';

interface ListEntriesParams {
  status?: EntryStatus;
  rss_source_id?: number;
  category?: string;
  period?: 'today' | 'past';
  is_read?: boolean;
  page?: number;
  page_size?: number;
}

export const entriesApi = {
  list: (params: ListEntriesParams = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, String(value));
    });
    const query = searchParams.toString();
    return apiClient.get<EntryListResponse>(`/entries${query ? `?${query}` : ''}`);
  },

  getUnread: (page = 1, pageSize = 20) =>
    apiClient.get<EntryListResponse>(`/entries/unread?page=${page}&page_size=${pageSize}`),

  getById: (id: number) =>
    apiClient.get<Entry>(`/entries/${id}`),

  updateStatus: (id: number, status: EntryStatus) =>
    apiClient.patch<Entry>(`/entries/${id}/status`, { status }),

  batchUpdateStatus: (ids: number[], status: EntryStatus) =>
    apiClient.post<{ updated_count: number }>('/entries/batch/status', { ids, status }),

  markAsRead: (id: number) =>
    apiClient.patch<Entry>(`/entries/${id}/read`, {}),

  batchMarkAsRead: (ids: number[]) =>
    apiClient.post<{ updated_count: number }>('/entries/batch/read', { ids }),

  updateNotes: (id: number, notes: string | null) =>
    apiClient.patch<Entry>(`/entries/${id}/notes`, { notes }),

  search: (q: string, params: { status?: EntryStatus; page?: number; page_size?: number } = {}) => {
    const searchParams = new URLSearchParams({ q });
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, String(value));
    });
    return apiClient.get<EntryListResponse>(`/entries/search?${searchParams}`);
  },

  getStats: () =>
    apiClient.get<EntryStatsResponse>('/entries/stats'),

  shuffleUnread: () =>
    apiClient.post<{ shuffled_count: number }>('/entries/unread/shuffle', {}),
};
