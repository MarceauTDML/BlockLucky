'use client';

import Link from 'next/link';
import React from 'react';
import { useAppTheme } from '@/theme/ThemeProvider';
import { RewardItem } from '@/types/api.types';

export const RewardCard: React.FC<{ reward: RewardItem; href: string }> = ({ reward, href }) => {
  const { t } = useAppTheme();
  const pct = Math.max(5, Number(reward.stockPercentage || 0));
  return (
    <Link
      href={href}
      className="card group flex h-full flex-col p-4 transition-colors hover:border-fg-muted"
    >
      <div className="mb-3 flex items-center">
        <div className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-elevated text-caption font-bold text-primary">
          {reward.partner.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1">
          <p className="text-caption text-fg-muted">{reward.partner.name}</p>
          <h3 className="text-body font-bold group-hover:underline">{reward.title}</h3>
        </div>
      </div>

      <div className="mt-auto">
        <div className="mb-2.5 h-1 overflow-hidden rounded-full bg-surface-elevated" aria-hidden>
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-caption text-fg-secondary">
            {t(
              `${reward.remainingStock} / ${reward.totalStock} restants`,
              `${reward.remainingStock} / ${reward.totalStock} left`
            )}
          </span>
          <span className="rounded-sm bg-surface-elevated px-2.5 py-1 text-caption font-bold text-secondary">
            {reward.costInPoints} pts
          </span>
        </div>
      </div>
    </Link>
  );
};

export default RewardCard;
