import React, { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import {
  formatDayMonth,
  formatMockEth,
  formatRoundLabel,
  getErrorMessage,
} from '../../components/draw/drawFormat';
import AppButton from '../../components/ui/AppButton';
import AppText from '../../components/ui/AppText';
import Card from '../../components/ui/Card';
import FilterChips from '../../components/ui/FilterChips';
import ListRow from '../../components/ui/ListRow';
import Loader from '../../components/ui/Loader';
import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import useAppTheme from '../../hooks/useAppTheme';
import { useRootNavigation } from '../../navigation/hooks';
import { useGetMyTransactionsQuery, useGetWalletQuery } from '../../store/api/lotteryApi';
import { TicketItem } from '../../types/api.types';
import { shortenWallet } from '../../utils/formatters.util';

type HistoryTab = 'tickets' | 'badges';

const openUrl = (url?: string | null) => {
  if (url) Linking.openURL(url).catch(() => undefined);
};

export const TransactionHistoryScreen: React.FC = () => {
  const { colors, t } = useAppTheme();
  const navigation = useRootNavigation();
  const [tab, setTab] = useState<HistoryTab>('tickets');

  const history = useGetMyTransactionsQuery({ page: 1, limit: 50 });
  const wallet = useGetWalletQuery();

  const tickets = history.data?.data?.tickets ?? [];
  const badges = history.data?.data?.poapBadges ?? [];
  const walletInfo = wallet.data?.data;
  const goBack = () =>
    navigation.canGoBack()
      ? navigation.goBack()
      : navigation.navigate('Main', { screen: 'TicketsTab' });
  const refresh = () => {
    history.refetch();
    wallet.refetch();
  };

  const ticketTitle = (ticket: TicketItem) => {
    const round = formatRoundLabel(ticket.contractRoundId);
    const number = ticket.ticketNumber
      ? t(`Ticket ${ticket.ticketNumber}`, `Ticket ${ticket.ticketNumber}`)
      : t('Ticket', 'Ticket');
    return round ? `${number} · #${round}` : number;
  };

  const ticketStatus = (ticket: TicketItem) => {
    if (ticket.roundStatus === 'CANCELLED') return t('Remboursé', 'Refunded');
    if (ticket.roundStatus === 'COMPLETED')
      return ticket.isWinner ? t('Gagnant', 'Winner') : t('Non gagnant', 'Not a winner');
    return t('En cours', 'Ongoing');
  };

  return (
    <Screen
      showSecurityFooter
      refreshing={history.isFetching && !history.isLoading}
      onRefresh={refresh}
    >
      <ScreenHeader
        title={t('Historique', 'History')}
        subtitle={t(
          'Vos tickets et certificats de participation',
          'Your tickets and participation certificates',
        )}
        onBack={goBack}
      />

      {walletInfo ? (
        <Card tone="sun" radius={24} padding={18}>
          <AppText variant="overline" color={colors.onSun}>
            {t('Votre portefeuille', 'Your wallet')}
          </AppText>
          <AppText size={28} weight="bold" color={colors.onSun} style={styles.balance}>
            {walletInfo.balanceEth !== null ? formatMockEth(walletInfo.balanceEth, t) : '—'}
          </AppText>
          <View style={styles.walletRow}>
            <AppText size={11} weight="medium" color={colors.onSunMuted} style={styles.flex}>
              {shortenWallet(walletInfo.walletAddress)}
            </AppText>
            {walletInfo.explorerUrl ? (
              <AppButton
                title={t('Explorateur', 'Explorer')}
                variant="dark"
                size="sm"
                rightIcon="arrowRight"
                fullWidth={false}
                onPress={() => openUrl(walletInfo.explorerUrl)}
                style={styles.explorer}
              />
            ) : null}
          </View>
        </Card>
      ) : null}

      <View style={styles.filters}>
        <FilterChips<HistoryTab>
          value={tab}
          onChange={setTab}
          options={[
            {
              value: 'tickets',
              label: t(`Tickets · ${tickets.length}`, `Tickets · ${tickets.length}`),
            },
            {
              value: 'badges',
              label: t(`Certificats · ${badges.length}`, `Certificates · ${badges.length}`),
            },
          ]}
        />
      </View>

      {history.isLoading ? (
        <Loader message={t('Chargement de l’historique…', 'Loading history…')} />
      ) : history.isError && !history.data ? (
        <Card radius={24} style={styles.empty}>
          <AppText variant="subtitle" align="center">
            {t('Historique indisponible', 'History unavailable')}
          </AppText>
          <AppText size={12} color={colors.inkMuted} align="center">
            {getErrorMessage(
              history.error,
              t(
                'Impossible de charger l’historique. Vérifiez votre connexion.',
                'Unable to load history. Check your connection.',
              ),
            )}
          </AppText>
          <AppButton
            title={t('Réessayer', 'Try again')}
            variant="dark"
            size="md"
            onPress={refresh}
          />
        </Card>
      ) : tab === 'tickets' ? (
        tickets.length === 0 ? (
          <Card radius={24} style={styles.empty}>
            <AppText variant="subtitle" align="center">
              {t('Aucun ticket pour l’instant', 'No tickets yet')}
            </AppText>
            <AppText size={12} color={colors.inkMuted} align="center">
              {t(
                'Chaque achat apparaît ici avec sa preuve d’enregistrement.',
                'Every purchase appears here with its proof of record.',
              )}
            </AppText>
            <AppButton
              title={t('Acheter mon ticket', 'Buy my ticket')}
              variant="dark"
              size="md"
              rightIcon="arrowRight"
              onPress={() => navigation.navigate('BuyTicket')}
            />
          </Card>
        ) : (
          <Card radius={24} padding={0} style={styles.list}>
            {tickets.map((ticket, index) => {
              const date = formatDayMonth(ticket.purchasedAt, t);
              const gain =
                ticket.isWinner && ticket.prizeEth
                  ? `+${formatMockEth(ticket.prizeEth, t)}`
                  : undefined;
              return (
                <View key={ticket.id} style={styles.rowPad}>
                  <ListRow
                    icon={ticket.isWinner ? 'trophy' : 'ticket'}
                    iconTone={
                      ticket.isWinner
                        ? 'mint'
                        : ticket.roundStatus === 'CANCELLED'
                          ? 'peach'
                          : 'sun'
                    }
                    title={ticketTitle(ticket)}
                    subtitle={[date, ticketStatus(ticket)].filter(Boolean).join(' · ')}
                    value={gain}
                    onPress={ticket.etherscanUrl ? () => openUrl(ticket.etherscanUrl) : undefined}
                    divider={index < tickets.length - 1}
                  />
                </View>
              );
            })}
          </Card>
        )
      ) : badges.length === 0 ? (
        <Card radius={24} style={styles.empty}>
          <AppText variant="subtitle" align="center">
            {t('Aucun certificat', 'No certificates')}
          </AppText>
          <AppText size={12} color={colors.inkMuted} align="center">
            {t(
              'Chaque participation débloque un certificat commémoratif.',
              'Every entry unlocks a commemorative certificate.',
            )}
          </AppText>
        </Card>
      ) : (
        <Card radius={24} padding={0} style={styles.list}>
          {badges.map((badge, index) => (
            <View key={badge.id} style={styles.rowPad}>
              <ListRow
                icon="star"
                iconTone="lavender"
                title={badge.title}
                subtitle={[badge.edition, formatDayMonth(badge.mintedAt, t)]
                  .filter(Boolean)
                  .join(' · ')}
                onPress={badge.explorerUrl ? () => openUrl(badge.explorerUrl) : undefined}
                divider={index < badges.length - 1}
              />
            </View>
          ))}
        </Card>
      )}

      <AppText size={10} color={colors.inkMuted} align="center" style={styles.note}>
        {t(
          'Montants en ETH fictifs, sans valeur réelle.',
          'Amounts in mock ETH, with no real value.',
        )}
      </AppText>
    </Screen>
  );
};

const styles = StyleSheet.create({
  balance: {
    marginTop: 6,
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  flex: {
    flex: 1,
  },
  explorer: {
    minHeight: 44,
  },
  filters: {
    marginTop: 20,
    marginBottom: 14,
  },
  list: {
    paddingVertical: 4,
  },
  rowPad: {
    paddingHorizontal: 18,
  },
  empty: {
    alignItems: 'stretch',
    gap: 10,
  },
  note: {
    marginTop: 18,
  },
});

export default TransactionHistoryScreen;
