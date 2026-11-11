import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAppTheme from '../../hooks/useAppTheme';
import { useGetMyTransactionsQuery } from '../../store/api/lotteryApi';
import AppText from '../../components/ui/AppText';
import AppButton from '../../components/ui/AppButton';
import BackButton from '../../components/ui/BackButton';
import Loader from '../../components/ui/Loader';
import TicketCard from '../../components/lottery/TicketCard';
import POAPBadge from '../../components/lottery/POAPBadge';

export const TransactionHistoryScreen: React.FC<{ navigation: any }> = ({
  navigation,
}) => {
  const { colors, borderRadius, spacing, t } = useAppTheme();
  const { data, isLoading } = useGetMyTransactionsQuery({ page: 1, limit: 25 });
  const [activeTab, setActiveTab] = useState<'TICKETS' | 'POAP'>('TICKETS');

  const tickets = data?.data?.tickets ?? [];
  const poapBadges = data?.data?.poapBadges ?? [];

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
          {t('Historique & POAP', 'History & POAP')}
        </AppText>
        <AppText variant="body" color={colors.textSecondary} style={styles.subtitle}>
          {t(
            'Consultez vos tickets vérifiables sur Ethereum et vos certificats de participation.',
            'View your verifiable Ethereum tickets and participation certificates.'
          )}
        </AppText>

        <View
          style={[
            styles.tabRow,
            {
              backgroundColor: colors.surfaceElevated,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => setActiveTab('TICKETS')}
            style={[
              styles.tabButton,
              {
                backgroundColor:
                  activeTab === 'TICKETS' ? colors.surface : 'transparent',
                borderRadius: borderRadius.sm,
              },
            ]}
          >
            <AppText
              variant="caption"
              weight="semibold"
              align="center"
              color={activeTab === 'TICKETS' ? colors.text : colors.textSecondary}
            >
              {t(`Tickets (${tickets.length})`, `Tickets (${tickets.length})`)}
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('POAP')}
            style={[
              styles.tabButton,
              {
                backgroundColor:
                  activeTab === 'POAP' ? colors.surface : 'transparent',
                borderRadius: borderRadius.sm,
              },
            ]}
          >
            <AppText
              variant="caption"
              weight="semibold"
              align="center"
              color={activeTab === 'POAP' ? colors.text : colors.textSecondary}
            >
              {t(
                `Certificats POAP (${poapBadges.length})`,
                `POAP Badges (${poapBadges.length})`
              )}
            </AppText>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <Loader
            message={t(
              'Chargement des preuves on-chain...',
              'Loading on-chain proofs...'
            )}
          />
        ) : activeTab === 'TICKETS' ? (
          tickets.length === 0 ? (
            <View
              style={[
                styles.emptyState,
                {
                  backgroundColor: colors.surface,
                  borderRadius: borderRadius.lg,
                  borderColor: colors.border,
                },
              ]}
            >
              <AppText variant="subtitle" weight="semibold" align="center">
                {t('Aucun ticket enregistré', 'No tickets recorded')}
              </AppText>
              <AppText
                variant="body"
                color={colors.textSecondary}
                align="center"
                style={styles.emptyDesc}
              >
                {t(
                  'Achetez un ticket avec votre portefeuille BlockLucky intégré pour obtenir votre premier ticket vérifiable sur la blockchain.',
                  'Buy a ticket with your integrated BlockLucky wallet to get your first ticket verifiable on the blockchain.'
                )}
              </AppText>
              <AppButton
                title={t('Acheter un ticket', 'Buy a ticket')}
                onPress={() => navigation.navigate('BuyTicket')}
              />
            </View>
          ) : (
            tickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)
          )
        ) : poapBadges.length === 0 ? (
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor: colors.surface,
                borderRadius: borderRadius.lg,
                borderColor: colors.border,
              },
            ]}
          >
            <AppText variant="subtitle" weight="semibold" align="center">
              {t('Aucun certificat POAP', 'No POAP certificates')}
            </AppText>
            <AppText
              variant="body"
              color={colors.textSecondary}
              align="center"
              style={styles.emptyDesc}
            >
              {t(
                'Chaque participation débloque automatiquement un certificat commémoratif.',
                'Every ticket entry automatically unlocks a commemorative certificate.'
              )}
            </AppText>
          </View>
        ) : (
          poapBadges.map((badge) => <POAPBadge key={badge.id} badge={badge} />)
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
  tabRow: {
    flexDirection: 'row',
    padding: 4,
    marginBottom: 18,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
  },
  emptyState: {
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  emptyDesc: {
    marginBottom: 8,
    lineHeight: 22,
  },
});

export default TransactionHistoryScreen;
