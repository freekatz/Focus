import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Icons } from '../../components/icons/Icons';
import { githubApi } from '../../api/github';
import type { GitHubRepoAnalysisResponse } from '../../api/github';

interface GithubAnalysisViewProps {
  darkMode: boolean;
}

// Preset 4D world model repositories from the problem statement
const PRESET_REPOS = [
  'https://github.com/3DTopia/4DNeX',
  'https://github.com/jzr99/Geo4D',
  'https://github.com/JaceyHuang/Gen3R',
  'https://github.com/IamCreateAI/NeoVerse',
  'https://github.com/InternRobotics/Aether',
  'https://github.com/Dynamics-X/DynamicVerse',
];

interface AnalysisState {
  result: GitHubRepoAnalysisResponse | null;
  loading: boolean;
  error: string | null;
}

export function GithubAnalysisView({ darkMode }: GithubAnalysisViewProps) {
  const { t } = useTranslation();
  const [urls, setUrls] = useState<string[]>(PRESET_REPOS);
  const [inputUrl, setInputUrl] = useState('');
  const [analyses, setAnalyses] = useState<Record<string, AnalysisState>>({});
  const [batchLoading, setBatchLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [expandedRepo, setExpandedRepo] = useState<string | null>(null);

  const addUrl = () => {
    const trimmed = inputUrl.trim();
    if (!trimmed) return;
    if (!urls.includes(trimmed)) {
      setUrls(prev => [...prev, trimmed]);
    }
    setInputUrl('');
  };

  const removeUrl = (url: string) => {
    setUrls(prev => prev.filter(u => u !== url));
    setAnalyses(prev => {
      const next = { ...prev };
      delete next[url];
      return next;
    });
  };

  const analyzeOne = async (url: string) => {
    setAnalyses(prev => ({
      ...prev,
      [url]: { result: null, loading: true, error: null },
    }));
    setGlobalError(null);
    try {
      const result = await githubApi.analyzeRepository(url);
      setAnalyses(prev => ({
        ...prev,
        [url]: { result, loading: false, error: result.error || null },
      }));
      setExpandedRepo(url);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : t('github.analyzeError');
      setAnalyses(prev => ({
        ...prev,
        [url]: { result: null, loading: false, error: errorMsg },
      }));
    }
  };

  const analyzeAll = async () => {
    if (urls.length === 0) return;
    setBatchLoading(true);
    setGlobalError(null);

    // Initialize all to loading state
    const loadingState: Record<string, AnalysisState> = {};
    urls.forEach(url => {
      loadingState[url] = { result: null, loading: true, error: null };
    });
    setAnalyses(loadingState);

    try {
      const batchResult = await githubApi.analyzeRepositoriesBatch(urls);
      const newAnalyses: Record<string, AnalysisState> = {};
      batchResult.analyses.forEach(analysis => {
        newAnalyses[analysis.url] = {
          result: analysis,
          loading: false,
          error: analysis.error || null,
        };
      });
      setAnalyses(newAnalyses);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : t('github.analyzeError');
      setGlobalError(errorMsg);
      // Reset loading states
      const errorState: Record<string, AnalysisState> = {};
      urls.forEach(url => {
        errorState[url] = { result: null, loading: false, error: null };
      });
      setAnalyses(errorState);
    } finally {
      setBatchLoading(false);
    }
  };

  const isAnyLoading = batchLoading || Object.values(analyses).some(a => a.loading);
  const hasAnyResult = Object.values(analyses).some(a => a.result && !a.error);

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-theme-text">{t('github.title')}</h1>
        <p className="mt-1 text-sm text-theme-text-secondary">{t('github.description')}</p>
      </div>

      {/* URL Input */}
      <div className="bg-theme-surface border border-theme-border rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-theme-text">{t('github.repositories')}</h2>

        {/* Add URL input */}
        <div className="flex gap-2">
          <input
            type="url"
            value={inputUrl}
            onChange={e => setInputUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addUrl(); }}
            placeholder="https://github.com/owner/repo"
            className="flex-1 px-3 py-2 rounded-lg border text-sm bg-theme-base border-theme-border text-theme-text placeholder:text-theme-text-secondary focus:outline-none focus:border-theme-accent focus:ring-1 focus:ring-theme-accent"
          />
          <button
            onClick={addUrl}
            disabled={!inputUrl.trim()}
            className="px-3 py-2 rounded-lg bg-theme-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center gap-1"
          >
            <Icons.Plus />
          </button>
        </div>

        {/* URL list */}
        <div className="space-y-2">
          {urls.map(url => {
            const state = analyses[url];
            const repoName = url.replace('https://github.com/', '');
            return (
              <div
                key={url}
                className="flex items-center gap-2 p-2 rounded-lg bg-theme-base border border-theme-border group"
              >
                <div className="flex-shrink-0 text-theme-text-secondary">
                  <Icons.Github />
                </div>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-sm font-mono text-theme-accent hover:underline truncate"
                >
                  {repoName}
                </a>
                {/* Status indicator */}
                {state?.loading && (
                  <div className="animate-spin h-4 w-4 border-2 border-t-transparent rounded-full border-theme-accent flex-shrink-0" />
                )}
                {state?.result && !state.error && (
                  <span className="text-green-500 flex-shrink-0"><Icons.Check /></span>
                )}
                {state?.error && (
                  <span className="text-red-500 flex-shrink-0" title={state.error}>!</span>
                )}
                {/* Analyze single button */}
                <button
                  onClick={() => analyzeOne(url)}
                  disabled={isAnyLoading}
                  className="opacity-0 group-hover:opacity-100 px-2 py-1 text-xs rounded-md bg-theme-muted text-theme-text-secondary hover:text-theme-text transition-all disabled:opacity-50"
                >
                  {t('github.analyzeOne')}
                </button>
                <button
                  onClick={() => removeUrl(url)}
                  disabled={isAnyLoading}
                  className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-theme-text-secondary hover:text-red-500 transition-all disabled:opacity-50"
                >
                  <Icons.X />
                </button>
              </div>
            );
          })}
          {urls.length === 0 && (
            <p className="text-sm text-theme-text-secondary text-center py-4">
              {t('github.noRepos')}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={analyzeAll}
            disabled={isAnyLoading || urls.length === 0}
            className="flex-1 px-4 py-2 rounded-lg bg-theme-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
          >
            {batchLoading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-t-transparent rounded-full border-white" />
                {t('github.analyzing')}
              </>
            ) : (
              <>
                <Icons.Sparkles />
                {t('github.analyzeAll')}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Global error */}
      {globalError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-400">
          {globalError}
        </div>
      )}

      {/* Results */}
      {hasAnyResult && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-theme-text">{t('github.results')}</h2>
          {urls.map(url => {
            const state = analyses[url];
            if (!state?.result) return null;
            const result = state.result;
            const isExpanded = expandedRepo === url;

            return (
              <div
                key={url}
                className="bg-theme-surface border border-theme-border rounded-xl overflow-hidden"
              >
                {/* Repo header */}
                <button
                  onClick={() => setExpandedRepo(isExpanded ? null : url)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-theme-muted transition-colors"
                >
                  <div className="flex-shrink-0 text-theme-text-secondary">
                    <Icons.Github />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-theme-text text-sm">{result.name}</span>
                      {result.stars > 0 && (
                        <span className="flex items-center gap-1 text-xs text-theme-text-secondary">
                          <Icons.Star />
                          {result.stars.toLocaleString()}
                        </span>
                      )}
                    </div>
                    {result.description && (
                      <p className="text-xs text-theme-text-secondary truncate mt-0.5">{result.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-theme-text-secondary hover:text-theme-accent transition-colors"
                      title={t('github.openRepo')}
                    >
                      <Icons.ExternalLink />
                    </a>
                    {isExpanded ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
                  </div>
                </button>

                {/* Analysis content */}
                {isExpanded && (
                  <div className="border-t border-theme-border p-4">
                    {state.error ? (
                      <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                        {state.error}
                      </div>
                    ) : (
                      <div className={`prose prose-sm max-w-none ${darkMode ? 'prose-invert' : ''}`}>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            table: ({ children }) => (
                              <div className="overflow-x-auto my-4">
                                <table className="min-w-full text-sm border-collapse border border-theme-border">
                                  {children}
                                </table>
                              </div>
                            ),
                            th: ({ children }) => (
                              <th className="border border-theme-border px-3 py-2 bg-theme-muted text-left font-semibold text-theme-text text-xs">
                                {children}
                              </th>
                            ),
                            td: ({ children }) => (
                              <td className="border border-theme-border px-3 py-2 text-theme-text text-xs">
                                {children}
                              </td>
                            ),
                            h2: ({ children }) => (
                              <h2 className="text-base font-bold text-theme-text mt-4 mb-2 first:mt-0">
                                {children}
                              </h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="text-sm font-semibold text-theme-text mt-3 mb-1">
                                {children}
                              </h3>
                            ),
                            p: ({ children }) => (
                              <p className="text-sm text-theme-text leading-relaxed my-2">
                                {children}
                              </p>
                            ),
                            ul: ({ children }) => (
                              <ul className="list-disc list-inside text-sm text-theme-text space-y-1 my-2">
                                {children}
                              </ul>
                            ),
                            li: ({ children }) => (
                              <li className="text-sm text-theme-text">
                                {children}
                              </li>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-semibold text-theme-text">
                                {children}
                              </strong>
                            ),
                            code: ({ children }) => (
                              <code className="text-xs bg-theme-muted px-1 py-0.5 rounded font-mono text-theme-accent">
                                {children}
                              </code>
                            ),
                          }}
                        >
                          {result.analysis}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Loading placeholder cards */}
      {isAnyLoading && !hasAnyResult && (
        <div className="space-y-4">
          {urls.map(url => {
            const state = analyses[url];
            if (!state?.loading) return null;
            const repoName = url.replace('https://github.com/', '');
            return (
              <div key={url} className="bg-theme-surface border border-theme-border rounded-xl p-4 flex items-center gap-3">
                <div className="animate-spin h-5 w-5 border-2 border-t-transparent rounded-full border-theme-accent flex-shrink-0" />
                <span className="text-sm text-theme-text-secondary font-mono">{repoName}</span>
                <span className="text-xs text-theme-text-secondary ml-auto">{t('github.analyzing')}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
