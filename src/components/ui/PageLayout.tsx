import React from 'react';
import { TopBar } from '../TopBar';

interface PageLayoutProps {
  children: React.ReactNode;
  onNewProject?: () => void;
}

export const PageLayout: React.FC<PageLayoutProps> = ({ children, onNewProject }) => {
  return (
    <div className="min-h-screen bg-brand-bg-section pb-12">
      <TopBar onNewProject={onNewProject} />
      <main className="max-w-7xl mx-auto px-6 pt-32">
        {children}
      </main>
    </div>
  );
};
