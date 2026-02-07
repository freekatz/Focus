import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { rssApi, subscriptionsApi } from '../../api';
import { CATEGORY_OPTIONS } from '../../types/subscription';

interface AddSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddSourceModal({ isOpen, onClose, onSuccess }: AddSourceModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'input' | 'confirm'>('input');
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [homepage, setHomepage] = useState('');
  const [category, setCategory] = useState('blog');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParse = async () => {
    if (!url.trim()) {
      setError(t('sources.pleaseEnterUrl'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await rssApi.parseUrl(url);
      setName(response.title || '');
      setDescription(response.description || '');
      setStep('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('sources.failedToParseFeed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError(t('sources.pleaseEnterName'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 创建 RSS 源
      const source = await rssApi.create({
        name: name.trim(),
        url: url.trim(),
        category,
        description: description.trim() || undefined,
        website_url: homepage.trim() || undefined,
      });

      // 自动订阅新创建的源
      await subscriptionsApi.subscribe(source.id);

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('sources.failedToCreateSource'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('input');
    setUrl('');
    setName('');
    setDescription('');
    setHomepage('');
    setCategory('blog');
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('sources.addRssSource')}>
      <div className="space-y-4">
        {step === 'input' ? (
          <>
            <div>
              <label className="block text-caption font-medium uppercase tracking-wider mb-2 text-theme-text-tertiary">
                {t('sources.rssUrl')}
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/feed.xml"
                className="w-full min-h-touch p-3 rounded-xl border outline-none focus:ring-2 transition-all text-body-sm bg-theme-muted border-theme-border text-theme-text placeholder-theme-text-tertiary focus:ring-theme-accent/30"
              />
            </div>

            <button
              onClick={handleParse}
              disabled={loading || !url.trim()}
              className={`w-full min-h-touch py-3 rounded-xl font-medium transition-all text-ui bg-theme-accent hover:bg-theme-accent-hover text-white ${loading || !url.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? t('common.parsing') : t('sources.getFeedInfo')}
            </button>
          </>
        ) : (
          <>
            <div>
              <label className="block text-caption font-medium uppercase tracking-wider mb-2 text-theme-text-tertiary">
                {t('sources.name')}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Feed name"
                className="w-full min-h-touch p-3 rounded-xl border outline-none focus:ring-2 transition-all text-body-sm bg-theme-muted border-theme-border text-theme-text placeholder-theme-text-tertiary focus:ring-theme-accent/30"
              />
            </div>

            <div>
              <label className="block text-caption font-medium uppercase tracking-wider mb-2 text-theme-text-tertiary">
                {t('sources.descriptionOptional')}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description"
                rows={2}
                className="w-full min-h-touch p-3 rounded-xl border outline-none focus:ring-2 transition-all text-body-sm resize-none bg-theme-muted border-theme-border text-theme-text placeholder-theme-text-tertiary focus:ring-theme-accent/30"
              />
            </div>

            <div>
              <label className="block text-caption font-medium uppercase tracking-wider mb-2 text-theme-text-tertiary">
                {t('sources.category')}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full min-h-touch p-3 rounded-xl border outline-none focus:ring-2 transition-all text-body-sm bg-theme-muted border-theme-border text-theme-text focus:ring-theme-accent/30"
              >
                {CATEGORY_OPTIONS.map(cat => (
                  <option key={cat} value={cat}>{t(`categories.${cat}`)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-caption font-medium uppercase tracking-wider mb-2 text-theme-text-tertiary">
                {t('sources.homepageOptional')}
              </label>
              <input
                type="url"
                value={homepage}
                onChange={(e) => setHomepage(e.target.value)}
                placeholder="https://example.com"
                className="w-full min-h-touch p-3 rounded-xl border outline-none focus:ring-2 transition-all text-body-sm bg-theme-muted border-theme-border text-theme-text placeholder-theme-text-tertiary focus:ring-theme-accent/30"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('input')}
                className="flex-1 min-h-touch py-3 rounded-xl font-medium transition-all text-ui border border-theme-border text-theme-text-secondary hover:bg-theme-muted"
              >
                {t('common.back')}
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || !name.trim()}
                className={`flex-1 min-h-touch py-3 rounded-xl font-medium transition-all text-ui bg-theme-accent hover:bg-theme-accent-hover text-white ${loading || !name.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? t('common.adding') : t('sources.addSource')}
              </button>
            </div>
          </>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 rounded-lg text-body-sm text-center bg-red-50 text-red-600">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
