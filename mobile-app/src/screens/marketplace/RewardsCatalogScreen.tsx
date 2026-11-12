import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import PointsBalanceCard from '../../components/marketplace/PointsBalanceCard';
import RewardCard from '../../components/marketplace/RewardCard';
import ScratchOfferCard from '../../components/marketplace/ScratchOfferCard';
import { getApiErrorMessage } from '../../components/marketplace/apiErrors';
import AppButton from '../../components/ui/AppButton';
import AppText from '../../components/ui/AppText';
import Card from '../../components/ui/Card';
import FilterChips, { FilterOption } from '../../components/ui/FilterChips';
import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import SectionHeader from '../../components/ui/SectionHeader';
import useAppTheme from '../../hooks/useAppTheme';
import usePoints from '../../hooks/usePoints';
import { useRootNavigation } from '../../navigation/hooks';
import { useGetCatalogQuery } from '../../store/api/marketplaceApi';

const ALL = 'all';
const AFFORDABLE = 'affordable';

const RewardsCatalogScreen: React.FC = () => {
  const { colors, t } = useAppTheme();
  const navigation = useRootNavigation();
  const { pointsBalance, ledgerIntegrityValid, refetchPoints } = usePoints();
  const { data, isLoading, isFetching, isError, error, refetch } = useGetCatalogQuery();
  const [filter, setFilter] = useState<string>(ALL);

  const rewards = useMemo(() => {
    const raw = data?.data?.catalog;
    return Array.isArray(raw) ? raw.filter((reward) => reward.isActive !== false) : [];
  }, [data]);

  const options = useMemo<FilterOption<string>[]>(() => {
    const partners = new Map<string, string>();
    rewards.forEach((reward) => partners.set(reward.partner.id, reward.partner.name));
    return [
      { value: ALL, label: t(`Toutes · ${rewards.length}`, `All · ${rewards.length}`) },
      { value: AFFORDABLE, label: t('À ma portée', 'Affordable') },
      ...Array.from(partners.entries()).map(([value, label]) => ({ value, label })),
    ];
  }, [rewards, t]);

  const visible = rewards.filter((reward) => {
    if (filter === ALL) return true;
    if (filter === AFFORDABLE)
      return reward.costInPoints <= pointsBalance && reward.remainingStock > 0;
    return reward.partner.id === filter;
  });

  return (
    <Screen
      showSecurityFooter
      refreshing={isFetching && !isLoading}
      onRefresh={() => {
        refetch();
        refetchPoints();
      }}
    >
      <ScreenHeader
        title={t('Boutique', 'Shop')}
        subtitle={t('Vos points, vos réductions', 'Your points, your discounts')}
        onBack={() => navigation.goBack()}
      />

      <PointsBalanceCard
        pointsBalance={pointsBalance}
        ledgerIntegrityValid={ledgerIntegrityValid}
        onPressMyCodes={() => navigation.navigate('MyCodes')}
      />

      <SectionHeader
        title={t('Les tickets à gratter', 'Scratch tickets')}
        subtitle={t('Grattez et découvrez une réduction.', 'Scratch and discover a discount.')}
      />
      <View style={styles.offers}>
        <ScratchOfferCard
          offer="violet"
          onPress={() => navigation.navigate('ScratchCard', { offer: 'violet' })}
        />
        <ScratchOfferCard
          offer="lucky"
          onPress={() => navigation.navigate('ScratchCard', { offer: 'lucky' })}
        />
      </View>

      <SectionHeader
        title={t('Réductions des commerces', 'Shop discounts')}
        subtitle={t(
          'Tickets, invitations et missions → EtherPoints',
          'Tickets, invitations and quests → EtherPoints',
        )}
      />
      {rewards.length > 0 ? (
        <View style={styles.filters}>
          <FilterChips options={options} value={filter} onChange={setFilter} />
        </View>
      ) : null}

      <Card>
        {isLoading ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.ink} />
            <AppText size={12} color={colors.inkMuted} align="center">
              {t('Chargement des offres...', 'Loading offers...')}
            </AppText>
          </View>
        ) : isError ? (
          <View style={styles.state}>
            <AppText size={13} weight="semibold" align="center">
              {t('Offres indisponibles', 'Offers unavailable')}
            </AppText>
            <AppText size={12} color={colors.inkMuted} align="center">
              {getApiErrorMessage(
                error,
                t('Vérifiez votre connexion et réessayez.', 'Check your connection and try again.'),
              )}
            </AppText>
            <AppButton
              title={t('Réessayer', 'Retry')}
              variant="outline"
              size="md"
              onPress={refetch}
            />
          </View>
        ) : visible.length === 0 ? (
          <View style={styles.state}>
            <AppText size={13} weight="semibold" align="center">
              {rewards.length === 0
                ? t('Aucune offre pour le moment', 'No offers yet')
                : t('Aucune offre dans ce filtre', 'No offer for this filter')}
            </AppText>
            <AppText size={12} color={colors.inkMuted} align="center">
              {rewards.length === 0
                ? t(
                    'De nouveaux commerces rejoignent le programme régulièrement.',
                    'New shops join the programme regularly.',
                  )
                : t(
                    'Essayez un autre filtre ou gagnez plus d’EtherPoints.',
                    'Try another filter or earn more EtherPoints.',
                  )}
            </AppText>
          </View>
        ) : (
          <View style={styles.list}>
            {visible.map((reward, index) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                pointsBalance={pointsBalance}
                tone={index % 2 === 0 ? 'sun' : 'lavender'}
                onPress={() => navigation.navigate('RewardDetail', { rewardId: reward.id })}
              />
            ))}
          </View>
        )}
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  offers: {
    flexDirection: 'row',
    gap: 12,
  },
  filters: {
    marginBottom: 12,
  },
  state: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  list: {
    gap: 7,
  },
});

export default RewardsCatalogScreen;
