'use client';

import { useParams, useRouter } from 'next/navigation';
import React, { useState } from 'react';
import BackButton from '@/components/ui/BackButton';
import Button from '@/components/ui/Button';
import { Loader } from '@/components/ui/Loader';
import { Alert, EmptyState } from '@/components/ui/Misc';
import usePoints from '@/hooks/usePoints';
import storage, { KEYS } from '@/lib/storage';
import { useAppDispatch } from '@/store';
import { getErrorMessage } from '@/store/api/baseApi';
import { useClaimRewardMutation, useGetRewardDetailQuery } from '@/store/api/marketplaceApi';
import { updateUserPoints } from '@/store/slices/authSlice';
import { useAppTheme } from '@/theme/ThemeProvider';

export default function RewardDetailPage() {
  const { rewardId } = useParams<{ rewardId: string }>();
  const router = useRouter();
  const { t } = useAppTheme();
  const dispatch = useAppDispatch();
  const { pointsBalance } = usePoints();
  const { data, isLoading, isError } = useGetRewardDetailQuery(rewardId);
  const [claimReward, { isLoading: isClaiming }] = useClaimRewardMutation();
  const [errorMessage, setErrorMessage] = useState('');

  const reward = data?.data?.reward;
  const outOfStock = (reward?.remainingStock ?? 0) <= 0;
  const notEnoughPoints = reward ? pointsBalance < reward.costInPoints : false;

  const handleClaim = async () => {
    setErrorMessage('');
    try {
      const res = await claimReward({ rewardId }).unwrap();
      dispatch(updateUserPoints(res.data.newPointsBalance));
      storage.setJson(KEYS.lastClaim, res.data.claim);
      router.replace('/boutique/carte');
    } catch (err) {
      setErrorMessage(
        getErrorMessage(
          err,
          t(
            'Impossible de débloquer cette offre. Vérifiez votre solde de points.',
            'Unable to unlock this offer. Please check your points balance.'
          )
        )
      );
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <BackButton href="/boutique" />
      {isLoading ? (
        <Loader message={t("Chargement de l'offre...", 'Loading offer details...')} />
      ) : isError || !reward ? (
        <EmptyState
          title={t('Offre introuvable', 'Offer not found')}
          description={t("Cette offre n'est plus disponible.", 'This offer is no longer available.')}
        />
      ) : (
        <section className="card flex flex-col gap-3.5 p-5 md:p-7">
          <p className="eyebrow-caps text-caption font-semibold text-secondary">{reward.partner.name}</p>
          <h1 className="text-title font-bold md:text-hero">{reward.title}</h1>

          <div className="flex flex-col gap-1 rounded-md bg-surface-elevated p-3.5">
            <p className="text-caption text-fg-secondary">{t("Coût de l'offre", 'Offer cost')}</p>
            <p className="text-subtitle font-bold text-primary tabular">
              {t(
                `${reward.costInPoints} pts (Solde : ${pointsBalance} pts)`,
                `${reward.costInPoints} pts (Balance: ${pointsBalance} pts)`
              )}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-caption text-fg-secondary">{t('Disponibilité', 'Availability')}</span>
              <span className="text-caption font-semibold tabular">
                {t(
                  `${reward.remainingStock} / ${reward.totalStock} codes restants`,
                  `${reward.remainingStock} / ${reward.totalStock} codes left`
                )}
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-surface-elevated"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={reward.stockPercentage}
              aria-label={t('Stock restant', 'Remaining stock')}
            >
              <div className="h-full bg-primary" style={{ width: `${Math.max(4, reward.stockPercentage)}%` }} />
            </div>
          </div>

          {errorMessage ? <Alert tone="error">{errorMessage}</Alert> : null}
          {notEnoughPoints && !outOfStock ? (
            <p className="text-caption text-fg-muted">
              {t(
                `Il vous manque ${reward.costInPoints - pointsBalance} pts. Participez au tirage ou complétez une mission.`,
                `You need ${reward.costInPoints - pointsBalance} more pts. Enter the draw or complete a quest.`
              )}
            </p>
          ) : null}

          <Button onClick={handleClaim} loading={isClaiming} disabled={outOfStock || notEnoughPoints}>
            {outOfStock
              ? t('Stock épuisé', 'Out of stock')
              : t(
                  `Débloquer la carte (${reward.costInPoints} pts)`,
                  `Unlock Scratch Card (${reward.costInPoints} pts)`
                )}
          </Button>
        </section>
      )}
    </div>
  );
}
