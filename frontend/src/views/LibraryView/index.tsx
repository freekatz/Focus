import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '../../components/icons/Icons';
import { entriesApi } from '../../api';
import { mapEntryToArticle, mapActionToBackendStatus } from '../../utils/mappers';
import { ExportModal } from '../../components/shared/ExportModal';
import { useToast } from '../../context/ToastContext';
import type { Article, EntryStatus } from '../../types';

interface LibraryViewProps {
  darkMode: boolean;
  onOpenArticle: (article: Article) => void;
  refreshKey?: number;
}

type SortField = 'date' | 'title';
type SortOrder = 'asc' | 'desc';

// Page size constants (borrowed from HomeView pattern)
const INITIAL_PAGE_SIZE = 20;  // Fast first load
const LOAD_MORE_SIZE = 30;     // Subsequent loads
const PAGE_SIZE = 20;  // For UI pagination display

export function LibraryView({ darkMode, onOpenArticle, refreshKey = 0 }: LibraryViewProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [articles, setArticles] = useState<Article[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const hasLoaded = useRef(false);
  const lastRefreshKey = useRef(refreshKey);
  const isInitialMount = useRef(true);  // Phase 1: Prevent duplicate API calls on mount

  // Applied filter states - these are used for actual filtering
  const [appliedStatusFilters, setAppliedStatusFilters] = useState<Set<EntryStatus | 'all'>>(new Set(['interested', 'favorite']));
  const [appliedCategoryFilter, setAppliedCategoryFilter] = useState<string>('all');
  const [appliedYearFilter, setAppliedYearFilter] = useState<string>('all');
  const [appliedLetterFilter, setAppliedLetterFilter] = useState<string>('all');
  const [appliedSearch, setAppliedSearch] = useState<string>('');

  // Temporary filter states - these are used for UI interaction before applying
  const [tempStatusFilters, setTempStatusFilters] = useState<Set<EntryStatus | 'all'>>(new Set(['interested', 'favorite']));
  const [tempCategoryFilter, setTempCategoryFilter] = useState<string>('all');
  const [tempYearFilter, setTempYearFilter] = useState<string>('all');
  const [tempLetterFilter, setTempLetterFilter] = useState<string>('all');
  const [tempSearch, setTempSearch] = useState<string>('');

  // Sort states
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Pagination (existing UI pagination)
  const [currentPage, setCurrentPage] = useState(1);

  // API Pagination state (new - for "Load More" functionality)
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filter dropdown visibility
  const [showFilters, setShowFilters] = useState(false);

  // Backend search states
  const [searchResults, setSearchResults] = useState<Article[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch entries with pagination (optimized - only fetches one page at a time)
  // Uses appliedStatusFilters instead of tempStatusFilters
  const fetchEntries = useCallback(async (append = false) => {
    const currentPage = append ? page + 1 : 1;
    const pageSize = !append && currentPage === 1 ? INITIAL_PAGE_SIZE : LOAD_MORE_SIZE;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setPage(1);
      setSelectedIds(new Set());
    }

    try {
      // Phase 2: Handle 'all' status - call single endpoint instead of parallel requests
      if (appliedStatusFilters.has('all')) {
        // Call single 'all' endpoint (backend handles fetching all statuses)
        const response = await entriesApi.list({ status: 'all' as any, page: currentPage, page_size: pageSize });
        const mappedArticles = response.items.map(mapEntryToArticle);

        if (append) {
          setArticles(prev => [...prev, ...mappedArticles]);
        } else {
          setArticles(mappedArticles);
        }

        setPage(currentPage);
        setHasMore(response.has_more);
      } else {
        // Multiple statuses selected - fetch each in parallel
        const statuses: EntryStatus[] = appliedStatusFilters.size > 0
          ? Array.from(appliedStatusFilters).filter(s => s !== 'all') as EntryStatus[]
          : ['interested', 'favorite'];  // Fallback default

        const responses = await Promise.all(
          statuses.map(status =>
            entriesApi.list({ status, page: currentPage, page_size: pageSize })
          )
        );

        // Merge and sort results
        const allItems = responses.flatMap(r => r.items);
        const mappedArticles = allItems.map(mapEntryToArticle);

        if (append) {
          setArticles(prev => [...prev, ...mappedArticles]);
        } else {
          setArticles(mappedArticles);
        }

        setPage(currentPage);
        setHasMore(responses.some(r => r.has_more));
      }
    } catch (error) {
      console.error('Failed to fetch entries:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [page, appliedStatusFilters]);

  // Initial load - only fetch once
  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    fetchEntries();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh when refreshKey changes (triggered by parent)
  useEffect(() => {
    if (refreshKey !== lastRefreshKey.current) {
      lastRefreshKey.current = refreshKey;
      fetchEntries();
    }
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch when applied status filters change (after initial load)
  // Phase 1: Skip initial mount to prevent duplicate API calls
  useEffect(() => {
    // Skip initial render
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Only refetch when applied filters change
    if (hasLoaded.current) {
      fetchEntries();
    }
  }, [appliedStatusFilters]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get unique categories and years for filters
  const categories = useMemo(() => {
    const cats = new Set<string>();
    articles.forEach(a => {
      if (a._entry?.rss_source_name) cats.add(a._entry.rss_source_name);
    });
    return Array.from(cats).sort();
  }, [articles]);

  const years = useMemo(() => {
    const yrs = new Set<string>();
    articles.forEach(a => {
      if (a._entry?.published_at) {
        const year = new Date(a._entry.published_at).getFullYear().toString();
        yrs.add(year);
      }
    });
    return Array.from(yrs).sort().reverse();
  }, [articles]);

  // Backend search function
  const searchFromBackend = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    try {
      const response = await entriesApi.search(query, { page: 1, page_size: 100 });
      setSearchResults(response.items.map(mapEntryToArticle));
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (appliedSearch.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        searchFromBackend(appliedSearch);
      }, 300);
    } else {
      setSearchResults(null);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [appliedSearch, searchFromBackend]);

  // Filter and sort articles - now uses applied states only
  // When searchResults is available, use it instead of articles (backend search)
  const filteredAndSorted = useMemo(() => {
    // Use search results if available (backend search), otherwise use local articles
    let result = searchResults !== null ? searchResults : articles;

    // Multi-select status filter
    // If 'all' is selected, don't filter by status (show all)
    if (appliedStatusFilters.size > 0 && !appliedStatusFilters.has('all')) {
      result = result.filter(a => a._entry?.status && appliedStatusFilters.has(a._entry.status));
    }

    if (appliedCategoryFilter !== 'all') {
      result = result.filter(a => a._entry?.rss_source_name === appliedCategoryFilter);
    }

    if (appliedYearFilter !== 'all') {
      result = result.filter(a => {
        if (!a._entry?.published_at) return false;
        return new Date(a._entry.published_at).getFullYear().toString() === appliedYearFilter;
      });
    }

    if (appliedLetterFilter !== 'all') {
      result = result.filter(a => {
        const firstChar = a.title.charAt(0).toUpperCase();
        if (appliedLetterFilter === '#') {
          return !/[A-Z]/.test(firstChar);
        }
        return firstChar === appliedLetterFilter;
      });
    }

    // Note: Search filtering is now handled by backend API (searchResults)
    // No need for frontend filtering when using backend search

    result = [...result].sort((a, b) => {
      if (sortField === 'date') {
        const dateA = a._entry?.published_at ? new Date(a._entry.published_at).getTime() : 0;
        const dateB = b._entry?.published_at ? new Date(b._entry.published_at).getTime() : 0;
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      } else {
        const titleA = a.title.toLowerCase();
        const titleB = b.title.toLowerCase();
        const cmp = titleA.localeCompare(titleB);
        return sortOrder === 'desc' ? -cmp : cmp;
      }
    });

    return result;
  }, [articles, searchResults, appliedStatusFilters, appliedCategoryFilter, appliedYearFilter, appliedLetterFilter, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSorted.length / PAGE_SIZE);
  const paginatedArticles = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAndSorted.slice(start, start + PAGE_SIZE);
  }, [filteredAndSorted, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [appliedStatusFilters, appliedCategoryFilter, appliedYearFilter, appliedLetterFilter, appliedSearch, sortField, sortOrder]);

  // Utility function to compare Sets for equality
  const areSetsEqual = (set1: Set<any>, set2: Set<any>) => {
    if (set1.size !== set2.size) return false;
    for (const item of set1) {
      if (!set2.has(item)) return false;
    }
    return true;
  };

  // Check if temporary filters have changes compared to applied filters
  const hasFilterChanges = () => {
    return (
      !areSetsEqual(tempStatusFilters, appliedStatusFilters) ||
      tempCategoryFilter !== appliedCategoryFilter ||
      tempYearFilter !== appliedYearFilter ||
      tempLetterFilter !== appliedLetterFilter ||
      tempSearch !== appliedSearch
    );
  };

  // Apply temporary filters to applied state
  const applyFilters = () => {
    if (!hasFilterChanges()) {
      return; // No changes, do nothing
    }

    setAppliedStatusFilters(new Set(tempStatusFilters));
    setAppliedCategoryFilter(tempCategoryFilter);
    setAppliedYearFilter(tempYearFilter);
    setAppliedLetterFilter(tempLetterFilter);
    setAppliedSearch(tempSearch);

    // Reset pagination
    setPage(1);
    setCurrentPage(1);
    setHasMore(true);

    // Close filter panel
    setShowFilters(false);
  };

  // Reset all filters to default
  const resetFilters = () => {
    const defaultStatusFilters = new Set<EntryStatus | 'all'>(['interested', 'favorite']);

    setTempStatusFilters(defaultStatusFilters);
    setTempCategoryFilter('all');
    setTempYearFilter('all');
    setTempLetterFilter('all');
    setTempSearch('');

    setAppliedStatusFilters(defaultStatusFilters);
    setAppliedCategoryFilter('all');
    setAppliedYearFilter('all');
    setAppliedLetterFilter('all');
    setAppliedSearch('');

    setPage(1);
    setCurrentPage(1);
    setHasMore(true);
  };

  // Cancel changes and restore to applied state
  const cancelFilters = () => {
    setTempStatusFilters(new Set(appliedStatusFilters));
    setTempCategoryFilter(appliedCategoryFilter);
    setTempYearFilter(appliedYearFilter);
    setTempLetterFilter(appliedLetterFilter);
    setTempSearch(appliedSearch);

    setShowFilters(false);
  };

  // Toggle status in temporary filter (not applied yet)
  const toggleTempStatusFilter = (status: EntryStatus | 'all') => {
    setTempStatusFilters(prev => {
      const newSet = new Set(prev);

      if (status === 'all') {
        // If selecting "all", clear other selections
        return new Set(['all']);
      } else {
        // If selecting specific status, remove "all"
        newSet.delete('all');

        if (newSet.has(status)) {
          newSet.delete(status);
        } else {
          newSet.add(status);
        }
      }

      return newSet;
    });
    // Note: Don't reset pagination here - not applied yet
  };

  // Check if any applied filter is active
  const hasActiveFilters = appliedStatusFilters.size > 0 || appliedCategoryFilter !== 'all' || appliedYearFilter !== 'all' || appliedLetterFilter !== 'all' || appliedSearch !== '';

  // Count active filters for display
  const activeFiltersCount = useMemo(() => {
    let count = 0;

    if (!appliedStatusFilters.has('all') && appliedStatusFilters.size > 0) {
      count += appliedStatusFilters.size;
    }

    if (appliedCategoryFilter !== 'all') count++;
    if (appliedYearFilter !== 'all') count++;
    if (appliedLetterFilter !== 'all') count++;
    if (appliedSearch.trim()) count++;

    return count;
  }, [appliedStatusFilters, appliedCategoryFilter, appliedYearFilter, appliedLetterFilter, appliedSearch]);

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === paginatedArticles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedArticles.map(a => a.id)));
    }
  };

  const handleBulkDiscard = async () => {
    const ids = Array.from(selectedIds).map(id => {
      const article = articles.find(a => a.id === id);
      return article?._entry?.id;
    }).filter((id): id is number => id !== undefined);

    if (ids.length > 0) {
      try {
        await entriesApi.batchUpdateStatus(ids, 'trash');
        setArticles(prev => prev.filter(a => !selectedIds.has(a.id)));
        setSelectedIds(new Set());
        showToast(t('library.articlesDiscarded', { count: ids.length }), 'success');
      } catch (error) {
        console.error('Failed to bulk discard:', error);
        showToast(t('library.failedToDiscard'), 'error');
      }
    }
  };

  const handleBulkFavorite = async () => {
    const ids = Array.from(selectedIds).map(id => {
      const article = articles.find(a => a.id === id);
      return article?._entry?.id;
    }).filter((id): id is number => id !== undefined);

    if (ids.length > 0) {
      try {
        await entriesApi.batchUpdateStatus(ids, 'favorite');
        setArticles(prev => prev.map(a =>
          selectedIds.has(a.id) ? { ...a, isFavorite: true } : a
        ));
        setSelectedIds(new Set());
        showToast(t('library.articlesFavorited', { count: ids.length }), 'success');
      } catch (error) {
        console.error('Failed to bulk favorite:', error);
        showToast(t('library.failedToFavorite'), 'error');
      }
    }
  };

  const handleBulkSave = async () => {
    const ids = Array.from(selectedIds).map(id => {
      const article = articles.find(a => a.id === id);
      return article?._entry?.id;
    }).filter((id): id is number => id !== undefined);

    if (ids.length > 0) {
      try {
        await entriesApi.batchUpdateStatus(ids, 'interested');
        fetchEntries();
        setSelectedIds(new Set());
        showToast(t('library.articlesSaved', { count: ids.length }), 'success');
      } catch (error) {
        console.error('Failed to bulk save:', error);
        showToast(t('library.failedToSave'), 'error');
      }
    }
  };

  const openOriginalLink = (e: React.MouseEvent, link: string) => {
    e.stopPropagation();
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const handleReinterpret = async (e: React.MouseEvent, article: Article) => {
    e.stopPropagation();
    if (!article._entry?.id) return;

    const isReinterpret = article._entry?.ai_content_type === 'error';

    try {
      await entriesApi.reinterpret(article._entry.id);
      // Update local state to show interpreting status
      setArticles(prev => prev.map(a =>
        a.id === article.id
          ? { ...a, _entry: { ...a._entry!, ai_content_type: 'interpreting', ai_summary: null } }
          : a
      ));
      showToast(isReinterpret ? t('home.reinterpretStarted') : t('home.interpretStarted'), 'success');
    } catch (error) {
      console.error('Failed to interpret:', error);
      showToast(t('home.reinterpretFailed'), 'error');
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getStatusLabel = (status: EntryStatus | 'all') => {
    const labels: Record<string, string> = {
      all: t('common.all'),
      unread: t('library.unread'),
      interested: t('library.saved'),
      favorite: t('library.favorite'),
      archived: t('library.archived'),
      trash: t('library.trash'),
    };
    return labels[status] || status;
  };

  const letters = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

  return (
    <div className="animate-fade-in space-y-4 pb-32 pt-4 md:pt-6 relative">
      {/* Search + Filter + Sort Row */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder={t('library.searchArticles')}
            value={appliedSearch}
            onChange={(e) => {
              setAppliedSearch(e.target.value);
              setTempSearch(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                applyFilters();
              }
            }}
            className={`w-full min-h-touch pl-10 pr-4 rounded-xl border outline-none focus:ring-2 transition-all text-body-sm ${darkMode ? 'bg-theme-muted border-theme-border focus:ring-theme-accent text-theme-text placeholder-theme-text-tertiary' : 'bg-theme-surface border-theme-border focus:ring-theme-accent/30 text-theme-text placeholder-theme-text-tertiary'}`}
          />
          <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-theme-text-tertiary' : 'text-theme-text-tertiary'}`}>
            {isSearching ? (
              <div className="animate-spin h-4 w-4 border-2 border-theme-accent border-t-transparent rounded-full" />
            ) : (
              <Icons.Search />
            )}
          </div>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 min-h-touch px-4 rounded-xl border transition-micro cursor-pointer active:scale-[0.98] ${
            showFilters || hasActiveFilters
              ? (darkMode ? 'bg-theme-accent border-theme-accent text-white' : 'bg-theme-accent border-theme-accent text-white')
              : (darkMode ? 'bg-theme-muted border-theme-border text-theme-text-secondary hover:border-theme-text-tertiary' : 'bg-theme-surface border-theme-border text-theme-text-secondary hover:border-theme-text-tertiary')
          }`}
        >
          <Icons.Filter />
          <span className="text-ui-sm font-medium">{t('library.filter')}</span>
          {activeFiltersCount > 0 && (
            <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${darkMode ? 'bg-theme-accent-light' : 'bg-theme-accent/100'}`}>
              {activeFiltersCount}
            </span>
          )}
          {/* Change indicator when temp filters differ from applied */}
          {hasFilterChanges() && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
          )}
        </button>

        <div className={`flex rounded-xl border overflow-hidden ${darkMode ? 'border-theme-border' : 'border-theme-border'}`}>
          <button
            onClick={() => toggleSort('date')}
            className={`flex items-center gap-1.5 min-h-touch px-3 text-ui-sm font-medium transition-micro cursor-pointer ${
              sortField === 'date'
                ? (darkMode ? 'bg-theme-selected text-theme-text' : 'bg-theme-muted text-theme-text')
                : (darkMode ? 'bg-theme-surface text-theme-text-secondary hover:text-theme-text hover:bg-theme-muted' : 'bg-theme-surface text-theme-text-secondary hover:text-theme-text hover:bg-theme-muted')
            }`}
          >
            {sortField === 'date' && sortOrder === 'desc' ? <Icons.SortDesc /> : <Icons.SortAsc />}
            {t('library.date')}
          </button>
          <button
            onClick={() => toggleSort('title')}
            className={`flex items-center gap-1.5 min-h-touch px-3 text-ui-sm font-medium border-l transition-micro cursor-pointer ${
              sortField === 'title'
                ? (darkMode ? 'bg-theme-selected text-theme-text border-theme-border' : 'bg-theme-muted text-theme-text border-theme-border')
                : (darkMode ? 'bg-theme-surface text-theme-text-secondary hover:text-theme-text hover:bg-theme-muted border-theme-border' : 'bg-theme-surface text-theme-text-secondary hover:text-theme-text hover:bg-theme-muted border-theme-border')
            }`}
          >
            {sortField === 'title' && sortOrder === 'desc' ? <Icons.SortDesc /> : <Icons.SortAsc />}
            {t('entry.title')}
          </button>
        </div>
      </div>

      {/* Filter Panel - Floating Overlay */}
      {showFilters && (
        <>
          {/* Backdrop to close on click outside */}
          <div
            className="fixed inset-0 z-10"
            onClick={cancelFilters}
          />
          <div
            className={`absolute left-4 right-4 md:left-auto md:right-8 md:w-[500px] z-20 p-4 rounded-xl border shadow-xl space-y-4 ${darkMode ? 'bg-theme-surface border-theme-border' : 'bg-theme-surface border-theme-border'}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                applyFilters();
              } else if (e.key === 'Escape') {
                cancelFilters();
              } else if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
                e.preventDefault();
                resetFilters();
              }
            }}
            tabIndex={0}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-semibold ${darkMode ? 'text-theme-text' : 'text-theme-text'}`}>{t('library.filters')}</span>
              <button
                onClick={cancelFilters}
                className={`p-1 rounded-lg transition-colors ${darkMode ? 'hover:bg-theme-muted text-theme-text-secondary' : 'hover:bg-theme-muted text-theme-text-secondary'}`}
              >
                <Icons.X />
              </button>
            </div>
            {/* Status multi-select - using temporary state */}
            <div className="mb-4">
              <label className={`block text-xs font-medium uppercase tracking-wider mb-2 ${darkMode ? 'text-theme-text-tertiary' : 'text-theme-text-tertiary'}`}>{t('library.status')}</label>
              <div className="flex flex-wrap gap-2">
                {/* Phase 2: Add "All Statuses" button */}
                <button
                  onClick={() => toggleTempStatusFilter('all')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    tempStatusFilters.has('all')
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-100 dark:text-purple-700 ring-2 ring-purple-400/50'
                      : darkMode ? 'bg-theme-muted text-theme-text-secondary hover:text-theme-text' : 'bg-theme-muted text-theme-text-secondary hover:text-theme-text'
                  }`}
                >
                  {tempStatusFilters.has('all') && <Icons.Check />}
                  {t('library.allStatuses')}
                </button>

                {/* Individual status buttons */}
                {(['unread', 'interested', 'favorite', 'archived', 'trash'] as EntryStatus[]).map(status => (
                  <button
                    key={status}
                    onClick={() => toggleTempStatusFilter(status)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      tempStatusFilters.has(status)
                        ? status === 'favorite' ? 'bg-amber-100 text-amber-700 dark:bg-amber-100 dark:text-amber-700 ring-2 ring-amber-400/50' :
                          status === 'interested' ? 'bg-green-100 text-green-700 dark:bg-green-100 dark:text-green-700 ring-2 ring-green-400/50' :
                          status === 'unread' ? 'bg-blue-100 text-blue-700 dark:bg-blue-100 dark:text-blue-700 ring-2 ring-blue-400/50' :
                          status === 'trash' ? 'bg-red-100 text-red-700 dark:bg-red-100 dark:text-red-700 ring-2 ring-red-400/50' :
                          'bg-theme-muted text-theme-text dark:bg-theme-muted dark:text-theme-text ring-2 ring-theme-border/50'
                        : darkMode ? 'bg-theme-muted text-theme-text-secondary hover:text-theme-text' : 'bg-theme-muted text-theme-text-secondary hover:text-theme-text'
                    }`}
                  >
                    {tempStatusFilters.has(status) && <Icons.Check />}
                    {getStatusLabel(status)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${darkMode ? 'text-theme-text-tertiary' : 'text-theme-text-tertiary'}`}>{t('library.source')}</label>
                <select
                  value={tempCategoryFilter}
                  onChange={(e) => setTempCategoryFilter(e.target.value)}
                  className={`w-full p-2 rounded-lg border text-sm ${darkMode ? 'bg-theme-muted border-theme-border text-theme-text' : 'bg-theme-surface border-theme-border text-theme-text'}`}
                >
                  <option value="all">{t('library.allSources')}</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${darkMode ? 'text-theme-text-tertiary' : 'text-theme-text-tertiary'}`}>{t('library.year')}</label>
                <select
                  value={tempYearFilter}
                  onChange={(e) => setTempYearFilter(e.target.value)}
                  className={`w-full p-2 rounded-lg border text-sm ${darkMode ? 'bg-theme-muted border-theme-border text-theme-text' : 'bg-theme-surface border-theme-border text-theme-text'}`}
                >
                  <option value="all">{t('library.allYears')}</option>
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${darkMode ? 'text-theme-text-tertiary' : 'text-theme-text-tertiary'}`}>{t('library.firstLetter')}</label>
                <select
                  value={tempLetterFilter}
                  onChange={(e) => setTempLetterFilter(e.target.value)}
                  className={`w-full p-2 rounded-lg border text-sm ${darkMode ? 'bg-theme-muted border-theme-border text-theme-text' : 'bg-theme-surface border-theme-border text-theme-text'}`}
                >
                  <option value="all">{t('common.all')}</option>
                  {letters.map(letter => (
                    <option key={letter} value={letter}>{letter}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-theme-border">
              <button
                onClick={applyFilters}
                disabled={!hasFilterChanges()}
                className={`
                  flex-1 py-2.5 rounded-lg font-medium transition-all
                  ${hasFilterChanges()
                    ? 'bg-theme-accent text-white hover:bg-theme-accent/90 cursor-pointer'
                    : 'bg-theme-muted text-theme-text-tertiary cursor-not-allowed'
                  }
                `}
              >
                {t('common.apply')}
              </button>

              <button
                onClick={resetFilters}
                className={`px-4 py-2.5 rounded-lg border font-medium transition-colors ${darkMode ? 'border-theme-border text-theme-text-secondary hover:bg-theme-muted' : 'border-theme-border text-theme-text-secondary hover:bg-theme-muted'}`}
              >
                {t('common.reset')}
              </button>

              <button
                onClick={cancelFilters}
                className={`px-4 py-2.5 rounded-lg border font-medium transition-colors ${darkMode ? 'border-theme-border text-theme-text-secondary hover:bg-theme-muted' : 'border-theme-border text-theme-text-secondary hover:bg-theme-muted'}`}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Select All Row */}
      {paginatedArticles.length > 0 && (
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <span className={`text-sm font-medium ${darkMode ? 'text-theme-accent' : 'text-theme-accent'}`}>{selectedIds.size} {t('library.selected')}</span>
            )}
          </div>
          <div className="flex items-center gap-3 cursor-pointer" onClick={selectAll}>
            <span className={`text-xs uppercase tracking-wider font-bold ${darkMode ? 'text-theme-text-tertiary' : 'text-theme-text-tertiary'}`}>{t('library.selectAll')}</span>
            <div
              className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedIds.size === paginatedArticles.length && paginatedArticles.length > 0 ? (darkMode ? 'bg-theme-accent border-theme-accent' : 'bg-theme-accent border-theme-accent') : (darkMode ? 'border-theme-border' : 'border-theme-border')}`}
            >
              {selectedIds.size === paginatedArticles.length && paginatedArticles.length > 0 && <div className="text-white scale-75"><Icons.Check /></div>}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className={`animate-spin h-8 w-8 border-2 border-t-transparent rounded-full ${darkMode ? 'border-theme-accent' : 'border-theme-accent'}`}/>
        </div>
      ) : paginatedArticles.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center">
          <div className="mb-4 p-4 rounded-full bg-theme-muted text-theme-text-tertiary">
            <Icons.Library />
          </div>
          <p className="text-lg font-medium text-theme-text-secondary mb-1">{t('library.noArticlesFound')}</p>
          <p className="text-sm text-theme-text-tertiary">{t('library.tryAdjustingFilters')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {paginatedArticles.map(article => {
            const isSelected = selectedIds.has(article.id);
            return (
              <div
                key={article.id}
                onClick={() => onOpenArticle(article)}
                className={`relative group flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-micro active:scale-[0.99] ${
                  isSelected
                    ? (darkMode ? 'bg-theme-accent/10 border-theme-accent/50' : 'bg-theme-accent/10 border-theme-accent/30')
                    : (darkMode ? 'bg-theme-surface border-theme-border hover:border-theme-accent/50 hover:shadow-lg hover:shadow-theme-text/5 hover:-translate-y-0.5' : 'bg-theme-surface border-theme-border hover:border-theme-accent/50 hover:shadow-lg hover:shadow-theme-accent/10 hover:-translate-y-0.5')
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${darkMode ? 'bg-theme-muted text-theme-accent' : 'bg-theme-muted text-theme-accent'}`}>{article.source}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        article._entry?.status === 'favorite' ? 'bg-amber-100 text-amber-700' :
                        article._entry?.status === 'interested' ? 'bg-green-100 text-green-700' :
                        article._entry?.status === 'unread' ? 'bg-blue-100 text-blue-700' :
                        article._entry?.status === 'trash' ? 'bg-red-100 text-red-700' :
                        darkMode ? 'bg-theme-muted text-theme-text-secondary' : 'bg-theme-muted text-theme-text-secondary'
                      }`}>{getStatusLabel(article._entry?.status || 'unread')}</span>
                      {/* ArXiv 翻译/解读状态徽章 */}
                      {article._entry?.link?.includes('arxiv.org') && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          article._entry?.ai_content_type === 'arxiv_interpretation'
                            ? 'bg-theme-success/15 text-theme-success'
                            : article._entry?.ai_content_type === 'error'
                              ? 'bg-theme-error/15 text-theme-error'
                              : article._entry?.ai_content_type === 'interpreting'
                                ? 'bg-theme-warning/15 text-theme-warning'
                                : article._entry?.translation_status === 'translating'
                                  ? 'bg-theme-accent/15 text-theme-accent'
                                  : article._entry?.translation_status === 'completed'
                                    ? 'bg-theme-success/15 text-theme-success'
                                    : article._entry?.translation_status === 'pending'
                                      ? 'bg-theme-muted text-theme-text-secondary'
                                      : 'bg-theme-accent/15 text-theme-accent'
                        }`}>
                          {article._entry?.ai_content_type === 'arxiv_interpretation'
                            ? t('home.interpreted')
                            : article._entry?.ai_content_type === 'error'
                              ? t('home.interpretFailed')
                              : article._entry?.ai_content_type === 'interpreting'
                                ? t('home.interpreting')
                                : article._entry?.translation_status === 'translating'
                                  ? t('library.translating')
                                  : article._entry?.translation_status === 'completed'
                                    ? t('library.translated')
                                    : article._entry?.translation_status === 'pending'
                                      ? t('library.pendingTranslation')
                                      : 'ArXiv'}
                        </span>
                      )}
                      <span className={`text-xs ${darkMode ? 'text-theme-text-tertiary' : 'text-theme-text-tertiary'}`}>{article.timestamp}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {article.isFavorite && <div className="text-amber-500 scale-75"><Icons.Star /></div>}
                      {/* Interpret button for ArXiv articles: saved + (uninterpreted or failed) */}
                      {article._entry?.link?.includes('arxiv.org') &&
                       article._entry?.status === 'interested' &&
                       (article._entry?.ai_content_type === null ||
                        article._entry?.ai_content_type === undefined ||
                        article._entry?.ai_content_type === 'error') && (
                        <button
                          onClick={(e) => handleReinterpret(e, article)}
                          className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${darkMode ? 'hover:bg-theme-muted text-theme-accent' : 'hover:bg-theme-muted text-theme-accent'}`}
                          title={article._entry?.ai_content_type === 'error' ? t('home.reinterpret') : t('home.interpret')}
                        >
                          <Icons.Sparkles />
                        </button>
                      )}
                      {article._entry?.link && (
                        <button
                          onClick={(e) => openOriginalLink(e, article._entry!.link)}
                          className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${darkMode ? 'hover:bg-theme-muted text-theme-text-secondary' : 'hover:bg-theme-muted text-theme-text-secondary'}`}
                          title="Open original"
                        >
                          <Icons.ExternalLink />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="mb-1">
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        if (article._entry?.link) {
                          window.open(article._entry.link, '_blank', 'noopener,noreferrer');
                        }
                      }}
                      className={`text-base font-bold cursor-pointer hover:underline decoration-2 underline-offset-2 ${darkMode ? 'text-theme-text decoration-theme-accent' : 'text-theme-text decoration-theme-accent'}`}
                    >
                      {article.title}
                    </span>
                  </h3>

                  <p className={`text-sm line-clamp-2 mb-2 leading-relaxed ${darkMode ? 'text-theme-text-secondary' : 'text-theme-text-secondary'}`}>{article.snippet}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {article.tags.slice(0, 3).map(tag => (
                        <span key={tag} className={`text-[10px] px-2 py-0.5 rounded font-medium ${darkMode ? 'bg-theme-muted text-theme-text-secondary' : 'bg-theme-muted text-theme-text-secondary'}`}>#{tag}</span>
                      ))}
                    </div>
                    <span className={`text-xs ${darkMode ? 'text-theme-text-tertiary' : 'text-theme-text-tertiary'}`}>{article.readTime}</span>
                  </div>
                </div>

                <div
                  onClick={(e) => toggleSelect(article.id, e)}
                  className={`mt-1 flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors z-10 ${isSelected ? (darkMode ? 'bg-theme-accent border-theme-accent' : 'bg-theme-accent border-theme-accent') : (darkMode ? 'border-theme-border hover:border-theme-accent' : 'border-theme-border hover:border-theme-accent/50')}`}
                >
                  {isSelected && <div className="text-white scale-75"><Icons.Check /></div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Load More Button - for fetching more data from API */}
      {hasMore && !loading && paginatedArticles.length > 0 && (
        <div className="flex justify-center py-6">
          <button
            onClick={() => fetchEntries(true)}
            disabled={loadingMore}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              loadingMore
                ? 'bg-theme-muted text-theme-text-tertiary cursor-not-allowed'
                : 'bg-theme-accent text-white hover:bg-theme-accent-hover active:scale-95'
            }`}
          >
            {loadingMore ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"/>
                <span>{t('library.loadingMore')}</span>
              </div>
            ) : (
              t('library.loadMore')
            )}
          </button>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <span className={`text-caption ${darkMode ? 'text-theme-text-tertiary' : 'text-theme-text-tertiary'}`}>
            {filteredAndSorted.length} {t('library.articles')}
          </span>
          <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={`min-h-touch min-w-touch flex items-center justify-center rounded-xl transition-micro ${
              currentPage === 1
                ? (darkMode ? 'text-theme-text-muted cursor-not-allowed' : 'text-theme-text-muted cursor-not-allowed')
                : (darkMode ? 'text-theme-text-secondary hover:bg-theme-muted cursor-pointer active:scale-95' : 'text-theme-text-secondary hover:bg-theme-muted cursor-pointer active:scale-95')
            }`}
          >
            <Icons.ChevronLeft />
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page: number;
              if (totalPages <= 5) {
                page = i + 1;
              } else if (currentPage <= 3) {
                page = i + 1;
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i;
              } else {
                page = currentPage - 2 + i;
              }
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`min-h-touch min-w-touch flex items-center justify-center rounded-xl text-ui-sm font-medium transition-micro cursor-pointer active:scale-95 ${
                    currentPage === page
                      ? (darkMode ? 'bg-theme-accent text-white' : 'bg-theme-accent text-white')
                      : (darkMode ? 'text-theme-text-secondary hover:bg-theme-muted' : 'text-theme-text-secondary hover:bg-theme-muted')
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className={`min-h-touch min-w-touch flex items-center justify-center rounded-xl transition-micro ${
              currentPage === totalPages
                ? (darkMode ? 'text-theme-text-muted cursor-not-allowed' : 'text-theme-text-muted cursor-not-allowed')
                : (darkMode ? 'text-theme-text-secondary hover:bg-theme-muted cursor-pointer active:scale-95' : 'text-theme-text-secondary hover:bg-theme-muted cursor-pointer active:scale-95')
            }`}
          >
            <Icons.ChevronRight />
          </button>
          </div>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {(() => {
        const selectedArticles = articles.filter(a => selectedIds.has(a.id));
        const hasTrashSelected = selectedArticles.some(a => a._entry?.status === 'trash');

        return (
          <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-0.5 md:gap-1 p-1.5 md:p-2 rounded-full shadow-lg transition-micro-slow max-w-[95vw] ${selectedIds.size > 0 ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'} bg-theme-surface border border-theme-border`}>
            <button
              onClick={() => setSelectedIds(new Set())}
              className={`flex items-center justify-center gap-1 md:gap-2 min-h-touch min-w-touch md:min-w-0 md:px-3 rounded-full font-medium text-ui-sm transition-micro cursor-pointer active:scale-95 ${darkMode ? 'hover:bg-theme-muted text-theme-text-secondary' : 'hover:bg-theme-muted text-theme-text-secondary'}`}
              title="Clear selection"
            >
              <Icons.X /> <span className="text-xs">{selectedIds.size}</span>
            </button>
            <div className={`w-px h-5 md:h-6 ${darkMode ? 'bg-theme-border' : 'bg-theme-border'}`}></div>
            {hasTrashSelected ? (
              // Only show Save button for trashed articles
              <button
                onClick={handleBulkSave}
                className={`flex items-center justify-center gap-1.5 md:gap-2 min-h-touch px-4 md:px-5 rounded-full font-medium text-ui-sm transition-micro cursor-pointer active:scale-95 ${darkMode ? 'bg-theme-accent hover:bg-theme-accent text-white' : 'bg-theme-accent hover:bg-theme-accent/100 text-white'}`}
              >
                <Icons.Check /> <span>{t('library.restore')}</span>
              </button>
            ) : (
              // Normal action bar
              <>
                <button
                  onClick={handleBulkDiscard}
                  className={`flex items-center justify-center gap-1 md:gap-2 min-h-touch min-w-touch md:min-w-0 md:px-4 rounded-full font-medium text-ui-sm transition-micro cursor-pointer active:scale-95 ${darkMode ? 'hover:bg-red-100 text-theme-error' : 'hover:bg-red-50 text-theme-error'}`}
                >
                  <Icons.Trash /> <span className="hidden md:inline">{t('library.discard')}</span>
                </button>
                <div className={`w-px h-5 md:h-6 ${darkMode ? 'bg-theme-border' : 'bg-theme-border'}`}></div>
                <button
                  onClick={handleBulkSave}
                  className={`flex items-center justify-center gap-1 md:gap-2 min-h-touch min-w-touch md:min-w-0 md:px-4 rounded-full font-medium text-ui-sm transition-micro cursor-pointer active:scale-95 ${darkMode ? 'hover:bg-theme-muted text-theme-text' : 'hover:bg-theme-muted text-theme-text'}`}
                >
                  <Icons.Check /> <span className="hidden md:inline">{t('common.save')}</span>
                </button>
                <button
                  onClick={handleBulkFavorite}
                  className={`flex items-center justify-center gap-1 md:gap-2 min-h-touch min-w-touch md:min-w-0 md:px-4 rounded-full font-medium text-ui-sm transition-micro cursor-pointer active:scale-95 ${darkMode ? 'hover:bg-theme-muted text-theme-text' : 'hover:bg-theme-muted text-theme-text'}`}
                >
                  <Icons.Star /> <span className="hidden md:inline">{t('library.favorite')}</span>
                </button>
                <div className={`w-px h-5 md:h-6 ${darkMode ? 'bg-theme-border' : 'bg-theme-border'}`}></div>
                <button
                  onClick={() => setExportModalOpen(true)}
                  className={`flex items-center justify-center gap-1 md:gap-2 min-h-touch min-w-touch md:min-w-0 md:px-4 rounded-full font-medium text-ui-sm transition-micro cursor-pointer active:scale-95 ${darkMode ? 'hover:bg-theme-muted text-theme-text' : 'hover:bg-theme-muted text-theme-text'}`}
                >
                  <Icons.Share /> <span className="hidden md:inline">{t('library.export')}</span>
                </button>
              </>
            )}
          </div>
        );
      })()}

      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        articles={articles.filter(a => selectedIds.has(a.id))}
      />
    </div>
  );
}
