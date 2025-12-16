import React from 'react';

interface LoadingStateProps {
  darkMode?: boolean;
}

export function LoadingState({ darkMode = false }: LoadingStateProps) {
  return (
    <div className={`flex items-center justify-center h-screen w-full ${darkMode ? 'bg-slate-900' : 'bg-spira-50'}`}>
      <div className="flex flex-col items-center space-y-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${darkMode ? 'bg-indigo-500' : 'bg-spira-600'} text-white animate-pulse`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M2 12h20" transform="rotate(45 12 12)"/>
          </svg>
        </div>
        <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-zinc-500'}`}>Loading...</span>
      </div>
    </div>
  );
}
