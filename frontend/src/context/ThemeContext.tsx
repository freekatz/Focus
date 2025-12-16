import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { configApi } from '../api';

type FontTheme = 'sans' | 'serif' | 'mono';
type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  darkMode: boolean;
  themeMode: ThemeMode;
  setThemeMode: (value: ThemeMode) => void;
  fontTheme: FontTheme;
  setFontTheme: (value: FontTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const THEME_MODE_KEY = 'focus-theme-mode';
const FONT_THEME_KEY = 'focus-font-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(THEME_MODE_KEY);
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      return stored as ThemeMode;
    }
    return 'system';
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  const [fontTheme, setFontThemeState] = useState<FontTheme>(() => {
    const stored = localStorage.getItem(FONT_THEME_KEY);
    if (stored && ['sans', 'serif', 'mono'].includes(stored)) {
      return stored as FontTheme;
    }
    return 'sans';
  });

  // Compute actual dark mode based on theme mode
  const darkMode = themeMode === 'system' ? systemPrefersDark : themeMode === 'dark';

  // Listen to system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Sync theme from server on initial load
  useEffect(() => {
    const syncThemeFromServer = async () => {
      try {
        const config = await configApi.get();
        if (config.theme && ['light', 'dark', 'system'].includes(config.theme)) {
          setThemeModeState(config.theme as ThemeMode);
          localStorage.setItem(THEME_MODE_KEY, config.theme);
        }
      } catch {
        // If not logged in or error, use local storage value
      }
    };
    syncThemeFromServer();
  }, []);

  const setThemeMode = useCallback(async (value: ThemeMode) => {
    setThemeModeState(value);
    localStorage.setItem(THEME_MODE_KEY, value);
    // Sync to server
    try {
      await configApi.update({ theme: value });
    } catch {
      // Ignore sync errors
    }
  }, []);

  const setFontTheme = useCallback((value: FontTheme) => {
    setFontThemeState(value);
    localStorage.setItem(FONT_THEME_KEY, value);
  }, []);

  // Update document class for dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <ThemeContext.Provider
      value={{
        darkMode,
        themeMode,
        setThemeMode,
        fontTheme,
        setFontTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
