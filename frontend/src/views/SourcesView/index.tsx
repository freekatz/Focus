import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '../../components/icons/Icons';
import { subscriptionsApi, rssApi } from '../../api';
import { mapSubscriptionToFeed, mapMarketItemToFeed, getUniqueCategories } from '../../utils/mappers';
import { AddSourceModal } from '../../components/shared/AddSourceModal';
import type { Feed } from '../../types';
import { SourceConfigModal } from './SourceConfigModal';

interface SourcesViewProps {
  darkMode: boolean;
}

export function SourcesView({ darkMode }: SourcesViewProps) {
  const { t } = useTranslation();
  // Persist tab and category state in sessionStorage
  const [tab, setTab] = useState<'my' | 'market'>(() => {
    const saved = sessionStorage.getItem('sourcesView_tab');
    return (saved === 'my' || saved === 'market') ? saved : 'my';
  });
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    return sessionStorage.getItem('sourcesView_category') || 'all';
  });
  const [editingFeed, setEditingFeed] = useState<Feed | null>(null);
  // Separate cache for each tab
  const [myFeeds, setMyFeeds] = useState<Feed[]>([]);
  const [marketFeeds, setMarketFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const hasLoadedTab = useRef<{ my: boolean; market: boolean }>({ my: false, market: false });

  // Get feeds for current tab
  const feeds = tab === 'my' ? myFeeds : marketFeeds;
  const setFeeds = tab === 'my' ? setMyFeeds : setMarketFeeds;

  // Save tab state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('sourcesView_tab', tab);
  }, [tab]);

  // Save category state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('sourcesView_category', selectedCategory);
  }, [selectedCategory]);

  // Fetch feeds based on tab
  const fetchFeeds = useCallback(async (forceTab?: 'my' | 'market') => {
    const targetTab = forceTab || tab;
    // Only show loading spinner if we don't have cached data
    const hasCachedData = targetTab === 'my' ? myFeeds.length > 0 : marketFeeds.length > 0;
    if (!hasCachedData) {
      setLoading(true);
    }
    try {
      if (targetTab === 'my') {
        const response = await subscriptionsApi.getMySubscriptions();
        const mappedFeeds = response.items.map(mapSubscriptionToFeed);
        setMyFeeds(mappedFeeds);
      } else {
        const response = await subscriptionsApi.getMarket();
        const mappedFeeds = response.items.map(mapMarketItemToFeed);
        setMarketFeeds(mappedFeeds);
      }
    } catch (error) {
      console.error('Failed to fetch feeds:', error);
    } finally {
      setLoading(false);
    }
  }, [tab, myFeeds.length, marketFeeds.length]);

  // Only fetch when tab changes and hasn't been loaded yet
  useEffect(() => {
    if (hasLoadedTab.current[tab]) return;
    hasLoadedTab.current[tab] = true;
    fetchFeeds();
  }, [tab, fetchFeeds]);

  const toggleFeed = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const feed = feeds.find(f => f.id === id);
    if (!feed) return;

    // If already subscribed in market view, do nothing (just show status)
    if (tab === 'market' && feed.subscribed) {
      return;
    }

    try {
      if (feed.subscribed) {
        // Unsubscribe (only in my tab)
        if (feed._subscription) {
          await subscriptionsApi.unsubscribe(feed._subscription.id);
          // Update local state immediately (optimistic update)
          setMyFeeds(prev => prev.map(f =>
            f.id === id ? { ...f, subscribed: false } : f
          ));
          // Invalidate market tab cache
          hasLoadedTab.current.market = false;
        }
      } else {
        // Subscribe (in market tab)
        if (feed._marketItem) {
          await subscriptionsApi.subscribe(feed._marketItem.id);
          // Update local state immediately (optimistic update)
          setMarketFeeds(prev => prev.map(f =>
            f.id === id ? { ...f, subscribed: true } : f
          ));
          // Invalidate my tab cache
          hasLoadedTab.current.my = false;
        }
      }
    } catch (error) {
      console.error('Failed to toggle subscription:', error);
      // Revert on error by refetching
      fetchFeeds();
    }
  };

  const updateFeed = async (updatedFeed: Feed) => {
    try {
      if (updatedFeed._subscription) {
        // Update subscription settings (my tab)
        await subscriptionsApi.updateSubscription(updatedFeed._subscription.id, {
          custom_refresh_time: updatedFeed.refreshTime === 'default' ? undefined : updatedFeed.refreshTime,
        });
      } else if (updatedFeed._marketItem) {
        // Update RSS source (market tab)
        await rssApi.update(updatedFeed._marketItem.id, {
          name: updatedFeed.name,
          url: updatedFeed.url,
          category: updatedFeed._marketItem.category,
          description: updatedFeed.description || undefined,
          website_url: updatedFeed.homepage || undefined,
        });
      }
      fetchFeeds();
    } catch (error) {
      console.error('Failed to update feed:', error);
    }
  };

  // Delete RSS source (market tab)
  const deleteFeed = async (feed: Feed) => {
    try {
      if (feed._marketItem) {
        await rssApi.delete(feed._marketItem.id);
        fetchFeeds();
      }
    } catch (error) {
      console.error('Failed to delete RSS source:', error);
    }
  };

  // Refresh single subscription
  const refreshSingleFeed = async (feed: Feed): Promise<{ success: boolean; newCount: number; error?: string }> => {
    try {
      if (feed._subscription?.rss_source_id) {
        const result = await rssApi.fetch(feed._subscription.rss_source_id);
        return {
          success: result.success,
          newCount: result.new_count,
          error: result.error || undefined
        };
      }
      return { success: false, newCount: 0, error: 'No subscription found' };
    } catch (error) {
      console.error('Failed to refresh feed:', error);
      return { success: false, newCount: 0, error: 'Refresh failed' };
    }
  };

  // Refresh all subscriptions
  const handleRefreshAll = async () => {
    if (tab !== 'my' || refreshing) return;

    setRefreshing(true);
    setRefreshMessage(null);

    let totalNew = 0;
    let successCount = 0;
    let errorCount = 0;

    // Get all rss_source_ids from subscriptions
    const rssSourceIds = feeds
      .filter(f => f._subscription?.rss_source_id)
      .map(f => f._subscription!.rss_source_id);

    for (const rssId of rssSourceIds) {
      try {
        const result = await rssApi.fetch(rssId);
        if (result.success) {
          successCount++;
          totalNew += result.new_count;
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }

    setRefreshing(false);

    // Refresh feeds list to show updated data
    fetchFeeds();

    if (errorCount === 0) {
      setRefreshMessage({
        type: 'success',
        text: totalNew > 0 ? t('sources.refreshSuccess', { count: totalNew }) : t('sources.allUpToDate')
      });
    } else if (successCount > 0) {
      // Some succeeded, some failed
      setRefreshMessage({
        type: 'success',
        text: totalNew > 0
          ? t('sources.refreshPartialSuccess', { newCount: totalNew, errorCount })
          : t('sources.refreshPartialNoNew', { successCount, errorCount })
      });
    } else {
      // All failed
      setRefreshMessage({
        type: 'error',
        text: t('sources.refreshFailed')
      });
    }

    // Clear message after 3 seconds
    setTimeout(() => setRefreshMessage(null), 3000);
  };

  // Get unique categories
  const categories = getUniqueCategories(feeds);

  // Reset category if it doesn't exist in current feeds (e.g., after tab switch)
  useEffect(() => {
    if (selectedCategory !== 'all' && !categories.includes(selectedCategory)) {
      setSelectedCategory('all');
    }
  }, [categories, selectedCategory]);

  // Filter Logic
  const filteredFeeds = feeds.filter(f => {
    const matchCategory = selectedCategory === 'all' || f.category === selectedCategory;
    return matchCategory;
  });

  return (
    <div className="animate-fade-in space-y-6 pb-20 pt-4 md:pt-6">
      <header className="flex flex-col gap-4 sticky top-0 z-10 backdrop-blur-md">
        <div className="flex justify-end items-center">
          <div className="flex items-center gap-3">
            {tab === 'my' ? (
              <button
                onClick={handleRefreshAll}
                disabled={refreshing || feeds.length === 0}
                className={`min-h-touch min-w-touch flex items-center justify-center rounded-xl transition-colors ${
                  refreshing || feeds.length === 0
                    ? (darkMode ? 'bg-theme-accent/50 text-white/50 cursor-not-allowed' : 'bg-theme-accent/50 text-white/50 cursor-not-allowed')
                    : (darkMode ? 'bg-theme-accent hover:bg-theme-accent text-white' : 'bg-theme-accent hover:bg-theme-accent-hover text-white')
                }`}
                title="Refresh all feeds"
              >
                <div className={refreshing ? 'animate-spin' : ''}>
                  <Icons.Refresh />
                </div>
              </button>
            ) : (
              <button
                onClick={() => setAddModalOpen(true)}
                className={`min-h-touch min-w-touch flex items-center justify-center rounded-xl transition-colors ${darkMode ? 'bg-theme-accent hover:bg-theme-accent text-white' : 'bg-theme-accent hover:bg-theme-accent-hover text-white'}`}
              >
                <Icons.Plus />
              </button>
            )}
            <div className={`flex p-1 rounded-lg ${darkMode ? 'bg-theme-muted' : 'bg-theme-muted'}`}>
            <button
              onClick={() => setTab('my')}
              className={`min-h-touch px-4 text-ui-sm font-medium rounded-lg transition-all ${tab === 'my' ? (darkMode ? 'bg-theme-surface text-theme-text shadow' : 'bg-theme-surface text-theme-text shadow') : (darkMode ? 'text-theme-text-secondary hover:text-theme-text' : 'text-theme-text-secondary hover:text-theme-text')}`}
            >
              {t('sources.mySubs')}
            </button>
            <button
              onClick={() => setTab('market')}
              className={`min-h-touch px-4 text-ui-sm font-medium rounded-lg transition-all ${tab === 'market' ? (darkMode ? 'bg-theme-surface text-theme-text shadow' : 'bg-theme-surface text-theme-text shadow') : (darkMode ? 'text-theme-text-secondary hover:text-theme-text' : 'text-theme-text-secondary hover:text-theme-text')}`}
            >
              {t('sources.discovery')}
            </button>
            </div>
          </div>
        </div>

        {/* Refresh Message */}
        {refreshMessage && (
          <div className={`px-4 py-3 rounded-xl text-body-sm text-center transition-all ${
            refreshMessage.type === 'success'
              ? (darkMode ? 'bg-green-100 text-green-700' : 'bg-green-50 text-green-600')
              : (darkMode ? 'bg-red-100 text-red-700' : 'bg-red-50 text-red-600')
          }`}>
            {refreshMessage.text}
          </div>
        )}

        {/* Category Filter Chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap min-h-touch px-4 rounded-full text-caption font-bold uppercase tracking-wider transition-colors ${
                selectedCategory === cat
                  ? (darkMode ? 'bg-theme-accent text-white' : 'bg-theme-accent text-white')
                  : (darkMode ? 'bg-theme-muted text-theme-text-secondary hover:bg-theme-selected' : 'bg-theme-surface border border-theme-border text-theme-text-secondary hover:bg-theme-muted')
              }`}
            >
              {t(`categories.${cat}`)}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className={`animate-spin h-8 w-8 border-2 border-t-transparent rounded-full ${darkMode ? 'border-theme-accent' : 'border-theme-accent'}`}/>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFeeds.length === 0 ? (
            <div className="col-span-full text-center py-16 flex flex-col items-center">
              <div className="mb-4 p-4 rounded-full bg-theme-muted text-theme-text-tertiary">
                <Icons.Sources />
              </div>
              <p className="text-lg font-medium text-theme-text-secondary mb-1">
                {t('sources.noSourcesInCategory')}
              </p>
              <p className="text-sm text-theme-text-tertiary">
                {t('sources.noSourcesInCategoryDesc')}
              </p>
            </div>
          ) : (
            filteredFeeds.map(feed => (
              <div
                key={feed.id}
                onClick={() => setEditingFeed(feed)}
                className={`flex items-center justify-between p-4 md:p-5 rounded-2xl border transition-all hover:shadow-md cursor-pointer ${darkMode ? 'bg-theme-surface border-theme-border' : 'bg-theme-surface border-theme-border'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center text-lg font-serif font-bold ${darkMode ? 'bg-theme-muted text-theme-accent' : 'bg-theme-accent/20 text-theme-accent'}`}>
                    {feed.name[0]}
                  </div>
                  <div>
                    <h3 className={`text-body-sm font-medium ${darkMode ? 'text-theme-text' : 'text-theme-text'}`}>{feed.name}</h3>
                    <p className={`text-caption ${darkMode ? 'text-theme-text-tertiary' : 'text-theme-text-tertiary'}`}>{t(`categories.${feed.category}`)}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => toggleFeed(feed.id, e)}
                  disabled={tab === 'market' && feed.subscribed}
                  className={`min-h-touch px-4 rounded-xl text-caption font-bold uppercase tracking-wider transition-colors min-w-[90px] ${
                    feed.subscribed
                      ? tab === 'market'
                        ? 'bg-theme-muted text-theme-text-muted cursor-not-allowed'
                        : (darkMode ? 'bg-theme-muted text-theme-text-secondary hover:bg-red-100 hover:text-red-600' : 'bg-theme-muted text-theme-text-secondary hover:bg-red-50 hover:text-red-500')
                      : (darkMode ? 'bg-theme-accent text-white hover:bg-theme-accent' : 'bg-theme-text text-theme-base hover:bg-theme-text-secondary')
                  }`}
                >
                  {feed.subscribed ? t('sources.following') : t('sources.follow')}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {editingFeed && (
        <SourceConfigModal
          feed={editingFeed}
          type={tab}
          onClose={() => setEditingFeed(null)}
          onSave={updateFeed}
          onDelete={deleteFeed}
          onRefresh={refreshSingleFeed}
        />
      )}

      <AddSourceModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={fetchFeeds}
      />
    </div>
  );
}
