'use client';

import React from 'react';
import { cn } from '@/lib/cn';
import { useAppTheme } from '@/theme/ThemeProvider';
import Spinner from './Spinner';

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div
    aria-hidden
    className={cn('rounded-md bg-surface-elevated animate-bl-shimmer', className || 'h-[52px] w-full')}
  />
);

export const Loader: React.FC<{ message?: string; skeletonRows?: number; className?: string }> = ({
  message,
  skeletonRows = 2,
  className,
}) => {
  const { t } = useAppTheme();
  return (
    <div className={cn('flex flex-col items-center justify-center py-5', className)} aria-live="polite">
      <Spinner className="h-5 w-5 text-primary" />
      <p className="mt-2 mb-3.5 text-center text-caption text-fg-secondary">
        {message || t('Chargement...', 'Loading...')}
      </p>
      <div className="flex w-full flex-col gap-2">
        {Array.from({ length: skeletonRows }).map((_, idx) => (
          <Skeleton key={idx} />
        ))}
      </div>
    </div>
  );
};

export default Loader;
