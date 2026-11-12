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
    <section className={cn('card flex flex-col gap-3 p-5', className)} aria-labelledby={titleId}>
      <div className="flex items-center justify-between gap-2">
        <h2 id={titleId} className="eyebrow-caps text-caption font-bold text-fg-muted">
          {t('Portefeuille BlockLucky intégré', 'Integrated BlockLucky wallet')}
        </h2>
        {wallet?.mode === 'simulated' ? <Badge tone="warning">{t('Mode démonstration', 'Demo mode')}</Badge> : null}
      </div>
      {isLoading ? (
        <Skeleton className="h-20 w-full rounded-[18px]" />
      ) : isError || !wallet ? (
        <p className="rounded-[16px] bg-surface-elevated px-4 py-3 text-caption text-fg-muted">
          {t('Portefeuille momentanément indisponible.', 'Wallet temporarily unavailable.')}
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-1 rounded-[18px] bg-sun-soft px-4 py-3.5 text-on-sun">
            <p className="text-title font-bold tabular">
              {formattedBalance !== null
                ? t(`${formattedBalance} ethers fictifs`, `${formattedBalance} test ethers`)
                : t('Solde indisponible', 'Balance unavailable')}
            </p>
            <p className="font-mono text-caption font-semibold text-on-sun-muted" title={wallet.walletAddress}>
              {shortenWallet(wallet.walletAddress, 6)}
            </p>
          </div>
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
              className="inline-flex items-center gap-1.5 self-start text-caption font-semibold text-green underline-offset-2 hover:underline"
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
