import React from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, action }) => {
  return (
    <div className="text-center py-20 bg-brand-bg rounded-xl border border-gray-200">
      <h2 className="text-xl font-bold text-gray-700 mb-2">{title}</h2>
      {description && <p className="text-gray-500 mb-6">{description}</p>}
      {action}
    </div>
  );
};
