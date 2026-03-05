import React from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '../icons/Icons';

type TabType = 'home' | 'sources' | 'library' | 'settings' | 'github';

interface MobileMenuItemProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  darkMode: boolean;
}

const MobileMenuItem = ({ active, onClick, icon, label }: MobileMenuItemProps) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 min-h-[48px] py-3 rounded-xl transition-all active:scale-[0.98] ${
      active
        ? 'bg-theme-selected text-theme-accent'
        : 'text-theme-text-secondary hover:bg-theme-muted/50'
    }`}
  >
    <div className={active ? 'text-theme-accent' : ''}>{icon}</div>
    <span className="font-medium text-ui">{label}</span>
  </button>
);

export interface MobileMenuProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  darkMode: boolean;
}

export function MobileMenu({ activeTab, onTabChange, darkMode }: MobileMenuProps) {
  const { t } = useTranslation();

  return (
    <div className="md:hidden absolute top-[57px] left-0 right-0 bottom-0 z-20 backdrop-blur-xl animate-fade-in bg-theme-base/95">
      <nav className="p-4 space-y-2">
        <MobileMenuItem active={activeTab === 'home'} onClick={() => onTabChange('home')} icon={<Icons.Home />} label={t('nav.home')} darkMode={darkMode} />
        <MobileMenuItem active={activeTab === 'sources'} onClick={() => onTabChange('sources')} icon={<Icons.Sources />} label={t('nav.sources')} darkMode={darkMode} />
        <MobileMenuItem active={activeTab === 'library'} onClick={() => onTabChange('library')} icon={<Icons.Library />} label={t('nav.library')} darkMode={darkMode} />
        <MobileMenuItem active={activeTab === 'github'} onClick={() => onTabChange('github')} icon={<Icons.Github />} label={t('nav.github')} darkMode={darkMode} />
        <MobileMenuItem active={activeTab === 'settings'} onClick={() => onTabChange('settings')} icon={<Icons.Settings />} label={t('nav.settings')} darkMode={darkMode} />
      </nav>
    </div>
  );
}
