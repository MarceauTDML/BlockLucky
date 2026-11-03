import React from 'react';
import { View, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import useAppTheme from '../../hooks/useAppTheme';
import AppText from '../ui/AppText';
import { TicketItem } from '../../types/api.types';
import { shortenWallet } from '../../utils/formatters.util';
import { formatDateShort } from '../../utils/date.util';

export interface TicketCardProps {
  ticket: TicketItem;
}

export const TicketCard: React.FC<TicketCardProps> = ({ ticket }) => {
  const { colors, borderRadius, t } = useAppTheme();

  const openEtherscan = () => {
    if (ticket.etherscanUrl) {
      Linking.openURL(ticket.etherscanUrl).catch(() => {});
    }
  };

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

      <TouchableOpacity
        onPress={openEtherscan}
        style={[
          styles.etherscanBtn,
          {
            backgroundColor: colors.surfaceElevated,
            borderRadius: borderRadius.sm,
          },
        ]}
      >
        <AppText variant="caption" weight="medium" color={colors.primary} align="center">
          {t('Consulter sur Etherscan →', 'View on Etherscan →')}
        </AppText>
      </TouchableOpacity>
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
  etherscanBtn: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
});

export default TicketCard;
