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
      className={cn(
        'mb-4 flex gap-1 rounded-full border border-[var(--card-border)] bg-surface p-1 shadow-[var(--card-shadow)]',
        className
      )}
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
              'flex-1 rounded-full px-3 py-2.5 text-caption font-semibold transition-colors',
              selected ? 'bg-sun text-on-sun' : 'text-fg-secondary hover:text-fg'
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
                ? 'rounded-full py-2.5 text-body font-semibold'
                : 'rounded-full py-2 text-caption font-semibold',
              selected
                ? 'border-[#1d2637] bg-[#1d2637] text-white'
                : cn('border-line bg-surface hover:border-fg-muted', size === 'md' ? 'text-fg' : 'text-fg-secondary')
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
