import React, { useState, useEffect, useCallback, useRef } from "react";
import { Icons } from "../../components/icons/Icons";
import { AIBottomSheet } from "../../components/shared/AIBottomSheet";
import { ArticleContent } from "../../components/shared/ArticleContent";
import { entriesApi, subscriptionsApi } from "../../api";
import {
  mapEntryToArticle,
  mapActionToBackendStatus,
} from "../../utils/mappers";
import type { Article } from "../../types";

interface HomeViewProps {
  darkMode: boolean;
}

type SwipeDirection = "left" | "right" | null;

export function HomeView({ darkMode }: HomeViewProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Animation states
  const [isAnimating, setIsAnimating] = useState(false);
  const [exitDirection, setExitDirection] = useState<SwipeDirection>(null);
  const [enterDirection, setEnterDirection] = useState<SwipeDirection>(null);
  const [isShuffling, setIsShuffling] = useState(false);

  // Swipe Constants - increased threshold to prevent accidental triggers
  const minSwipeDistance = 180;

  // Ref for content scroll area
  const contentRef = useRef<HTMLDivElement>(null);

  // Fetch unread entries from subscribed sources only
  const fetchEntries = useCallback(async () => {
    try {
      // Get user's subscriptions to filter entries
      const [entriesResponse, subscriptionsResponse] = await Promise.all([
        entriesApi.getUnread(1, 50),
        subscriptionsApi.getMySubscriptions(),
      ]);

      // Get set of subscribed source IDs
      const subscribedSourceIds = new Set(
        subscriptionsResponse.items.map((sub) => sub.rss_source_id)
      );

      // Filter entries to only include those from subscribed sources
      const filteredEntries = entriesResponse.items.filter((entry) =>
        subscribedSourceIds.has(entry.rss_source_id)
      );

      const mappedArticles = filteredEntries.map(mapEntryToArticle);
      setArticles(mappedArticles);
    } catch (error) {
      console.error("Failed to fetch entries:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    // Reset sheet and scroll position on article change
    setSheetOpen(false);
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [articles.length > 0 ? articles[0]?.id : null]);

  // Animated action with direction tracking
  const performAction = async (
    id: string,
    action: "save" | "discard",
    direction: SwipeDirection
  ) => {
    if (isAnimating) return;

    const article = articles.find((a) => a.id === id);
    if (!article?._entry) return;

    setIsAnimating(true);
    setExitDirection(direction);

    // Wait for exit animation
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      await entriesApi.updateStatus(
        article._entry.id,
        mapActionToBackendStatus(action)
      );

      // Set enter direction (opposite of exit for visual continuity)
      // If we swipe left (save), next card enters from right
      // If we swipe right (discard), next card enters from left
      setEnterDirection(direction === "left" ? "right" : "left");

      setArticles((prev) => prev.filter((a) => a.id !== id));
    } catch (error) {
      console.error(`Failed to ${action} article:`, error);
    } finally {
      setExitDirection(null);
      setOffset(0);

      // Reset enter direction after animation
      setTimeout(() => {
        setEnterDirection(null);
        setIsAnimating(false);
      }, 300);
    }
  };

  const handleSave = (id: string) => {
    performAction(id, "save", "left");
  };

  const handleDiscard = (id: string) => {
    performAction(id, "discard", "right");
  };

  const updateSummary = (id: string, summary: string) => {
    setArticles((prev) =>
      prev.map((a) => (a.id === id ? { ...a, summary } : a))
    );
  };

  const handleShuffle = async () => {
    if (isShuffling || isAnimating) return;
    setIsShuffling(true);
    try {
      await entriesApi.shuffleUnread();
      await fetchEntries();
    } catch (error) {
      console.error("Failed to shuffle:", error);
    } finally {
      setIsShuffling(false);
    }
  };

  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [isHorizontalSwipe, setIsHorizontalSwipe] = useState<boolean | null>(
    null
  );

  // Refs for touch state (needed for native event listeners)
  const touchStateRef = useRef({
    startX: null as number | null,
    startY: null as number | null,
    isHorizontal: null as boolean | null,
  });

  // Native touch event handlers for content area (with passive: false)
  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;

    const handleTouchMove = (e: TouchEvent) => {
      const state = touchStateRef.current;
      if (state.startX === null || state.startY === null) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const diffX = Math.abs(currentX - state.startX);
      const diffY = Math.abs(currentY - state.startY);

      // Determine swipe direction (only once)
      if (state.isHorizontal === null && (diffX > 10 || diffY > 10)) {
        state.isHorizontal = diffX > diffY;
        setIsHorizontalSwipe(state.isHorizontal);
      }

      // Prevent scroll and update offset for horizontal swipe
      if (state.isHorizontal) {
        e.preventDefault();
        setTouchEnd(currentX);
        setOffset(currentX - state.startX);
      }
    };

    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => {
      element.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    const startX = e.targetTouches[0].clientX;
    const startY = e.targetTouches[0].clientY;
    setTouchStart(startX);
    setTouchStartY(startY);
    setIsHorizontalSwipe(null);
    touchStateRef.current = { startX, startY, isHorizontal: null };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    // Only handle for card container (not content area which uses native listener)
    if (e.currentTarget === contentRef.current) return;

    if (!touchStart || touchStartY === null) return;

    const currentX = e.targetTouches[0].clientX;
    const currentY = e.targetTouches[0].clientY;
    const diffX = Math.abs(currentX - touchStart);
    const diffY = Math.abs(currentY - touchStartY);

    // Determine swipe direction (only once)
    if (isHorizontalSwipe === null && (diffX > 10 || diffY > 10)) {
      const horizontal = diffX > diffY;
      setIsHorizontalSwipe(horizontal);
    }

    // Only update offset for horizontal swipe
    if (isHorizontalSwipe) {
      setTouchEnd(currentX);
      setOffset(currentX - touchStart);
    }
  };

  const onTouchEnd = () => {
    touchStateRef.current = { startX: null, startY: null, isHorizontal: null };

    if (!touchStart || !touchEnd || !isHorizontalSwipe) {
      setOffset(0);
      setTouchStart(null);
      setTouchEnd(null);
      setTouchStartY(null);
      setIsHorizontalSwipe(null);
      return;
    }
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && articles.length > 0) {
      performAction(articles[0].id, "save", "left");
    } else if (isRightSwipe && articles.length > 0) {
      performAction(articles[0].id, "discard", "right");
    } else {
      setOffset(0);
    }
    // Reset touch state
    setTouchStart(null);
    setTouchEnd(null);
    setTouchStartY(null);
    setIsHorizontalSwipe(null);
  };

  // Calculate card styles based on animation state
  const getCardStyle = () => {
    // Exit animation
    if (exitDirection === "left") {
      return {
        transform: "translateX(-120%) rotate(-15deg)",
        opacity: 0,
        transition: "all 0.3s ease-out",
      };
    }
    if (exitDirection === "right") {
      return {
        transform: "translateX(120%) rotate(15deg)",
        opacity: 0,
        transition: "all 0.3s ease-out",
      };
    }

    // Enter animation
    if (enterDirection === "right") {
      return {
        transform: "translateX(0) rotate(0deg)",
        opacity: 1,
        transition: "all 0.3s ease-out",
        animation: "slide-in-right 0.3s ease-out",
      };
    }
    if (enterDirection === "left") {
      return {
        transform: "translateX(0) rotate(0deg)",
        opacity: 1,
        transition: "all 0.3s ease-out",
        animation: "slide-in-left 0.3s ease-out",
      };
    }

    // Normal drag state
    const rotate = offset / 25; // Reduced rotation for smoother feel
    const opacity = 1 - Math.abs(offset) / 600;
    return {
      transform: `translateX(${offset}px) rotate(${rotate}deg)`,
      opacity: opacity,
      transition: touchStart ? "none" : "all 0.3s ease-out",
    };
  };

  const cardStyle = getCardStyle();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin h-8 w-8 border-2 border-spira-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-4 animate-fade-in pt-20 md:pt-0">
        <div
          className={`p-4 rounded-full ${
            darkMode ? "bg-slate-800" : "bg-spira-100"
          }`}
        >
          <div className={`${darkMode ? "text-indigo-400" : "text-spira-600"}`}>
            <Icons.Check />
          </div>
        </div>
        <h2 className="text-2xl font-serif font-medium">All caught up</h2>
        <p className="text-zinc-500 max-w-md">
          You've processed all incoming items. Enjoy your focus time or check
          your Library.
        </p>
      </div>
    );
  }

  const current = articles[0];

  return (
    <div className="h-full flex flex-col items-center justify-between md:justify-center max-w-5xl mx-auto animate-fade-in pb-4 md:pb-8 px-1 md:px-6">
      <div className="relative w-full flex-1 flex flex-col justify-center perspective-1000 min-h-0 pt-2 md:pt-0">
        <div
          style={cardStyle}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className={`relative w-full h-full md:h-[80vh] flex flex-col rounded-2xl md:rounded-3xl shadow-xl border overflow-hidden select-none ${
            darkMode
              ? "bg-slate-800 border-slate-700 shadow-slate-900/50"
              : "bg-white border-zinc-100 shadow-zinc-200"
          }`}
        >
          {/* Sticky Header */}
          <div
            className={`flex-shrink-0 px-3 md:px-8 py-3 md:py-5 border-b ${
              darkMode
                ? "bg-slate-800 border-slate-700"
                : "bg-white border-zinc-100"
            }`}
          >
            {/* Top Row: Source & Counter */}
            <div className="flex justify-between items-center mb-3">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase ${
                  darkMode
                    ? "bg-slate-700 text-indigo-300"
                    : "bg-spira-100 text-spira-700"
                }`}
              >
                {current.source}
              </span>
              <span
                className={`text-xs font-bold px-2 py-1 rounded-md ${
                  darkMode
                    ? "text-slate-400 bg-slate-700/50"
                    : "text-zinc-400 bg-zinc-100"
                }`}
              >
                {articles.length} Left
              </span>
            </div>

            {/* Title */}
            <h1 className="mb-2 line-clamp-2">
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  if (current.url) {
                    window.open(current.url, "_blank", "noopener,noreferrer");
                  }
                }}
                className={`text-xl md:text-2xl font-serif font-bold leading-snug cursor-pointer hover:underline ${
                  darkMode
                    ? "text-slate-100 hover:text-indigo-300"
                    : "text-zinc-900 hover:text-spira-600"
                }`}
              >
                {current.title}
              </span>
            </h1>

            {/* Metadata - same style as ReadingModal */}
            <div
              className={`text-sm flex items-center gap-2 ${
                darkMode ? "text-slate-400" : "text-zinc-500"
              }`}
            >
              <span className="font-medium">{current.author}</span>
              <span>•</span>
              <span>{current.timestamp}</span>
            </div>
          </div>

          {/* Scrollable Content */}
          <div
            ref={contentRef}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            className={`flex-1 overflow-y-auto px-3 md:px-8 py-4 pb-28 md:pb-36 ${
              darkMode
                ? "scrollbar-styled scrollbar-styled-dark"
                : "scrollbar-styled"
            }`}
          >
            <ArticleContent content={current.content} darkMode={darkMode} />
          </div>

          {/* Floating Trigger Button */}
          <div
            className="absolute bottom-6 right-6 z-10"
            onTouchStart={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSheetOpen(true)}
              className={`flex items-center gap-2 px-4 py-3 rounded-full shadow-xl transition-transform active:scale-95 ${
                darkMode
                  ? "bg-indigo-600 text-white"
                  : "bg-spira-600 text-white"
              }`}
            >
              <Icons.Sparkles />
              <span className="text-sm font-bold">Insight</span>
            </button>
          </div>

          {/* TikTok-style Drawer Overlay */}
          <AIBottomSheet
            isOpen={sheetOpen}
            onClose={() => setSheetOpen(false)}
            article={current}
            onUpdateSummary={updateSummary}
            darkMode={darkMode}
          />
        </div>

        {offset > 80 && (
          <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-red-500/30 to-transparent rounded-l-2xl md:rounded-l-3xl pointer-events-none flex items-center justify-start px-4">
            <div
              className={`bg-red-500 text-white p-2 rounded-full transition-transform ${
                offset > minSwipeDistance ? "scale-110" : "scale-100"
              }`}
            >
              <Icons.X />
            </div>
          </div>
        )}
        {offset < -80 && (
          <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-green-500/30 to-transparent rounded-r-2xl md:rounded-r-3xl pointer-events-none flex items-center justify-end px-4">
            <div
              className={`bg-green-500 text-white p-2 rounded-full transition-transform ${
                offset < -minSwipeDistance ? "scale-110" : "scale-100"
              }`}
            >
              <Icons.Check />
            </div>
          </div>
        )}
      </div>

      <div className="w-full flex justify-between items-center md:justify-center md:gap-6 mt-3 md:mt-10 px-2 md:px-0">
        <button
          onClick={() => handleDiscard(current.id)}
          className={`flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full border-2 transition-all duration-200 active:scale-95 md:hover:scale-110 ${
            darkMode
              ? "border-red-900/50 text-red-400 bg-slate-900/80 backdrop-blur"
              : "border-red-100 text-red-400 bg-white/80 backdrop-blur shadow-sm"
          }`}
          aria-label="Discard"
        >
          <Icons.X />
        </button>
        <button
          onClick={handleShuffle}
          disabled={isShuffling}
          className={`flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full border-2 transition-all duration-200 active:scale-95 md:hover:scale-110 ${
            isShuffling ? "opacity-50 cursor-not-allowed" : ""
          } ${
            darkMode
              ? "border-slate-700 text-slate-400 bg-slate-900/80 backdrop-blur hover:text-slate-200 hover:border-slate-500"
              : "border-zinc-200 text-zinc-500 bg-white/80 backdrop-blur shadow-sm hover:text-zinc-700 hover:border-zinc-300"
          }`}
          aria-label="Shuffle"
        >
          <Icons.Shuffle />
        </button>
        <button
          onClick={() => handleSave(current.id)}
          className={`flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full transition-all duration-200 active:scale-95 md:hover:scale-110 shadow-lg ${
            darkMode
              ? "bg-indigo-600 text-white shadow-indigo-900/50"
              : "bg-spira-600 text-white shadow-spira-200"
          }`}
          aria-label="Keep"
        >
          <Icons.Check />
        </button>
      </div>
    </div>
  );
}
