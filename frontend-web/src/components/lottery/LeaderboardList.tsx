'use client';

import React from 'react';
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
    <section className={cn('card p-4', className)}>
      <h2 className="mb-2.5 text-body font-bold">{t("Ambassadeurs d'EtherBay", 'EtherBay Ambassadors')}</h2>

      {visible.length === 0 ? (
        <p className="text-caption text-fg-muted">
          {t('Aucun participant classé pour le moment.', 'No ranked participants yet.')}
        </p>
      ) : (
        <ol>
          {visible.map((item, idx) => (
            <li
              key={`${item.rank}-${item.anonymizedWallet}`}
              className={cn(
                'flex items-center justify-between py-[9px]',
                idx < visible.length - 1 && 'border-b border-line'
              )}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    'flex h-[26px] w-[26px] items-center justify-center rounded-sm text-caption font-bold',
                    item.rank === 1 ? 'bg-secondary text-on-primary' : 'bg-surface-elevated text-fg-secondary'
                  )}
                  aria-label={t(`Rang ${item.rank}`, `Rank ${item.rank}`)}
                >
                  {item.rank}
                </span>
                <div>
                  <p className="font-mono text-caption font-bold">{item.anonymizedWallet}</p>
                  <p className="text-caption text-fg-muted">
                    {t(
                      `${item.referralsCount} parrainage(s) • ${item.ticketsBought} ticket(s)`,
                      `${item.referralsCount} referral(s) • ${item.ticketsBought} ticket(s)`
                    )}
                  </p>
                </div>
              </div>
              <span className="text-caption font-bold text-primary tabular">{item.pointsBalance} pts</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};

export default LeaderboardList;
