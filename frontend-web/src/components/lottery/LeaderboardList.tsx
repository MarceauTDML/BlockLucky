'use client';

import React from 'react';
import Icon from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { useAppTheme } from '@/theme/ThemeProvider';
import { LeaderboardEntry } from '@/types/api.types';

export const LeaderboardList: React.FC<{ entries: LeaderboardEntry[]; limit?: number; className?: string }> = ({
  entries,
  limit = 6,
  className,
}) => {
  const { t } = useAppTheme();
  const visible = entries.slice(0, limit);

  return (
    <section className={cn('card p-5', className)}>
      <div className="mb-3 flex items-center gap-3">
        <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full bg-lavender text-violet">
          <Icon name="trophy" size={20} />
        </span>
        <h2 className="text-subtitle font-bold">{t("Ambassadeurs d'EtherBay", 'EtherBay Ambassadors')}</h2>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-[16px] bg-surface-elevated px-4 py-3 text-caption text-fg-muted">
          {t('Aucun participant classé pour le moment.', 'No ranked participants yet.')}
        </p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {visible.map((item) => (
            <li
              key={`${item.rank}-${item.anonymizedWallet}`}
              className={cn(
                'flex items-center justify-between gap-3 rounded-[16px] px-3 py-2.5',
                item.rank === 1 ? 'bg-sun-chip' : 'bg-surface-elevated'
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-caption font-bold',
                    item.rank === 1 ? 'bg-sun text-on-sun' : 'bg-surface text-fg-secondary'
                  )}
                  aria-label={t(`Rang ${item.rank}`, `Rank ${item.rank}`)}
                >
                  {item.rank}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-mono text-caption font-bold">{item.anonymizedWallet}</p>
                  <p className="text-caption text-fg-muted">
                    {t(
                      `${item.referralsCount} parrainage(s) • ${item.ticketsBought} ticket(s)`,
                      `${item.referralsCount} referral(s) • ${item.ticketsBought} ticket(s)`
                    )}
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-lavender px-2.5 py-1 text-caption font-bold text-violet tabular">
                {item.pointsBalance} pts
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};

export default LeaderboardList;
