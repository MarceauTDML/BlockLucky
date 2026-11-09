'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';
import { useAppTheme } from '@/theme/ThemeProvider';

const classes =
  'mb-2.5 inline-flex items-center gap-1 self-start rounded-sm bg-surface-elevated px-3 py-1.5 text-caption font-medium text-fg hover:bg-line transition-colors';

export const BackButton: React.FC<{ href?: string; label?: string }> = ({ href, label }) => {
  const { t } = useAppTheme();
  const router = useRouter();
  const text = label || t('Retour', 'Back');
  if (href) {
    return (
      <Link href={href} className={classes}>
        <span aria-hidden>←</span> {text}
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => router.back()} className={classes}>
      <span aria-hidden>←</span> {text}
    </button>
  );
};

export default BackButton;
