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
}

export function SourceConfigModal({ feed, type, onClose, onSave, onDelete, onRefresh }: SourceConfigModalProps) {
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
      <div className="relative w-full max-w-md rounded-2xl shadow-xl bg-theme-surface text-theme-text">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 md:px-6 md:py-5 border-b border-theme-border">
          <h3 className="text-h3 font-bold">{type === 'my' ? t('sources.subscriptionSettings') : t('sources.editSource')}</h3>
          <button onClick={onClose} className="min-h-touch min-w-touch flex items-center justify-center rounded-full transition-colors hover:bg-theme-muted text-theme-text-secondary">
            <Icons.X />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 md:px-6 space-y-4">
          {type === 'market' && (
            <>
              <div>
                <label className="block text-caption font-medium uppercase tracking-wider mb-2 text-theme-text-tertiary">{t('sources.name')}</label>
                <input name="name" value={formData.name} onChange={handleChange} className="w-full min-h-touch p-3 rounded-xl border text-body-sm bg-theme-muted border-theme-border text-theme-text" />
              </div>
              <div>
                <label className="block text-caption font-medium uppercase tracking-wider mb-2 text-theme-text-tertiary">{t('sources.rssUrl')}</label>
                <input name="url" value={formData.url} onChange={handleChange} className="w-full min-h-touch p-3 rounded-xl border text-body-sm bg-theme-muted border-theme-border text-theme-text" />
              </div>
              <div>
                <label className="block text-caption font-medium uppercase tracking-wider mb-2 text-theme-text-tertiary">{t('sources.category')}</label>
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
                  className="w-full min-h-touch p-3 rounded-xl border text-body-sm bg-theme-muted border-theme-border text-theme-text"
                >
                  {CATEGORY_OPTIONS.map(cat => (
                    <option key={cat} value={cat}>{t(`categories.${cat}`)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-caption font-medium uppercase tracking-wider mb-2 text-theme-text-tertiary">{t('sources.homepage')}</label>
                <input name="homepage" value={formData.homepage || ''} onChange={handleChange} className="w-full min-h-touch p-3 rounded-xl border text-body-sm bg-theme-muted border-theme-border text-theme-text" />
              </div>
              <div>
                <label className="block text-caption font-medium uppercase tracking-wider mb-2 text-theme-text-tertiary">{t('sources.description')}</label>
                <textarea name="description" value={formData.description || ''} onChange={handleChange} className="w-full min-h-touch p-3 rounded-xl border h-20 text-body-sm resize-none bg-theme-muted border-theme-border text-theme-text" />
              </div>
            </>
          )}

          {type === 'my' && (
            <>
              <div>
                <label className="block text-caption font-medium uppercase tracking-wider mb-2 text-theme-text-tertiary">{t('sources.refreshTime')}</label>
                <select name="refreshTime" value={formData.refreshTime || 'default'} onChange={handleChange} className="w-full min-h-touch p-3 rounded-xl border text-body-sm bg-theme-muted border-theme-border text-theme-text">
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
                  <label className="block text-caption font-medium uppercase tracking-wider mb-2 text-theme-text-tertiary">{t('sources.manualRefresh')}</label>
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className={`w-full min-h-touch p-3 rounded-xl border flex items-center justify-center gap-2 transition-colors bg-theme-muted border-theme-border hover:bg-theme-border ${
                      refreshing ? 'opacity-50 cursor-not-allowed' : ''
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
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
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
          <div className="mx-5 md:mx-6 mb-4 p-4 rounded-xl border bg-red-50 border-red-200">
            <p className="text-body-sm mb-3 text-red-700">
              {t('sources.deleteConfirmMessage', { name: feed.name })}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 min-h-touch px-4 rounded-xl text-ui-sm font-medium bg-theme-muted hover:bg-theme-border"
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
        <div className="flex justify-between items-center px-5 py-4 md:px-6 md:py-5 border-t border-theme-border">
          {/* Delete button for market (RSS Source) */}
          {type === 'market' && onDelete && !showDeleteConfirm && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="min-h-touch px-4 rounded-xl text-ui-sm font-medium flex items-center gap-2 text-red-600 hover:bg-red-50"
            >
              <Icons.Trash />
              {t('common.delete')}
            </button>
          )}
          {(type === 'my' || !onDelete || showDeleteConfirm) && <div />}

          <div className="flex gap-3">
            <button onClick={onClose} className="min-h-touch px-4 rounded-xl text-ui font-medium border transition-colors border-theme-border text-theme-text-secondary hover:bg-theme-muted">{t('common.cancel')}</button>
            <button onClick={() => { onSave(formData); onClose(); }} className="min-h-touch px-4 rounded-xl text-ui font-medium text-white transition-colors bg-theme-accent hover:bg-theme-accent-hover">{t('settings.saveChanges')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
