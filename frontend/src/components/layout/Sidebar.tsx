import React from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '../icons/Icons';

type TabType = 'home' | 'sources' | 'library' | 'settings' | 'github';
type ThemeMode = 'light' | 'dark' | 'system';

interface SidebarItemProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  darkMode: boolean;
}

const SidebarItem = ({ active, onClick, icon, label }: SidebarItemProps) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 min-h-touch py-3 rounded-xl transition-micro cursor-pointer relative overflow-hidden ${
      active
        ? 'bg-theme-selected text-theme-accent font-medium'
        : 'text-theme-text-secondary hover:bg-theme-muted hover:text-theme-text active:scale-[0.98]'
    }`}
  >
    {/* Active indicator bar */}
    {active && (
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-theme-accent" />
    )}
    <div className={active ? 'text-theme-accent' : ''}>{icon}</div>
    <span className="text-ui">{label}</span>
  </button>
);

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  darkMode: boolean;
  themeMode: ThemeMode;
  setThemeMode: (value: ThemeMode) => void;
}

export function Sidebar({ activeTab, onTabChange, darkMode, themeMode, setThemeMode }: SidebarProps) {
  const { t } = useTranslation();

  // Cycle through theme modes: light -> dark -> system -> light
  const cycleTheme = () => {
    const nextMode: ThemeMode = themeMode === 'light' ? 'dark' : themeMode === 'dark' ? 'system' : 'light';
    setThemeMode(nextMode);
  };

  const getThemeIcon = () => {
    if (themeMode === 'system') return <Icons.Monitor />;
    return darkMode ? <Icons.Sun /> : <Icons.Moon />;
  };

  const getThemeLabel = () => {
    if (themeMode === 'system') return t('settings.themeSystem');
    return darkMode ? t('settings.themeLight') : t('settings.themeDark');
  };

  return (
    <aside className="hidden md:flex flex-col w-64 border-r flex-shrink-0 border-theme-border bg-theme-surface p-6">
      <div className="flex items-center space-x-2 mb-8">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-theme-accent text-white">
          <Icons.Focus />
        </div>
        <h1 className="text-2xl font-bold tracking-tight font-serif">Focus</h1>
      </div>

      <nav className="flex-1 space-y-2">
        <SidebarItem active={activeTab === 'home'} onClick={() => onTabChange('home')} icon={<Icons.Home />} label={t('nav.home')} darkMode={darkMode} />
        <SidebarItem active={activeTab === 'sources'} onClick={() => onTabChange('sources')} icon={<Icons.Sources />} label={t('nav.sources')} darkMode={darkMode} />
        <SidebarItem active={activeTab === 'library'} onClick={() => onTabChange('library')} icon={<Icons.Library />} label={t('nav.library')} darkMode={darkMode} />
        <SidebarItem active={activeTab === 'github'} onClick={() => onTabChange('github')} icon={<Icons.Github />} label={t('nav.github')} darkMode={darkMode} />
      </nav>

      <div className="border-t pt-4 space-y-2 border-theme-border">
        <SidebarItem active={activeTab === 'settings'} onClick={() => onTabChange('settings')} icon={<Icons.Settings />} label={t('nav.settings')} darkMode={darkMode} />
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={cycleTheme}
          className="w-full flex items-center space-x-3 px-4 min-h-touch py-3 rounded-xl transition-micro cursor-pointer text-theme-text-secondary hover:bg-theme-muted hover:text-theme-text active:scale-[0.98]"
        >
          <div>{getThemeIcon()}</div>
          <span className="text-ui">{getThemeLabel()}</span>
        </button>
      </div>
    </aside>
  );
}
