import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '../icons/Icons';
import { rssApi } from '../../api';
import { CATEGORY_OPTIONS } from '../../types/subscription';

interface AddSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  darkMode: boolean;
}

export function AddSourceModal({ isOpen, onClose, onSuccess, darkMode }: AddSourceModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'input' | 'confirm'>('input');
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [homepage, setHomepage] = useState('');
  const [category, setCategory] = useState('blog');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

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
      await rssApi.create({
        name: name.trim(),
        url: url.trim(),
        category,
        description: description.trim() || undefined,
        website_url: homepage.trim() || undefined,
      });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal - Centered */}
      <div className={`relative w-full max-w-md rounded-2xl shadow-xl ${darkMode ? 'bg-stone-800' : 'bg-white'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-stone-700' : 'border-zinc-200'}`}>
          <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-zinc-900'}`}>
            {t('sources.addRssSource')}
          </h3>
          <button
            onClick={handleClose}
            className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-stone-700 text-stone-400' : 'hover:bg-zinc-100 text-zinc-500'}`}
          >
            <Icons.X />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {step === 'input' ? (
            <>
              <div>
                <label className={`block text-xs font-medium uppercase tracking-wider mb-2 ${darkMode ? 'text-stone-500' : 'text-zinc-400'}`}>
                  {t('sources.rssUrl')}
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/feed.xml"
                  className={`w-full p-3 rounded-xl border outline-none focus:ring-2 transition-all ${
                    darkMode
                      ? 'bg-stone-900 border-stone-600 text-white placeholder-stone-500 focus:ring-teal-500'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:ring-spira-200'
                  }`}
                />
              </div>

              <button
                onClick={handleParse}
                disabled={loading || !url.trim()}
                className={`w-full py-3 rounded-xl font-medium transition-all ${
                  darkMode
                    ? 'bg-teal-600 hover:bg-teal-500 text-white'
                    : 'bg-spira-600 hover:bg-spira-500 text-white'
                } ${loading || !url.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? t('common.parsing') : t('sources.getFeedInfo')}
              </button>
            </>
          ) : (
            <>
              <div>
                <label className={`block text-xs font-medium uppercase tracking-wider mb-2 ${darkMode ? 'text-stone-500' : 'text-zinc-400'}`}>
                  {t('sources.name')}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Feed name"
                  className={`w-full p-3 rounded-xl border outline-none focus:ring-2 transition-all ${
                    darkMode
                      ? 'bg-stone-900 border-stone-600 text-white placeholder-stone-500 focus:ring-teal-500'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:ring-spira-200'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-medium uppercase tracking-wider mb-2 ${darkMode ? 'text-stone-500' : 'text-zinc-400'}`}>
                  {t('sources.descriptionOptional')}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description"
                  rows={2}
                  className={`w-full p-3 rounded-xl border outline-none focus:ring-2 transition-all resize-none ${
                    darkMode
                      ? 'bg-stone-900 border-stone-600 text-white placeholder-stone-500 focus:ring-teal-500'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:ring-spira-200'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-medium uppercase tracking-wider mb-2 ${darkMode ? 'text-stone-500' : 'text-zinc-400'}`}>
                  {t('sources.category')}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={`w-full p-3 rounded-xl border outline-none focus:ring-2 transition-all ${
                    darkMode
                      ? 'bg-stone-900 border-stone-600 text-white focus:ring-teal-500'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:ring-spira-200'
                  }`}
                >
                  {CATEGORY_OPTIONS.map(cat => (
                    <option key={cat} value={cat}>{t(`categories.${cat}`)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-medium uppercase tracking-wider mb-2 ${darkMode ? 'text-stone-500' : 'text-zinc-400'}`}>
                  {t('sources.homepageOptional')}
                </label>
                <input
                  type="url"
                  value={homepage}
                  onChange={(e) => setHomepage(e.target.value)}
                  placeholder="https://example.com"
                  className={`w-full p-3 rounded-xl border outline-none focus:ring-2 transition-all ${
                    darkMode
                      ? 'bg-stone-900 border-stone-600 text-white placeholder-stone-500 focus:ring-teal-500'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:ring-spira-200'
                  }`}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('input')}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all border ${
                    darkMode
                      ? 'border-stone-600 text-stone-300 hover:bg-stone-700'
                      : 'border-zinc-300 text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  {t('common.back')}
                </button>
                <button
                  onClick={handleCreate}
                  disabled={loading || !name.trim()}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                    darkMode
                      ? 'bg-teal-600 hover:bg-teal-500 text-white'
                      : 'bg-spira-600 hover:bg-spira-500 text-white'
                  } ${loading || !name.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading ? t('common.adding') : t('sources.addSource')}
                </button>
              </div>
            </>
          )}

          {/* Error Message */}
          {error && (
            <div className={`p-3 rounded-lg text-sm text-center ${
              darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'
            }`}>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
