'use client';

import React from 'react';
import { cn } from '@/lib/cn';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('mb-4 flex rounded-md bg-surface-elevated p-1', className)}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex-1 rounded-sm px-2 py-2.5 text-caption font-semibold transition-colors',
              selected ? 'bg-surface text-fg shadow-[0_1px_0_var(--border)]' : 'text-fg-secondary hover:text-fg'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function ChoicePills<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  render,
  size = 'md',
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  render?: (value: T) => React.ReactNode;
  size?: 'md' | 'sm';
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex gap-2">
      {options.map((opt) => {
        const selected = opt === value;
        return (
          <button
            key={String(opt)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt)}
            className={cn(
              'flex-1 border text-center transition-colors',
              size === 'md'
                ? 'rounded-md py-2.5 text-body font-semibold'
                : 'rounded-sm border-transparent py-2 text-caption font-medium',
              selected
                ? 'border-primary bg-primary text-on-primary'
                : cn('bg-surface-elevated hover:border-fg-muted', size === 'md' ? 'border-line text-fg' : 'text-fg-secondary')
            )}
          >
            {render ? render(opt) : String(opt)}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedTabs;
