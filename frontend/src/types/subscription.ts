// Backend RSS category enum
export type RssCategory = 'blog' | 'community' | 'paper' | 'social' | 'news_podcast' | 'other';

// Backend subscription response
export interface Subscription {
  id: number;
  rss_source_id: number;
  is_active: boolean;
  custom_fetch_interval: number | null;
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
  refreshRate?: string;
  // Keep original data for API calls
  _subscription?: Subscription;
  _marketItem?: RssMarketItem;
}

// Category display mapping (unified simple labels)
export const CATEGORY_DISPLAY: Record<RssCategory, string> = {
  blog: 'Blog',
  community: 'Community',
  paper: 'Research',
  social: 'Social',
  news_podcast: 'News',
  other: 'Other',
};
