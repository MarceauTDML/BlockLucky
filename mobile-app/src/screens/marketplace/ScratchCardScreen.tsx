import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAppTheme from '../../hooks/useAppTheme';
import AppText from '../../components/ui/AppText';
import AppButton from '../../components/ui/AppButton';
import BackButton from '../../components/ui/BackButton';
import ScratchCanvas from '../../components/marketplace/ScratchCanvas';

export const ScratchCardScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { claim } = route.params;
  const { colors, spacing, t } = useAppTheme();

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
        <BackButton onPress={() => navigation.goBack()} />

        <AppText variant="title" weight="bold" style={styles.title}>
          {t('Carte à gratter', 'Scratch Card')}
        </AppText>
        <AppText variant="body" color={colors.textSecondary} style={styles.subtitle}>
          {t(
            'Glissez votre doigt sur la zone ci-dessous pour révéler votre code promotionnel.',
            'Swipe your finger across the card below to reveal your promo code.'
          )}
        </AppText>

        <ScratchCanvas
          secretCode={claim.uniqueCode}
          partnerName={
            claim.partnerName ||
            claim.partner?.name ||
            t('Partenaire EtherBay', 'EtherBay Partner')
          }
          rewardTitle={claim.rewardTitle}
        />

        <View style={styles.actions}>
          <AppButton
            title={t('Voir mes codes enregistrés', 'View My Saved Codes')}
            onPress={() => navigation.replace('MyCodes')}
          />
        </View>
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
    marginBottom: 12,
    lineHeight: 22,
  },
  actions: {
    marginTop: 16,
  },
});

export default ScratchCardScreen;
