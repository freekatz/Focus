// Backend entry status enum values
export type EntryStatus = 'unread' | 'interested' | 'trash' | 'favorite' | 'archived';

// Backend entry response type
export interface Entry {
  id: number;
  rss_source_id: number;
  title: string;
  link: string;
  author: string | null;
  published_at: string | null;
  content: string | null;
  content_type: string;
  status: EntryStatus;
  is_read: boolean;
  marked_at: string | null;
  ai_summary: string | null;
  ai_content_type: string | null;
  ai_processed_at: string | null;
  user_notes: string | null;
  exported_to_zotero: boolean;
  fetched_at: string;
  created_at: string;
  rss_source_name: string | null;
}

export interface EntryListResponse {
  items: Entry[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface EntryStatsResponse {
  total: number;
  by_status: Record<string, number>;
  today_count: number;
  unread_count: number;
}

// Frontend article type (for display, mapped from Entry)
export interface Article {
  id: string;
  title: string;
  source: string;
  author: string;
  snippet: string;
  content: string;
  timestamp: string;
  status: 'inbox' | 'saved' | 'discarded';
  tags: string[];
  summary?: string;
  readTime?: string;
  isFavorite?: boolean;
  url?: string;
  // Keep original entry data for API calls
  _entry?: Entry;
}
