import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

const BASE =
  'w-full px-3 py-2 bg-brand-bg border rounded-lg text-sm text-brand-text-main ' +
  'placeholder-gray-500 transition-colors ' +
  'focus:outline-none focus:ring-1 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed';

const VALID = 'border-brand-bg-card focus:border-brand-primary focus:ring-brand-primary';
const INVALID = 'border-red-300 focus:border-red-500 focus:ring-red-500';

export const Input: React.FC<InputProps> = ({ invalid, className, ...rest }) => {
  return (
    <input
      className={`${BASE} ${invalid ? INVALID : VALID} ${className ?? ''}`.trim()}
      {...rest}
    />
  );
};
