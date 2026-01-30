import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '../../components/icons/Icons';
import type { Feed } from '../../types';
import { CATEGORY_OPTIONS, type RssCategory } from '../../types/subscription';

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
      <div className={`relative w-full max-w-md rounded-2xl shadow-xl ${darkMode ? 'bg-stone-900 text-white' : 'bg-white text-zinc-900'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 md:px-6 md:py-5 border-b ${darkMode ? 'border-stone-700' : 'border-zinc-200'}`}>
          <h3 className="text-h3 font-bold">{type === 'my' ? t('sources.subscriptionSettings') : t('sources.editSource')}</h3>
          <button onClick={onClose} className={`min-h-touch min-w-touch flex items-center justify-center rounded-full transition-colors ${darkMode ? 'hover:bg-stone-700 text-stone-400' : 'hover:bg-zinc-100 text-zinc-500'}`}>
            <Icons.X />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 md:px-6 space-y-4">
          {type === 'market' && (
            <>
              <div>
                <label className={`block text-caption font-medium uppercase tracking-wider mb-2 ${darkMode ? 'text-stone-500' : 'text-zinc-400'}`}>{t('sources.name')}</label>
                <input name="name" value={formData.name} onChange={handleChange} className={`w-full min-h-touch p-3 rounded-xl border text-body-sm ${darkMode ? 'bg-stone-800 border-stone-700 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'}`} />
              </div>
              <div>
                <label className={`block text-caption font-medium uppercase tracking-wider mb-2 ${darkMode ? 'text-stone-500' : 'text-zinc-400'}`}>{t('sources.rssUrl')}</label>
                <input name="url" value={formData.url} onChange={handleChange} className={`w-full min-h-touch p-3 rounded-xl border text-body-sm ${darkMode ? 'bg-stone-800 border-stone-700 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'}`} />
              </div>
              <div>
                <label className={`block text-caption font-medium uppercase tracking-wider mb-2 ${darkMode ? 'text-stone-500' : 'text-zinc-400'}`}>{t('sources.category')}</label>
                <select
                  name="category"
                  value={formData._marketItem?.category || 'other'}
                  onChange={(e) => {
                    if (formData._marketItem) {
                      setFormData({
                        ...formData,
                        category: e.target.value,
                        _marketItem: { ...formData._marketItem, category: e.target.value as RssCategory }
                      });
                    }
                  }}
                  className={`w-full min-h-touch p-3 rounded-xl border text-body-sm ${darkMode ? 'bg-stone-800 border-stone-700 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'}`}
                >
                  {CATEGORY_OPTIONS.map(cat => (
                    <option key={cat} value={cat}>{t(`categories.${cat}`)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-caption font-medium uppercase tracking-wider mb-2 ${darkMode ? 'text-stone-500' : 'text-zinc-400'}`}>{t('sources.homepage')}</label>
                <input name="homepage" value={formData.homepage || ''} onChange={handleChange} className={`w-full min-h-touch p-3 rounded-xl border text-body-sm ${darkMode ? 'bg-stone-800 border-stone-700 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'}`} />
              </div>
              <div>
                <label className={`block text-caption font-medium uppercase tracking-wider mb-2 ${darkMode ? 'text-stone-500' : 'text-zinc-400'}`}>{t('sources.description')}</label>
                <textarea name="description" value={formData.description || ''} onChange={handleChange} className={`w-full min-h-touch p-3 rounded-xl border h-20 text-body-sm resize-none ${darkMode ? 'bg-stone-800 border-stone-700 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'}`} />
              </div>
            </>
          )}

          {type === 'my' && (
            <>
              <div>
                <label className={`block text-caption font-medium uppercase tracking-wider mb-2 ${darkMode ? 'text-stone-500' : 'text-zinc-400'}`}>{t('sources.refreshTime')}</label>
                <select name="refreshTime" value={formData.refreshTime || 'default'} onChange={handleChange} className={`w-full min-h-touch p-3 rounded-xl border text-body-sm ${darkMode ? 'bg-stone-800 border-stone-700 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'}`}>
                  <option value="default">{t('sources.daily')}</option>
                  <option value="06:00">{t('sources.daily6am')}</option>
                  <option value="08:00">{t('sources.daily8am')}</option>
                  <option value="09:00">{t('sources.daily9am')}</option>
                  <option value="12:00">{t('sources.daily12pm')}</option>
                  <option value="18:00">{t('sources.daily6pm')}</option>
                  <option value="20:00">{t('sources.daily8pm')}</option>
                </select>
              </div>

              {/* Manual Refresh Button */}
              {onRefresh && (
                <div>
                  <label className={`block text-caption font-medium uppercase tracking-wider mb-2 ${darkMode ? 'text-stone-500' : 'text-zinc-400'}`}>{t('sources.manualRefresh')}</label>
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className={`w-full min-h-touch p-3 rounded-xl border flex items-center justify-center gap-2 transition-colors ${
                      refreshing
                        ? 'opacity-50 cursor-not-allowed'
                        : darkMode
                          ? 'bg-stone-800 border-stone-700 hover:bg-stone-700'
                          : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    <div className={refreshing ? 'animate-spin' : ''}>
                      <Icons.Refresh />
                    </div>
                    <span className="text-ui-sm">{refreshing ? t('sources.refreshing') : t('sources.refreshNow')}</span>
                  </button>
                  {refreshResult && (
                    <div className={`mt-2 px-3 py-2 rounded-xl text-caption text-center ${
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
          <div className={`mx-5 md:mx-6 mb-4 p-4 rounded-xl border ${darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
            <p className={`text-body-sm mb-3 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
              {t('sources.deleteConfirmMessage', { name: feed.name })}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className={`flex-1 min-h-touch px-4 rounded-xl text-ui-sm font-medium ${
                  darkMode ? 'bg-stone-700 hover:bg-stone-600' : 'bg-zinc-100 hover:bg-zinc-200'
                }`}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 min-h-touch px-4 rounded-xl text-ui-sm font-medium bg-red-600 hover:bg-red-500 text-white"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className={`flex justify-between items-center px-5 py-4 md:px-6 md:py-5 border-t ${darkMode ? 'border-stone-700' : 'border-zinc-200'}`}>
          {/* Delete button for market (RSS Source) */}
          {type === 'market' && onDelete && !showDeleteConfirm && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className={`min-h-touch px-4 rounded-xl text-ui-sm font-medium flex items-center gap-2 ${
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
            <button onClick={onClose} className={`min-h-touch px-4 rounded-xl text-ui font-medium border transition-colors ${darkMode ? 'border-stone-600 text-stone-300 hover:bg-stone-700' : 'border-zinc-300 text-zinc-700 hover:bg-zinc-50'}`}>{t('common.cancel')}</button>
            <button onClick={() => { onSave(formData); onClose(); }} className={`min-h-touch px-4 rounded-xl text-ui font-medium text-white transition-colors ${darkMode ? 'bg-teal-600 hover:bg-teal-500' : 'bg-spira-600 hover:bg-spira-500'}`}>{t('settings.saveChanges')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
