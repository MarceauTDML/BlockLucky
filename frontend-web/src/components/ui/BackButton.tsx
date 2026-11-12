'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';
import { useAppTheme } from '@/theme/ThemeProvider';
import Icon from './Icon';

const classes =
  'mb-3 inline-flex items-center gap-2 self-start rounded-full bg-surface py-1.5 pr-3.5 pl-1.5 text-caption font-semibold text-fg shadow-[var(--card-shadow)] border border-[var(--card-border)] hover:bg-surface-elevated transition-colors';

const arrow = (
  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-elevated">
    <Icon name="arrowLeft" size={16} />
  </span>
);

export const BackButton: React.FC<{ href?: string; label?: string }> = ({ href, label }) => {
  const { t } = useAppTheme();
  const router = useRouter();
  const text = label || t('Retour', 'Back');
  if (href) {
    return (
      <Link href={href} className={classes}>
        {arrow} {text}
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => router.back()} className={classes}>
      {arrow} {text}
    </button>
  );
};

export default BackButton;
