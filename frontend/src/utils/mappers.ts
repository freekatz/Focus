import type { Entry, Article, EntryStatus, Subscription, RssMarketItem, Feed, RssCategory } from '../types';
import { formatRelativeTime, estimateReadTime, stripHtml, truncateText, formatAuthors } from './formatters';

/**
 * Maps backend Entry to frontend Article for display
 */
export function mapEntryToArticle(entry: Entry): Article {
  const content = entry.content || '';
  const plainContent = stripHtml(content);

  // 优先使用简要总结作为摘要，其次是翻译摘要，最后是原始内容
  let snippet = '';
  if (entry.brief_summary) {
    snippet = entry.brief_summary;
  } else if (entry.translated_abstract) {
    snippet = truncateText(entry.translated_abstract, 200);
  } else {
    snippet = truncateText(plainContent, 200);
  }

  return {
    id: String(entry.id),
    title: entry.title,
    source: entry.rss_source_name || 'Unknown Source',
    author: formatAuthors(entry.author),
    snippet,
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
    category: subscription.rss_source_category || 'other',
    subscribed: true,
    description: subscription.rss_source_description || undefined,
    refreshTime: subscription.custom_refresh_time || 'default',
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
    category: item.category || 'other',
    subscribed: item.is_subscribed,
    description: item.description || undefined,
    homepage: item.website_url || undefined,
    _marketItem: item,
  };
}

/**
 * Get all unique categories from feeds
 * Returns category keys (e.g., 'blog', 'paper') for i18n translation
 */
export function getUniqueCategories(feeds: Feed[]): string[] {
  const categories = new Set(feeds.map(f => f.category));
  return ['all', ...Array.from(categories)];
}
