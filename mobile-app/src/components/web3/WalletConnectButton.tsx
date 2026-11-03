import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import useAppTheme from '../../hooks/useAppTheme';
import AppText from '../ui/AppText';
import { shortenWallet } from '../../utils/formatters.util';

export interface WalletConnectButtonProps {
  walletAddress?: string | null;
  providerLabel?: string;
  onPress: () => void;
}

export const WalletConnectButton: React.FC<WalletConnectButtonProps> = ({
  walletAddress,
  providerLabel,
  onPress,
}) => {
  const { colors, borderRadius, t } = useAppTheme();
  const displayLabel = providerLabel || t('Portefeuille', 'Wallet');

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.md,
          borderColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.dot,
          {
            backgroundColor: walletAddress ? colors.primary : colors.secondary,
          },
        ]}
      />
      <View>
        <AppText variant="caption" color={colors.textMuted}>
          {displayLabel}
        </AppText>
        <AppText variant="caption" weight="bold" color={colors.textPrimary}>
          {walletAddress
            ? shortenWallet(walletAddress, 4)
            : t('Connecter', 'Connect')}
        </AppText>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderWidth: 1,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 8,
  },
});

export default WalletConnectButton;
