// Backend entry status enum values
export type EntryStatus = 'unread' | 'interested' | 'trash' | 'favorite' | 'archived';

// Unified task processing status
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

// Backward-compatible alias
export type TranslationStatus = TaskStatus;

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
  ai_processed_at: string | null;
  task_interpret_status: TaskStatus | null;
  task_translation_status: TaskStatus | null;
  user_notes: string | null;
  exported_to_zotero: boolean;
  fetched_at: string;
  created_at: string;
  rss_source_name: string | null;
  translated_abstract: string | null;
  brief_summary: string | null;
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
