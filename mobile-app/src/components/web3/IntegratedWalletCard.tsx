import React from 'react';
import { View, StyleSheet } from 'react-native';
import useAppTheme from '../../hooks/useAppTheme';
import { useGetWalletQuery } from '../../store/api/lotteryApi';
import AppText from '../ui/AppText';
import ExplorerLink from './ExplorerLink';
import { formatEthBalance, shortenWallet } from '../../utils/formatters.util';

export interface IntegratedWalletCardProps {
  fallbackAddress?: string | null;
}

export const IntegratedWalletCard: React.FC<IntegratedWalletCardProps> = ({
  fallbackAddress,
}) => {
  const { colors, borderRadius, t } = useAppTheme();
  const { data, isLoading, isError } = useGetWalletQuery();
  const wallet = data?.data;

  const address = wallet?.walletAddress || fallbackAddress;
  const isDemo = Boolean(wallet && wallet.mode !== 'onchain');

  const balanceLabel = isLoading
    ? t('Chargement du solde...', 'Loading balance...')
    : wallet && wallet.balanceEth !== null
      ? t(
          `${formatEthBalance(wallet.balanceEth)} ethers fictifs`,
          `${formatEthBalance(wallet.balanceEth)} fictitious ETH`
        )
      : isError
        ? t('Solde momentanément indisponible', 'Balance temporarily unavailable')
        : t('Solde non disponible', 'Balance not available');

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
      <View style={styles.headerRow}>
        <AppText variant="overline" weight="semibold" color={colors.secondary}>
          {t('Portefeuille BlockLucky intégré', 'Integrated BlockLucky wallet')}
        </AppText>
        {isDemo ? (
          <View
            style={[
              styles.demoTag,
              {
                backgroundColor: colors.surfaceElevated,
                borderRadius: borderRadius.sm,
              },
            ]}
          >
            <AppText variant="caption" weight="medium" color={colors.textMuted}>
              {t('Mode démonstration', 'Demo mode')}
            </AppText>
          </View>
        ) : null}
      </View>

      <AppText variant="subtitle" weight="bold" color={colors.textPrimary}>
        {address ? shortenWallet(address, 6) : t('Création en cours...', 'Being created...')}
      </AppText>
      <AppText variant="body" weight="semibold" color={colors.primary}>
        {balanceLabel}
      </AppText>
      <AppText variant="caption" color={colors.textSecondary}>
        {t(
          'Vos transactions sont signées par ce portefeuille, conservé de façon sécurisée par BlockLucky. Le prix des tickets et les frais de réseau sont réglés avec la dotation de bienvenue en ethers fictifs versée par la Mairie.',
          'Your transactions are signed by this wallet, kept securely by BlockLucky. Ticket prices and network fees are paid with the welcome grant of fictitious ETH from the City Hall.'
        )}
      </AppText>

      <ExplorerLink
        url={wallet?.explorerUrl}
        label={t('Voir mon portefeuille sur l explorateur', 'View my wallet on the explorer')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  demoTag: {
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
});

export default IntegratedWalletCard;
