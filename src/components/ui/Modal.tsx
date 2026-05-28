import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg';
  footer?: React.ReactNode;
  disabled?: boolean;
  children: React.ReactNode;
}

const SIZE_CLASS: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  size = 'md',
  footer,
  disabled,
  children,
}) => {
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    containerRef.current?.focus();
    return () => {
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !disabled) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, disabled, onClose]);

  if (!open) return null;

  const handleBackdropClick = () => {
    if (!disabled) onClose();
  };

  return (
    <div
      data-testid="modal-backdrop"
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-brand-text-main/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div
        data-testid="modal-container"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        ref={containerRef}
        // tabIndex={-1} is required for the focus() call below to land here
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`bg-brand-bg rounded-2xl shadow-xl w-full ${SIZE_CLASS[size]} overflow-hidden outline-none`}
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 id="modal-title" className="font-serif text-2xl font-bold text-brand-text-main">{title}</h2>
          <button
            onClick={onClose}
            disabled={disabled}
            aria-label="Fechar"
            className="text-gray-400 hover:text-brand-text-main transition-colors p-1 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">{children}</div>

        {footer && (
          <div className="px-6 pb-6 pt-0 flex gap-3 justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
