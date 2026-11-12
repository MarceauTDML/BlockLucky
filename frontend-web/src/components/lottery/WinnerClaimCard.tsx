'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import { Alert } from '@/components/ui/Misc';
import useBlockLuckyWallet, { ClaimPrizeOutcome } from '@/hooks/useBlockLuckyWallet';
import { cn } from '@/lib/cn';
import { useAppSelector } from '@/store';
import { useGetWalletQuery } from '@/store/api/lotteryApi';
import { useAppTheme } from '@/theme/ThemeProvider';
import { LotteryStatusResponse } from '@/types/api.types';

export const WinnerClaimCard: React.FC<{ status?: LotteryStatusResponse; className?: string }> = ({
  status,
  className,
}) => {
  const { t } = useAppTheme();
  const userWallet = useAppSelector((s) => s.auth.user?.walletAddress);
  const announcement = useAppSelector((s) => s.lottery.lastWinnerAnnouncement);
  const { data: walletRes } = useGetWalletQuery();
  const { claimPrize, isClaiming } = useBlockLuckyWallet();
  const [outcome, setOutcome] = useState<{ roundId: number; result: ClaimPrizeOutcome } | null>(null);

  const myWallet = (walletRes?.data?.walletAddress || userWallet || '').toLowerCase();
  const round = status?.round;
  const win = announcement?.winnerWallet
    ? {
        wallet: announcement.winnerWallet,
        contractRoundId: announcement.contractRoundId,
        prizePool: announcement.prizePool,
      }
    : round?.winnerWallet
      ? { wallet: round.winnerWallet, contractRoundId: round.contractRoundId, prizePool: round.prizePool }
      : null;

  if (!myWallet || !win || win.wallet.toLowerCase() !== myWallet) return null;

  const simulated = Boolean(status?.guarantees?.simulated);
  const result = outcome?.roundId === win.contractRoundId ? outcome.result : null;

  const handleClaim = async () => {
    if (isClaiming) return;
    const res = await claimPrize(win.contractRoundId);
    setOutcome({ roundId: win.contractRoundId, result: res });
  };

  return (
    <section className={cn('flex flex-col gap-2.5 rounded-[24px] bg-mint p-5', className)} aria-live="polite">
      <div className="flex items-center gap-3">
        <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-green">
          <Icon name="trophy" size={20} />
        </span>
        <p className="rounded-full bg-surface px-3 py-1 text-caption font-semibold text-green">
          {t('Félicitations', 'Congratulations')}
        </p>
      </div>
      <h2 className="text-heading font-bold">
        {t(
          `Votre portefeuille a remporté le tirage #${win.contractRoundId}`,
          `Your wallet won draw #${win.contractRoundId}`
        )}
      </h2>
      <p className="text-body font-semibold text-green tabular">
        {t(
          `Cagnotte : ${Number(win.prizePool || 0).toFixed(4)} ethers fictifs`,
          `Prize pool: ${Number(win.prizePool || 0).toFixed(4)} test ethers`
        )}
      </p>
      {simulated ? (
        <p className="text-caption text-fg-muted">
          {t(
            "Mode démonstration : la cagnotte n'est pas versée sur une blockchain réelle.",
            'Demo mode: the prize pool is not paid out on a real blockchain.'
          )}
        </p>
      ) : result?.status === 'claimed' ? (
        <Alert>
          {t('Gains versés sur votre portefeuille BlockLucky.', 'Winnings paid to your BlockLucky wallet.')}
          {typeof result.data.walletBalanceEth === 'number'
            ? t(
                ` Nouveau solde : ${result.data.walletBalanceEth.toFixed(4)} ethers fictifs.`,
                ` New balance: ${result.data.walletBalanceEth.toFixed(4)} test ethers.`
              )
            : null}
          {result.data.etherscanUrl ? (
            <a
              href={result.data.etherscanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block font-medium underline-offset-2 hover:underline"
            >
              {t('Vérifier sur Etherscan →', 'Verify on Etherscan →')}
            </a>
          ) : null}
        </Alert>
      ) : result?.status === 'already-paid' ? (
        <Alert>{t('Cagnotte déjà versée sur votre portefeuille.', 'Prize pool already paid to your wallet.')}</Alert>
      ) : (
        <>
          <p className="text-caption text-fg-secondary">
            {t(
              "La plateforme verse automatiquement la cagnotte sur votre portefeuille BlockLucky. Si elle n'apparaît pas encore dans votre solde, vous pouvez la retirer vous-même.",
              'The platform automatically pays the prize pool to your BlockLucky wallet. If it is not in your balance yet, you can withdraw it yourself.'
            )}
          </p>
          {result?.status === 'error' ? <Alert tone={result.tone}>{result.message}</Alert> : null}
          <Button onClick={handleClaim} loading={isClaiming}>
            {t('Retirer mes gains', 'Withdraw my winnings')}
          </Button>
        </>
      )}
    </section>
  );
};

export default WinnerClaimCard;
