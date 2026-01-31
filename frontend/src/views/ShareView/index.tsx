import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '../../components/icons/Icons';
import { ArticleContent } from '../../components/shared/ArticleContent';
import { shareApi, type ShareDetailResponse } from '../../api/share';
import type { Entry } from '../../types';

// Check if article is from ArXiv
function isArxivEntry(entry: Entry): boolean {
  const link = entry.link || "";
  if (link.includes("arxiv.org")) return true;
  const sourceName = (entry.rss_source_name || "").toLowerCase();
  return sourceName.includes("arxiv");
}

// Format date for display
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface ShareViewProps {
  code: string;
  darkMode: boolean;
  fontClass?: string;
}

export function ShareView({ code, darkMode, fontClass = 'font-sans' }: ShareViewProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareData, setShareData] = useState<ShareDetailResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // Render entry content based on ArXiv status
  const renderEntryContent = (entry: Entry) => {
    const isArxiv = isArxivEntry(entry);
    const hasInterpretation = entry.ai_summary && entry.ai_content_type === 'arxiv_interpretation';
    const translatedAbstract = entry.translated_abstract;
    const briefSummary = entry.brief_summary;
    const isTranslationCompleted = entry.translation_status === 'completed';

    if (!isArxiv) {
      return <ArticleContent content={entry.content || ''} darkMode={darkMode} />;
    }

    // ArXiv article with interpretation
    if (hasInterpretation) {
      return (
        <>
          {/* Original Abstract - Collapsible */}
          <details className="mb-8 group">
            <summary
              className={`cursor-pointer text-sm ${
                darkMode ? "text-theme-text-tertiary hover:text-theme-text" : "text-theme-text-tertiary hover:text-theme-text-secondary"
              }`}
            >
              <span className="transform transition-transform group-open:rotate-90 inline-block mr-2">▶</span>
              {t("home.originalAbstract")}
            </summary>
            <div className="mt-4 pl-6">
              <ArticleContent content={entry.content || ''} darkMode={darkMode} />
            </div>
          </details>

          {/* AI Interpretation */}
          <section>
            <ArticleContent content={entry.ai_summary!} darkMode={darkMode} />
          </section>
        </>
      );
    }

    // ArXiv article with translation but no interpretation
    if (isTranslationCompleted || translatedAbstract) {
      return (
        <>
          {/* Brief summary + translated abstract */}
          {(briefSummary || translatedAbstract) && (
            <section className="mb-8">
              {briefSummary && (
                <p className={`text-base leading-relaxed mb-4 ${darkMode ? "text-theme-text" : "text-theme-text"}`}>
                  {briefSummary}
                </p>
              )}
              {translatedAbstract && (
                <ArticleContent content={translatedAbstract} darkMode={darkMode} />
              )}
            </section>
          )}

          {/* Original Abstract - Collapsible */}
          <details className="mb-8 group">
            <summary
              className={`cursor-pointer text-sm ${
                darkMode ? "text-theme-text-tertiary hover:text-theme-text" : "text-theme-text-tertiary hover:text-theme-text-secondary"
              }`}
            >
              <span className="transform transition-transform group-open:rotate-90 inline-block mr-2">▶</span>
              {t("home.originalAbstract")}
            </summary>
            <div className="mt-4 pl-6">
              <ArticleContent content={entry.content || ''} darkMode={darkMode} />
            </div>
          </details>
        </>
      );
    }

    // ArXiv article not translated yet: show original content
    return <ArticleContent content={entry.content || ''} darkMode={darkMode} />;
  };

  useEffect(() => {
    const fetchShare = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await shareApi.getShare(code);
        setShareData(data);
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

  // Reset scroll position on article change
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
    // Also scroll window to top for mobile
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentIndex]);

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goNext = () => {
    if (shareData?.entries && currentIndex < shareData.entries.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${fontClass} ${darkMode ? 'bg-theme-base' : 'bg-theme-base'}`}>
        <div className={`animate-spin h-8 w-8 border-2 border-t-transparent rounded-full ${darkMode ? 'border-theme-accent' : 'border-theme-accent'}`} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${fontClass} ${darkMode ? 'bg-theme-base text-theme-text' : 'bg-theme-base text-theme-text'}`}>
        <div className={`p-4 rounded-full mb-4 ${darkMode ? 'bg-theme-muted text-theme-error' : 'bg-red-50 text-red-500'}`}>
          <Icons.X />
        </div>
        <h1 className="text-h2 font-serif font-medium mb-2">
          {error === 'Share not found' ? 'Not Found' : error === 'Share has expired' ? 'Expired' : 'Error'}
        </h1>
        <p className={`text-center max-w-md text-body-sm ${darkMode ? 'text-theme-text-secondary' : 'text-theme-text-secondary'}`}>
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

  // Text share - simple display
  if (share_type === 'text' && text_content) {
    return (
      <div className={`min-h-screen ${fontClass} ${darkMode ? 'bg-theme-base text-theme-text' : 'bg-theme-base text-theme-text'}`}>
        {/* Header */}
        <header className={`sticky top-0 z-10 border-b backdrop-blur-sm ${darkMode ? 'bg-theme-base/90 border-theme-border' : 'bg-theme-base/90 border-theme-border'}`}>
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-theme-accent' : 'bg-theme-accent'}`}>
                <span className="w-5 h-5 text-white"><Icons.Focus /></span>
              </div>
              <span className="font-semibold text-body">Focus</span>
            </div>
            <div className={`text-caption ${darkMode ? 'text-theme-text-secondary' : 'text-theme-text-secondary'}`}>
              Shared {formatDate(created_at)}
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          {description && (
            <div className={`mb-8 p-4 rounded-xl ${darkMode ? 'bg-theme-surface' : 'bg-theme-surface'} shadow-sm`}>
              <p className={`text-body-sm ${darkMode ? 'text-theme-text-secondary' : 'text-theme-text-secondary'}`}>{description}</p>
            </div>
          )}
          <div className={`p-6 rounded-2xl ${darkMode ? 'bg-theme-surface' : 'bg-theme-surface'} shadow-sm`}>
            <div className={`prose max-w-none ${darkMode ? 'prose-sepia' : ''}`}>
              <pre className="whitespace-pre-wrap font-sans text-body-sm">{text_content}</pre>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Entry share - card browser design
  if (share_type === 'entries' && entries && entries.length > 0) {
    const current = entries[currentIndex];
    const isArxiv = isArxivEntry(current);
    const hasInterpretation = current.ai_summary && current.ai_content_type === 'arxiv_interpretation';

    return (
      <div className={`min-h-screen flex flex-col ${fontClass} ${darkMode ? 'bg-theme-base text-theme-text' : 'bg-theme-base text-theme-text'}`}>
        {/* Header */}
        <header className={`sticky top-0 z-10 border-b backdrop-blur-sm ${darkMode ? 'bg-theme-base/90 border-theme-border' : 'bg-theme-base/90 border-theme-border'}`}>
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${darkMode ? 'bg-theme-accent' : 'bg-theme-accent'}`}>
                <span className="w-4 h-4 text-white"><Icons.Focus /></span>
              </div>
              <span className="font-semibold text-body-sm">Focus</span>
            </div>
            <div className={`text-caption ${darkMode ? 'text-theme-text-secondary' : 'text-theme-text-secondary'}`}>
              {formatDate(created_at)}
              {expires_at && <span className="hidden md:inline"> · Expires {formatDate(expires_at)}</span>}
            </div>
          </div>
        </header>

        {/* Article Content - HomeView inspired layout */}
        <article
          ref={contentRef}
          className="flex-1 flex flex-col max-w-5xl mx-auto w-full pt-6 pb-24 px-4 md:px-6 lg:px-8"
        >
          {/* Document Header: Tag + Date */}
          <div className="flex justify-between items-center text-sm mb-6">
            <span className="flex items-center gap-2 flex-wrap">
              {current.rss_source_name && (
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  darkMode ? "bg-theme-muted text-theme-text-secondary" : "bg-theme-muted text-theme-text-secondary"
                }`}>
                  {current.rss_source_name}
                </span>
              )}
              {isArxiv && (
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  hasInterpretation
                    ? "bg-theme-success/15 text-theme-success"
                    : current.translation_status === 'completed'
                      ? "bg-theme-success/15 text-theme-success"
                      : "bg-theme-accent/15 text-theme-accent"
                }`}>
                  {hasInterpretation
                    ? t("home.interpreted")
                    : current.translation_status === 'completed'
                      ? t("library.translated")
                      : "ArXiv"}
                </span>
              )}
            </span>
            <time className={`flex-shrink-0 ${darkMode ? "text-theme-text-tertiary" : "text-theme-text-tertiary"}`}>
              {formatDate(current.published_at)}
            </time>
          </div>

          {/* Title - Markdown H1 Style (matches HomeView) */}
          <h1
            onClick={() => {
              if (current.link) {
                window.open(current.link, "_blank", "noopener,noreferrer");
              }
            }}
            className={`text-2xl md:text-3xl font-serif font-bold mb-4 leading-tight cursor-pointer hover:underline decoration-2 underline-offset-4 ${
              darkMode
                ? "text-theme-text hover:text-theme-accent"
                : "text-theme-text hover:text-theme-accent"
            }`}
          >
            {current.title}
          </h1>

          {/* Author - Blockquote Style */}
          {current.author && (
            <blockquote className={`border-l-4 pl-4 mb-8 ${
              darkMode ? "border-theme-border text-theme-text-secondary" : "border-theme-border text-theme-text-secondary"
            }`}>
              {current.author}
            </blockquote>
          )}

          <hr className={`mb-8 ${darkMode ? "border-theme-border" : "border-theme-border"}`} />

          {/* Content */}
          {renderEntryContent(current)}
        </article>

        {/* Floating Navigation Bar */}
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-10">
          <div className={`flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-full shadow-xl backdrop-blur-sm ${
            darkMode
              ? "bg-theme-surface/95 border border-theme-border shadow-theme-border/50"
              : "bg-theme-surface/95 border border-theme-border shadow-theme-border/50"
          }`}>
            {/* Previous */}
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              className={`flex items-center justify-center gap-1 min-h-touch min-w-touch md:min-w-0 md:px-3 rounded-full transition-micro text-ui-sm ${
                currentIndex === 0
                  ? darkMode ? "text-theme-text-muted cursor-not-allowed" : "text-theme-text-muted cursor-not-allowed"
                  : darkMode ? "text-theme-text-secondary hover:bg-theme-muted cursor-pointer active:scale-95" : "text-theme-text-secondary hover:bg-theme-muted cursor-pointer active:scale-95"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span className="hidden md:inline">{t("home.prevArticle")}</span>
            </button>

            {/* Divider */}
            <div className={`w-px h-4 ${darkMode ? "bg-theme-border" : "bg-theme-border"}`} />

            {/* Article Counter */}
            <div className="flex items-center flex-shrink-0 whitespace-nowrap px-2">
              <span className={`text-caption font-medium ${darkMode ? "text-theme-text-secondary" : "text-theme-text-secondary"}`}>
                {currentIndex + 1}
              </span>
              <span className={`text-caption ${darkMode ? "text-theme-text-tertiary" : "text-theme-text-tertiary"}`}>
                /{entries.length}
              </span>
            </div>

            {/* Divider */}
            <div className={`w-px h-4 ${darkMode ? "bg-theme-border" : "bg-theme-border"}`} />

            {/* Open Original */}
            <button
              onClick={() => {
                if (current.link) {
                  window.open(current.link, "_blank", "noopener,noreferrer");
                }
              }}
              className={`flex items-center justify-center gap-1 min-h-touch min-w-touch md:min-w-0 md:px-3 rounded-full transition-micro text-ui-sm ${
                darkMode
                  ? "text-theme-text-secondary hover:bg-theme-muted hover:text-theme-text cursor-pointer active:scale-95"
                  : "text-theme-text-secondary hover:bg-theme-muted hover:text-theme-text cursor-pointer active:scale-95"
              }`}
            >
              <Icons.ExternalLink />
              <span className="hidden md:inline">{t("entry.visitOriginal")}</span>
            </button>

            {/* Divider */}
            <div className={`w-px h-4 ${darkMode ? "bg-theme-border" : "bg-theme-border"}`} />

            {/* Next */}
            <button
              onClick={goNext}
              disabled={currentIndex === entries.length - 1}
              className={`flex items-center justify-center gap-1 min-h-touch min-w-touch md:min-w-0 md:px-3 rounded-full transition-micro text-ui-sm ${
                currentIndex === entries.length - 1
                  ? darkMode ? "text-theme-text-muted cursor-not-allowed" : "text-theme-text-muted cursor-not-allowed"
                  : darkMode ? "text-theme-text-secondary hover:bg-theme-muted cursor-pointer active:scale-95" : "text-theme-text-secondary hover:bg-theme-muted cursor-pointer active:scale-95"
              }`}
            >
              <span className="hidden md:inline">{t("home.nextArticle")}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </nav>

        {/* Footer */}
        <footer className={`border-t py-4 ${darkMode ? 'border-theme-border' : 'border-theme-border'}`}>
          <div className="max-w-5xl mx-auto px-4 text-center">
            <p className={`text-caption ${darkMode ? 'text-theme-text-tertiary' : 'text-theme-text-tertiary'}`}>
              Shared via Focus
            </p>
          </div>
        </footer>
      </div>
    );
  }

  // Empty state
  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${fontClass} ${darkMode ? 'bg-theme-base text-theme-text' : 'bg-theme-base text-theme-text'}`}>
      <p className={`text-body-sm ${darkMode ? 'text-theme-text-secondary' : 'text-theme-text-secondary'}`}>
        No articles in this share.
      </p>
    </div>
  );
}
