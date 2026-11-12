'use client';

import Link from 'next/link';
import React from 'react';
import Icon from '@/components/ui/Icon';
import { useAppTheme } from '@/theme/ThemeProvider';
import { RewardItem } from '@/types/api.types';

export const RewardCard: React.FC<{ reward: RewardItem; href: string }> = ({ reward, href }) => {
  const { t } = useAppTheme();
  const pct = Math.max(5, Number(reward.stockPercentage || 0));
  return (
    <Link
      href={href}
      className="card group flex h-full flex-col p-5 transition-transform duration-150 hover:-translate-y-0.5"
    >
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sun-soft text-caption font-bold text-on-sun">
          {reward.partner.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-caption font-medium text-fg-muted">{reward.partner.name}</p>
          <h3 className="text-subtitle font-bold group-hover:underline">{reward.title}</h3>
        </div>
        <Icon name="chevronRight" size={18} className="mt-1 text-fg-muted" />
      </div>

      <div className="mt-auto">
        <div className="mb-3 h-2 overflow-hidden rounded-full bg-surface-elevated" aria-hidden>
          <div className="h-full rounded-full bg-sun" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-caption text-fg-secondary">
            {t(
              `${reward.remainingStock} / ${reward.totalStock} restants`,
              `${reward.remainingStock} / ${reward.totalStock} left`
            )}
          </span>
          <span className="rounded-full bg-lavender px-3 py-1 text-caption font-bold text-violet tabular">
            {reward.costInPoints} pts
          </span>
        </div>
      </div>
    </Link>
  );
};

export default RewardCard;
