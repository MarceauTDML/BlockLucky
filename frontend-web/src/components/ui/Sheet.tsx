'use client';

import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import useIsClient from '@/hooks/useIsClient';
import { useAppTheme } from '@/theme/ThemeProvider';

export interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  tone?: 'default' | 'danger';
  dismissible?: boolean;
  eyebrow?: string;
  size?: 'md' | 'lg';
}

export const Sheet: React.FC<SheetProps> = ({
  open,
  title,
  onClose,
  children,
  tone = 'default',
  dismissible = true,
  eyebrow,
  size = 'md',
}) => {
  const { t } = useAppTheme();
  const isClient = useIsClient();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      (focusable || panelRef.current)?.focus();
    }, 30);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) onClose();
      if (e.key === 'Tab' && panelRef.current) {
        const nodes = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        );
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
      previouslyFocused.current?.focus?.();
    };
  }, [open, dismissible, onClose]);

  if (!open || !isClient) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-[var(--overlay)] animate-bl-fade-in md:items-center md:p-6"
      onMouseDown={(e) => {
        if (dismissible && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'flex max-h-[85vh] w-full flex-col border border-line bg-surface px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] animate-bl-slide-up focus:outline-none',
          'rounded-t-xl md:rounded-xl md:pb-5 md:pt-5',
          size === 'lg' ? 'md:max-w-2xl' : 'md:max-w-md',
          tone === 'danger' && 'border-error'
        )}
      >
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-line md:hidden" aria-hidden />
        <div className="mb-3.5 flex items-start justify-between gap-3">
          <div>
            {eyebrow ? (
              <p
                className={cn(
                  'text-caption font-medium',
                  tone === 'danger' ? 'text-error' : 'text-secondary'
                )}
              >
                {eyebrow}
              </p>
            ) : null}
            <h2 id={titleId} className="text-subtitle font-bold text-fg">
              {title}
            </h2>
          </div>
          {dismissible ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-sm px-1.5 py-1 text-caption font-medium text-fg-secondary hover:bg-surface-elevated"
            >
              {t('Fermer', 'Close')}
            </button>
          ) : null}
        </div>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default Sheet;
