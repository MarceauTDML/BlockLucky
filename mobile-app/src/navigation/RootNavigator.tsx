import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import DialogSummary from '../components/lottery/DialogSummary';
import AppText from '../components/ui/AppText';
import ResultDialog from '../components/ui/ResultDialog';
import Icon from '../components/ui/icons/Icon';
import useAppTheme from '../hooks/useAppTheme';
import useAuth from '../hooks/useAuth';
import useCitizenWallet from '../hooks/useCitizenWallet';
import usePushNotifications from '../hooks/usePushNotifications';
import Setup2FAScreen from '../screens/auth/Setup2FAScreen';
import BuyTicketScreen from '../screens/lottery/BuyTicketScreen';
import GiftTicketScreen from '../screens/lottery/GiftTicketScreen';
import HowItWorksScreen from '../screens/lottery/HowItWorksScreen';
import LiveDrawScreen from '../screens/lottery/LiveDrawScreen';
import TransactionHistoryScreen from '../screens/lottery/TransactionHistoryScreen';
import WaitingRoomScreen from '../screens/lottery/WaitingRoomScreen';
import MyCodesScreen from '../screens/marketplace/MyCodesScreen';
import RewardDetailScreen from '../screens/marketplace/RewardDetailScreen';
import RewardsCatalogScreen from '../screens/marketplace/RewardsCatalogScreen';
import ScratchCardScreen from '../screens/marketplace/ScratchCardScreen';
import GDPRScreen from '../screens/settings/GDPRScreen';
import HelpSupportScreen from '../screens/settings/HelpSupportScreen';
import NotificationsScreen from '../screens/settings/NotificationsScreen';
import SecurityScreen from '../screens/settings/SecurityScreen';
import VerifyAgeScreen from '../screens/settings/VerifyAgeScreen';
import { useAppDispatch, useAppSelector } from '../store';
import {
  hidePointsPopup,
  hideRetryModal,
  hideQueueModal,
  hideSentryModal,
} from '../store/slices/uiSlice';
import { RootStackParamList } from '../types/navigation.types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { colors, t } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, ageVerificationStatus } = useAuth();
  const agePromptShown = useRef(false);

  const promptAgeVerification = useCallback(() => {
    if (!isAuthenticated || agePromptShown.current || !navigationRef.isReady()) return;
    if (ageVerificationStatus !== 'NONE' && ageVerificationStatus !== 'REJECTED') return;
    agePromptShown.current = true;
    navigationRef.navigate('VerifyAge');
  }, [isAuthenticated, ageVerificationStatus]);

  useEffect(() => {
    if (!isAuthenticated) {
      agePromptShown.current = false;
      return;
    }
    const timer = setTimeout(promptAgeVerification, 400);
    return () => clearTimeout(timer);
  }, [isAuthenticated, promptAgeVerification]);
  const { retryPurchaseFromQueue } = useCitizenWallet();
  const { osPushBanner } = usePushNotifications();
  const dispatch = useAppDispatch();

  const { pointsPopup, retryModal, queueModal, sentryModal } = useAppSelector((state) => state.ui);

  return (
    <View style={[styles.rootWrapper, { backgroundColor: colors.background }]}>
      {osPushBanner.visible ? (
        <View
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[
            styles.osPushBanner,
            {
              top: Math.max(insets.top + 8, 16),
              backgroundColor: colors.surface,
              shadowColor: colors.shadowModal,
            },
          ]}
        >
          <View style={[styles.bannerIcon, { backgroundColor: colors.sun }]}>
            <Icon name="bell" size={19} color={colors.onSun} />
          </View>
          <View style={styles.bannerText}>
            <AppText variant="overline" color={colors.inkMuted}>
              {t('Notification EtherBay', 'EtherBay notification')}
            </AppText>
            <AppText size={13} weight="semibold">
              {osPushBanner.title}
            </AppText>
            <AppText size={11} color={colors.inkMuted}>
              {osPushBanner.body}
            </AppText>
          </View>
        </View>
      ) : null}

      <NavigationContainer ref={navigationRef} onReady={promptAgeVerification}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            <Stack.Screen name="Auth" component={AuthStack} />
          ) : (
            <>
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen name="BuyTicket" component={BuyTicketScreen} />
              <Stack.Screen name="GiftTicket" component={GiftTicketScreen} />
              <Stack.Screen name="WaitingRoom" component={WaitingRoomScreen} />
              <Stack.Screen name="LiveDraw" component={LiveDrawScreen} />
              <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
              <Stack.Screen name="HowItWorks" component={HowItWorksScreen} />
              <Stack.Screen name="RewardsCatalog" component={RewardsCatalogScreen} />
              <Stack.Screen name="RewardDetail" component={RewardDetailScreen} />
              <Stack.Screen name="ScratchCard" component={ScratchCardScreen} />
              <Stack.Screen name="MyCodes" component={MyCodesScreen} />
              <Stack.Screen name="VerifyAge" component={VerifyAgeScreen} />
              <Stack.Screen name="Security" component={SecurityScreen} />
              <Stack.Screen name="Setup2FA" component={Setup2FAScreen} />
              <Stack.Screen name="GDPR" component={GDPRScreen} />
              <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>

      <ResultDialog
        visible={pointsPopup.visible}
        status="success"
        title={t(`+${pointsPopup.amount} EtherPoints`, `+${pointsPopup.amount} EtherPoints`)}
        message={pointsPopup.reason}
        note={t(
          'À échanger contre des réductions chez les commerçants d’EtherBay.',
          'Redeem them for discounts at EtherBay shops.',
        )}
        primaryLabel={t('Continuer', 'Continue')}
        onPrimary={() => dispatch(hidePointsPopup())}
      />

      <ResultDialog
        visible={retryModal.visible}
        status="error"
        title={t('Réseau encombré', 'Network busy')}
        message={retryModal.message}
        note={t(
          'Aucun ticket créé, aucun ETH fictif débité.',
          'No ticket created, no fictional ETH charged.',
        )}
        primaryLabel={t('Réessayer l’achat', 'Retry purchase')}
        onPrimary={() => {
          dispatch(hideRetryModal());
          retryPurchaseFromQueue(retryModal.retryAttempt);
        }}
        secondaryLabel={t('Revenir plus tard', 'Come back later')}
        onSecondary={() => dispatch(hideRetryModal())}
      />

      <ResultDialog
        visible={queueModal.visible}
        status="info"
        title={t('Forte affluence', 'High traffic')}
        message={t(
          'Beaucoup de participants achètent en même temps. Votre demande est mise en file d’attente sécurisée.',
          'Many participants are buying at the same time. Your request is safely queued.',
        )}
        primaryLabel={t('Patienter', 'Wait')}
        onPrimary={() => dispatch(hideQueueModal())}
      >
        <DialogSummary
          title={t(
            `Position dans la file : ${queueModal.position}`,
            `Queue position: ${queueModal.position}`,
          )}
          detail={t(
            'Un seul ticket par participant et par grand tirage.',
            'Only one ticket per participant per grand draw.',
          )}
        />
      </ResultDialog>

      <ResultDialog
        visible={sentryModal.visible}
        status="error"
        title={sentryModal.title || t('Information réseau', 'Network notice')}
        message={sentryModal.message}
        primaryLabel={t('Compris', 'Got it')}
        onPrimary={() => dispatch(hideSentryModal())}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  rootWrapper: {
    flex: 1,
  },
  osPushBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 20,
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  bannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    flex: 1,
    gap: 2,
  },
});

export default RootNavigator;
