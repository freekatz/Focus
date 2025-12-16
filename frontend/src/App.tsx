import { useState, useCallback, useEffect, useRef, useLayoutEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { Sidebar } from './components/layout/Sidebar';
import { MobileHeader } from './components/layout/MobileHeader';
import { MobileMenu } from './components/layout/MobileMenu';
import { ToastContainer } from './components/shared/ToastContainer';
import { useToast } from './context/ToastContext';
import { LoginView } from './views/LoginView';
import { HomeView } from './views/HomeView';
import { SourcesView } from './views/SourcesView';
import { LibraryView } from './views/LibraryView';
import { SettingsView } from './views/SettingsView';
import { ReadingModal } from './views/ReadingModal';
import { ShareView } from './views/ShareView';
import { entriesApi } from './api';
import type { Article } from './types';

type Tab = 'home' | 'sources' | 'library' | 'settings';

// Map URL paths to tabs
const pathToTab: Record<string, Tab> = {
  '/': 'home',
  '/sources': 'sources',
  '/library': 'library',
  '/settings': 'settings',
};

const tabToPath: Record<Tab, string> = {
  home: '/',
  sources: '/sources',
  library: '/library',
  settings: '/settings',
};

// Get initial tab from URL
const getTabFromPath = (): Tab => {
  const path = window.location.pathname;
  return pathToTab[path] || 'home';
};

// Check if current path is share page
const isSharePage = (): boolean => {
  return window.location.pathname === '/share';
};

// Get share code from URL query params
const getShareCode = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  return params.get('code');
};

function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const { darkMode, themeMode, setThemeMode, fontTheme, setFontTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>(getTabFromPath);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [readingArticle, setReadingArticle] = useState<Article | null>(null);
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);

  // Preserve scroll position when fontTheme changes
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTop = scrollPositionRef.current;
    }
  }, [fontTheme]);

  // Sync URL with tab changes and handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(getTabFromPath());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // All hooks must be called before any early returns
  const handleDiscardArticle = useCallback(async () => {
    if (!readingArticle?._entry) return;
    try {
      await entriesApi.updateStatus(readingArticle._entry.id, 'trash');
      setReadingArticle(null);
      setLibraryRefreshKey(k => k + 1);
    } catch (error) {
      console.error('Failed to discard article:', error);
    }
  }, [readingArticle]);

  const handleFavoriteArticle = useCallback(async () => {
    if (!readingArticle?._entry) return;
    try {
      const newStatus = readingArticle._entry.status === 'favorite' ? 'interested' : 'favorite';
      await entriesApi.updateStatus(readingArticle._entry.id, newStatus);
      setReadingArticle(prev => prev ? {
        ...prev,
        isFavorite: newStatus === 'favorite',
        _entry: prev._entry ? { ...prev._entry, status: newStatus } : undefined
      } : null);
      setLibraryRefreshKey(k => k + 1);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  }, [readingArticle]);

  const handleRestoreArticle = useCallback(async () => {
    if (!readingArticle?._entry) return;
    try {
      await entriesApi.updateStatus(readingArticle._entry.id, 'interested');
      setReadingArticle(null);
      setLibraryRefreshKey(k => k + 1);
    } catch (error) {
      console.error('Failed to restore article:', error);
    }
  }, [readingArticle]);

  const handleUpdateSummary = useCallback((summary: string) => {
    setReadingArticle(prev => prev ? { ...prev, summary } : null);
    setLibraryRefreshKey(k => k + 1);
  }, []);

  // Font Theme Mapping
  const fontClass = fontTheme === 'serif' ? 'font-serif' : fontTheme === 'mono' ? 'font-mono' : 'font-sans';

  // Share page - public access, no auth required
  if (isSharePage()) {
    const shareCode = getShareCode();
    if (shareCode) {
      return <ShareView code={shareCode} darkMode={darkMode} />;
    }
    // No code provided, redirect to home
    window.location.href = '/';
    return null;
  }

  if (isLoading) {
    return (
      <div className={`flex h-screen w-full items-center justify-center ${darkMode ? 'bg-slate-900' : 'bg-spira-50'}`}>
        <div className="animate-spin h-8 w-8 border-2 border-spira-500 border-t-transparent rounded-full"/>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView darkMode={darkMode} />;
  }

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    // Update URL without reload
    const newPath = tabToPath[tab];
    if (window.location.pathname !== newPath) {
      window.history.pushState({}, '', newPath);
    }
  };

  const handleOpenArticle = (article: Article) => {
    setReadingArticle(article);
  };

  const handleCloseArticle = () => {
    setReadingArticle(null);
  };

  return (
    <div className={`flex h-screen w-full transition-colors duration-300 ${fontClass} ${darkMode ? 'bg-[#121212] text-[rgba(255,255,255,0.87)]' : 'bg-[#FAFAF9] text-[#1C1C1E]'}`}>

      {/* Sidebar (Desktop) */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        darkMode={darkMode}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative flex flex-col">

        {/* Mobile Header */}
        <MobileHeader
          darkMode={darkMode}
          themeMode={themeMode}
          setThemeMode={setThemeMode}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          onLogoClick={() => handleTabChange('home')}
        />

        {/* Mobile Menu Dropdown Overlay */}
        {mobileMenuOpen && (
          <MobileMenu
            activeTab={activeTab}
            onTabChange={handleTabChange}
            darkMode={darkMode}
          />
        )}

        {/* View Container */}
        <div
          ref={scrollContainerRef}
          onScroll={(e) => { scrollPositionRef.current = e.currentTarget.scrollTop; }}
          className={`flex-1 overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto w-full relative ${darkMode ? 'scrollbar-styled-dark' : 'scrollbar-styled'}`}
        >
          {activeTab === 'home' && (
            <HomeView darkMode={darkMode} />
          )}
          {activeTab === 'sources' && (
            <SourcesView darkMode={darkMode} />
          )}
          {activeTab === 'library' && (
            <LibraryView
              key={libraryRefreshKey}
              darkMode={darkMode}
              onOpenArticle={handleOpenArticle}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsView
              darkMode={darkMode}
              themeMode={themeMode}
              setThemeMode={setThemeMode}
              fontTheme={fontTheme}
              setFontTheme={setFontTheme}
            />
          )}
        </div>
      </main>

      {/* Reading Modal */}
      {readingArticle && (
        <ReadingModal
          article={readingArticle}
          onClose={handleCloseArticle}
          darkMode={darkMode}
          onUpdateSummary={handleUpdateSummary}
          onDiscard={handleDiscardArticle}
          onFavorite={handleFavoriteArticle}
          onRestore={handleRestoreArticle}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer darkMode={darkMode} />
    </div>
  );
}

export default App;
