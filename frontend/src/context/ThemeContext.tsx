import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { configApi } from '../api';
import { type ColorThemeId, applyTheme, applyCustomTheme, isValidThemeId, colorThemes } from '../themes';

type FontTheme = 'sans' | 'serif' | 'mono';
type ThemeMode = 'light' | 'dark' | 'system';
type FontSize = 'small' | 'medium' | 'large';

interface ThemeContextType {
  darkMode: boolean;
  themeMode: ThemeMode;
  setThemeMode: (value: ThemeMode) => void;
  fontTheme: FontTheme;
  setFontTheme: (value: FontTheme) => void;
  fontSize: FontSize;
  setFontSize: (value: FontSize) => void;
  colorTheme: ColorThemeId;
  setColorTheme: (value: ColorThemeId) => void;
  customThemeJson: string | null;
  setCustomThemeJson: (value: string | null) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const THEME_MODE_KEY = 'focus-theme-mode';
const FONT_THEME_KEY = 'focus-font-theme';
const FONT_SIZE_KEY = 'focus-font-size';
const COLOR_THEME_KEY = 'focus-color-theme';
const CUSTOM_THEME_KEY = 'focus-custom-theme';

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

  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    const stored = localStorage.getItem(FONT_SIZE_KEY);
    if (stored && ['small', 'medium', 'large'].includes(stored)) {
      return stored as FontSize;
    }
    return 'medium';
  });

  const [colorTheme, setColorThemeState] = useState<ColorThemeId>(() => {
    const stored = localStorage.getItem(COLOR_THEME_KEY);
    if (stored && isValidThemeId(stored)) {
      return stored;
    }
    return 'cream';
  });

  const [customThemeJson, setCustomThemeJsonState] = useState<string | null>(() => {
    return localStorage.getItem(CUSTOM_THEME_KEY);
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
        if (config.color_theme && isValidThemeId(config.color_theme)) {
          setColorThemeState(config.color_theme);
          localStorage.setItem(COLOR_THEME_KEY, config.color_theme);
        }
        if (config.font_theme && ['sans', 'serif', 'mono'].includes(config.font_theme)) {
          setFontThemeState(config.font_theme as FontTheme);
          localStorage.setItem(FONT_THEME_KEY, config.font_theme);
        }
        if (config.font_size && ['small', 'medium', 'large'].includes(config.font_size)) {
          setFontSizeState(config.font_size as FontSize);
          localStorage.setItem(FONT_SIZE_KEY, config.font_size);
        }
        if (config.custom_theme_json) {
          setCustomThemeJsonState(config.custom_theme_json);
          localStorage.setItem(CUSTOM_THEME_KEY, config.custom_theme_json);
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

  const setFontTheme = useCallback(async (value: FontTheme) => {
    setFontThemeState(value);
    localStorage.setItem(FONT_THEME_KEY, value);
    // Sync to server
    try {
      await configApi.update({ font_theme: value });
    } catch {
      // Ignore sync errors
    }
  }, []);

  const setFontSize = useCallback(async (value: FontSize) => {
    setFontSizeState(value);
    localStorage.setItem(FONT_SIZE_KEY, value);
    // Sync to server
    try {
      await configApi.update({ font_size: value });
    } catch {
      // Ignore sync errors
    }
  }, []);

  const setColorTheme = useCallback(async (value: ColorThemeId) => {
    setColorThemeState(value);
    localStorage.setItem(COLOR_THEME_KEY, value);
    // Sync to server
    try {
      await configApi.update({ color_theme: value });
    } catch {
      // Ignore sync errors
    }
  }, []);

  const setCustomThemeJson = useCallback(async (value: string | null) => {
    setCustomThemeJsonState(value);
    if (value) {
      localStorage.setItem(CUSTOM_THEME_KEY, value);
    } else {
      localStorage.removeItem(CUSTOM_THEME_KEY);
    }
    // Sync to server
    try {
      await configApi.update({ custom_theme_json: value || '' });
    } catch {
      // Ignore sync errors
    }
  }, []);

  // Update document class for dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Update document class for font size
  useEffect(() => {
    document.documentElement.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
    document.documentElement.classList.add(`font-size-${fontSize}`);
  }, [fontSize]);

  // Apply color theme whenever colorTheme, customThemeJson, or darkMode changes
  useEffect(() => {
    if (colorTheme === 'custom' && customThemeJson) {
      applyCustomTheme(customThemeJson, darkMode);
    } else {
      applyTheme(colorTheme, darkMode);
    }
  }, [colorTheme, customThemeJson, darkMode]);

  return (
    <ThemeContext.Provider
      value={{
        darkMode,
        themeMode,
        setThemeMode,
        fontTheme,
        setFontTheme,
        fontSize,
        setFontSize,
        colorTheme,
        setColorTheme,
        customThemeJson,
        setCustomThemeJson,
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
