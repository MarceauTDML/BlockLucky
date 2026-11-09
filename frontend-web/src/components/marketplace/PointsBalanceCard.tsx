'use client';

import Link from 'next/link';
import React from 'react';
import { useAppTheme } from '@/theme/ThemeProvider';

export const PointsBalanceCard: React.FC<{
  pointsBalance: number;
  ledgerIntegrityValid?: boolean;
  myCodesHref?: string;
}> = ({ pointsBalance, ledgerIntegrityValid = true, myCodesHref }) => {
  const { t } = useAppTheme();
  return (
    <section className="card mb-3.5 flex items-center justify-between p-4">
      <div className="flex flex-1 flex-col gap-0.5">
        <p className="text-caption text-fg-muted">{t('Solde disponible', 'Available Balance')}</p>
        <p className="text-title font-bold tabular">{Number(pointsBalance || 0)} EtherPoints</p>
        <p className="text-caption text-fg-secondary">
          {ledgerIntegrityValid
            ? t('Registre SHA-256 vérifié', 'SHA-256 Ledger Verified')
            : t('Synchronisation du registre', 'Ledger Syncing')}
        </p>
      </div>
      {myCodesHref ? (
        <Link
          href={myCodesHref}
          className="ml-3 rounded-md bg-primary px-3.5 py-[9px] text-caption font-medium text-on-primary hover:bg-primary-light"
        >
          {t('Mes codes', 'My Codes')}
        </Link>
      ) : null}
    </section>
  );
};

export default PointsBalanceCard;
