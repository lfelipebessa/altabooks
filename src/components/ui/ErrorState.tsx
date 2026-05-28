import React from 'react';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => {
  return (
    <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-100 text-center">
      <p className="font-semibold mb-2">Algo deu errado</p>
      <p className="text-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-white text-red-700 font-medium rounded border border-red-200 hover:bg-red-50 cursor-pointer"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
};
