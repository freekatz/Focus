import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Feed>({ ...feed, allow_ssl_bypass: feed.allow_ssl_bypass ?? true });
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
          text: result.newCount > 0 ? t('sources.foundNewArticles', { count: result.newCount }) : t('sources.alreadyUpToDate')
        });
      } else {
        setRefreshResult({
          type: 'error',
          text: result.error || t('sources.refreshFeedFailed')
        });
      }
    } catch {
      setRefreshResult({
        type: 'error',
        text: t('sources.refreshFeedFailed')
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
          <h3 className="text-xl font-bold font-serif">{type === 'my' ? t('sources.subscriptionSettings') : t('sources.editSource')}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10"><Icons.X /></button>
        </div>

        <div className="space-y-4">
          {type === 'market' && (
            <>
              <div>
                <label className="block text-xs font-medium uppercase text-zinc-500 mb-1">{t('sources.name')}</label>
                <input name="name" value={formData.name} onChange={handleChange} className={`w-full p-2 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-zinc-50 border-zinc-200'}`} />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase text-zinc-500 mb-1">{t('sources.rssUrl')}</label>
                <input name="url" value={formData.url} onChange={handleChange} className={`w-full p-2 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-zinc-50 border-zinc-200'}`} />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase text-zinc-500 mb-1">{t('sources.category')}</label>
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
                <label className="block text-xs font-medium uppercase text-zinc-500 mb-1">{t('sources.homepage')}</label>
                <input name="homepage" value={formData.homepage || ''} onChange={handleChange} className={`w-full p-2 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-zinc-50 border-zinc-200'}`} />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase text-zinc-500 mb-1">{t('sources.description')}</label>
                <textarea name="description" value={formData.description || ''} onChange={handleChange} className={`w-full p-2 rounded-lg border h-20 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-zinc-50 border-zinc-200'}`} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-medium uppercase text-zinc-500">{t('sources.allowSslBypass')}</label>
                  <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-500' : 'text-zinc-400'}`}>{t('sources.allowSslBypassDesc')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, allow_ssl_bypass: !formData.allow_ssl_bypass })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    formData.allow_ssl_bypass
                      ? (darkMode ? 'bg-indigo-600' : 'bg-spira-600')
                      : (darkMode ? 'bg-slate-700' : 'bg-zinc-200')
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform ${
                      darkMode ? 'bg-slate-300' : 'bg-white'
                    } ${formData.allow_ssl_bypass ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
              </div>
            </>
          )}

          {type === 'my' && (
            <>
              <div>
                <label className="block text-xs font-medium uppercase text-zinc-500 mb-1">{t('sources.autoRefreshInterval')}</label>
                <select name="refreshRate" value={formData.refreshRate || 'Daily'} onChange={handleChange} className={`w-full p-2 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-zinc-50 border-zinc-200'}`}>
                  <option value="15min">{t('sources.every15min')}</option>
                  <option value="30min">{t('sources.every30min')}</option>
                  <option value="Hourly">{t('sources.hourly')}</option>
                  <option value="4Hours">{t('sources.every4hours')}</option>
                  <option value="Daily">{t('sources.daily')}</option>
                </select>
              </div>

              {/* Manual Refresh Button */}
              {onRefresh && (
                <div>
                  <label className="block text-xs font-medium uppercase text-zinc-500 mb-1">{t('sources.manualRefresh')}</label>
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
                    <span className="text-sm">{refreshing ? t('sources.refreshing') : t('sources.refreshNow')}</span>
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
              {t('sources.deleteConfirmMessage', { name: feed.name })}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
                  darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-zinc-100 hover:bg-zinc-200'
                }`}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white"
              >
                {t('common.delete')}
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
              {t('common.delete')}
            </button>
          )}
          {(type === 'my' || !onDelete || showDeleteConfirm) && <div />}

          <div className="flex gap-3">
            <button onClick={onClose} className={`px-4 py-2 rounded-lg text-sm font-medium ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-zinc-100'}`}>{t('common.cancel')}</button>
            <button onClick={() => { onSave(formData); onClose(); }} className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${darkMode ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-spira-600 hover:bg-spira-500'}`}>{t('settings.saveChanges')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
