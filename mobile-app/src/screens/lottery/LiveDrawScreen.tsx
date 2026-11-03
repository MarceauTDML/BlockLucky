import React from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAppTheme from '../../hooks/useAppTheme';
import useSocket from '../../hooks/useSocket';
import { useAppDispatch, useAppSelector } from '../../store';
import { setRouletteSpinning } from '../../store/slices/lotterySlice';
import { useGetLotteryStatusQuery } from '../../store/api/lotteryApi';
import AppText from '../../components/ui/AppText';
import AppButton from '../../components/ui/AppButton';
import RouletteAnimation from '../../components/lottery/RouletteAnimation';
import ChatBox from '../../components/lottery/ChatBox';

export const LiveDrawScreen: React.FC = () => {
  const { colors, borderRadius, spacing, t } = useAppTheme();
  const dispatch = useAppDispatch();
  const { data: statusRes } = useGetLotteryStatusQuery();
  const round = statusRes?.data?.round;

  const { sendChatMessage } = useSocket(round?.id);
  const {
    onlineWaitingUsers,
    liveChatMessages,
    lastWinnerAnnouncement,
    isRouletteSpinning,
  } = useAppSelector((state) => state.lottery);

  const handleSimulateSpin = () => {
    dispatch(setRouletteSpinning(true));
    setTimeout(() => {
      dispatch(setRouletteSpinning(false));
    }, 3500);
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
            { padding: spacing.md, paddingBottom: spacing.xxl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerBlock}>
            <AppText variant="title" weight="bold">
              {t('Tirage en direct', 'Live Draw')}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {t(
                'Vérification aléatoire décentralisée via Chainlink VRF',
                'Decentralized randomness verified by Chainlink VRF'
              )}
            </AppText>
          </View>

          <View
            style={[
              styles.waitingRoomBanner,
              {
                backgroundColor: colors.surface,
                borderRadius: borderRadius.lg,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.waitingHeader}>
              <AppText variant="caption" weight="semibold" color={colors.primary}>
                {t('Salle d attente', 'Waiting Room')}
              </AppText>
              <AppText variant="caption" weight="medium" color={colors.secondary}>
                {t(`${onlineWaitingUsers} en ligne`, `${onlineWaitingUsers} online`)}
              </AppText>
            </View>
            <AppText variant="caption" color={colors.textSecondary}>
              {round?.inWaitingRoom
                ? t(
                    'Les 10 dernières minutes sont actives. Le tirage Chainlink VRF est imminent.',
                    'The final 10-minute countdown is active. Chainlink VRF draw is imminent.'
                  )
                : t(
                    'Ouverture du compte à rebours final 10 minutes avant l échéance du contrat.',
                    'Final countdown opens 10 minutes before smart contract expiration.'
                  )}
            </AppText>
          </View>

          <RouletteAnimation
            spinning={isRouletteSpinning}
            winnerWallet={
              lastWinnerAnnouncement?.winnerWallet || round?.winnerWallet
            }
            vrfRequestId={
              lastWinnerAnnouncement?.vrfProofHash || round?.chainlinkRequestId
            }
          />

          <AppButton
            title={
              isRouletteSpinning
                ? t('Tirage en cours...', 'Drawing...')
                : t('Simuler la roue de tirage', 'Simulate Draw Wheel')
            }
            variant="outline"
            onPress={handleSimulateSpin}
            disabled={isRouletteSpinning}
          />

          <View
            style={[
              styles.vrfProofCard,
              {
                backgroundColor: colors.surface,
                borderRadius: borderRadius.lg,
                borderColor: colors.border,
              },
            ]}
          >
            <AppText variant="caption" weight="semibold" color={colors.text}>
              {t('Certification Chainlink VRF v2.5', 'Chainlink VRF v2.5 Certification')}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {t(
                'La preuve cryptographique garantit l impartialité complète de la sélection du portefeuille gagnant.',
                'Cryptographic proof guarantees complete fairness when selecting the winning wallet.'
              )}
            </AppText>
          </View>

          <ChatBox messages={liveChatMessages} onSendMessage={sendChatMessage} />
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
  headerBlock: {
    marginBottom: 14,
    gap: 2,
  },
  waitingRoomBanner: {
    padding: 14,
    borderWidth: 1,
    marginBottom: 14,
    gap: 6,
  },
  waitingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vrfProofCard: {
    padding: 14,
    borderWidth: 1,
    marginTop: 14,
    gap: 4,
  },
});

export default LiveDrawScreen;
