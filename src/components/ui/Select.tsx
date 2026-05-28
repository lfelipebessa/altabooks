import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  placeholder?: string;
}

const BASE =
  'w-full px-3 py-2 bg-brand-bg border rounded-lg text-sm text-brand-text-main ' +
  'transition-colors ' +
  'focus:outline-none focus:ring-1 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed';

const VALID = 'border-brand-bg-card focus:border-brand-primary focus:ring-brand-primary';
const INVALID = 'border-red-300 focus:border-red-500 focus:ring-red-500';

export const Select: React.FC<SelectProps> = ({
  invalid, className, placeholder, children, value, ...rest
}) => {
  return (
    <select
      value={value ?? ''}
      className={`${BASE} ${invalid ? INVALID : VALID} ${className ?? ''}`.trim()}
      {...rest}
    >
      {placeholder && (
        <option value="" disabled>{placeholder}</option>
      )}
      {children}
    </select>
  );
};
