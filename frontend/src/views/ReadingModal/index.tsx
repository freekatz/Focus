import { useState } from 'react';
import { Icons } from '../../components/icons/Icons';
import { AIBottomSheet } from '../../components/shared/AIBottomSheet';
import { ExportModal } from '../../components/shared/ExportModal';
import { ArticleContent } from '../../components/shared/ArticleContent';
import type { Article } from '../../types';

interface ReadingModalProps {
  article: Article;
  onClose: () => void;
  darkMode: boolean;
  onUpdateSummary: (id: string, summary: string) => void;
  onDiscard: () => void;
  onFavorite: () => void;
  onRestore?: () => void;
}

export function ReadingModal({ article, onClose, darkMode, onUpdateSummary, onDiscard, onFavorite, onRestore }: ReadingModalProps) {
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const isTrashed = article._entry?.status === 'trash';

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
          <ArticleContent content={article.content} darkMode={darkMode} />
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
                <button onClick={() => setSummaryOpen(true)} className={`flex flex-col items-center gap-1 p-2 ${darkMode ? 'text-indigo-400' : 'text-spira-600'}`}>
                  <Icons.Sparkles />
                  <span className="text-[10px] font-medium">Insight</span>
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
            <ArticleContent content={article.content} darkMode={darkMode} />
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
                <button
                  onClick={() => setSummaryOpen(true)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full shadow-lg transition-transform hover:scale-105 ${darkMode ? 'bg-indigo-600 text-white' : 'bg-spira-600 text-white'}`}
                >
                  <Icons.Sparkles />
                  <span className="text-sm font-bold">Insight</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <AIBottomSheet
        isOpen={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        article={article}
        onUpdateSummary={onUpdateSummary}
        darkMode={darkMode}
      />

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
