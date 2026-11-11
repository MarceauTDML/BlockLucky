import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import useAppTheme from '../../hooks/useAppTheme';
import useCitizenWallet from '../../hooks/useCitizenWallet';
import AppText from '../ui/AppText';
import AppButton from '../ui/AppButton';
import ExplorerLink from '../web3/ExplorerLink';
import { formatEthBalance } from '../../utils/formatters.util';

export interface WinnerClaimCardProps {
  contractRoundId: number;
  prizePool?: number | null;
}

export const WinnerClaimCard: React.FC<WinnerClaimCardProps> = ({
  contractRoundId,
  prizePool,
}) => {
  const { colors, borderRadius, t } = useAppTheme();
  const { claimPrize, isClaiming } = useCitizenWallet();
  const [settled, setSettled] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [txUrl, setTxUrl] = useState<string | null>(null);

  useEffect(() => {
    setSettled(false);
    setMessage('');
    setIsError(false);
    setTxUrl(null);
  }, [contractRoundId]);

  const handleClaim = async () => {
    setMessage('');
    setIsError(false);
    const outcome = await claimPrize(contractRoundId);

    if (outcome.status === 'CLAIMED') {
      const balance = outcome.data?.walletBalanceEth;
      setSettled(true);
      setTxUrl(outcome.data?.etherscanUrl ?? null);
      setMessage(
        balance !== null && balance !== undefined
          ? t(
              `Gains versés sur votre portefeuille. Nouveau solde : ${formatEthBalance(balance)} ethers fictifs.`,
              `Winnings paid to your wallet. New balance: ${formatEthBalance(balance)} fictitious ETH.`
            )
          : t('Gains versés sur votre portefeuille.', 'Winnings paid to your wallet.')
      );
      return;
    }

    if (outcome.status === 'ALREADY_CLAIMED') {
      setSettled(true);
      setMessage(
        t(
          'Cagnotte déjà versée sur votre portefeuille.',
          'Prize already paid to your wallet.'
        )
      );
      return;
    }

    setIsError(true);
    setMessage(
      outcome.message ||
        t('Le retrait est momentanément indisponible.', 'Withdrawal is temporarily unavailable.')
    );
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.lg,
          borderColor: colors.primary,
        },
      ]}
    >
      <AppText variant="subtitle" weight="bold" color={colors.primary}>
        {t('Félicitations, vous avez gagné !', 'Congratulations, you won!')}
      </AppText>
      <AppText variant="caption" color={colors.textSecondary}>
        {t(
          `Votre portefeuille BlockLucky a été désigné gagnant du tour #${contractRoundId}${
            prizePool ? ` (cagnotte de ${formatEthBalance(prizePool)} ethers fictifs)` : ''
          }. La plateforme verse automatiquement la cagnotte sur votre portefeuille. Si elle n apparaît pas encore, vous pouvez la retirer vous-même.`,
          `Your BlockLucky wallet has been designated winner of round #${contractRoundId}${
            prizePool ? ` (prize pool of ${formatEthBalance(prizePool)} fictitious ETH)` : ''
          }. The platform pays the prize to your wallet automatically. If it does not show up yet, you can withdraw it yourself.`
        )}
      </AppText>

      {!settled ? (
        <AppButton
          title={t('Retirer mes gains', 'Withdraw my winnings')}
          onPress={handleClaim}
          loading={isClaiming}
        />
      ) : null}

      {message ? (
        <AppText
          variant="caption"
          weight="medium"
          color={isError ? colors.error : colors.primary}
        >
          {message}
        </AppText>
      ) : null}

      <ExplorerLink
        url={txUrl}
        label={t('Voir la transaction sur l explorateur', 'View the transaction on the explorer')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
    gap: 10,
  },
});

export default WinnerClaimCard;
