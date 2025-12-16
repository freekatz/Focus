import { apiClient } from './client';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export interface ZoteroTestResponse {
  success: boolean;
  message: string;
}

export interface ZoteroExportResponse {
  success: boolean;
  zotero_key?: string;
  message: string;
}

export interface ZoteroConfigResponse {
  default_collection: string;
  configured: boolean;
}

export interface ShareResponse {
  share_id: string;
  share_url: string;
  expires_at?: string;
}

export const exportApi = {
  // Zotero
  testZotero: () =>
    apiClient.post<ZoteroTestResponse>('/export/zotero/test'),

  getZoteroConfig: () =>
    apiClient.get<ZoteroConfigResponse>('/export/zotero/config'),

  exportToZotero: (entryId: number, collection?: string) =>
    apiClient.post<ZoteroExportResponse>(`/export/zotero/${entryId}`, { collection }),

  batchExportToZotero: (entryIds: number[], collection?: string) =>
    apiClient.post<ZoteroExportResponse>('/export/zotero/batch', { entry_ids: entryIds, collection }),

  // Share
  createShare: (entryIds: number[], description?: string, expiresInDays?: number) =>
    apiClient.post<ShareResponse>('/share', {
      entry_ids: entryIds,
      description,
      expires_in_days: expiresInDays
    }),

  // Personal RSS Feed URL (constructs URL directly, no API call)
  getRssFeedUrl: (type: 'all' | 'interested' | 'favorite' = 'interested', days = 7) =>
    `${API_BASE_URL}/export/rss?type=${type}&days=${days}`,
};
