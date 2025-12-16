import React from 'react';
import { Icons } from '../icons/Icons';

type TabType = 'home' | 'sources' | 'library' | 'settings';

interface MobileMenuItemProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  darkMode: boolean;
}

const MobileMenuItem = ({ active, onClick, icon, label, darkMode }: MobileMenuItemProps) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
      active
        ? (darkMode ? 'bg-slate-800 text-indigo-300' : 'bg-spira-50 text-spira-800')
        : (darkMode ? 'text-slate-400' : 'text-zinc-500')
    }`}
  >
    <div className={active ? (darkMode ? 'text-indigo-400' : 'text-spira-600') : ''}>{icon}</div>
    <span className="font-medium">{label}</span>
  </button>
);

export interface MobileMenuProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  darkMode: boolean;
}

export function MobileMenu({ activeTab, onTabChange, darkMode }: MobileMenuProps) {
  return (
    <div className={`md:hidden absolute top-[57px] left-0 right-0 bottom-0 z-20 backdrop-blur-xl animate-fade-in ${darkMode ? 'bg-slate-900/95' : 'bg-white/95'}`}>
      <nav className="p-4 space-y-2">
        <MobileMenuItem active={activeTab === 'home'} onClick={() => onTabChange('home')} icon={<Icons.Home />} label="Focus" darkMode={darkMode} />
        <MobileMenuItem active={activeTab === 'sources'} onClick={() => onTabChange('sources')} icon={<Icons.Sources />} label="Sources" darkMode={darkMode} />
        <MobileMenuItem active={activeTab === 'library'} onClick={() => onTabChange('library')} icon={<Icons.Library />} label="Library" darkMode={darkMode} />
        <MobileMenuItem active={activeTab === 'settings'} onClick={() => onTabChange('settings')} icon={<Icons.Settings />} label="Settings" darkMode={darkMode} />
      </nav>
    </div>
  );
}
