import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAppTheme from '../../hooks/useAppTheme';
import useAuth from '../../hooks/useAuth';
import useCitizenWallet from '../../hooks/useCitizenWallet';
import { useGetLotteryStatusQuery } from '../../store/api/lotteryApi';
import AppText from '../../components/ui/AppText';
import AppInput from '../../components/ui/AppInput';
import AppButton from '../../components/ui/AppButton';
import BackButton from '../../components/ui/BackButton';
import IntegratedWalletCard from '../../components/web3/IntegratedWalletCard';
import ExplorerLink from '../../components/web3/ExplorerLink';
import { formatEthBalance } from '../../utils/formatters.util';
import { isValidEmail } from '../../utils/validators.util';

export const BuyTicketScreen: React.FC<{ route?: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { colors, borderRadius, spacing, t } = useAppTheme();
  const { user } = useAuth();
  const { purchaseTickets, sendGiftTicket, isBuying, isGifting } =
    useCitizenWallet();
  const { data: statusRes } = useGetLotteryStatusQuery();
  const statusData = statusRes?.data;
  const ticketPrice = statusData?.round.ticketPriceEth ?? 0.01;
  const isPaused = Boolean(statusData?.guarantees?.paused);
  const isDemo = Boolean(statusData?.guarantees?.simulated);
  const formatPrice = (amount: number) => String(Number(amount.toFixed(6)));

  const initialGiftMode = Boolean(route?.params?.giftMode);
  const [mode, setMode] = useState<'SELF' | 'GIFT'>(
    initialGiftMode ? 'GIFT' : 'SELF'
  );
  const [quantity, setQuantity] = useState(1);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [personalMessage, setPersonalMessage] = useState(
    t(
      'Je t offre un ticket pour le prochain tirage d EtherBay.',
      'Here is a gift ticket for the upcoming EtherBay draw.'
    )
  );
  const [feedback, setFeedback] = useState('');
  const [errorText, setErrorText] = useState('');
  const [feedbackTxUrl, setFeedbackTxUrl] = useState<string | null>(null);

  const handleBuyForSelf = async () => {
    setErrorText('');
    setFeedback('');
    setFeedbackTxUrl(null);
    const result = await purchaseTickets(quantity, 0);
    if (result) {
      const balanceText =
        result.walletBalanceEth !== null && result.walletBalanceEth !== undefined
          ? t(
              ` Solde restant : ${formatEthBalance(result.walletBalanceEth)} ethers fictifs.`,
              ` Remaining balance: ${formatEthBalance(result.walletBalanceEth)} fictitious ETH.`
            )
          : '';
      setFeedback(
        t(
          `${result.tickets.length} ticket(s) enregistré(s) sur la blockchain (+${result.pointsAwarded} pts).${balanceText}`,
          `${result.tickets.length} ticket(s) recorded on-chain (+${result.pointsAwarded} pts).${balanceText}`
        )
      );
      setFeedbackTxUrl(result.etherscanUrl ?? null);
    }
  };

  const handleSendGift = async () => {
    setErrorText('');
    setFeedback('');
    setFeedbackTxUrl(null);
    if (!isValidEmail(recipientEmail)) {
      setErrorText(
        t('Veuillez saisir une adresse email valide.', 'Please enter a valid email address.')
      );
      return;
    }

    const result = await sendGiftTicket(recipientEmail.trim(), personalMessage);
    if (result) {
      setFeedback(
        t(
          `Ticket envoyé à ${result.ticket.recipientEmail}. Vous avez reçu +${result.senderPointsAwarded} pts.`,
          `Gift ticket sent to ${result.ticket.recipientEmail}. You earned +${result.senderPointsAwarded} pts.`
        )
      );
      setFeedbackTxUrl(result.ticket.etherscanUrl ?? null);
      setRecipientEmail('');
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 24}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.content,
            { padding: spacing.lg, paddingBottom: spacing.xxl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {navigation?.canGoBack?.() ? (
            <BackButton onPress={() => navigation.goBack()} />
          ) : null}

          <AppText variant="title" weight="bold" style={styles.title}>
            {t('Billetterie', 'Ticket Office')}
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.subtitle}>
            {t(
              'Chaque achat est signé par votre portefeuille BlockLucky intégré. Le prix du ticket et les frais de réseau sont réglés avec votre dotation de bienvenue en ethers fictifs.',
              'Each purchase is signed by your integrated BlockLucky wallet. The ticket price and network fees are paid with your welcome grant of fictitious ETH.'
            )}
          </AppText>
          {isDemo ? (
            <AppText variant="caption" color={colors.textMuted} style={styles.demoNotice}>
              {t(
                'Mode démonstration : tirage simulé, sans certification Chainlink VRF.',
                'Demo mode: simulated draw, without Chainlink VRF certification.'
              )}
            </AppText>
          ) : null}

          <IntegratedWalletCard fallbackAddress={user?.walletAddress} />

          {isPaused ? (
            <View
              style={[
                styles.pauseBox,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.warning,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <AppText variant="caption" weight="medium" color={colors.warning}>
                {t(
                  'Le Smart Contract est en pause de sécurité par la Mairie. Les achats reprendront dès sa réactivation.',
                  'The Smart Contract has been paused by the City Hall for safety. Purchases will resume once it is reactivated.'
                )}
              </AppText>
            </View>
          ) : null}

          <View
            style={[
              styles.tabsRow,
              {
                backgroundColor: colors.surfaceElevated,
                borderRadius: borderRadius.md,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => setMode('SELF')}
              style={[
                styles.tabBtn,
                {
                  backgroundColor: mode === 'SELF' ? colors.surface : 'transparent',
                  borderRadius: borderRadius.sm,
                },
              ]}
            >
              <AppText
                variant="caption"
                weight="semibold"
                align="center"
                color={mode === 'SELF' ? colors.text : colors.textSecondary}
              >
                {t('Acheter pour moi', 'Buy for myself')}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMode('GIFT')}
              style={[
                styles.tabBtn,
                {
                  backgroundColor: mode === 'GIFT' ? colors.surface : 'transparent',
                  borderRadius: borderRadius.sm,
                },
              ]}
            >
              <AppText
                variant="caption"
                weight="semibold"
                align="center"
                color={mode === 'GIFT' ? colors.text : colors.textSecondary}
              >
                {t('Offrir un ticket', 'Gift a ticket')}
              </AppText>
            </TouchableOpacity>
          </View>

          {mode === 'SELF' ? (
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
              <AppText variant="subtitle" weight="semibold">
                {t('Participation directe', 'Direct Entry')}
              </AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                {t(
                  `${formatPrice(ticketPrice)} ETH fictif par ticket • +50 pts de fidélité par ticket`,
                  `${formatPrice(ticketPrice)} fictitious ETH per ticket • +50 loyalty pts per ticket`
                )}
              </AppText>

              <View style={styles.qtySelector}>
                {[1, 2, 5, 10].map((num) => {
                  const selected = quantity === num;
                  return (
                    <TouchableOpacity
                      key={num}
                      onPress={() => setQuantity(num)}
                      style={[
                        styles.qtyPill,
                        {
                          backgroundColor: selected
                            ? colors.primary
                            : colors.surfaceElevated,
                          borderRadius: borderRadius.md,
                          borderColor: selected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <AppText
                        weight="semibold"
                        color={selected ? '#FFFFFF' : colors.text}
                      >
                        {num}x
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View
                style={[
                  styles.summaryBox,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderRadius: borderRadius.md,
                  },
                ]}
              >
                <AppText variant="caption" color={colors.textSecondary}>
                  {t(
                    `Total : ${formatPrice(quantity * ticketPrice)} ETH fictifs + frais de réseau, débités de votre portefeuille`,
                    `Total: ${formatPrice(quantity * ticketPrice)} fictitious ETH + network fees, charged to your wallet`
                  )}
                </AppText>
                <AppText variant="caption" weight="semibold" color={colors.secondary}>
                  {t(
                    `Bonus : +${quantity * 50} pts + Certificat POAP`,
                    `Bonus: +${quantity * 50} pts + POAP Certificate`
                  )}
                </AppText>
              </View>

              <AppButton
                title={t(
                  `Confirmer (${quantity} ticket${quantity > 1 ? 's' : ''})`,
                  `Confirm (${quantity} ticket${quantity > 1 ? 's' : ''})`
                )}
                onPress={handleBuyForSelf}
                loading={isBuying}
                disabled={isPaused}
              />
            </View>
          ) : (
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
              <AppText variant="subtitle" weight="semibold">
                {t('Offrir un ticket à un proche', 'Send a Gift Ticket')}
              </AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                {t(
                  'Invitez un habitant par email et recevez +75 pts de parrainage.',
                  'Invite a friend by email and earn +75 referral pts.'
                )}
              </AppText>

              <AppInput
                label={t('Email du destinataire', 'Recipient email')}
                value={recipientEmail}
                onChangeText={setRecipientEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="ami@etherbay.fr"
                errorText={errorText}
              />

              <AppInput
                label={t('Message personnel', 'Personal message')}
                value={personalMessage}
                onChangeText={setPersonalMessage}
                multiline
              />

              <AppButton
                title={t(
                  'Envoyer le ticket (+75 pts)',
                  'Send Gift Ticket (+75 pts)'
                )}
                variant="secondary"
                onPress={handleSendGift}
                loading={isGifting}
                disabled={isPaused}
              />
            </View>
          )}

          {feedback ? (
            <View
              style={[
                styles.feedbackBox,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.primary,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <AppText variant="caption" weight="medium" color={colors.primary}>
                {feedback}
              </AppText>
              <ExplorerLink
                url={feedbackTxUrl}
                label={t('Voir la transaction sur l explorateur', 'View the transaction on the explorer')}
              />
            </View>
          ) : null}

          <TouchableOpacity
            onPress={() => navigation.navigate('TransactionHistory')}
            style={styles.historyLink}
          >
            <AppText
              variant="caption"
              weight="medium"
              color={colors.textSecondary}
              align="center"
            >
              {t(
                'Consulter mes tickets et certificats POAP',
                'View my tickets and POAP certificates'
              )}
            </AppText>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
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
    marginBottom: 20,
    lineHeight: 22,
  },
  demoNotice: {
    marginTop: -12,
    marginBottom: 16,
  },
  pauseBox: {
    padding: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  tabsRow: {
    flexDirection: 'row',
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
  },
  card: {
    padding: 18,
    borderWidth: 1,
    gap: 14,
  },
  qtySelector: {
    flexDirection: 'row',
    gap: 8,
  },
  qtyPill: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  summaryBox: {
    padding: 12,
    gap: 4,
  },
  feedbackBox: {
    marginTop: 16,
    padding: 14,
    borderWidth: 1,
  },
  historyLink: {
    marginTop: 20,
    paddingVertical: 10,
  },
});

export default BuyTicketScreen;
