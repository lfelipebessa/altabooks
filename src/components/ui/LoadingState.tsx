import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Carregando…' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-brand-text-body">
      <Loader2 className="w-8 h-8 text-brand-primary animate-spin mb-4" />
      <p>{message}</p>
    </div>
  );
};
