import React from 'react';
import { View, StyleSheet } from 'react-native';
import useAppTheme from '../../hooks/useAppTheme';
import AppText from '../ui/AppText';
import ExplorerLink from '../web3/ExplorerLink';
import { TicketItem } from '../../types/api.types';
import { shortenWallet } from '../../utils/formatters.util';
import { formatDateShort } from '../../utils/date.util';

export interface TicketCardProps {
  ticket: TicketItem;
}

export const TicketCard: React.FC<TicketCardProps> = ({ ticket }) => {
  const { colors, borderRadius, t } = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.lg,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.topRow}>
        <AppText variant="body" weight="bold">
          Ticket #{ticket.contractRoundId ?? 1}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          {t(`Bloc ${ticket.blockNumber}`, `Block ${ticket.blockNumber}`)}
        </AppText>
      </View>

      <AppText variant="caption" color={colors.textSecondary}>
        Transaction : {shortenWallet(ticket.transactionHash, 8)}
      </AppText>
      <AppText variant="caption" color={colors.textMuted}>
        {formatDateShort(ticket.purchasedAt)}
      </AppText>

      <ExplorerLink
        url={ticket.etherscanUrl}
        label={t('Consulter la transaction sur l explorateur', 'View the transaction on the explorer')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 3,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
});

export default TicketCard;
