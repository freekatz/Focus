import { apiClient } from './client';
import type {
  Subscription,
  SubscriptionListResponse,
  RssMarketItem,
  RssMarketListResponse,
  RssCategory
} from '../types';

interface ListSubscriptionsParams {
  is_active?: boolean;
  category?: RssCategory;
}

export const subscriptionsApi = {
  // User's subscriptions
  getMySubscriptions: (params: ListSubscriptionsParams = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, String(value));
    });
    const query = searchParams.toString();
    return apiClient.get<SubscriptionListResponse>(`/subscriptions/my${query ? `?${query}` : ''}`);
  },

  subscribe: (rssSourceId: number, customFetchInterval?: number) =>
    apiClient.post<Subscription>('/subscriptions/subscribe', {
      rss_source_id: rssSourceId,
      is_active: true,
      custom_fetch_interval: customFetchInterval,
    }),

  batchSubscribe: (rssSourceIds: number[]) =>
    apiClient.post<{ success: number[]; already_subscribed: number[]; not_found: number[] }>(
      '/subscriptions/subscribe/batch',
      { rss_source_ids: rssSourceIds }
    ),

  updateSubscription: (subscriptionId: number, data: { is_active?: boolean; custom_fetch_interval?: number }) =>
    apiClient.put<Subscription>(`/subscriptions/my/${subscriptionId}`, data),

  unsubscribe: (subscriptionId: number) =>
    apiClient.delete(`/subscriptions/my/${subscriptionId}`),

  // RSS Market
  getMarket: (params: { category?: RssCategory; page?: number; page_size?: number } = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, String(value));
    });
    const query = searchParams.toString();
    return apiClient.get<RssMarketListResponse>(`/subscriptions/market${query ? `?${query}` : ''}`);
  },
};
