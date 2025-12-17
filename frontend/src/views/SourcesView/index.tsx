import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '../../components/icons/Icons';
import { subscriptionsApi, rssApi } from '../../api';
import { mapSubscriptionToFeed, mapMarketItemToFeed, getUniqueCategories } from '../../utils/mappers';
import { AddSourceModal } from '../../components/shared/AddSourceModal';
import type { Feed } from '../../types';
import { SourceConfigModal } from './SourceConfigModal';
import {
  RECOMMENDED_FEEDS,
  RECOMMENDED_CATEGORY_LABELS,
  getAllCategories,
  buildRssUrl,
  type RecommendedFeed,
  type RecommendedCategory,
} from '../../data/recommendedFeeds';

interface SourcesViewProps {
  darkMode: boolean;
}

export function SourcesView({ darkMode }: SourcesViewProps) {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<'my' | 'market' | 'recommended'>('my');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedRecommendedCategory, setSelectedRecommendedCategory] = useState<RecommendedCategory | 'all'>('all');
  const [editingFeed, setEditingFeed] = useState<Feed | null>(null);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [addingFeedId, setAddingFeedId] = useState<string | null>(null);
  const [addedFeeds, setAddedFeeds] = useState<Set<string>>(new Set());

  // Fetch feeds based on tab
  const fetchFeeds = useCallback(async () => {
    if (tab === 'recommended') {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (tab === 'my') {
        const response = await subscriptionsApi.getMySubscriptions();
        const mappedFeeds = response.items.map(mapSubscriptionToFeed);
        setFeeds(mappedFeeds);
      } else {
        const response = await subscriptionsApi.getMarket();
        const mappedFeeds = response.items.map(mapMarketItemToFeed);
        setFeeds(mappedFeeds);
      }
    } catch (error) {
      console.error('Failed to fetch feeds:', error);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  // Add recommended feed to market
  const addRecommendedFeed = async (feed: RecommendedFeed) => {
    setAddingFeedId(feed.id);
    try {
      const isZh = i18n.language === 'zh';
      await rssApi.create({
        name: isZh ? feed.nameZh : feed.name,
        url: buildRssUrl(feed.route),
        category: 'other',
        description: isZh ? feed.descriptionZh : feed.description,
      });
      setAddedFeeds(prev => new Set(prev).add(feed.id));
    } catch (error) {
      console.error('Failed to add recommended feed:', error);
      setRefreshMessage({ type: 'error', text: t('sources.failedToAdd') });
      setTimeout(() => setRefreshMessage(null), 3000);
    } finally {
      setAddingFeedId(null);
    }
  };

  // Get filtered recommended feeds
  const filteredRecommendedFeeds = selectedRecommendedCategory === 'all'
    ? RECOMMENDED_FEEDS
    : RECOMMENDED_FEEDS.filter(f => f.category === selectedRecommendedCategory);

  useEffect(() => {
    fetchFeeds();
  }, [fetchFeeds]);

  const toggleFeed = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const feed = feeds.find(f => f.id === id);
    if (!feed) return;

    try {
      if (feed.subscribed) {
        // Unsubscribe
        if (feed._subscription) {
          await subscriptionsApi.unsubscribe(feed._subscription.id);
        }
      } else {
        // Subscribe
        if (feed._marketItem) {
          await subscriptionsApi.subscribe(feed._marketItem.id);
        }
      }
      // Refresh feeds
      fetchFeeds();
    } catch (error) {
      console.error('Failed to toggle subscription:', error);
    }
  };

  const updateFeed = async (updatedFeed: Feed) => {
    try {
      if (updatedFeed._subscription) {
        // Update subscription settings (my tab)
        await subscriptionsApi.updateSubscription(updatedFeed._subscription.id, {
          custom_fetch_interval: updatedFeed.refreshRate === 'Default' ? undefined :
            updatedFeed.refreshRate === '15min' ? 15 :
            updatedFeed.refreshRate === '30min' ? 30 :
            updatedFeed.refreshRate === 'Hourly' ? 60 :
            updatedFeed.refreshRate === '4Hours' ? 240 : 1440,
        });
      } else if (updatedFeed._marketItem) {
        // Update RSS source (market tab)
        console.log('Updating RSS source, allow_ssl_bypass:', updatedFeed.allow_ssl_bypass);
        await rssApi.update(updatedFeed._marketItem.id, {
          name: updatedFeed.name,
          url: updatedFeed.url,
          category: updatedFeed._marketItem.category,
          description: updatedFeed.description || undefined,
          website_url: updatedFeed.homepage || undefined,
          allow_ssl_bypass: updatedFeed.allow_ssl_bypass,
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

  // Filter Logic
  const filteredFeeds = feeds.filter(f => {
    const matchCategory = selectedCategory === 'All' || f.category === selectedCategory;
    return matchCategory;
  });

  return (
    <div className="animate-fade-in space-y-6 pb-20">
      <header className="flex flex-col gap-4 sticky top-0 z-10 pt-2 backdrop-blur-md">
        <div className="flex justify-between items-center">
          <h2 className={`text-3xl font-serif font-bold ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{t('sources.title')}</h2>
          <div className="flex items-center gap-3">
            {tab === 'my' && (
              <button
                onClick={handleRefreshAll}
                disabled={refreshing || feeds.length === 0}
                className={`p-2 rounded-lg transition-colors ${
                  refreshing || feeds.length === 0
                    ? (darkMode ? 'bg-indigo-600/50 text-white/50 cursor-not-allowed' : 'bg-spira-600/50 text-white/50 cursor-not-allowed')
                    : (darkMode ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-spira-600 hover:bg-spira-500 text-white')
                }`}
                title="Refresh all feeds"
              >
                <div className={refreshing ? 'animate-spin' : ''}>
                  <Icons.Refresh />
                </div>
              </button>
            )}
            {tab === 'market' && (
              <button
                onClick={() => setAddModalOpen(true)}
                className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-spira-600 hover:bg-spira-500 text-white'}`}
              >
                <Icons.Plus />
              </button>
            )}
            <div className={`flex p-1 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-zinc-100'}`}>
            <button
              onClick={() => { setTab('my'); setSelectedCategory('All'); }}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${tab === 'my' ? (darkMode ? 'bg-slate-700 text-white shadow' : 'bg-white text-zinc-900 shadow') : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              {t('sources.mySubs')}
            </button>
            <button
              onClick={() => { setTab('market'); setSelectedCategory('All'); }}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${tab === 'market' ? (darkMode ? 'bg-slate-700 text-white shadow' : 'bg-white text-zinc-900 shadow') : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              {t('sources.discovery')}
            </button>
            <button
              onClick={() => { setTab('recommended'); setSelectedRecommendedCategory('all'); }}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${tab === 'recommended' ? (darkMode ? 'bg-slate-700 text-white shadow' : 'bg-white text-zinc-900 shadow') : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              {t('sources.recommended')}
            </button>
            </div>
          </div>
        </div>

        {/* Refresh Message */}
        {refreshMessage && (
          <div className={`px-4 py-2 rounded-lg text-sm text-center transition-all ${
            refreshMessage.type === 'success'
              ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600')
              : (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600')
          }`}>
            {refreshMessage.text}
          </div>
        )}

        {/* Category Filter Chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          {tab === 'recommended' ? (
            <>
              <button
                onClick={() => setSelectedRecommendedCategory('all')}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
                  selectedRecommendedCategory === 'all'
                    ? (darkMode ? 'bg-indigo-600 text-white' : 'bg-spira-600 text-white')
                    : (darkMode ? 'bg-slate-800 text-zinc-400 hover:bg-slate-700' : 'bg-white border border-zinc-200 text-zinc-500 hover:bg-zinc-50')
                }`}
              >
                {t('common.all')}
              </button>
              {getAllCategories().map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedRecommendedCategory(cat)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
                    selectedRecommendedCategory === cat
                      ? (darkMode ? 'bg-indigo-600 text-white' : 'bg-spira-600 text-white')
                      : (darkMode ? 'bg-slate-800 text-zinc-400 hover:bg-slate-700' : 'bg-white border border-zinc-200 text-zinc-500 hover:bg-zinc-50')
                  }`}
                >
                  {i18n.language === 'zh' ? RECOMMENDED_CATEGORY_LABELS[cat].zh : RECOMMENDED_CATEGORY_LABELS[cat].en}
                </button>
              ))}
            </>
          ) : (
            categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
                  selectedCategory === cat
                    ? (darkMode ? 'bg-indigo-600 text-white' : 'bg-spira-600 text-white')
                    : (darkMode ? 'bg-slate-800 text-zinc-400 hover:bg-slate-700' : 'bg-white border border-zinc-200 text-zinc-500 hover:bg-zinc-50')
                }`}
              >
                {cat}
              </button>
            ))
          )}
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-2 border-spira-500 border-t-transparent rounded-full"/>
        </div>
      ) : tab === 'recommended' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRecommendedFeeds.map(feed => {
              const isAdded = addedFeeds.has(feed.id);
              const isAdding = addingFeedId === feed.id;
              const isZh = i18n.language === 'zh';
              return (
                <div
                  key={feed.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-zinc-200'}`}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-serif font-bold flex-shrink-0 ${darkMode ? 'bg-slate-700 text-indigo-300' : 'bg-spira-100 text-spira-700'}`}>
                      {(isZh ? feed.nameZh : feed.name)[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className={`font-medium truncate ${darkMode ? 'text-slate-200' : 'text-zinc-900'}`}>
                        {isZh ? feed.nameZh : feed.name}
                      </h3>
                      <p className="text-xs text-zinc-500 truncate">
                        {isZh ? feed.descriptionZh : feed.description}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => !isAdded && !isAdding && addRecommendedFeed(feed)}
                    disabled={isAdded || isAdding}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors min-w-[90px] flex-shrink-0 ${
                      isAdded
                        ? (darkMode ? 'bg-green-900/30 text-green-400 cursor-default' : 'bg-green-50 text-green-600 cursor-default')
                        : isAdding
                        ? (darkMode ? 'bg-slate-700 text-slate-400 cursor-wait' : 'bg-zinc-100 text-zinc-400 cursor-wait')
                        : (darkMode ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-zinc-900 text-white hover:bg-zinc-700')
                    }`}
                  >
                    {isAdded ? t('sources.addedToMarket') : isAdding ? t('common.adding') : t('sources.addToMarket')}
                  </button>
                </div>
              );
            })}
          </div>
          <div className={`text-center text-xs py-4 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {t('sources.poweredBy')} <a href="https://docs.rsshub.app" target="_blank" rel="noopener noreferrer" className="underline hover:text-zinc-600">RSSHub</a>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFeeds.length === 0 ? (
            <div className="col-span-full text-center py-10 opacity-50 italic">
              {t('sources.noSourcesInCategory')}
            </div>
          ) : (
            filteredFeeds.map(feed => (
              <div
                key={feed.id}
                onClick={() => setEditingFeed(feed)}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-zinc-200'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-serif font-bold ${darkMode ? 'bg-slate-700 text-indigo-300' : 'bg-spira-100 text-spira-700'}`}>
                    {feed.name[0]}
                  </div>
                  <div>
                    <h3 className={`font-medium ${darkMode ? 'text-slate-200' : 'text-zinc-900'}`}>{feed.name}</h3>
                    <p className="text-xs text-zinc-500">{feed.category}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => toggleFeed(feed.id, e)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors min-w-[90px] ${
                    feed.subscribed
                      ? (darkMode ? 'bg-slate-700 text-slate-300 hover:bg-red-900/30 hover:text-red-400' : 'bg-zinc-100 text-zinc-600 hover:bg-red-50 hover:text-red-500')
                      : (darkMode ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-zinc-900 text-white hover:bg-zinc-700')
                  }`}
                >
                  {feed.subscribed ? t('sources.following') : t('sources.follow')}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {editingFeed && tab !== 'recommended' && (
        <SourceConfigModal
          feed={editingFeed}
          type={tab}
          onClose={() => setEditingFeed(null)}
          onSave={updateFeed}
          onDelete={deleteFeed}
          onRefresh={refreshSingleFeed}
          darkMode={darkMode}
        />
      )}

      <AddSourceModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={fetchFeeds}
        darkMode={darkMode}
      />
    </div>
  );
}
