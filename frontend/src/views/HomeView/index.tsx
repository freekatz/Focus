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
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin h-8 w-8 border-2 border-spira-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4 animate-fade-in">
        <div
          className={`p-4 rounded-full ${
            darkMode ? "bg-stone-800" : "bg-spira-100"
          }`}
        >
          <div className={`${darkMode ? "text-teal-400" : "text-spira-600"}`}>
            <Icons.Check />
          </div>
        </div>
        <h2 className="text-2xl font-serif font-medium">
          {t("home.allCaughtUp")}
        </h2>
        <p
          className={`max-w-md ${darkMode ? "text-stone-400" : "text-zinc-500"}`}
        >
          {t("home.allCaughtUpDesc")}
        </p>
      </div>
    );
  }

  const current = articles[currentIndex];
  const isArxiv = isArxivArticle(current);
  const hasInterpretation =
    current._entry?.ai_summary &&
    current._entry?.ai_content_type === "arxiv_interpretation";
  const isInterpreting = current._entry?.ai_content_type === "interpreting";
  const isInterpretFailed = current._entry?.ai_content_type === "error";
  const translatedAbstract = current._entry?.translated_abstract;
  const briefSummary = current._entry?.brief_summary;

  return (
    <>
      {/* Article Content - Claude AI inspired layout */}
      <article
        ref={contentRef}
        className="flex-1 flex flex-col max-w-5xl mx-auto w-full pt-6 pb-24 px-2 md:px-3 lg:px-8"
      >
        {/* Document Header: Tag + Date */}
        <div className="flex justify-between items-center text-sm mb-6 px-2">
          <span className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                darkMode
                  ? "bg-stone-800 text-stone-300"
                  : "bg-zinc-100 text-zinc-600"
              }`}
            >
              {current.source}
            </span>
            {isArxiv && (
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  hasInterpretation
                    ? darkMode
                      ? "bg-green-900/30 text-green-400"
                      : "bg-green-100 text-green-700"
                    : isInterpretFailed
                      ? darkMode
                        ? "bg-red-900/30 text-red-400"
                        : "bg-red-100 text-red-700"
                      : isInterpreting
                        ? darkMode
                          ? "bg-yellow-900/30 text-yellow-400"
                          : "bg-yellow-100 text-yellow-700"
                        : darkMode
                          ? "bg-teal-900/30 text-teal-400"
                          : "bg-blue-100 text-blue-700"
                }`}
              >
                {hasInterpretation
                  ? t("home.interpreted")
                  : isInterpretFailed
                    ? t("home.interpretFailed")
                    : isInterpreting
                      ? t("home.interpreting")
                      : "ArXiv"}
              </span>
            )}
          </span>
          <time className={darkMode ? "text-stone-500" : "text-zinc-500"}>
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
          className={`text-2xl md:text-3xl font-serif font-bold mb-4 leading-tight cursor-pointer hover:underline decoration-2 underline-offset-4 pl-2 pr-8 ${
            darkMode
              ? "text-stone-100 hover:text-teal-300"
              : "text-zinc-900 hover:text-spira-600"
          }`}
        >
          {current.title}
        </h1>

        {/* Author - Blockquote Style */}
        {current.author && (
          <blockquote
            className={`border-l-4 pl-4 mb-8 ml-2 pr-8 ${
              darkMode
                ? "border-stone-700 text-stone-400"
                : "border-zinc-200 text-zinc-600"
            }`}
          >
            {current.author}
          </blockquote>
        )}

        <hr
          className={`mb-8 mx-2 ${darkMode ? "border-stone-700" : "border-zinc-200"}`}
        />

        {isArxiv ? (
          <>
            {/* Brief Summary - Key Points (if available) */}
            {briefSummary && (
              <section className="mb-8">
                <div
                  className={`rounded-lg p-4 mx-2 ${
                    darkMode
                      ? "bg-teal-900/20 border border-teal-800/30"
                      : "bg-spira-50 border border-spira-200"
                  }`}
                >
                  <h2
                    className={`text-base font-semibold mb-2 flex items-center gap-2 ${
                      darkMode ? "text-teal-300" : "text-spira-700"
                    }`}
                  >
                    <Icons.Sparkles />
                    {t("home.briefSummary")}
                  </h2>
                  <p
                    className={`text-sm leading-relaxed ${
                      darkMode ? "text-stone-300" : "text-zinc-700"
                    }`}
                  >
                    {briefSummary}
                  </p>
                </div>
              </section>
            )}

            {/* Original Abstract - Collapsible with native details (above translated) */}
            <details className="mb-8 group pl-2 pr-8">
              <summary
                className={`cursor-pointer flex items-center gap-2 text-sm font-medium ${
                  darkMode
                    ? "text-stone-400 hover:text-stone-200"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                <span className="transform transition-transform group-open:rotate-90">
                  ▶
                </span>
                {t("home.originalAbstract")}
              </summary>
              <div className="mt-4 pl-6">
                <ArticleContent content={current.content} darkMode={darkMode} />
              </div>
            </details>

            {/* Translated Abstract - H2 Section */}
            {translatedAbstract && (
              <section className="mb-8">
                <h2
                  className={`text-xl font-semibold mb-4 flex items-center gap-2 pl-2 pr-8 ${
                    darkMode ? "text-stone-200" : "text-zinc-800"
                  }`}
                >
                  <span
                    className={darkMode ? "text-teal-400" : "text-spira-600"}
                  >
                    <Icons.Language />
                  </span>
                  {t("home.translatedAbstract")}
                </h2>
                <ArticleContent
                  content={translatedAbstract}
                  darkMode={darkMode}
                />
              </section>
            )}

            {/* AI Interpretation - H2 Section */}
            {hasInterpretation ? (
              <section>
                <h2
                  className={`text-xl font-semibold mb-4 flex items-center gap-2 pl-2 pr-8 ${
                    darkMode ? "text-stone-200" : "text-zinc-800"
                  }`}
                >
                  <span
                    className={darkMode ? "text-teal-400" : "text-spira-600"}
                  >
                    <Icons.Sparkles />
                  </span>
                  {t("home.aiInterpretation")}
                </h2>
                <ArticleContent
                  content={current._entry!.ai_summary!}
                  darkMode={darkMode}
                />
              </section>
            ) : isInterpreting ? (
              <div
                className={`flex items-center gap-3 py-8 justify-center ${
                  darkMode ? "text-stone-400" : "text-zinc-500"
                }`}
              >
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
        <div
          className={`flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-full shadow-lg backdrop-blur-sm ${
            darkMode
              ? "bg-stone-800/95 border border-stone-700"
              : "bg-white/95 border border-zinc-200"
          }`}
        >
          {/* Previous */}
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            className={`flex items-center gap-1 p-2 md:px-3 md:py-1.5 rounded-full transition-colors text-sm ${
              currentIndex === 0
                ? darkMode
                  ? "text-stone-600 cursor-not-allowed"
                  : "text-zinc-300 cursor-not-allowed"
                : darkMode
                  ? "text-stone-300 hover:bg-stone-700"
                  : "text-zinc-600 hover:bg-zinc-100"
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
          <div
            className={`w-px h-4 ${darkMode ? "bg-stone-700" : "bg-zinc-200"}`}
          />

          {/* Discard */}
          <button
            onClick={handleDiscard}
            disabled={isAnimating}
            className={`flex items-center gap-1 p-2 md:px-3 md:py-1.5 rounded-full transition-colors text-sm ${
              isAnimating
                ? "opacity-50 cursor-not-allowed"
                : darkMode
                  ? "text-stone-400 hover:bg-stone-700 hover:text-red-400"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-red-500"
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
            className={`px-1 py-1 rounded text-xs border-0 bg-transparent cursor-pointer max-w-[60px] md:max-w-[100px] ${
              darkMode ? "text-stone-400" : "text-zinc-500"
            }`}
          >
            <option value="">{t("common.all")}</option>
            {subscriptions.map((sub) => (
              <option key={sub.id} value={sub.rss_source_id}>
                {sub.rss_source_name || `#${sub.rss_source_id}`}
              </option>
            ))}
          </select>

          {/* Article Counter */}
          <div className="flex items-center">
            <input
              type="text"
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              onKeyDown={handleJumpToArticle}
              placeholder={String(currentIndex + 1)}
              className={`w-6 text-center text-xs bg-transparent border-0 outline-none ${
                darkMode
                  ? "text-stone-400 placeholder-stone-500"
                  : "text-zinc-500 placeholder-zinc-400"
              }`}
            />
            <span
              className={`text-xs ${darkMode ? "text-stone-500" : "text-zinc-400"}`}
            >
              / {articles.length}
            </span>
          </div>

          {/* Shuffle */}
          <button
            onClick={handleShuffle}
            disabled={isShuffling || isAnimating}
            className={`flex items-center gap-1 p-2 md:px-3 md:py-1.5 rounded-full transition-colors text-sm ${
              isShuffling || isAnimating
                ? "opacity-50 cursor-not-allowed"
                : darkMode
                  ? "text-stone-400 hover:bg-stone-700 hover:text-stone-200"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
            }`}
            title={t("home.shuffle")}
          >
            <Icons.Shuffle />
            <span className="hidden md:inline">{t("home.shuffle")}</span>
          </button>

          {/* Divider */}
          <div
            className={`w-px h-4 ${darkMode ? "bg-stone-700" : "bg-zinc-200"}`}
          />

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={isAnimating}
            className={`flex items-center gap-1 p-2 md:px-3 md:py-1.5 rounded-full transition-colors text-sm ${
              isAnimating
                ? "opacity-50 cursor-not-allowed"
                : darkMode
                  ? "text-teal-400 hover:bg-stone-700"
                  : "text-spira-600 hover:bg-zinc-100"
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
            className={`flex items-center gap-1 p-2 md:px-3 md:py-1.5 rounded-full transition-colors text-sm ${
              currentIndex === articles.length - 1
                ? darkMode
                  ? "text-stone-600 cursor-not-allowed"
                  : "text-zinc-300 cursor-not-allowed"
                : darkMode
                  ? "text-stone-300 hover:bg-stone-700"
                  : "text-zinc-600 hover:bg-zinc-100"
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
