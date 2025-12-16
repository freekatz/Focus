import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Icons } from '../../components/icons/Icons';
import { entriesApi } from '../../api';
import { mapEntryToArticle, mapActionToBackendStatus } from '../../utils/mappers';
import { ExportModal } from '../../components/shared/ExportModal';
import { useToast } from '../../context/ToastContext';
import type { Article, EntryStatus } from '../../types';

interface LibraryViewProps {
  darkMode: boolean;
  onOpenArticle: (article: Article) => void;
}

type SortField = 'date' | 'title';
type SortOrder = 'asc' | 'desc';

const PAGE_SIZE = 20;

export function LibraryView({ darkMode, onOpenArticle }: LibraryViewProps) {
  const { showToast } = useToast();
  const [articles, setArticles] = useState<Article[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Filter states - multi-select for status, default to saved and favorite
  const [statusFilters, setStatusFilters] = useState<Set<EntryStatus>>(new Set(['interested', 'favorite']));
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [letterFilter, setLetterFilter] = useState<string>('all');

  // Sort states
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Filter dropdown visibility
  const [showFilters, setShowFilters] = useState(false);

  // Fetch all entries with pagination support (API limits page_size to 100)
  const fetchAllPages = async (status: EntryStatus) => {
    const allItems: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await entriesApi.list({ status, page, page_size: 100 });
      allItems.push(...response.items);
      hasMore = response.items.length === 100;
      page++;
    }

    return allItems;
  };

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setSelectedIds(new Set());
    try {
      const [unreadItems, interestedItems, favoriteItems, archivedItems, trashItems] = await Promise.all([
        fetchAllPages('unread'),
        fetchAllPages('interested'),
        fetchAllPages('favorite'),
        fetchAllPages('archived'),
        fetchAllPages('trash'),
      ]);
      const allEntries = [
        ...unreadItems,
        ...interestedItems,
        ...favoriteItems,
        ...archivedItems,
        ...trashItems,
      ];
      const mappedArticles = allEntries.map(mapEntryToArticle);
      setArticles(mappedArticles);
    } catch (error) {
      console.error('Failed to fetch entries:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

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

  // Filter and sort articles
  const filteredAndSorted = useMemo(() => {
    let result = articles;

    // Multi-select status filter
    if (statusFilters.size > 0) {
      result = result.filter(a => a._entry?.status && statusFilters.has(a._entry.status));
    }

    if (categoryFilter !== 'all') {
      result = result.filter(a => a._entry?.rss_source_name === categoryFilter);
    }

    if (yearFilter !== 'all') {
      result = result.filter(a => {
        if (!a._entry?.published_at) return false;
        return new Date(a._entry.published_at).getFullYear().toString() === yearFilter;
      });
    }

    if (letterFilter !== 'all') {
      result = result.filter(a => {
        const firstChar = a.title.charAt(0).toUpperCase();
        if (letterFilter === '#') {
          return !/[A-Z]/.test(firstChar);
        }
        return firstChar === letterFilter;
      });
    }

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(a =>
        a.title.toLowerCase().includes(searchLower) ||
        a.author.toLowerCase().includes(searchLower) ||
        a.tags.some(t => t.toLowerCase().includes(searchLower))
      );
    }

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
  }, [articles, statusFilters, categoryFilter, yearFilter, letterFilter, search, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSorted.length / PAGE_SIZE);
  const paginatedArticles = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAndSorted.slice(start, start + PAGE_SIZE);
  }, [filteredAndSorted, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilters, categoryFilter, yearFilter, letterFilter, search, sortField, sortOrder]);

  // Toggle status in multi-select
  const toggleStatusFilter = (status: EntryStatus) => {
    setStatusFilters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(status)) {
        newSet.delete(status);
      } else {
        newSet.add(status);
      }
      return newSet;
    });
  };

  // Clear all filters
  const clearAllFilters = () => {
    setStatusFilters(new Set());
    setCategoryFilter('all');
    setYearFilter('all');
    setLetterFilter('all');
    setSearch('');
  };

  // Check if any filter is active
  const hasActiveFilters = statusFilters.size > 0 || categoryFilter !== 'all' || yearFilter !== 'all' || letterFilter !== 'all' || search !== '';

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
        showToast(`${ids.length} article${ids.length > 1 ? 's' : ''} discarded`, 'success');
      } catch (error) {
        console.error('Failed to bulk discard:', error);
        showToast('Failed to discard articles', 'error');
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
        showToast(`${ids.length} article${ids.length > 1 ? 's' : ''} favorited`, 'success');
      } catch (error) {
        console.error('Failed to bulk favorite:', error);
        showToast('Failed to favorite articles', 'error');
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
        showToast(`${ids.length} article${ids.length > 1 ? 's' : ''} saved`, 'success');
      } catch (error) {
        console.error('Failed to bulk save:', error);
        showToast('Failed to save articles', 'error');
      }
    }
  };

  const openOriginalLink = (e: React.MouseEvent, link: string) => {
    e.stopPropagation();
    window.open(link, '_blank', 'noopener,noreferrer');
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
      all: 'All Status',
      unread: 'Unread',
      interested: 'Saved',
      favorite: 'Favorite',
      archived: 'Archived',
      trash: 'Trash',
    };
    return labels[status] || status;
  };

  const letters = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

  return (
    <div className="animate-fade-in space-y-4 pb-32 relative">
      {/* Header */}
      <header className="flex justify-between items-center">
        <h2 className={`text-3xl font-serif font-bold ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Library</h2>
        <span className={`text-sm ${darkMode ? 'text-slate-500' : 'text-zinc-400'}`}>
          {filteredAndSorted.length} articles
        </span>
      </header>

      {/* Search + Filter + Sort Row */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border outline-none focus:ring-2 transition-all ${darkMode ? 'bg-slate-800 border-slate-700 focus:ring-indigo-500 text-white placeholder-slate-500' : 'bg-white border-zinc-200 focus:ring-spira-200 text-zinc-900 placeholder-zinc-400'}`}
          />
          <div className="absolute left-3 top-2.5 text-zinc-400">
            <Icons.Search />
          </div>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
            showFilters || hasActiveFilters
              ? (darkMode ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-spira-600 border-spira-500 text-white')
              : (darkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600' : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300')
          }`}
        >
          <Icons.Filter />
          <span className="text-sm font-medium">Filter</span>
          {hasActiveFilters && (
            <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${darkMode ? 'bg-indigo-500' : 'bg-spira-500'}`}>
              {statusFilters.size + (categoryFilter !== 'all' ? 1 : 0) + (yearFilter !== 'all' ? 1 : 0) + (letterFilter !== 'all' ? 1 : 0)}
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border transition-all text-sm font-medium ${
              darkMode ? 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600' : 'border-zinc-200 text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
            }`}
          >
            <Icons.X />
            Clear
          </button>
        )}

        <div className={`flex rounded-xl border overflow-hidden ${darkMode ? 'border-slate-700' : 'border-zinc-200'}`}>
          <button
            onClick={() => toggleSort('date')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-all ${
              sortField === 'date'
                ? (darkMode ? 'bg-slate-700 text-white' : 'bg-zinc-100 text-zinc-900')
                : (darkMode ? 'bg-slate-800 text-slate-400 hover:text-slate-200' : 'bg-white text-zinc-500 hover:text-zinc-700')
            }`}
          >
            {sortField === 'date' && sortOrder === 'desc' ? <Icons.SortDesc /> : <Icons.SortAsc />}
            Date
          </button>
          <button
            onClick={() => toggleSort('title')}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-l transition-all ${
              sortField === 'title'
                ? (darkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-zinc-100 text-zinc-900 border-zinc-200')
                : (darkMode ? 'bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700' : 'bg-white text-zinc-500 hover:text-zinc-700 border-zinc-200')
            }`}
          >
            {sortField === 'title' && sortOrder === 'desc' ? <Icons.SortDesc /> : <Icons.SortAsc />}
            Title
          </button>
        </div>
      </div>

      {/* Filter Panel - Floating Overlay */}
      {showFilters && (
        <>
          {/* Backdrop to close on click outside */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowFilters(false)}
          />
          <div className={`absolute left-4 right-4 md:left-auto md:right-8 md:w-[500px] z-20 p-4 rounded-xl border shadow-xl space-y-4 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-zinc-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-zinc-700'}`}>Filters</span>
              <button
                onClick={() => setShowFilters(false)}
                className={`p-1 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-zinc-100 text-zinc-400'}`}
              >
                <Icons.X />
              </button>
            </div>
            {/* Status multi-select */}
            <div className="mb-4">
              <label className={`block text-xs font-medium uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-500' : 'text-zinc-400'}`}>Status</label>
              <div className="flex flex-wrap gap-2">
                {(['unread', 'interested', 'favorite', 'archived', 'trash'] as EntryStatus[]).map(status => (
                  <button
                    key={status}
                    onClick={() => toggleStatusFilter(status)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      statusFilters.has(status)
                        ? status === 'favorite' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400 ring-2 ring-yellow-400/50' :
                          status === 'interested' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 ring-2 ring-green-400/50' :
                          status === 'unread' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 ring-2 ring-blue-400/50' :
                          status === 'trash' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 ring-2 ring-red-400/50' :
                          'bg-zinc-100 text-zinc-700 dark:bg-slate-700 dark:text-slate-300 ring-2 ring-zinc-400/50'
                        : darkMode ? 'bg-slate-700 text-slate-400 hover:text-slate-200' : 'bg-zinc-100 text-zinc-500 hover:text-zinc-700'
                    }`}
                  >
                    {statusFilters.has(status) && <Icons.Check />}
                    {getStatusLabel(status)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${darkMode ? 'text-slate-500' : 'text-zinc-400'}`}>Source</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className={`w-full p-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-900 border-slate-600 text-white' : 'bg-white border-zinc-200'}`}
                >
                  <option value="all">All Sources</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${darkMode ? 'text-slate-500' : 'text-zinc-400'}`}>Year</label>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className={`w-full p-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-900 border-slate-600 text-white' : 'bg-white border-zinc-200'}`}
                >
                  <option value="all">All Years</option>
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${darkMode ? 'text-slate-500' : 'text-zinc-400'}`}>First Letter</label>
                <select
                  value={letterFilter}
                  onChange={(e) => setLetterFilter(e.target.value)}
                  className={`w-full p-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-900 border-slate-600 text-white' : 'bg-white border-zinc-200'}`}
                >
                  <option value="all">All</option>
                  {letters.map(letter => (
                    <option key={letter} value={letter}>{letter}</option>
                  ))}
                </select>
              </div>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className={`text-sm font-medium ${darkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-spira-600 hover:text-spira-500'}`}
              >
                Clear all filters
              </button>
            )}
          </div>
        </>
      )}

      {/* Select All Row */}
      {paginatedArticles.length > 0 && (
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <span className={`text-sm font-medium ${darkMode ? 'text-indigo-400' : 'text-spira-600'}`}>{selectedIds.size} selected</span>
            )}
          </div>
          <div className="flex items-center gap-3 cursor-pointer" onClick={selectAll}>
            <span className={`text-xs uppercase tracking-wider font-bold ${darkMode ? 'text-slate-500' : 'text-zinc-400'}`}>Select All</span>
            <div
              className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedIds.size === paginatedArticles.length && paginatedArticles.length > 0 ? (darkMode ? 'bg-indigo-600 border-indigo-600' : 'bg-spira-600 border-spira-600') : (darkMode ? 'border-slate-600' : 'border-zinc-300')}`}
            >
              {selectedIds.size === paginatedArticles.length && paginatedArticles.length > 0 && <div className="text-white scale-75"><Icons.Check /></div>}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-2 border-spira-500 border-t-transparent rounded-full"/>
        </div>
      ) : paginatedArticles.length === 0 ? (
        <div className="text-center py-20 opacity-50 flex flex-col items-center">
          <div className="mb-4 p-4 bg-zinc-100 rounded-full dark:bg-slate-800"><Icons.Library /></div>
          <p className="font-medium">No articles found.</p>
          <p className="text-sm">Try adjusting your filters or search terms.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {paginatedArticles.map(article => {
            const isSelected = selectedIds.has(article.id);
            return (
              <div
                key={article.id}
                onClick={() => onOpenArticle(article)}
                className={`relative group flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md active:scale-[0.99] ${
                  isSelected
                    ? (darkMode ? 'bg-indigo-900/20 border-indigo-500/50' : 'bg-spira-50 border-spira-200')
                    : (darkMode ? 'bg-slate-800 border-slate-700 hover:border-indigo-500/30' : 'bg-white border-zinc-200 hover:border-spira-300')
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${darkMode ? 'bg-slate-700 text-indigo-300' : 'bg-zinc-100 text-spira-700'}`}>{article.source}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        article._entry?.status === 'favorite' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        article._entry?.status === 'interested' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        article._entry?.status === 'unread' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        article._entry?.status === 'trash' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-zinc-100 text-zinc-600 dark:bg-slate-700 dark:text-slate-400'
                      }`}>{getStatusLabel(article._entry?.status || 'unread')}</span>
                      <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-zinc-400'}`}>{article.timestamp}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {article.isFavorite && <div className="text-yellow-400 scale-75"><Icons.Star /></div>}
                      {article._entry?.link && (
                        <button
                          onClick={(e) => openOriginalLink(e, article._entry!.link)}
                          className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-zinc-100 text-zinc-400'}`}
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
                      className={`text-base font-bold cursor-pointer hover:underline decoration-2 underline-offset-2 ${darkMode ? 'text-slate-100 decoration-indigo-500' : 'text-zinc-900 decoration-spira-300'}`}
                    >
                      {article.title}
                    </span>
                  </h3>

                  <p className={`text-sm line-clamp-2 mb-2 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-zinc-500'}`}>{article.snippet}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {article.tags.slice(0, 3).map(tag => (
                        <span key={tag} className={`text-[10px] px-2 py-0.5 rounded font-medium ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-zinc-100 text-zinc-600'}`}>#{tag}</span>
                      ))}
                    </div>
                    <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-zinc-400'}`}>{article.readTime}</span>
                  </div>
                </div>

                <div
                  onClick={(e) => toggleSelect(article.id, e)}
                  className={`mt-1 flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors z-10 ${isSelected ? (darkMode ? 'bg-indigo-600 border-indigo-600' : 'bg-spira-600 border-spira-600') : (darkMode ? 'border-slate-600 hover:border-indigo-400' : 'border-zinc-300 hover:border-spira-400')}`}
                >
                  {isSelected && <div className="text-white scale-75"><Icons.Check /></div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={`p-2 rounded-lg transition-colors ${
              currentPage === 1
                ? (darkMode ? 'text-slate-600 cursor-not-allowed' : 'text-zinc-300 cursor-not-allowed')
                : (darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-zinc-500 hover:bg-zinc-100')
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
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === page
                      ? (darkMode ? 'bg-indigo-600 text-white' : 'bg-spira-600 text-white')
                      : (darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-zinc-500 hover:bg-zinc-100')
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
            className={`p-2 rounded-lg transition-colors ${
              currentPage === totalPages
                ? (darkMode ? 'text-slate-600 cursor-not-allowed' : 'text-zinc-300 cursor-not-allowed')
                : (darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-zinc-500 hover:bg-zinc-100')
            }`}
          >
            <Icons.ChevronRight />
          </button>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {(() => {
        const selectedArticles = articles.filter(a => selectedIds.has(a.id));
        const hasTrashSelected = selectedArticles.some(a => a._entry?.status === 'trash');

        return (
          <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-0.5 md:gap-1 p-1.5 md:p-2 rounded-full shadow-2xl transition-all duration-300 max-w-[95vw] ${selectedIds.size > 0 ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'} ${darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-zinc-200'}`}>
            <button
              onClick={() => setSelectedIds(new Set())}
              className={`flex items-center gap-1 md:gap-2 px-2.5 md:px-3 py-2 rounded-full font-medium text-sm transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-zinc-100 text-zinc-500'}`}
              title="Clear selection"
            >
              <Icons.X /> <span className="text-xs">{selectedIds.size}</span>
            </button>
            <div className={`w-px h-5 md:h-6 ${darkMode ? 'bg-slate-700' : 'bg-zinc-200'}`}></div>
            {hasTrashSelected ? (
              // Only show Save button for trashed articles
              <button
                onClick={handleBulkSave}
                className={`flex items-center gap-1.5 md:gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-full font-medium text-sm transition-colors ${darkMode ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-spira-600 hover:bg-spira-500 text-white'}`}
              >
                <Icons.Check /> <span>Restore</span>
              </button>
            ) : (
              // Normal action bar
              <>
                <button
                  onClick={handleBulkDiscard}
                  className="flex items-center gap-1 md:gap-2 px-2.5 md:px-4 py-2 rounded-full hover:bg-red-50 text-red-500 font-medium text-sm transition-colors"
                >
                  <Icons.Trash /> <span className="hidden md:inline">Discard</span>
                </button>
                <div className={`w-px h-5 md:h-6 ${darkMode ? 'bg-slate-700' : 'bg-zinc-200'}`}></div>
                <button
                  onClick={handleBulkSave}
                  className={`flex items-center gap-1 md:gap-2 px-2.5 md:px-4 py-2 rounded-full font-medium text-sm transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-zinc-50 text-zinc-700'}`}
                >
                  <Icons.Check /> <span className="hidden md:inline">Save</span>
                </button>
                <button
                  onClick={handleBulkFavorite}
                  className={`flex items-center gap-1 md:gap-2 px-2.5 md:px-4 py-2 rounded-full font-medium text-sm transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-zinc-50 text-zinc-700'}`}
                >
                  <Icons.Star /> <span className="hidden md:inline">Favorite</span>
                </button>
                <div className={`w-px h-5 md:h-6 ${darkMode ? 'bg-slate-700' : 'bg-zinc-200'}`}></div>
                <button
                  onClick={() => setExportModalOpen(true)}
                  className={`flex items-center gap-1 md:gap-2 px-2.5 md:px-4 py-2 rounded-full font-medium text-sm transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-zinc-50 text-zinc-700'}`}
                >
                  <Icons.Share /> <span className="hidden md:inline">Export</span>
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
        darkMode={darkMode}
      />
    </div>
  );
}
