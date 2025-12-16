import React, { useState } from 'react';
import { Icons } from '../../components/icons/Icons';
import type { Feed } from '../../types';
import { CATEGORY_DISPLAY, type RssCategory } from '../../types/subscription';

// Build categories from shared CATEGORY_DISPLAY
const CATEGORIES = (Object.entries(CATEGORY_DISPLAY) as [RssCategory, string][]).map(
  ([value, label]) => ({ value, label })
);

interface SourceConfigModalProps {
  feed: Feed;
  type: 'my' | 'market';
  onClose: () => void;
  onSave: (f: Feed) => void;
  onDelete?: (f: Feed) => void;
  onRefresh?: (f: Feed) => Promise<{ success: boolean; newCount: number; error?: string }>;
  darkMode: boolean;
}

export function SourceConfigModal({ feed, type, onClose, onSave, onDelete, onRefresh, darkMode }: SourceConfigModalProps) {
  const [formData, setFormData] = useState<Feed>({ ...feed });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(feed);
      onClose();
    }
  };

  const handleRefresh = async () => {
    if (!onRefresh || refreshing) return;

    setRefreshing(true);
    setRefreshResult(null);

    try {
      const result = await onRefresh(feed);
      if (result.success) {
        setRefreshResult({
          type: 'success',
          text: result.newCount > 0 ? `Found ${result.newCount} new article(s)` : 'Already up to date'
        });
      } else {
        setRefreshResult({
          type: 'error',
          text: result.error || 'Refresh failed'
        });
      }
    } catch {
      setRefreshResult({
        type: 'error',
        text: 'Refresh failed'
      });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className={`relative w-full max-w-md rounded-2xl shadow-xl p-6 ${darkMode ? 'bg-slate-900 text-white' : 'bg-white text-zinc-900'}`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold font-serif">{type === 'my' ? 'Subscription Settings' : 'Edit Source'}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10"><Icons.X /></button>
        </div>

        <div className="space-y-4">
          {type === 'market' && (
            <>
              <div>
                <label className="block text-xs font-medium uppercase text-zinc-500 mb-1">Name</label>
                <input name="name" value={formData.name} onChange={handleChange} className={`w-full p-2 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-zinc-50 border-zinc-200'}`} />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase text-zinc-500 mb-1">RSS URL</label>
                <input name="url" value={formData.url} onChange={handleChange} className={`w-full p-2 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-zinc-50 border-zinc-200'}`} />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase text-zinc-500 mb-1">Category</label>
                <select
                  name="category"
                  value={formData._marketItem?.category || 'other'}
                  onChange={(e) => {
                    if (formData._marketItem) {
                      setFormData({
                        ...formData,
                        category: CATEGORY_DISPLAY[e.target.value as RssCategory] || e.target.value,
                        _marketItem: { ...formData._marketItem, category: e.target.value as RssCategory }
                      });
                    }
                  }}
                  className={`w-full p-2 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-zinc-50 border-zinc-200'}`}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase text-zinc-500 mb-1">Homepage</label>
                <input name="homepage" value={formData.homepage || ''} onChange={handleChange} className={`w-full p-2 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-zinc-50 border-zinc-200'}`} />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase text-zinc-500 mb-1">Description</label>
                <textarea name="description" value={formData.description || ''} onChange={handleChange} className={`w-full p-2 rounded-lg border h-20 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-zinc-50 border-zinc-200'}`} />
              </div>
            </>
          )}

          {type === 'my' && (
            <>
              <div>
                <label className="block text-xs font-medium uppercase text-zinc-500 mb-1">Auto-Refresh Interval</label>
                <select name="refreshRate" value={formData.refreshRate || 'Daily'} onChange={handleChange} className={`w-full p-2 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-zinc-50 border-zinc-200'}`}>
                  <option value="15min">Every 15 minutes</option>
                  <option value="30min">Every 30 minutes</option>
                  <option value="Hourly">Hourly</option>
                  <option value="4Hours">Every 4 hours</option>
                  <option value="Daily">Daily</option>
                </select>
              </div>

              {/* Manual Refresh Button */}
              {onRefresh && (
                <div>
                  <label className="block text-xs font-medium uppercase text-zinc-500 mb-1">Manual Refresh</label>
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className={`w-full p-2 rounded-lg border flex items-center justify-center gap-2 transition-colors ${
                      refreshing
                        ? 'opacity-50 cursor-not-allowed'
                        : darkMode
                          ? 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                          : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    <div className={refreshing ? 'animate-spin' : ''}>
                      <Icons.Refresh />
                    </div>
                    <span className="text-sm">{refreshing ? 'Refreshing...' : 'Refresh Now'}</span>
                  </button>
                  {refreshResult && (
                    <div className={`mt-2 px-3 py-2 rounded-lg text-xs text-center ${
                      refreshResult.type === 'success'
                        ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600')
                        : (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600')
                    }`}>
                      {refreshResult.text}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Delete Confirmation for market (Delete RSS Source) */}
        {showDeleteConfirm && type === 'market' && (
          <div className={`mt-4 p-4 rounded-lg border ${darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
            <p className={`text-sm mb-3 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
              Are you sure you want to delete "{feed.name}"? This will remove the source and all its unread articles.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
                  darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-zinc-100 hover:bg-zinc-200'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-between">
          {/* Delete button for market (RSS Source) */}
          {type === 'market' && onDelete && !showDeleteConfirm && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                darkMode
                  ? 'text-red-400 hover:bg-red-900/30'
                  : 'text-red-600 hover:bg-red-50'
              }`}
            >
              <Icons.Trash />
              Delete
            </button>
          )}
          {(type === 'my' || !onDelete || showDeleteConfirm) && <div />}

          <div className="flex gap-3">
            <button onClick={onClose} className={`px-4 py-2 rounded-lg text-sm font-medium ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-zinc-100'}`}>Cancel</button>
            <button onClick={() => { onSave(formData); onClose(); }} className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${darkMode ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-spira-600 hover:bg-spira-500'}`}>Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}
