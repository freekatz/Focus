import { apiClient } from './client';
import type { Entry } from '../types';

export interface ShareDetailResponse {
  share_code: string;
  share_type: 'entries' | 'text';
  title: string | null;
  description: string | null;
  entries: Entry[] | null;
  text_content: string | null;
  created_at: string;
  expires_at: string | null;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const shareApi = {
  // Get share by code (public, no auth required)
  getShare: async (code: string): Promise<ShareDetailResponse> => {
    const response = await fetch(`${API_BASE_URL}/share/${code}`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Share not found');
      }
      if (response.status === 410) {
        throw new Error('Share has expired');
      }
      throw new Error('Failed to load share');
    }
    return response.json();
  },
};
