import type { Entry, Article, EntryStatus, Subscription, RssMarketItem, Feed, RssCategory } from '../types';
import { formatRelativeTime, estimateReadTime, stripHtml, truncateText, formatAuthors } from './formatters';
import { CATEGORY_DISPLAY } from '../types/subscription';

/**
 * Maps backend Entry to frontend Article for display
 */
export function mapEntryToArticle(entry: Entry): Article {
  const content = entry.content || '';
  const plainContent = stripHtml(content);

  return {
    id: String(entry.id),
    title: entry.title,
    source: entry.rss_source_name || 'Unknown Source',
    author: formatAuthors(entry.author),
    snippet: truncateText(plainContent, 200),
    content: content,
    timestamp: formatRelativeTime(entry.published_at || entry.fetched_at),
    status: mapBackendStatusToFrontend(entry.status),
    tags: [], // Backend doesn't have tags - could derive from category
    summary: entry.ai_summary || undefined,
    readTime: estimateReadTime(content),
    isFavorite: entry.status === 'favorite',
    url: entry.link || undefined,
    _entry: entry,
  };
}

/**
 * Maps backend status to frontend status
 */
export function mapBackendStatusToFrontend(
  status: EntryStatus
): 'inbox' | 'saved' | 'discarded' {
  switch (status) {
    case 'unread':
      return 'inbox';
    case 'interested':
    case 'favorite':
    case 'archived':
      return 'saved';
    case 'trash':
      return 'discarded';
    default:
      return 'inbox';
  }
}

/**
 * Maps frontend action to backend status
 */
export function mapActionToBackendStatus(
  action: 'save' | 'discard' | 'favorite'
): EntryStatus {
  switch (action) {
    case 'save':
      return 'interested';
    case 'discard':
      return 'trash';
    case 'favorite':
      return 'favorite';
  }
}

/**
 * Maps backend Subscription to frontend Feed
 */
export function mapSubscriptionToFeed(subscription: Subscription): Feed {
  return {
    id: String(subscription.id),
    name: subscription.rss_source_name,
    url: subscription.rss_source_url,
    category: CATEGORY_DISPLAY[subscription.rss_source_category] || 'Other',
    subscribed: true,
    description: subscription.rss_source_description || undefined,
    refreshRate: subscription.custom_fetch_interval
      ? formatFetchInterval(subscription.custom_fetch_interval)
      : 'Default',
    _subscription: subscription,
  };
}

/**
 * Maps backend RssMarketItem to frontend Feed
 */
export function mapMarketItemToFeed(item: RssMarketItem): Feed {
  return {
    id: String(item.id),
    name: item.name,
    url: item.url,
    category: CATEGORY_DISPLAY[item.category] || 'Other',
    subscribed: item.is_subscribed,
    description: item.description || undefined,
    homepage: item.website_url || undefined,
    _marketItem: item,
  };
}

/**
 * Format fetch interval minutes to human-readable string
 */
function formatFetchInterval(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  if (minutes === 60) return 'Hourly';
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  return 'Daily';
}

/**
 * Get all unique categories from feeds
 */
export function getUniqueCategories(feeds: Feed[]): string[] {
  const categories = new Set(feeds.map(f => f.category));
  return ['All', ...Array.from(categories)];
}
