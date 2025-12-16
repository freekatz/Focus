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
    <div className={`md:hidden flex items-center justify-between px-4 py-3 border-b z-30 relative transition-colors ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-zinc-200'} backdrop-blur-md`}>
      <div className="flex items-center gap-2 cursor-pointer" onClick={onLogoClick}>
        <div className={`w-6 h-6 rounded flex items-center justify-center ${darkMode ? 'bg-indigo-500' : 'bg-spira-600'} text-white`}>
          <Icons.Focus />
        </div>
        <span className="font-serif font-bold text-lg tracking-tight">Focus</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={cycleTheme}
          className={`p-2 rounded-full transition-colors ${darkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-zinc-600 hover:bg-zinc-100'}`}
        >
          {getThemeIcon()}
        </button>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`p-2 -mr-2 rounded-full transition-colors ${darkMode ? 'text-zinc-300 hover:bg-slate-800' : 'text-zinc-600 hover:bg-zinc-100'}`}
          aria-label="Menu"
        >
          {mobileMenuOpen ? <Icons.X /> : <Icons.Menu />}
        </button>
      </div>
    </div>
  );
}
