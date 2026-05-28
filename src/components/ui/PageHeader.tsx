import React from 'react';
import { SearchBar } from '../SearchBar';

interface PageHeaderProps {
  title: string;
  action?: React.ReactNode;
  search?: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  };
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, action, search }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <h1 className="font-serif text-3xl font-bold text-brand-text-main">
        {title}
      </h1>
      <div className="flex items-center gap-3">
        {search && (
          <SearchBar
            value={search.value}
            onChange={search.onChange}
            placeholder={search.placeholder}
          />
        )}
        {action}
      </div>
    </div>
  );
};
