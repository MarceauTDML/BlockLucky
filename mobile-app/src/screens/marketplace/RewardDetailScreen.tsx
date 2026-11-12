import { RouteProp, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { getApiErrorMessage, isAgeVerificationError } from '../../components/marketplace/apiErrors';
import AppButton from '../../components/ui/AppButton';
import AppText from '../../components/ui/AppText';
import Card from '../../components/ui/Card';
import Pill from '../../components/ui/Pill';
import ProgressBar from '../../components/ui/ProgressBar';
import ResultDialog from '../../components/ui/ResultDialog';
import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import useAppTheme from '../../hooks/useAppTheme';
import usePoints from '../../hooks/usePoints';
import { useRootNavigation } from '../../navigation/hooks';
import { useClaimRewardMutation, useGetRewardDetailQuery } from '../../store/api/marketplaceApi';
import { RootStackParamList } from '../../types/navigation.types';

type DialogState = 'none' | 'confirm' | 'age' | 'error';

const RewardDetailScreen: React.FC = () => {
  const { colors, t } = useAppTheme();
  const navigation = useRootNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'RewardDetail'>>();
  const { pointsBalance, setPointsBalance } = usePoints();
  const { data, isLoading, isError, error, refetch } = useGetRewardDetailQuery(params.rewardId);
  const [claimReward, { isLoading: isClaiming }] = useClaimRewardMutation();
  const [dialog, setDialog] = useState<DialogState>('none');
  const [errorMessage, setErrorMessage] = useState('');

  const reward = data?.data?.reward;
  const missing = reward ? Math.max(0, reward.costInPoints - pointsBalance) : 0;
  const soldOut = reward ? reward.remainingStock <= 0 || reward.isActive === false : false;

  const handleClaim = async () => {
    setDialog('none');
    try {
      const res = await claimReward({ rewardId: params.rewardId }).unwrap();
      setPointsBalance(res.data.newPointsBalance);
      navigation.replace('ScratchCard', { claim: res.data.claim });
    } catch (err) {
      if (isAgeVerificationError(err)) {
        setDialog('age');
        return;
      }
      setErrorMessage(
        getApiErrorMessage(
          err,
          t(
            'Impossible d’échanger cette offre pour le moment.',
            'Unable to exchange this offer right now.',
          ),
        ),
      );
      setDialog('error');
    }
  };

  const footer = reward ? (
    <AppButton
      title={
        soldOut
          ? t('Offre épuisée', 'Sold out')
          : missing > 0
            ? t(`Encore ${missing} EtherPoints`, `${missing} EtherPoints to go`)
            : t(
                `Échanger ${reward.costInPoints} EtherPoints`,
                `Exchange ${reward.costInPoints} EtherPoints`,
              )
      }
      rightIcon={soldOut || missing > 0 ? undefined : 'arrowRight'}
      align={soldOut || missing > 0 ? 'center' : 'space-between'}
      disabled={soldOut || missing > 0}
      loading={isClaiming}
      onPress={() => setDialog('confirm')}
    />
  ) : undefined;

  return (
    <Screen showSecurityFooter footer={footer}>
      <ScreenHeader
        title={t('Réduction', 'Discount')}
        subtitle={reward?.partner?.name}
        onBack={() => navigation.goBack()}
      />

      {isLoading ? (
        <Card style={styles.state}>
          <ActivityIndicator color={colors.ink} />
        </Card>
      ) : isError || !reward ? (
        <Card style={styles.state}>
          <AppText size={13} weight="semibold" align="center">
            {t('Offre introuvable', 'Offer not found')}
          </AppText>
          <AppText size={12} color={colors.inkMuted} align="center">
            {getApiErrorMessage(
              error,
              t('Cette offre n’est plus disponible.', 'This offer is no longer available.'),
            )}
          </AppText>
          <AppButton
            title={t('Réessayer', 'Retry')}
            variant="outline"
            size="md"
            onPress={refetch}
          />
        </Card>
      ) : (
        <>
          <View style={[styles.hero, { backgroundColor: colors.sunPale }]}>
            <Pill label={reward.partner.name} tone="surface" />
            <AppText size={28} weight="bold" color={colors.onSun} style={styles.heroTitle}>
              {reward.title}
            </AppText>
            <AppText size={13} color={colors.onSunMuted}>
              {t(
                'Échangez vos EtherPoints, grattez votre carte et présentez le code en caisse.',
                'Exchange your EtherPoints, scratch your card and show the code at checkout.',
              )}
            </AppText>
            <View style={[styles.costBox, { backgroundColor: colors.surface }]}>
              <AppText size={11} color={colors.inkMuted}>
                {t('Prix', 'Price')}
              </AppText>
              <AppText size={22} weight="bold">{`${reward.costInPoints} EtherPoints`}</AppText>
            </View>
          </View>

          <Card style={styles.block}>
            <View style={styles.row}>
              <AppText size={13} color={colors.inkMuted}>
                {t('Votre solde', 'Your balance')}
              </AppText>
              <AppText size={14} weight="bold" color={missing > 0 ? colors.terracotta : colors.ink}>
                {`${pointsBalance} EtherPoints`}
              </AppText>
            </View>
            <View style={[styles.row, styles.divider, { borderTopColor: colors.divider }]}>
              <AppText size={13} color={colors.inkMuted}>
                {t('Codes restants', 'Codes left')}
              </AppText>
              <AppText
                size={14}
                weight="bold"
              >{`${reward.remainingStock} / ${reward.totalStock}`}</AppText>
            </View>
            <ProgressBar
              percentage={reward.stockPercentage}
              tone="surface"
              accessibilityLabel={t(
                `${reward.stockPercentage} % du stock restant`,
                `${reward.stockPercentage}% of stock left`,
              )}
            />
          </Card>

          <Card tone="lavender" style={styles.block}>
            <AppText size={13} weight="bold" color={colors.violet}>
              {t('Comment l’utiliser', 'How to use it')}
            </AppText>
            <AppText size={12} color={colors.ink} style={styles.howTo}>
              {t(
                'Votre code reste disponible dans Mes codes. Montrez-le au commerçant qui le valide en magasin.',
                'Your code stays available in My codes. Show it to the shop, which validates it in store.',
              )}
            </AppText>
          </Card>
        </>
      )}

      <ResultDialog
        visible={dialog === 'confirm'}
        status="info"
        title={t('Confirmer l’échange ?', 'Confirm the exchange?')}
        message={
          reward
            ? t(
                `${reward.costInPoints} EtherPoints seront débités pour « ${reward.title} » chez ${reward.partner.name}.`,
                `${reward.costInPoints} EtherPoints will be deducted for "${reward.title}" at ${reward.partner.name}.`,
              )
            : undefined
        }
        primaryLabel={t('Échanger', 'Exchange')}
        onPrimary={handleClaim}
        secondaryLabel={t('Annuler', 'Cancel')}
        onSecondary={() => setDialog('none')}
      />

      <ResultDialog
        visible={dialog === 'age'}
        status="info"
        title={t('Vérifiez votre âge', 'Verify your age')}
        message={t(
          'Les échanges sont réservés aux personnes majeures. Envoyez votre pièce d’identité pour continuer.',
          'Exchanges are for adults only. Send your ID to continue.',
        )}
        primaryLabel={t('Vérifier mon âge', 'Verify my age')}
        onPrimary={() => {
          setDialog('none');
          navigation.navigate('VerifyAge');
        }}
        secondaryLabel={t('Plus tard', 'Later')}
        onSecondary={() => setDialog('none')}
      />

      <ResultDialog
        visible={dialog === 'error'}
        status="error"
        title={t('Échange impossible', 'Exchange failed')}
        message={errorMessage}
        primaryLabel={t('Fermer', 'Close')}
        onPrimary={() => setDialog('none')}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  state: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 28,
  },
  hero: {
    borderRadius: 24,
    padding: 18,
  },
  heroTitle: {
    marginTop: 14,
    marginBottom: 8,
  },
  costBox: {
    borderRadius: 16,
    padding: 14,
    marginTop: 18,
    gap: 2,
  },
  block: {
    marginTop: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  divider: {
    borderTopWidth: 1,
    marginBottom: 8,
  },
  howTo: {
    marginTop: 6,
  },
});

export default RewardDetailScreen;
