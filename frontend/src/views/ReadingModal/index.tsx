import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '../../components/icons/Icons';
import { ExportModal } from '../../components/shared/ExportModal';
import { ArticleContent } from '../../components/shared/ArticleContent';
import { entriesApi } from '../../api';
import { useToast } from '../../context/ToastContext';
import type { Article } from '../../types';

interface ReadingModalProps {
  article: Article;
  onClose: () => void;
  darkMode: boolean;
  onUpdateSummary?: (id: string, summary: string) => void;
  onDiscard: () => void;
  onFavorite: () => void;
  onRestore?: () => void;
  onArticleUpdated?: (article: Article) => void;
}

// Check if article is from ArXiv
function isArxivArticle(article: Article): boolean {
  const link = article._entry?.link || article.url || "";
  if (link.includes("arxiv.org")) return true;
  const sourceName = (article.source || "").toLowerCase();
  return sourceName.includes("arxiv");
}

export function ReadingModal({ article, onClose, darkMode, onDiscard, onFavorite, onRestore, onArticleUpdated }: ReadingModalProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const isTrashed = article._entry?.status === 'trash';
  const isArxiv = isArxivArticle(article);

  // ArXiv status checks
  const hasInterpretation = article._entry?.ai_summary && article._entry?.ai_content_type === 'arxiv_interpretation';
  const isInterpreting = article._entry?.ai_content_type === 'interpreting';
  const isInterpretFailed = article._entry?.ai_content_type === 'error';
  const isNoHtml = article._entry?.ai_content_type === 'no_html';
  const translatedAbstract = article._entry?.translated_abstract;
  const translationStatus = article._entry?.translation_status;
  const isTranslating = translationStatus === 'translating';
  const isTranslationFailed = translationStatus === 'failed';
  const isTranslationCompleted = translationStatus === 'completed';
  const briefSummary = article._entry?.brief_summary;

  // Handle reinterpret
  const handleReinterpret = async () => {
    if (!article._entry?.id || isRetrying) return;
    setIsRetrying(true);
    try {
      const updated = await entriesApi.reinterpret(article._entry.id);
      if (onArticleUpdated) {
        onArticleUpdated({ ...article, _entry: updated });
      }
      showToast(t('home.reinterpretStarted'), 'success');
    } catch (error) {
      console.error('Failed to reinterpret:', error);
      showToast(t('home.reinterpretFailed'), 'error');
    } finally {
      setIsRetrying(false);
    }
  };

  // Render content based on ArXiv status
  const renderContent = () => {
    if (!isArxiv) {
      // Non-ArXiv: show original content
      return <ArticleContent content={article.content} darkMode={darkMode} />;
    }

    // ArXiv article
    if (hasInterpretation) {
      // Interpretation completed: show interpretation as main content
      return (
        <>
          {/* Original Abstract - Collapsible */}
          <details className="mb-6 group">
            <summary
              className="cursor-pointer flex items-center gap-2 text-sm font-medium text-theme-text-tertiary hover:text-theme-text"
            >
              <span className="transform transition-transform group-open:rotate-90">▶</span>
              {t("home.originalAbstract")}
            </summary>
            <div className="mt-4 pl-6">
              <ArticleContent content={article.content} darkMode={darkMode} forceMarkdown={true} />
            </div>
          </details>

          {/* AI Interpretation */}
          <section>
            <ArticleContent content={article._entry!.ai_summary!} darkMode={darkMode} forceMarkdown={true} />
          </section>
        </>
      );
    }

    if (isNoHtml || isTranslationCompleted || translatedAbstract) {
      // no_html or translation completed but not interpreted: show translation content
      return (
        <>
          {/* 要点总结 + 翻译摘要：无标题 */}
          {(briefSummary || translatedAbstract) && (
            <section className="mb-6">
              {briefSummary && (
                <p className="text-base leading-relaxed mb-4 text-theme-text">
                  {briefSummary}
                </p>
              )}
              {translatedAbstract && (
                <ArticleContent content={translatedAbstract} darkMode={darkMode} forceMarkdown={true} />
              )}
            </section>
          )}

          {/* Original Abstract - Collapsible */}
          <details className="mb-6 group">
            <summary
              className="cursor-pointer text-sm text-theme-text-muted hover:text-theme-text-secondary"
            >
              <span className="transform transition-transform group-open:rotate-90 inline-block mr-2">▶</span>
              {t("home.originalAbstract")}
            </summary>
            <div className="mt-4 pl-6">
              <ArticleContent content={article.content} darkMode={darkMode} forceMarkdown={true} />
            </div>
          </details>

          {/* no_html status - show info message, no retry button */}
          {isNoHtml && (
            <div className="flex items-center justify-center gap-2 py-4 text-theme-text-secondary">
              <Icons.Info />
              <span>{t("home.noHtmlAvailable")}</span>
            </div>
          )}

          {/* Interpretation status (only if not no_html) */}
          {!isNoHtml && isInterpreting && (
            <div className="flex items-center gap-3 py-6 justify-center text-theme-text-tertiary">
              <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
              <span>{t("home.interpretingArticle")}</span>
            </div>
          )}
          {!isNoHtml && isInterpretFailed && (
            <div className="flex items-center justify-center gap-3 py-6 text-theme-error">
              <span>{t("home.interpretFailed")}</span>
              <button
                onClick={handleReinterpret}
                disabled={isRetrying}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-theme-muted hover:bg-theme-selected ${
                  isRetrying ? "opacity-50" : ""
                }`}
              >
                <Icons.Refresh />
                {t("home.reinterpret")}
              </button>
            </div>
          )}
        </>
      );
    }

    // Not translated yet or translating: show original content
    return (
      <>
        <ArticleContent content={article.content} darkMode={darkMode} forceMarkdown={true} />

        {/* Translation/Interpretation status indicators */}
        {isTranslating && (
          <div className="flex items-center gap-3 py-6 justify-center mt-4 text-theme-text-tertiary">
            <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
            <span>{t("library.translating")}</span>
          </div>
        )}
        {isTranslationFailed && (
          <div className="flex items-center justify-center gap-3 py-6 mt-4 text-theme-error">
            <span>{t("home.translationFailed")}</span>
            <button
              onClick={handleReinterpret}
              disabled={isRetrying}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-theme-muted hover:bg-theme-selected ${
                isRetrying ? "opacity-50" : ""
              }`}
            >
              <Icons.Refresh />
              {t("home.retryTranslation")}
            </button>
          </div>
        )}
      </>
    );
  };

  // Render status badge
  const renderStatusBadge = () => {
    if (!isArxiv) return null;

    let badgeClass = "";
    let badgeText = "ArXiv";

    if (hasInterpretation) {
      badgeClass = "bg-theme-success/15 text-theme-success";
      badgeText = t("home.interpreted");
    } else if (isNoHtml) {
      badgeClass = "bg-theme-muted text-theme-text-secondary";
      badgeText = t("home.noHtml");
    } else if (isInterpretFailed) {
      badgeClass = "bg-theme-error/15 text-theme-error";
      badgeText = t("home.interpretFailed");
    } else if (isInterpreting) {
      badgeClass = "bg-theme-warning/15 text-theme-warning";
      badgeText = t("home.interpreting");
    } else if (isTranslationFailed) {
      badgeClass = "bg-theme-error/15 text-theme-error";
      badgeText = t("home.translationFailed");
    } else if (isTranslating) {
      badgeClass = "bg-theme-accent/15 text-theme-accent";
      badgeText = t("library.translating");
    } else if (isTranslationCompleted) {
      badgeClass = "bg-theme-success/15 text-theme-success";
      badgeText = t("library.translated");
    } else {
      badgeClass = "bg-theme-accent/15 text-theme-accent";
    }

    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${badgeClass}`}>
        {badgeText}
      </span>
    );
  };

  return (
    <>
      {/* Mobile: Full screen slide up */}
      <div className="md:hidden fixed inset-0 z-50 flex flex-col animate-slide-up bg-theme-surface">
        {/* Mobile Sticky Header */}
        <div className="flex-shrink-0 px-5 py-4 border-b bg-theme-surface border-theme-border">
          {/* Top Row: Source & Close */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-theme-muted text-theme-accent">
                {article.source}
              </span>
              {renderStatusBadge()}
              {isTrashed && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-theme-error/10 text-theme-error">
                  {t('library.trash')}
                </span>
              )}
            </div>
            <button onClick={onClose} className="p-1.5 -mr-1.5 rounded-full text-theme-text-tertiary">
              <Icons.ChevronDown />
            </button>
          </div>
          {/* Title */}
          <h1 className="mb-2 line-clamp-2">
            <span
              onClick={() => article.url && window.open(article.url, '_blank', 'noopener,noreferrer')}
              className="text-xl font-serif font-bold leading-snug cursor-pointer hover:underline text-theme-text hover:text-theme-accent"
            >
              {article.title}
            </span>
          </h1>
          {/* Metadata - same style as Focus card */}
          <div className="text-sm flex items-center gap-2 text-theme-text-tertiary">
            <span className="font-medium">{article.author}</span>
            <span>•</span>
            <span>{article.timestamp}</span>
          </div>
        </div>

        {/* Mobile Scrollable Content */}
        <div className={`flex-1 overflow-y-auto px-5 py-5 pb-28 ${darkMode ? 'scrollbar-styled scrollbar-styled-dark' : 'scrollbar-styled'}`}>
          {renderContent()}
        </div>

        {/* Mobile Bottom Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 p-4 border-t z-50 bg-theme-surface border-theme-border">
          <div className="flex items-center justify-center gap-4 px-4">
            {isTrashed ? (
              // Only show Restore button for trashed articles
              <button
                onClick={onRestore}
                className="flex items-center gap-2 px-6 py-3 rounded-full font-medium text-sm bg-theme-accent text-white"
              >
                <Icons.Check />
                <span>{t('library.restore')}</span>
              </button>
            ) : (
              // Normal action bar
              <>
                <button onClick={onDiscard} className="flex flex-col items-center gap-1 p-2 text-theme-text-tertiary">
                  <Icons.Trash />
                  <span className="text-[10px] font-medium">{t('library.discard')}</span>
                </button>
                <button onClick={onFavorite} className={`flex flex-col items-center gap-1 p-2 ${article.isFavorite ? 'text-theme-favorite' : 'text-theme-text-tertiary'}`}>
                  <Icons.Star />
                  <span className="text-[10px] font-medium">{t('library.favorite')}</span>
                </button>
                <button onClick={() => setExportModalOpen(true)} className="flex flex-col items-center gap-1 p-2 text-theme-text-tertiary">
                  <Icons.Share />
                  <span className="text-[10px] font-medium">{t('library.export')}</span>
                </button>
              </>
            )}
            <button onClick={onClose} className="flex flex-col items-center gap-1 p-2 text-theme-text-tertiary">
              <Icons.X />
              <span className="text-[10px] font-medium">{t('common.close')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop: Card modal with overlay */}
      <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center px-6 animate-fade-in">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Card - Full height, edge to edge vertically */}
        <div className="relative w-full max-w-5xl h-full flex flex-col rounded-2xl shadow-2xl overflow-hidden bg-theme-surface">
          {/* Desktop Sticky Header */}
          <div className="flex-shrink-0 px-8 py-5 border-b bg-theme-surface border-theme-border">
            {/* Top Row: Source, Trash, Close */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-theme-muted text-theme-accent">
                  {article.source}
                </span>
                {renderStatusBadge()}
                {isTrashed && (
                  <span className="text-xs font-medium px-2 py-1 rounded bg-theme-error/10 text-theme-error">
                    {t('library.trash')}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg transition-colors text-theme-text-tertiary hover:bg-theme-muted hover:text-theme-text"
              >
                <Icons.X />
              </button>
            </div>
            {/* Title */}
            <h1 className="mb-2 line-clamp-2">
              <span
                onClick={() => article.url && window.open(article.url, '_blank', 'noopener,noreferrer')}
                className="text-2xl font-serif font-bold leading-snug cursor-pointer hover:underline text-theme-text hover:text-theme-accent"
              >
                {article.title}
              </span>
            </h1>
            {/* Metadata - same style as Focus card */}
            <div className="text-sm flex items-center gap-2 text-theme-text-tertiary">
              <span className="font-medium">{article.author}</span>
              <span>•</span>
              <span>{article.timestamp}</span>
            </div>
          </div>

          {/* Desktop Scrollable Content */}
          <div className={`flex-1 overflow-y-auto px-8 py-6 pb-10 ${darkMode ? 'scrollbar-styled scrollbar-styled-dark' : 'scrollbar-styled'}`}>
            {renderContent()}
          </div>

          {/* Desktop Action Bar */}
          <div className="flex items-center justify-between px-8 py-4 border-t flex-shrink-0 border-theme-border bg-theme-surface/80">
            {isTrashed ? (
              // Only show Restore button for trashed articles
              <div className="flex-1 flex justify-center">
                <button
                  onClick={onRestore}
                  className="flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-transform hover:scale-105 bg-theme-accent text-white"
                >
                  <Icons.Check />
                  <span>{t('library.restore')}</span>
                </button>
              </div>
            ) : (
              // Normal action bar
              <>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onDiscard}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-theme-text-tertiary hover:bg-theme-muted hover:text-theme-error"
                  >
                    <Icons.Trash />
                    <span className="text-sm font-medium">{t('library.discard')}</span>
                  </button>
                  <button
                    onClick={onFavorite}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${article.isFavorite ? 'text-theme-favorite bg-theme-favorite/10' : 'text-theme-text-tertiary hover:bg-theme-muted hover:text-theme-favorite'}`}
                  >
                    <Icons.Star />
                    <span className="text-sm font-medium">{t('library.favorite')}</span>
                  </button>
                  <button
                    onClick={() => setExportModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-theme-text-tertiary hover:bg-theme-muted hover:text-theme-text"
                  >
                    <Icons.Share />
                    <span className="text-sm font-medium">{t('library.export')}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {exportModalOpen && (
        <ExportModal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          articles={[article]}
        />
      )}
    </>
  );
}
