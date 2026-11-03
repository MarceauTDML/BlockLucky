import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAppTheme from '../../hooks/useAppTheme';
import { useGetMyCodesQuery } from '../../store/api/marketplaceApi';
import AppText from '../../components/ui/AppText';
import AppButton from '../../components/ui/AppButton';
import BackButton from '../../components/ui/BackButton';
import Loader from '../../components/ui/Loader';
import { formatDateShort } from '../../utils/date.util';

export const MyCodesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors, borderRadius, spacing, t } = useAppTheme();
  const { data, isLoading } = useGetMyCodesQuery();

  const rawCodes = data?.data?.codes;
  const codes = Array.isArray(rawCodes) ? rawCodes : [];

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { padding: spacing.lg, paddingBottom: spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {navigation?.canGoBack?.() ? (
          <BackButton onPress={() => navigation.goBack()} />
        ) : null}

        <AppText variant="title" weight="bold" style={styles.title}>
          {t('Mes codes partenaires', 'My Partner Codes')}
        </AppText>
        <AppText variant="body" color={colors.textSecondary} style={styles.subtitle}>
          {t(
            'Présentez ces codes uniques chez les commerçants partenaires d EtherBay.',
            'Present these unique promo codes at EtherBay partner stores.'
          )}
        </AppText>

        {isLoading ? (
          <Loader
            message={t('Chargement de vos codes...', 'Loading your codes...')}
          />
        ) : codes.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.surface,
                borderRadius: borderRadius.lg,
                borderColor: colors.border,
              },
            ]}
          >
            <AppText variant="subtitle" weight="semibold" align="center">
              {t('Aucun code enregistré', 'No saved codes')}
            </AppText>
            <AppText
              variant="body"
              color={colors.textSecondary}
              align="center"
              style={styles.emptyDesc}
            >
              {t(
                'Échangez vos points dans le catalogue pour débloquer votre première carte à gratter.',
                'Redeem your points in the catalog to unlock your first scratch card.'
              )}
            </AppText>
            <AppButton
              title={t('Explorer le catalogue', 'Explore Catalog')}
              onPress={() => navigation.goBack()}
            />
          </View>
        ) : (
          codes.map((item) => (
            <View
              key={item.id}
              style={[
                styles.codeCard,
                {
                  backgroundColor: colors.surface,
                  borderRadius: borderRadius.lg,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.topRow}>
                <AppText variant="overline" weight="semibold" color={colors.secondary}>
                  {item.partner?.name ||
                    item.partnerName ||
                    t('Commerçant EtherBay', 'EtherBay Partner')}
                </AppText>
                <AppText
                  variant="caption"
                  weight="semibold"
                  color={item.isUsed ? colors.textMuted : colors.primary}
                >
                  {item.isUsed ? t('Utilisé', 'Used') : t('Actif', 'Active')}
                </AppText>
              </View>

              <AppText variant="subtitle" weight="semibold" style={styles.rewardTitle}>
                {item.rewardTitle}
              </AppText>

              <View
                style={[
                  styles.qrPlaceholder,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderRadius: borderRadius.md,
                    borderColor: colors.border,
                  },
                ]}
              >
                <AppText variant="overline" color={colors.textSecondary}>
                  {t('Code magasin', 'In-Store Code')}
                </AppText>
                <AppText variant="title" weight="bold" color={colors.primary}>
                  {item.uniqueCode}
                </AppText>
              </View>

              <AppText variant="caption" color={colors.textMuted}>
                {t(
                  `Obtenu le ${formatDateShort(item.claimedAt)}`,
                  `Claimed on ${formatDateShort(item.claimedAt)}`
                )}
              </AppText>
            </View>
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
    marginBottom: 6,
  },
  subtitle: {
    marginBottom: 18,
    lineHeight: 22,
  },
  emptyCard: {
    padding: 24,
    borderWidth: 1,
    gap: 12,
  },
  emptyDesc: {
    lineHeight: 22,
  },
  codeCard: {
    padding: 18,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardTitle: {
    marginVertical: 2,
  },
  qrPlaceholder: {
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginVertical: 6,
  },
});

export default MyCodesScreen;
