import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import useAppTheme from '../../hooks/useAppTheme';
import AppText from '../ui/AppText';

export interface PointsBalanceCardProps {
  pointsBalance: number;
  ledgerIntegrityValid?: boolean;
  onPressMyCodes?: () => void;
}

export const PointsBalanceCard: React.FC<PointsBalanceCardProps> = ({
  pointsBalance,
  ledgerIntegrityValid = true,
  onPressMyCodes,
}) => {
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
      <View style={styles.leftCol}>
        <AppText variant="caption" color={colors.textMuted}>
          {t('Solde disponible', 'Available Balance')}
        </AppText>
        <AppText variant="title" weight="bold" color={colors.textPrimary}>
          {Number(pointsBalance || 0)} EtherPoints
        </AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          {ledgerIntegrityValid
            ? t('Registre SHA-256 vérifié', 'SHA-256 Ledger Verified')
            : t('Synchronisation du registre', 'Ledger Syncing')}
        </AppText>
      </View>

      {onPressMyCodes ? (
        <TouchableOpacity
          onPress={onPressMyCodes}
          style={[
            styles.walletBtn,
            {
              backgroundColor: colors.primary,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <AppText variant="caption" weight="medium" color="#F7F6F2">
            {t('Mes codes', 'My Codes')}
          </AppText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  leftCol: {
    flex: 1,
    gap: 2,
  },
  walletBtn: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginLeft: 12,
  },
});

export default PointsBalanceCard;
