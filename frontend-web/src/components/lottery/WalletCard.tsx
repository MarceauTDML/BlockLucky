'use client';

import React, { useId } from 'react';
import { Skeleton } from '@/components/ui/Loader';
import { Badge } from '@/components/ui/Misc';
import { cn } from '@/lib/cn';
import { shortenWallet } from '@/lib/formatters';
import { useGetWalletQuery } from '@/store/api/lotteryApi';
import { useAppTheme } from '@/theme/ThemeProvider';

export const WalletCard: React.FC<{ className?: string }> = ({ className }) => {
  const { language, t } = useAppTheme();
  const titleId = useId();
  const { data, isLoading, isError } = useGetWalletQuery();
  const wallet = data?.data;
  const balance = wallet?.balanceEth;
  const formattedBalance =
    typeof balance === 'number'
      ? new Intl.NumberFormat(language === 'FR' ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 4 }).format(balance)
      : null;

  return (
    <section className={cn('card flex flex-col gap-1.5 p-4', className)} aria-labelledby={titleId}>
      <div className="flex items-center justify-between gap-2">
        <h2 id={titleId} className="text-caption font-semibold text-secondary">
          {t('Portefeuille BlockLucky intégré', 'Integrated BlockLucky wallet')}
        </h2>
        {wallet?.mode === 'simulated' ? <Badge tone="warning">{t('Mode démonstration', 'Demo mode')}</Badge> : null}
      </div>
      {isLoading ? (
        <Skeleton className="h-14 w-full rounded-md" />
      ) : isError || !wallet ? (
        <p className="text-caption text-fg-muted">
          {t('Portefeuille momentanément indisponible.', 'Wallet temporarily unavailable.')}
        </p>
      ) : (
        <>
          <p className="font-mono text-body font-bold" title={wallet.walletAddress}>
            {shortenWallet(wallet.walletAddress, 6)}
          </p>
          <p className="text-subtitle font-bold tabular">
            {formattedBalance !== null
              ? t(`${formattedBalance} ethers fictifs`, `${formattedBalance} test ethers`)
              : t('Solde indisponible', 'Balance unavailable')}
          </p>
          <p className="text-caption text-fg-secondary">
            {t(
              'Vos transactions sont signées par ce portefeuille. Le prix des tickets et les frais réseau sont prélevés sur la dotation de bienvenue en ethers fictifs versée par la Mairie.',
              'Your transactions are signed by this wallet. Ticket prices and network fees are taken from the test-ether welcome grant sent by City Hall.'
            )}
          </p>
          {wallet.explorerUrl ? (
            <a
              href={wallet.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-caption font-medium text-primary underline-offset-2 hover:underline"
            >
              {t("Voir le portefeuille sur l'explorateur de blocs →", 'View the wallet on the block explorer →')}
            </a>
          ) : null}
        </>
      )}
    </section>
  );
};

export default WalletCard;
