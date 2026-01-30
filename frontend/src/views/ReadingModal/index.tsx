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
              className={`cursor-pointer flex items-center gap-2 text-sm font-medium ${
                darkMode ? "text-slate-400 hover:text-slate-200" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <span className="transform transition-transform group-open:rotate-90">▶</span>
              {t("home.originalAbstract")}
            </summary>
            <div className="mt-4 pl-6">
              <ArticleContent content={article.content} darkMode={darkMode} />
            </div>
          </details>

          {/* AI Interpretation */}
          <section>
            <ArticleContent content={article._entry!.ai_summary!} darkMode={darkMode} />
          </section>
        </>
      );
    }

    if (isTranslationCompleted || translatedAbstract) {
      // Translation completed but not interpreted: show like HomeView
      return (
        <>
          {/* 要点总结 + 翻译摘要：无标题 */}
          {(briefSummary || translatedAbstract) && (
            <section className="mb-6">
              {briefSummary && (
                <p
                  className={`text-base leading-relaxed mb-4 ${
                    darkMode ? "text-slate-200" : "text-zinc-800"
                  }`}
                >
                  {briefSummary}
                </p>
              )}
              {translatedAbstract && (
                <ArticleContent content={translatedAbstract} darkMode={darkMode} />
              )}
            </section>
          )}

          {/* Original Abstract - Collapsible */}
          <details className="mb-6 group">
            <summary
              className={`cursor-pointer text-sm ${
                darkMode ? "text-slate-500 hover:text-slate-300" : "text-zinc-400 hover:text-zinc-600"
              }`}
            >
              <span className="transform transition-transform group-open:rotate-90 inline-block mr-2">▶</span>
              {t("home.originalAbstract")}
            </summary>
            <div className="mt-4 pl-6">
              <ArticleContent content={article.content} darkMode={darkMode} />
            </div>
          </details>

          {/* Interpretation status */}
          {isInterpreting && (
            <div className={`flex items-center gap-3 py-6 justify-center ${darkMode ? "text-slate-400" : "text-zinc-500"}`}>
              <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
              <span>{t("home.interpretingArticle")}</span>
            </div>
          )}
          {isInterpretFailed && (
            <div className={`flex items-center justify-center gap-3 py-6 ${darkMode ? "text-red-400" : "text-red-500"}`}>
              <span>{t("home.interpretFailed")}</span>
              <button
                onClick={handleReinterpret}
                disabled={isRetrying}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium ${
                  isRetrying ? "opacity-50" : ""
                } ${darkMode ? "bg-slate-700 hover:bg-slate-600" : "bg-zinc-100 hover:bg-zinc-200"}`}
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
        <ArticleContent content={article.content} darkMode={darkMode} />

        {/* Translation/Interpretation status indicators */}
        {isTranslating && (
          <div className={`flex items-center gap-3 py-6 justify-center mt-4 ${darkMode ? "text-slate-400" : "text-zinc-500"}`}>
            <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
            <span>{t("library.translating")}</span>
          </div>
        )}
        {isTranslationFailed && (
          <div className={`flex items-center justify-center gap-3 py-6 mt-4 ${darkMode ? "text-red-400" : "text-red-500"}`}>
            <span>{t("home.translationFailed")}</span>
            <button
              onClick={handleReinterpret}
              disabled={isRetrying}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium ${
                isRetrying ? "opacity-50" : ""
              } ${darkMode ? "bg-slate-700 hover:bg-slate-600" : "bg-zinc-100 hover:bg-zinc-200"}`}
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
      badgeClass = darkMode ? "bg-green-900/30 text-green-400" : "bg-green-100 text-green-700";
      badgeText = t("home.interpreted");
    } else if (isInterpretFailed) {
      badgeClass = darkMode ? "bg-red-900/30 text-red-400" : "bg-red-100 text-red-700";
      badgeText = t("home.interpretFailed");
    } else if (isInterpreting) {
      badgeClass = darkMode ? "bg-yellow-900/30 text-yellow-400" : "bg-yellow-100 text-yellow-700";
      badgeText = t("home.interpreting");
    } else if (isTranslationFailed) {
      badgeClass = darkMode ? "bg-red-900/30 text-red-400" : "bg-red-100 text-red-700";
      badgeText = t("home.translationFailed");
    } else if (isTranslating) {
      badgeClass = darkMode ? "bg-blue-900/30 text-blue-400" : "bg-blue-100 text-blue-700";
      badgeText = t("library.translating");
    } else if (isTranslationCompleted) {
      badgeClass = darkMode ? "bg-teal-900/30 text-teal-400" : "bg-teal-100 text-teal-700";
      badgeText = t("library.translated");
    } else {
      badgeClass = darkMode ? "bg-purple-900/30 text-purple-400" : "bg-purple-100 text-purple-700";
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
      <div className={`md:hidden fixed inset-0 z-50 flex flex-col animate-slide-up ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
        {/* Mobile Sticky Header */}
        <div className={`flex-shrink-0 px-5 py-4 border-b ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-zinc-100'}`}>
          {/* Top Row: Source & Close */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${darkMode ? 'bg-slate-700 text-indigo-300' : 'bg-spira-100 text-spira-700'}`}>
                {article.source}
              </span>
              {renderStatusBadge()}
              {isTrashed && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  Trash
                </span>
              )}
            </div>
            <button onClick={onClose} className={`p-1.5 -mr-1.5 rounded-full ${darkMode ? 'text-slate-400' : 'text-zinc-400'}`}>
              <Icons.ChevronDown />
            </button>
          </div>
          {/* Title */}
          <h1 className="mb-2 line-clamp-2">
            <span
              onClick={() => article.url && window.open(article.url, '_blank', 'noopener,noreferrer')}
              className={`text-xl font-serif font-bold leading-snug cursor-pointer hover:underline ${darkMode ? 'text-slate-100 hover:text-indigo-300' : 'text-zinc-900 hover:text-spira-600'}`}
            >
              {article.title}
            </span>
          </h1>
          {/* Metadata - same style as Focus card */}
          <div className={`text-sm flex items-center gap-2 ${darkMode ? 'text-slate-400' : 'text-zinc-500'}`}>
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
        <div className={`fixed bottom-0 left-0 right-0 p-4 border-t z-50 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-zinc-200'}`}>
          <div className="flex items-center justify-center gap-4 px-4">
            {isTrashed ? (
              // Only show Restore button for trashed articles
              <button
                onClick={onRestore}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium text-sm ${darkMode ? 'bg-indigo-600 text-white' : 'bg-spira-600 text-white'}`}
              >
                <Icons.Check />
                <span>Restore</span>
              </button>
            ) : (
              // Normal action bar
              <>
                <button onClick={onDiscard} className={`flex flex-col items-center gap-1 p-2 ${darkMode ? 'text-slate-400' : 'text-zinc-500'}`}>
                  <Icons.Trash />
                  <span className="text-[10px] font-medium">Discard</span>
                </button>
                <button onClick={onFavorite} className={`flex flex-col items-center gap-1 p-2 ${article.isFavorite ? 'text-yellow-500' : (darkMode ? 'text-slate-400' : 'text-zinc-500')}`}>
                  <Icons.Star />
                  <span className="text-[10px] font-medium">Favorite</span>
                </button>
                <button onClick={() => setExportModalOpen(true)} className={`flex flex-col items-center gap-1 p-2 ${darkMode ? 'text-slate-400' : 'text-zinc-500'}`}>
                  <Icons.Share />
                  <span className="text-[10px] font-medium">Export</span>
                </button>
              </>
            )}
            <button onClick={onClose} className={`flex flex-col items-center gap-1 p-2 ${darkMode ? 'text-slate-400' : 'text-zinc-500'}`}>
              <Icons.X />
              <span className="text-[10px] font-medium">Close</span>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop: Card modal with overlay */}
      <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center p-6 animate-fade-in">
        {/* Backdrop */}
        <div
          className={`absolute inset-0 ${darkMode ? 'bg-black/60' : 'bg-black/40'} backdrop-blur-sm`}
          onClick={onClose}
        />

        {/* Modal Card - Increased size */}
        <div className={`relative w-full max-w-5xl h-[85vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
          {/* Desktop Sticky Header */}
          <div className={`flex-shrink-0 px-8 py-5 border-b ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-zinc-100'}`}>
            {/* Top Row: Source, Trash, Close */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${darkMode ? 'bg-slate-700 text-indigo-300' : 'bg-spira-100 text-spira-700'}`}>
                  {article.source}
                </span>
                {renderStatusBadge()}
                {isTrashed && (
                  <span className="text-xs font-medium px-2 py-1 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    Trash
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600'}`}
              >
                <Icons.X />
              </button>
            </div>
            {/* Title */}
            <h1 className="mb-2 line-clamp-2">
              <span
                onClick={() => article.url && window.open(article.url, '_blank', 'noopener,noreferrer')}
                className={`text-2xl font-serif font-bold leading-snug cursor-pointer hover:underline ${darkMode ? 'text-slate-100 hover:text-indigo-300' : 'text-zinc-900 hover:text-spira-600'}`}
              >
                {article.title}
              </span>
            </h1>
            {/* Metadata - same style as Focus card */}
            <div className={`text-sm flex items-center gap-2 ${darkMode ? 'text-slate-400' : 'text-zinc-500'}`}>
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
          <div className={`flex items-center justify-between px-8 py-4 border-t flex-shrink-0 ${darkMode ? 'border-slate-700 bg-slate-800/80' : 'border-zinc-100 bg-white/80'}`}>
            {isTrashed ? (
              // Only show Restore button for trashed articles
              <div className="flex-1 flex justify-center">
                <button
                  onClick={onRestore}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-transform hover:scale-105 ${darkMode ? 'bg-indigo-600 text-white' : 'bg-spira-600 text-white'}`}
                >
                  <Icons.Check />
                  <span>Restore Article</span>
                </button>
              </div>
            ) : (
              // Normal action bar
              <>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onDiscard}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${darkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-red-400' : 'text-zinc-500 hover:bg-zinc-100 hover:text-red-500'}`}
                  >
                    <Icons.Trash />
                    <span className="text-sm font-medium">Discard</span>
                  </button>
                  <button
                    onClick={onFavorite}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${article.isFavorite ? 'text-yellow-500 bg-yellow-500/10' : (darkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-yellow-400' : 'text-zinc-500 hover:bg-zinc-100 hover:text-yellow-500')}`}
                  >
                    <Icons.Star />
                    <span className="text-sm font-medium">Favorite</span>
                  </button>
                  <button
                    onClick={() => setExportModalOpen(true)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${darkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'}`}
                  >
                    <Icons.Share />
                    <span className="text-sm font-medium">Export</span>
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
          darkMode={darkMode}
        />
      )}
    </>
  );
}
