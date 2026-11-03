import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAppTheme from '../../hooks/useAppTheme';
import usePoints from '../../hooks/usePoints';
import { useGetCatalogQuery } from '../../store/api/marketplaceApi';
import AppText from '../../components/ui/AppText';
import Loader from '../../components/ui/Loader';
import PointsBalanceCard from '../../components/marketplace/PointsBalanceCard';
import RewardCard from '../../components/marketplace/RewardCard';

export const RewardsCatalogScreen: React.FC<{ navigation: any }> = ({
  navigation,
}) => {
  const { colors, borderRadius, spacing, t } = useAppTheme();
  const { pointsBalance, ledgerIntegrityValid } = usePoints();
  const { data, isLoading } = useGetCatalogQuery();

  const rawCatalog = data?.data?.catalog;
  const rewards = Array.isArray(rawCatalog) ? rawCatalog : [];

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { padding: spacing.md, paddingBottom: spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="title" weight="bold" style={styles.title}>
          {t('Commerces partenaires', 'Partner Merchants')}
        </AppText>
        <AppText variant="body" color={colors.textSecondary} style={styles.subtitle}>
          {t(
            'Échangez vos points contre des cartes à gratter chez les commerçants d EtherBay.',
            'Redeem your points for virtual scratch cards at EtherBay partner shops.'
          )}
        </AppText>

        <PointsBalanceCard
          pointsBalance={pointsBalance}
          ledgerIntegrityValid={ledgerIntegrityValid}
          onPressMyCodes={() => navigation.navigate('MyCodes')}
        />

        {isLoading ? (
          <Loader
            message={t(
              'Chargement des offres partenaires...',
              'Loading partner offers...'
            )}
          />
        ) : rewards.length === 0 ? (
          <View
            style={[
              styles.emptyBox,
              {
                backgroundColor: colors.surface,
                borderRadius: borderRadius.lg,
                borderColor: colors.border,
              },
            ]}
          >
            <AppText variant="subtitle" weight="semibold" align="center">
              {t('Aucune offre disponible', 'No offers available')}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary} align="center">
              {t(
                'De nouveaux partenaires rejoignent le programme chaque semaine.',
                'New local partners join the program every week.'
              )}
            </AppText>
          </View>
        ) : (
          rewards.map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              onPress={() =>
                navigation.navigate('RewardDetail', { rewardId: reward.id })
              }
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {},
  title: {
    marginBottom: 4,
  },
  subtitle: {
    marginBottom: 16,
    lineHeight: 22,
  },
  emptyBox: {
    padding: 24,
    borderWidth: 1,
    gap: 8,
  },
});

export default RewardsCatalogScreen;
