import { useState, useEffect } from 'react';
import { Icons } from '../../components/icons/Icons';
import { ArticleContent } from '../../components/shared/ArticleContent';
import { shareApi, type ShareDetailResponse } from '../../api/share';
import type { Entry } from '../../types';

interface ShareViewProps {
  code: string;
  darkMode: boolean;
}

export function ShareView({ code, darkMode }: ShareViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareData, setShareData] = useState<ShareDetailResponse | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    const fetchShare = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await shareApi.getShare(code);
        setShareData(data);
        // Auto-expand if only one article
        if (data.entries && data.entries.length === 1) {
          setExpandedId(data.entries[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load share');
      } finally {
        setLoading(false);
      }
    };

    if (code) {
      fetchShare();
    }
  }, [code]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-slate-900' : 'bg-spira-50'}`}>
        <div className="animate-spin h-8 w-8 border-2 border-spira-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-spira-50 text-zinc-900'}`}>
        <div className={`p-4 rounded-full mb-4 ${darkMode ? 'bg-slate-800 text-red-400' : 'bg-red-50 text-red-500'}`}>
          <Icons.X />
        </div>
        <h1 className="text-2xl font-serif font-medium mb-2">
          {error === 'Share not found' ? 'Not Found' : error === 'Share has expired' ? 'Expired' : 'Error'}
        </h1>
        <p className={`text-center max-w-md ${darkMode ? 'text-slate-400' : 'text-zinc-500'}`}>
          {error === 'Share not found'
            ? 'This share link does not exist or has been removed.'
            : error === 'Share has expired'
            ? 'This share link has expired and is no longer accessible.'
            : 'Something went wrong while loading this share.'}
        </p>
      </div>
    );
  }

  if (!shareData) return null;

  const { entries, text_content, description, created_at, expires_at, share_type } = shareData;

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-spira-50 text-zinc-900'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-10 border-b backdrop-blur-sm ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-spira-50/90 border-zinc-200'}`}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-indigo-600' : 'bg-spira-600'}`}>
              <span className="w-5 h-5 text-white"><Icons.Focus /></span>
            </div>
            <span className="font-semibold text-lg">Focus</span>
          </div>
          <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-zinc-500'}`}>
            Shared {formatDate(created_at)}
            {expires_at && (
              <span className="ml-2">
                · Expires {formatDate(expires_at)}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Description if exists */}
        {description && (
          <div className={`mb-8 p-4 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-white'} shadow-sm`}>
            <p className={darkMode ? 'text-slate-300' : 'text-zinc-700'}>{description}</p>
          </div>
        )}

        {/* Text Share */}
        {share_type === 'text' && text_content && (
          <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-white'} shadow-sm`}>
            <div className={`prose max-w-none ${darkMode ? 'prose-invert' : ''}`}>
              <pre className="whitespace-pre-wrap font-sans">{text_content}</pre>
            </div>
          </div>
        )}

        {/* Entry Share */}
        {share_type === 'entries' && entries && entries.length > 0 && (
          <div className="space-y-4">
            {/* Stats */}
            <div className={`text-sm mb-6 ${darkMode ? 'text-slate-400' : 'text-zinc-500'}`}>
              {entries.length} {entries.length === 1 ? 'article' : 'articles'} shared
            </div>

            {entries.map((entry: Entry) => (
              <article
                key={entry.id}
                className={`rounded-2xl overflow-hidden transition-all ${
                  darkMode ? 'bg-slate-800' : 'bg-white'
                } shadow-sm hover:shadow-md`}
              >
                {/* Entry Header - always visible */}
                <div
                  className={`p-5 cursor-pointer ${expandedId === entry.id ? 'border-b' : ''} ${
                    darkMode ? 'border-slate-700' : 'border-zinc-100'
                  }`}
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Source tag */}
                      {entry.rss_source_name && (
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-2 ${
                          darkMode ? 'bg-slate-700 text-slate-300' : 'bg-spira-100 text-spira-700'
                        }`}>
                          {entry.rss_source_name}
                        </span>
                      )}

                      {/* Title - clickable to open original */}
                      <h2 className="mb-2 line-clamp-2">
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            if (entry.link) {
                              window.open(entry.link, '_blank', 'noopener,noreferrer');
                            }
                          }}
                          className={`text-lg font-serif font-semibold leading-snug cursor-pointer hover:underline ${
                            darkMode ? 'text-slate-100 hover:text-indigo-300' : 'text-zinc-900 hover:text-spira-600'
                          }`}
                        >
                          {entry.title}
                        </span>
                      </h2>

                      {/* Meta - same style as HomeView */}
                      <div className={`text-sm flex items-center gap-2 ${
                        darkMode ? 'text-slate-400' : 'text-zinc-500'
                      }`}>
                        {entry.author && <span className="font-medium">{entry.author}</span>}
                        {entry.author && entry.published_at && <span>•</span>}
                        {entry.published_at && <span>{formatDate(entry.published_at)}</span>}
                      </div>

                      {/* AI Summary preview when collapsed */}
                      {expandedId !== entry.id && entry.ai_summary && (
                        <p className={`mt-3 text-sm line-clamp-2 ${
                          darkMode ? 'text-slate-300' : 'text-zinc-600'
                        }`}>
                          {entry.ai_summary}
                        </p>
                      )}
                    </div>

                    {/* Expand/Collapse icon */}
                    <div className={`flex-shrink-0 p-2 rounded-full transition-transform ${
                      expandedId === entry.id ? 'rotate-180' : ''
                    } ${darkMode ? 'text-slate-400' : 'text-zinc-400'}`}>
                      <Icons.ChevronDown />
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedId === entry.id && (
                  <div className="p-5 pt-4">
                    {/* AI Summary */}
                    {entry.ai_summary && (
                      <div className={`mb-6 p-4 rounded-xl ${
                        darkMode ? 'bg-slate-700/50' : 'bg-spira-50'
                      }`}>
                        <div className={`flex items-center gap-2 mb-2 text-sm font-medium ${
                          darkMode ? 'text-indigo-400' : 'text-spira-600'
                        }`}>
                          <span className="w-4 h-4"><Icons.Sparkles /></span>
                          AI Summary
                        </div>
                        <p className={darkMode ? 'text-slate-200' : 'text-zinc-700'}>
                          {entry.ai_summary}
                        </p>
                      </div>
                    )}

                    {/* Full Content */}
                    {entry.content && (
                      <ArticleContent content={entry.content} darkMode={darkMode} />
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        {/* Empty state */}
        {share_type === 'entries' && (!entries || entries.length === 0) && (
          <div className="text-center py-12">
            <p className={darkMode ? 'text-slate-400' : 'text-zinc-500'}>
              No articles in this share.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={`border-t mt-12 py-6 ${darkMode ? 'border-slate-800' : 'border-zinc-200'}`}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-zinc-400'}`}>
            Shared via Focus
          </p>
        </div>
      </footer>
    </div>
  );
}
