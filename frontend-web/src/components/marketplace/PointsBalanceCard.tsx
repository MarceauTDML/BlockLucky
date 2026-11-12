'use client';

import Link from 'next/link';
import React from 'react';
import Icon from '@/components/ui/Icon';
import { useAppTheme } from '@/theme/ThemeProvider';

export const PointsBalanceCard: React.FC<{
  pointsBalance: number;
  ledgerIntegrityValid?: boolean;
  myCodesHref?: string;
}> = ({ pointsBalance, ledgerIntegrityValid = true, myCodesHref }) => {
  const { t } = useAppTheme();
  return (
    <section className="mb-3.5 flex flex-col gap-4 rounded-[24px] bg-lavender p-5">
      <div className="flex items-start gap-3.5">
        <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-violet">
          <Icon name="star" size={20} />
        </span>
      <div className="flex flex-1 flex-col gap-0.5">
        <p className="eyebrow-caps text-caption font-bold text-violet">{t('Solde disponible', 'Available Balance')}</p>
        <p className="text-title font-bold text-fg tabular">{Number(pointsBalance || 0)} EtherPoints</p>
        <p className="inline-flex items-center gap-1.5 text-caption font-medium text-fg-secondary">
          <Icon name="shield" size={14} />
          {ledgerIntegrityValid
            ? t('Registre SHA-256 vérifié', 'SHA-256 Ledger Verified')
            : t('Synchronisation du registre', 'Ledger Syncing')}
        </p>
      </div>
      </div>
      {myCodesHref ? (
        <Link
          href={myCodesHref}
          className="inline-flex min-h-11 items-center justify-between gap-2 rounded-[14px] bg-primary px-4 py-2.5 text-caption font-semibold text-on-primary hover:bg-primary-light"
        >
          <span className="inline-flex items-center gap-2">
            <Icon name="giftTicket" size={18} />
            {t('Mes codes', 'My Codes')}
          </span>
          <Icon name="arrowRight" size={16} />
        </Link>
      ) : null}
    </section>
  );
};

export default PointsBalanceCard;
