'use client';

import React from 'react';
import { cn } from '@/lib/cn';

export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, eyebrow, actions, className }) => (
  <header className={cn('mb-[18px] flex flex-col gap-3 md:flex-row md:items-end md:justify-between', className)}>
    <div className="max-w-2xl">
      {eyebrow ? <p className="text-caption font-medium text-secondary">{eyebrow}</p> : null}
      <h1 className="mb-1.5 text-title font-bold tracking-[-0.3px] md:text-hero">{title}</h1>
      {subtitle ? <p className="text-body text-fg-secondary">{subtitle}</p> : null}
    </div>
    {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
  </header>
);

export const EmptyState: React.FC<{
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, description, action, className }) => (
  <div className={cn('card flex flex-col items-center gap-3 p-6 text-center', className)}>
    <div aria-hidden className="mb-1 flex h-12 w-12 items-center justify-center rounded-md bg-surface-elevated">
      <span className="h-2 w-2 rounded-full bg-fg-muted" />
    </div>
    <h2 className="text-subtitle font-semibold">{title}</h2>
    {description ? <p className="max-w-md text-body text-fg-secondary">{description}</p> : null}
    {action ? <div className="mt-2 w-full max-w-xs">{action}</div> : null}
  </div>
);

type AlertTone = 'success' | 'error' | 'info' | 'warning';

const toneClasses: Record<AlertTone, string> = {
  success: 'border-primary text-primary',
  error: 'border-error text-error',
  info: 'border-line text-fg-secondary',
  warning: 'border-warning text-warning',
};

export const Alert: React.FC<{ tone?: AlertTone; children: React.ReactNode; className?: string }> = ({
  tone = 'success',
  children,
  className,
}) => (
  <div
    role={tone === 'error' ? 'alert' : 'status'}
    className={cn('rounded-md border bg-surface-elevated p-3.5 text-caption font-medium', toneClasses[tone], className)}
  >
    {children}
  </div>
);

export const Badge: React.FC<{
  children: React.ReactNode;
  tone?: 'neutral' | 'primary' | 'secondary' | 'danger' | 'warning';
  className?: string;
}> = ({ children, tone = 'neutral', className }) => {
  const tones = {
    neutral: 'text-fg-secondary',
    primary: 'text-primary',
    secondary: 'text-secondary',
    danger: 'text-error',
    warning: 'text-warning',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm bg-surface-elevated px-2 py-[3px] text-caption font-medium',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
};

export const StatusDot: React.FC<{ tone: 'success' | 'warning' | 'error' | 'muted'; className?: string }> = ({
  tone,
  className,
}) => {
  const colors = { success: 'bg-success', warning: 'bg-warning', error: 'bg-error', muted: 'bg-fg-muted' };
  return <span aria-hidden className={cn('inline-block h-1.5 w-1.5 rounded-full', colors[tone], className)} />;
};

export const CheckboxCard: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
  id?: string;
}> = ({ checked, onChange, children, id }) => (
  <label
    htmlFor={id}
    className={cn(
      'flex cursor-pointer items-start gap-2.5 rounded-md border bg-surface-elevated p-3 transition-colors',
      checked ? 'border-primary' : 'border-line hover:border-fg-muted'
    )}
  >
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--primary)]"
    />
    <span className="text-caption font-medium text-fg">{children}</span>
  </label>
);
