import React from 'react';
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
    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200 ${
      active
        ? (darkMode ? 'bg-slate-800 text-indigo-300' : 'bg-spira-100 text-spira-800 font-medium')
        : (darkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900')
    }`}
  >
    <div className={active ? (darkMode ? 'text-indigo-400' : 'text-spira-600') : ''}>{icon}</div>
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
    if (themeMode === 'system') return 'System Theme';
    return darkMode ? 'Light Mode' : 'Dark Mode';
  };

  return (
    <aside className={`hidden md:flex flex-col w-64 border-r flex-shrink-0 ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-zinc-200 bg-white'} p-6`}>
      <div className="flex items-center space-x-2 mb-8">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-indigo-500' : 'bg-spira-600'} text-white`}>
          <Icons.Focus />
        </div>
        <h1 className="text-2xl font-bold tracking-tight font-serif">Focus</h1>
      </div>

      <nav className="flex-1 space-y-2">
        <SidebarItem active={activeTab === 'home'} onClick={() => onTabChange('home')} icon={<Icons.Home />} label="Focus" darkMode={darkMode} />
        <SidebarItem active={activeTab === 'sources'} onClick={() => onTabChange('sources')} icon={<Icons.Sources />} label="Sources" darkMode={darkMode} />
        <SidebarItem active={activeTab === 'library'} onClick={() => onTabChange('library')} icon={<Icons.Library />} label="Library" darkMode={darkMode} />
      </nav>

      <div className={`border-t pt-4 space-y-2 ${darkMode ? 'border-slate-800' : 'border-zinc-200'}`}>
        <SidebarItem active={activeTab === 'settings'} onClick={() => onTabChange('settings')} icon={<Icons.Settings />} label="Settings" darkMode={darkMode} />
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={cycleTheme}
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200 ${
            darkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
          }`}
        >
          <div>{getThemeIcon()}</div>
          <span>{getThemeLabel()}</span>
        </button>
      </div>
    </aside>
  );
}
