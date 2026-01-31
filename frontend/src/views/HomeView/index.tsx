import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Icons } from "../../components/icons/Icons";
import { ArticleContent } from "../../components/shared/ArticleContent";
import { entriesApi, subscriptionsApi } from "../../api";
import {
  mapEntryToArticle,
  mapActionToBackendStatus,
} from "../../utils/mappers";
import type { Article } from "../../types";
import type { Subscription } from "../../types/subscription";

interface HomeViewProps {
  darkMode: boolean;
}

// Check if article is from ArXiv
function isArxivArticle(article: Article): boolean {
  const link = article._entry?.link || article.url || "";
  if (link.includes("arxiv.org")) return true;
  const sourceName = (article.source || "").toLowerCase();
  return sourceName.includes("arxiv");
}

// Format date for display
function formatDate(dateString: string | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function HomeView({ darkMode }: HomeViewProps) {
  const { t } = useTranslation();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isShuffling, setIsShuffling] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [jumpInput, setJumpInput] = useState("");

  const contentRef = useRef<HTMLDivElement>(null);

  // Fetch subscriptions
  const fetchSubscriptions = useCallback(async () => {
    try {
      const response = await subscriptionsApi.getMySubscriptions();
      setSubscriptions(response.items);
    } catch (error) {
      console.error("Failed to fetch subscriptions:", error);
    }
  }, []);

  // Fetch unread entries
  const fetchEntries = useCallback(async (sourceId?: number | null) => {
    try {
      setLoading(true);
      const [entriesResponse, subscriptionsResponse] = await Promise.all([
        entriesApi.getUnread(1, 100),
        subscriptionsApi.getMySubscriptions(),
      ]);

      const subscribedSourceIds = new Set(
        subscriptionsResponse.items.map((sub) => sub.rss_source_id),
      );

      let filteredEntries = entriesResponse.items.filter((entry) =>
        subscribedSourceIds.has(entry.rss_source_id),
      );

      // Filter by selected source if specified
      if (sourceId) {
        filteredEntries = filteredEntries.filter(
          (entry) => entry.rss_source_id === sourceId,
        );
      }

      const mappedArticles = filteredEntries.map(mapEntryToArticle);
      setArticles(mappedArticles);
      setCurrentIndex(0);
    } catch (error) {
      console.error("Failed to fetch entries:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
    fetchEntries(selectedSourceId);
  }, [fetchSubscriptions, fetchEntries, selectedSourceId]);

  // Reset scroll position on article change
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [currentIndex]);

  // Handle save action
  const handleSave = async () => {
    if (isAnimating || articles.length === 0) return;
    const article = articles[currentIndex];
    if (!article?._entry) return;

    setIsAnimating(true);
    try {
      await entriesApi.updateStatus(
        article._entry.id,
        mapActionToBackendStatus("save"),
      );
      setArticles((prev) => prev.filter((_, i) => i !== currentIndex));
      if (currentIndex >= articles.length - 1) {
        setCurrentIndex(Math.max(0, articles.length - 2));
      }
    } catch (error) {
      console.error("Failed to save article:", error);
    } finally {
      setIsAnimating(false);
    }
  };

  // Handle discard action
  const handleDiscard = async () => {
    if (isAnimating || articles.length === 0) return;
    const article = articles[currentIndex];
    if (!article?._entry) return;

    setIsAnimating(true);
    try {
      await entriesApi.updateStatus(
        article._entry.id,
        mapActionToBackendStatus("discard"),
      );
      setArticles((prev) => prev.filter((_, i) => i !== currentIndex));
      if (currentIndex >= articles.length - 1) {
        setCurrentIndex(Math.max(0, articles.length - 2));
      }
    } catch (error) {
      console.error("Failed to discard article:", error);
    } finally {
      setIsAnimating(false);
    }
  };

  // Handle shuffle
  const handleShuffle = async () => {
    if (isShuffling || isAnimating || articles.length <= 1) return;
    setIsShuffling(true);
    try {
      const shuffled = [...articles];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setArticles(shuffled);
      setCurrentIndex(0);
      await entriesApi.shuffleUnread();
    } catch (error) {
      console.error("Failed to shuffle:", error);
    } finally {
      setIsShuffling(false);
    }
  };

  // Navigate to previous article
  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Navigate to next article
  const goNext = () => {
    if (currentIndex < articles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Handle source filter change
  const handleSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedSourceId(value ? Number(value) : null);
    setCurrentIndex(0);
  };

  // Handle jump to article by index
  const handleJumpToArticle = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const targetIndex = parseInt(jumpInput, 10) - 1;
      if (
        !isNaN(targetIndex) &&
        targetIndex >= 0 &&
        targetIndex < articles.length
      ) {
        setCurrentIndex(targetIndex);
      }
      setJumpInput("");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full pt-6 pb-24 px-4 md:px-6 lg:px-8 animate-pulse">
        {/* Skeleton: Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="h-5 w-16 rounded bg-theme-muted" />
            <div className="h-5 w-20 rounded bg-theme-muted" />
          </div>
          <div className="h-4 w-24 rounded bg-theme-muted" />
        </div>
        {/* Skeleton: Title */}
        <div className="h-8 md:h-10 rounded w-3/4 mb-4 bg-theme-muted" />
        {/* Skeleton: Author */}
        <div className="h-4 w-48 rounded mb-8 ml-4 bg-theme-muted" />
        {/* Skeleton: Divider */}
        <div className="h-px w-full mb-8 bg-theme-border" />
        {/* Skeleton: Content */}
        <div className="space-y-4">
          <div className="h-4 rounded w-full bg-theme-muted" />
          <div className="h-4 rounded w-5/6 bg-theme-muted" />
          <div className="h-4 rounded w-full bg-theme-muted" />
          <div className="h-4 rounded w-4/5 bg-theme-muted" />
          <div className="h-4 rounded w-full bg-theme-muted" />
          <div className="h-4 rounded w-3/4 bg-theme-muted" />
        </div>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4 animate-fade-in">
          <div className="mb-4 p-4 rounded-full bg-theme-muted text-theme-text-tertiary">
            <Icons.Check />
          </div>
          <p className="text-lg font-medium text-theme-text-secondary mb-1">
            {selectedSourceId ? t("home.noArticlesInSource") : t("home.allCaughtUp")}
          </p>
          <p className="text-sm text-theme-text-tertiary max-w-md">
            {selectedSourceId ? t("home.trySelectingAnotherSource") : t("home.allCaughtUpDesc")}
          </p>
        </div>

        {/* Floating Action Bar - Always show source selector */}
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-10">
          <div className="flex items-center gap-2 px-3 py-2 rounded-full shadow-lg backdrop-blur-sm bg-theme-surface/95 border border-theme-border">
            {/* Source Filter */}
            <span className="text-xs text-theme-text-tertiary">
              {t("home.source")}:
            </span>
            <select
              value={selectedSourceId || ""}
              onChange={handleSourceChange}
              className="px-2 py-1 rounded text-sm border-0 bg-transparent cursor-pointer text-theme-text-secondary"
            >
              <option value="">{t("common.all")}</option>
              {subscriptions.map((sub) => (
                <option key={sub.id} value={sub.rss_source_id}>
                  {sub.rss_source_name || `#${sub.rss_source_id}`}
                </option>
              ))}
            </select>
          </div>
        </nav>
      </>
    );
  }

  const current = articles[currentIndex];
  const isArxiv = isArxivArticle(current);
  const hasInterpretation =
    current._entry?.ai_summary &&
    current._entry?.ai_content_type === "arxiv_interpretation";
  const isInterpreting = current._entry?.ai_content_type === "interpreting";
  const isInterpretFailed = current._entry?.ai_content_type === "error";
  const isNoHtml = current._entry?.ai_content_type === "no_html";
  const translatedAbstract = current._entry?.translated_abstract;
  const briefSummary = current._entry?.brief_summary;

  return (
    <>
      {/* Article Content - Claude AI inspired layout */}
      <article
        ref={contentRef}
        className="flex-1 flex flex-col max-w-5xl mx-auto w-full pt-6 pb-24 px-4 md:px-6 lg:px-8"
      >
        {/* Document Header: Tag + Date */}
        <div className="flex justify-between items-center text-sm mb-6">
          <span className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-theme-muted text-theme-text-secondary">
              {current.source}
            </span>
            {isArxiv && (
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  hasInterpretation
                    ? "bg-theme-success/15 text-theme-success"
                    : isNoHtml
                      ? "bg-theme-muted text-theme-text-secondary"
                      : isInterpretFailed
                        ? "bg-theme-error/15 text-theme-error"
                        : isInterpreting
                          ? "bg-theme-warning/15 text-theme-warning"
                          : "bg-theme-accent/15 text-theme-accent"
                }`}
              >
                {hasInterpretation
                  ? t("home.interpreted")
                  : isNoHtml
                    ? t("home.noHtml")
                    : isInterpretFailed
                      ? t("home.interpretFailed")
                      : isInterpreting
                        ? t("home.interpreting")
                        : "ArXiv"}
              </span>
            )}
          </span>
          <time className="text-theme-text-tertiary">
            {formatDate(
              current._entry?.published_at ||
                current._entry?.created_at ||
                null,
            )}
          </time>
        </div>

        {/* Title - Markdown H1 Style */}
        <h1
          onClick={() => {
            if (current.url) {
              window.open(current.url, "_blank", "noopener,noreferrer");
            }
          }}
          className="text-2xl md:text-3xl font-serif font-bold mb-4 leading-tight cursor-pointer hover:underline decoration-2 underline-offset-4 text-theme-text hover:text-theme-accent"
        >
          {current.title}
        </h1>

        {/* Author - Blockquote Style */}
        {current.author && (
          <blockquote className="border-l-4 pl-4 mb-8 border-theme-border text-theme-text-secondary">
            {current.author}
          </blockquote>
        )}

        <hr className="mb-8 border-theme-border" />

        {isArxiv ? (
          <>
            {/* 要点总结 + 翻译摘要：无标题，简洁展示 */}
            {(briefSummary || translatedAbstract) && (
              <section className="mb-8">
                {briefSummary && (
                  <p className="text-base leading-relaxed mb-4 text-theme-text">
                    {briefSummary}
                  </p>
                )}
                {translatedAbstract && (
                  <ArticleContent
                    content={translatedAbstract}
                    darkMode={darkMode}
                  />
                )}
              </section>
            )}

            {/* 原文摘要 - 折叠 */}
            <details className="mb-8 group">
              <summary className="cursor-pointer text-sm text-theme-text-tertiary hover:text-theme-text-secondary">
                <span className="transform transition-transform group-open:rotate-90 inline-block mr-2">
                  ▶
                </span>
                {t("home.originalAbstract")}
              </summary>
              <div className="mt-4 pl-6">
                <ArticleContent content={current.content} darkMode={darkMode} />
              </div>
            </details>

            {/* AI 深度解读 - 保留标题（内容长需要导航） */}
            {hasInterpretation ? (
              <section>
                <ArticleContent
                  content={current._entry!.ai_summary!}
                  darkMode={darkMode}
                />
              </section>
            ) : isNoHtml ? (
              <div className="flex items-center justify-center gap-2 py-6 text-theme-text-secondary">
                <Icons.Info />
                <span>{t("home.noHtmlAvailable")}</span>
              </div>
            ) : isInterpreting ? (
              <div className="flex items-center gap-3 py-8 justify-center text-theme-text-secondary">
                <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
                <span>{t("home.interpretingArticle")}</span>
              </div>
            ) : null}
          </>
        ) : (
          /* Non-ArXiv: show original content directly */
          <ArticleContent content={current.content} darkMode={darkMode} />
        )}
      </article>

      {/* Unified Floating Action Bar - PC shows text labels, mobile icons only */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-10">
        <div className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-full shadow-xl backdrop-blur-sm transition-micro bg-theme-surface/95 border border-theme-border">
          {/* Previous */}
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            className={`flex items-center justify-center gap-1 min-h-touch min-w-touch md:min-w-0 md:px-3 rounded-full transition-micro text-ui-sm ${
              currentIndex === 0
                ? "text-theme-text-muted cursor-not-allowed"
                : "text-theme-text-secondary hover:bg-theme-muted cursor-pointer active:scale-95"
            }`}
            title={t("home.prevArticle")}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span className="hidden md:inline">{t("home.prevArticle")}</span>
          </button>

          {/* Divider */}
          <div className="w-px h-4 bg-theme-border" />

          {/* Discard */}
          <button
            onClick={handleDiscard}
            disabled={isAnimating}
            className={`flex items-center justify-center gap-1 min-h-touch min-w-touch md:min-w-0 md:px-3 rounded-full transition-micro text-ui-sm ${
              isAnimating
                ? "opacity-50 cursor-not-allowed"
                : "text-theme-text-secondary hover:bg-theme-muted hover:text-theme-error cursor-pointer active:scale-95"
            }`}
            title={t("home.discard")}
          >
            <Icons.X />
            <span className="hidden md:inline">{t("home.discard")}</span>
          </button>

          {/* Source Filter */}
          <select
            value={selectedSourceId || ""}
            onChange={handleSourceChange}
            className="px-1 py-1 rounded text-xs border-0 bg-transparent cursor-pointer max-w-[60px] md:max-w-[100px] text-theme-text-secondary"
          >
            <option value="">{t("common.all")}</option>
            {subscriptions.map((sub) => (
              <option key={sub.id} value={sub.rss_source_id}>
                {sub.rss_source_name || `#${sub.rss_source_id}`}
              </option>
            ))}
          </select>

          {/* Article Counter */}
          <div className="flex items-center flex-shrink-0 whitespace-nowrap">
            <input
              type="text"
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              onKeyDown={handleJumpToArticle}
              placeholder={String(currentIndex + 1)}
              className="w-8 text-center text-caption bg-transparent border-0 outline-none text-theme-text-secondary placeholder-theme-text-tertiary"
            />
            <span className="text-caption text-theme-text-tertiary">
              /{articles.length}
            </span>
          </div>

          {/* Shuffle */}
          <button
            onClick={handleShuffle}
            disabled={isShuffling || isAnimating}
            className={`flex items-center justify-center gap-1 min-h-touch min-w-touch md:min-w-0 md:px-3 rounded-full transition-micro text-ui-sm ${
              isShuffling || isAnimating
                ? "opacity-50 cursor-not-allowed"
                : "text-theme-text-secondary hover:bg-theme-muted hover:text-theme-text cursor-pointer active:scale-95"
            }`}
            title={t("home.shuffle")}
          >
            <Icons.Shuffle />
            <span className="hidden md:inline">{t("home.shuffle")}</span>
          </button>

          {/* Divider */}
          <div className="w-px h-4 bg-theme-border" />

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={isAnimating}
            className={`flex items-center justify-center gap-1 min-h-touch min-w-touch md:min-w-0 md:px-3 rounded-full transition-micro text-ui-sm ${
              isAnimating
                ? "opacity-50 cursor-not-allowed"
                : "text-theme-accent hover:bg-theme-muted cursor-pointer active:scale-95"
            }`}
            title={t("home.save")}
          >
            <Icons.Check />
            <span className="hidden md:inline">{t("home.save")}</span>
          </button>

          {/* Next */}
          <button
            onClick={goNext}
            disabled={currentIndex === articles.length - 1}
            className={`flex items-center justify-center gap-1 min-h-touch min-w-touch md:min-w-0 md:px-3 rounded-full transition-micro text-ui-sm ${
              currentIndex === articles.length - 1
                ? "text-theme-text-muted cursor-not-allowed"
                : "text-theme-text-secondary hover:bg-theme-muted cursor-pointer active:scale-95"
            }`}
            title={t("home.nextArticle")}
          >
            <span className="hidden md:inline">{t("home.nextArticle")}</span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </nav>
    </>
  );
}
