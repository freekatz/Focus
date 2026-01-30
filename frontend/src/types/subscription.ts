// Backend RSS category enum
export type RssCategory = 'blog' | 'community' | 'paper' | 'social' | 'news_podcast' | 'other';

// Backend subscription response
export interface Subscription {
  id: number;
  rss_source_id: number;
  is_active: boolean;
  custom_refresh_time: string | null;  // 每日刷新时间，如 "08:00"
  created_at: string;
  rss_source_name: string;
  rss_source_url: string;
  rss_source_category: RssCategory;
  rss_source_description: string | null;
  entry_count: number;
  unread_count: number;
  last_fetched_at: string | null;
  last_fetch_status: string;
}

// 可用的刷新时间选项
export const REFRESH_TIME_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: '06:00', label: '6:00 AM' },
  { value: '08:00', label: '8:00 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '20:00', label: '8:00 PM' },
] as const;

export interface SubscriptionListResponse {
  items: Subscription[];
  total: number;
}

// Backend RSS market item
export interface RssMarketItem {
  id: number;
  name: string;
  url: string;
  website_url: string | null;
  description: string | null;
  category: RssCategory;
  icon_url: string | null;
  entry_count: number;
  is_subscribed: boolean;
}

export interface RssMarketListResponse {
  items: RssMarketItem[];
  total: number;
}

// Frontend Feed type (for display, mapped from Subscription/RssMarketItem)
export interface Feed {
  id: string;
  name: string;
  url: string;
  category: string;
  subscribed: boolean;
  description?: string;
  homepage?: string;
  refreshTime?: string;  // 每日刷新时间，如 "08:00" 或 "default"
  // Keep original data for API calls
  _subscription?: Subscription;
  _marketItem?: RssMarketItem;
}

// All category options for filters - use with i18n: t(`categories.${category}`)
export const CATEGORY_OPTIONS: RssCategory[] = ['blog', 'community', 'paper', 'social', 'news_podcast', 'other'];
