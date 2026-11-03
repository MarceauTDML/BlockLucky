import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAppTheme from '../../hooks/useAppTheme';
import usePushNotifications from '../../hooks/usePushNotifications';
import { useGetTransparencyCharterQuery } from '../../store/api/lotteryApi';
import AppText from '../../components/ui/AppText';
import AppButton from '../../components/ui/AppButton';
import BackButton from '../../components/ui/BackButton';

export const HelpSupportScreen: React.FC<{ navigation: any }> = ({
  navigation,
}) => {
  const { colors, borderRadius, spacing, language, t } = useAppTheme();
  const { data } = useGetTransparencyCharterQuery();
  const { triggerSimulatedOsPush } = usePushNotifications();

  const charter = data?.data;

  const fallbackSections = [
    {
      heading: t('1. Registre public Ethereum', '1. Public Ethereum Ledger'),
      body: t(
        'Chaque participation et chaque tirage sont inscrits de façon immuable sur la blockchain. Aucune intervention humaine ne peut modifier le résultat.',
        'Every entry and draw is immutably recorded on the blockchain. No human intervention can alter the outcome.'
      ),
    },
    {
      heading: t(
        '2. Tirage aléatoire certifié (Chainlink VRF)',
        '2. Certified Randomness (Chainlink VRF)'
      ),
      body: t(
        'Le gagnant est désigné par un oracle cryptographique vérifiable qui génère une preuve mathématique d impartialité.',
        'The winner is selected by a verifiable cryptographic oracle that generates a mathematical proof of fairness.'
      ),
    },
    {
      heading: t('3. Remboursement automatique', '3. Automatic Refund Guarantee'),
      body: t(
        'Le Smart Contract intègre une clause de remboursement automatique : si le tirage est annulé, l intégralité des fonds engagés est restituée.',
        'The Smart Contract includes an automatic refund clause: if the draw is cancelled, 100% of committed funds are returned.'
      ),
    },
  ];

  const sections =
    language === 'FR' && charter?.sections?.length
      ? charter.sections
      : fallbackSections;

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
          {language === 'FR'
            ? charter?.title || 'Charte de transparence'
            : 'Transparency Charter'}
        </AppText>
        <AppText variant="caption" color={colors.secondary} weight="medium">
          {t(
            `Version ${charter?.version || '2026.1'} • Ville d EtherBay`,
            `Version ${charter?.version || '2026.1'} • City of EtherBay`
          )}
        </AppText>

        {sections.map((sec) => (
          <View
            key={sec.heading}
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderRadius: borderRadius.lg,
                borderColor: colors.border,
              },
            ]}
          >
            <AppText variant="subtitle" weight="semibold" color={colors.text}>
              {sec.heading}
            </AppText>
            <AppText variant="body" color={colors.textSecondary} style={styles.body}>
              {sec.body}
            </AppText>
          </View>
        ))}

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surfaceElevated,
              borderRadius: borderRadius.lg,
              borderColor: colors.border,
            },
          ]}
        >
          <AppText variant="subtitle" weight="semibold">
            {t('Test de notification', 'Notification Test')}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {t(
              'Simulez l affichage d une bannière de notification en haut de l écran.',
              'Simulate a push notification banner at the top of the screen.'
            )}
          </AppText>
          <AppButton
            title={t('Simuler une notification', 'Simulate Notification')}
            variant="secondary"
            onPress={() =>
              triggerSimulatedOsPush(
                t('Nouveau partenaire à EtherBay', 'New Partner in EtherBay'),
                t(
                  'La Boulangerie du Port propose -15% contre 100 points.',
                  'Harbor Bakery offers 15% off for 100 points.'
                )
              )
            }
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
  content: {
    gap: 14,
  },
  title: {
    marginBottom: 2,
  },
  card: {
    padding: 16,
    borderWidth: 1,
    gap: 8,
  },
  body: {
    lineHeight: 22,
  },
});

export default HelpSupportScreen;
