import React, { useState, useEffect } from 'react';
import { Icons } from '../icons/Icons';
import { aiApi } from '../../api';
import type { Article } from '../../types';

interface AIBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  article: Article;
  onUpdateSummary: (id: string, summary: string) => void;
  darkMode: boolean;
}

// Check if summary is a valid AI-generated summary (not an error/timeout message)
const isValidSummary = (summary: string | undefined): boolean => {
  if (!summary) return false;
  const errorPatterns = ['timeout', 'timed out', 'error', 'failed'];
  const lowerSummary = summary.toLowerCase();
  return !errorPatterns.some(pattern => lowerSummary.includes(pattern));
};

export function AIBottomSheet({ isOpen, onClose, article, onUpdateSummary, darkMode }: AIBottomSheetProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !isValidSummary(article.summary) && !loading) {
      generateSummary();
    }
  }, [isOpen]);

  const generateSummary = async (forceRefresh: boolean = false) => {
    if (loading) return; // Prevent double-clicking

    setLoading(true);
    setError(null);
    try {
      // Get entry ID from article
      const entryId = article._entry?.id;
      if (entryId) {
        const response = await aiApi.summarize(entryId, forceRefresh);
        onUpdateSummary(article.id, response.summary);
      } else {
        setError("No entry ID available");
      }
    } catch (err) {
      console.error("AI Generation failed", err);
      const errorMessage = err instanceof Error ? err.message : 'Generation failed. Click refresh to retry.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="absolute inset-0 bg-black/20 z-20 backdrop-blur-[2px] transition-opacity"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          onTouchStart={(e) => { e.stopPropagation(); onClose(); }}
        ></div>
      )}

      <div
        className={`absolute bottom-0 left-0 right-0 z-30 flex flex-col rounded-t-2xl shadow-[0_-4px_24px_rgba(0,0,0,0.15)] transition-transform duration-300 ease-out max-h-[60%] ${isOpen ? 'translate-y-0' : 'translate-y-full'} ${darkMode ? 'bg-slate-800 border-t border-slate-700' : 'bg-white'}`}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-slate-700 cursor-grab active:cursor-grabbing">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${darkMode ? 'text-indigo-300' : 'text-spira-600'}`}>
              <Icons.Sparkles /> AI Insight
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => generateSummary(true)} disabled={loading} className={`p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-slate-700 ${loading ? 'animate-spin' : ''}`}>
              <Icons.Refresh />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-slate-700">
              <Icons.X />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto min-h-[150px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-3 opacity-50">
              <div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full"/>
              <span className="text-sm">{isValidSummary(article.summary) ? 'Regenerating...' : 'Distilling knowledge...'}</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full space-y-3">
              <p className={`text-base text-center ${darkMode ? 'text-red-400' : 'text-red-500'}`}>
                {error}
              </p>
              <button
                onClick={() => generateSummary(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${darkMode ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-spira-600 text-white hover:bg-spira-500'}`}
              >
                Retry
              </button>
            </div>
          ) : !isValidSummary(article.summary) ? (
            <div className="flex flex-col items-center justify-center h-full space-y-3">
              <p className={`text-base text-center ${darkMode ? 'text-slate-400' : 'text-zinc-500'}`}>
                {article.summary || "No summary available. Click refresh to generate."}
              </p>
              <button
                onClick={() => generateSummary(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${darkMode ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-spira-600 text-white hover:bg-spira-500'}`}
              >
                Generate
              </button>
            </div>
          ) : (
            <p className={`text-base leading-7 ${darkMode ? 'text-slate-200' : 'text-zinc-800'}`}>
              {article.summary}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
