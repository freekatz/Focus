import React from 'react';
import { Icons } from '../icons/Icons';

type ThemeMode = 'light' | 'dark' | 'system';

interface MobileHeaderProps {
  darkMode: boolean;
  themeMode: ThemeMode;
  setThemeMode: (value: ThemeMode) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (value: boolean) => void;
  onLogoClick: () => void;
}

export function MobileHeader({ darkMode, themeMode, setThemeMode, mobileMenuOpen, setMobileMenuOpen, onLogoClick }: MobileHeaderProps) {
  // Cycle through theme modes: light -> dark -> system -> light
  const cycleTheme = () => {
    const nextMode: ThemeMode = themeMode === 'light' ? 'dark' : themeMode === 'dark' ? 'system' : 'light';
    setThemeMode(nextMode);
  };

  const getThemeIcon = () => {
    if (themeMode === 'system') return <Icons.Monitor />;
    return darkMode ? <Icons.Sun /> : <Icons.Moon />;
  };

  return (
    <div className="md:hidden flex items-center justify-between px-4 py-3 border-b z-30 relative transition-colors bg-theme-surface border-theme-border backdrop-blur-md">
      <div className="flex items-center gap-2 cursor-pointer" onClick={onLogoClick}>
        <div className="w-6 h-6 rounded flex items-center justify-center bg-theme-accent text-white">
          <Icons.Focus />
        </div>
        <span className="font-serif font-bold text-lg tracking-tight">Focus</span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={cycleTheme}
          className="min-h-touch min-w-touch flex items-center justify-center rounded-full transition-colors text-theme-text-secondary hover:bg-theme-muted active:bg-theme-selected"
          aria-label="Toggle theme"
        >
          {getThemeIcon()}
        </button>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="min-h-touch min-w-touch flex items-center justify-center rounded-full transition-colors text-theme-text-secondary hover:bg-theme-muted active:bg-theme-selected"
          aria-label="Menu"
        >
          {mobileMenuOpen ? <Icons.X /> : <Icons.Menu />}
        </button>
      </div>
    </div>
  );
}
