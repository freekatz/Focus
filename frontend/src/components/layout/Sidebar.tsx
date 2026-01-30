import React from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '../icons/Icons';

type TabType = 'home' | 'sources' | 'library' | 'settings';
type ThemeMode = 'light' | 'dark' | 'system';

interface SidebarItemProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  darkMode: boolean;
}

const SidebarItem = ({ active, onClick, icon, label, darkMode }: SidebarItemProps) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-micro cursor-pointer relative overflow-hidden ${
      active
        ? (darkMode ? 'bg-stone-800 text-teal-300' : 'bg-spira-100 text-spira-800 font-medium')
        : (darkMode ? 'text-stone-400 hover:bg-stone-800 hover:text-stone-200 hover:scale-[1.02] active:scale-[0.98]' : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 hover:scale-[1.02] active:scale-[0.98]')
    }`}
  >
    {/* Active indicator bar */}
    {active && (
      <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full ${darkMode ? 'bg-teal-400' : 'bg-spira-600'}`} />
    )}
    <div className={active ? (darkMode ? 'text-teal-400' : 'text-spira-600') : ''}>{icon}</div>
    <span>{label}</span>
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
    <aside className={`hidden md:flex flex-col w-64 border-r flex-shrink-0 ${darkMode ? 'border-stone-800 bg-stone-900' : 'border-zinc-200 bg-white'} p-6`}>
      <div className="flex items-center space-x-2 mb-8">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-teal-600' : 'bg-spira-600'} text-white`}>
          <Icons.Focus />
        </div>
        <h1 className="text-2xl font-bold tracking-tight font-serif">Focus</h1>
      </div>

      <nav className="flex-1 space-y-2">
        <SidebarItem active={activeTab === 'home'} onClick={() => onTabChange('home')} icon={<Icons.Home />} label={t('nav.home')} darkMode={darkMode} />
        <SidebarItem active={activeTab === 'sources'} onClick={() => onTabChange('sources')} icon={<Icons.Sources />} label={t('nav.sources')} darkMode={darkMode} />
        <SidebarItem active={activeTab === 'library'} onClick={() => onTabChange('library')} icon={<Icons.Library />} label={t('nav.library')} darkMode={darkMode} />
      </nav>

      <div className={`border-t pt-4 space-y-2 ${darkMode ? 'border-stone-800' : 'border-zinc-200'}`}>
        <SidebarItem active={activeTab === 'settings'} onClick={() => onTabChange('settings')} icon={<Icons.Settings />} label={t('nav.settings')} darkMode={darkMode} />
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={cycleTheme}
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-micro cursor-pointer ${
            darkMode ? 'text-stone-400 hover:bg-stone-800 hover:text-stone-200 hover:scale-[1.02] active:scale-[0.98]' : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 hover:scale-[1.02] active:scale-[0.98]'
          }`}
        >
          <div>{getThemeIcon()}</div>
          <span>{getThemeLabel()}</span>
        </button>
      </div>
    </aside>
  );
}
