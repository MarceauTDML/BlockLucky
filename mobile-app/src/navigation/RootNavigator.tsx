import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types/navigation.types';
import useAppTheme from '../hooks/useAppTheme';
import useAuth from '../hooks/useAuth';
import useGaslessWeb3 from '../hooks/useGaslessWeb3';
import usePushNotifications from '../hooks/usePushNotifications';
import { useAppDispatch, useAppSelector } from '../store';
import {
  hidePointsPopup,
  hideRetryModal,
  hideQueueModal,
  hideSentryModal,
} from '../store/slices/uiSlice';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import BuyTicketScreen from '../screens/lottery/BuyTicketScreen';
import LiveDrawScreen from '../screens/lottery/LiveDrawScreen';
import TransactionHistoryScreen from '../screens/lottery/TransactionHistoryScreen';
import RewardsCatalogScreen from '../screens/marketplace/RewardsCatalogScreen';
import RewardDetailScreen from '../screens/marketplace/RewardDetailScreen';
import ScratchCardScreen from '../screens/marketplace/ScratchCardScreen';
import MyCodesScreen from '../screens/marketplace/MyCodesScreen';
import Setup2FAScreen from '../screens/auth/Setup2FAScreen';
import BottomSheet from '../components/ui/BottomSheet';
import AppText from '../components/ui/AppText';
import AppButton from '../components/ui/AppButton';
import { formatDateShort } from '../utils/date.util';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { colors, borderRadius, t } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { purchaseGaslessTicket } = useGaslessWeb3();
  const { notifications, drawerOpen, closeDrawer, osPushBanner } =
    usePushNotifications();
  const dispatch = useAppDispatch();

  const { pointsPopup, retryModal, queueModal, sentryModal } = useAppSelector(
    (state) => state.ui
  );

  return (
    <View style={[styles.rootWrapper, { backgroundColor: colors.background }]}>
      {osPushBanner.visible ? (
        <View
          style={[
            styles.osPushBanner,
            {
              top: Math.max(insets.top + 8, 16),
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: borderRadius.lg,
            },
          ]}
        >
          <AppText variant="overline" weight="semibold" color={colors.secondary}>
            {t('Notification EtherBay', 'EtherBay Notification')}
          </AppText>
          <AppText weight="semibold">{osPushBanner.title}</AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {osPushBanner.body}
          </AppText>
        </View>
      ) : null}

      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            <Stack.Screen name="Auth" component={AuthStack} />
          ) : (
            <>
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen name="BuyTicket" component={BuyTicketScreen} />
              <Stack.Screen name="LiveDraw" component={LiveDrawScreen} />
              <Stack.Screen
                name="TransactionHistory"
                component={TransactionHistoryScreen}
              />
              <Stack.Screen
                name="RewardsCatalog"
                component={RewardsCatalogScreen}
              />
              <Stack.Screen
                name="RewardDetail"
                component={RewardDetailScreen}
              />
              <Stack.Screen name="ScratchCard" component={ScratchCardScreen} />
              <Stack.Screen name="MyCodes" component={MyCodesScreen} />
              <Stack.Screen name="Setup2FA" component={Setup2FAScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>

      <BottomSheet
        visible={pointsPopup.visible}
        title={t('Points crédités', 'Points Credited')}
        onClose={() => dispatch(hidePointsPopup())}
      >
        <View style={styles.modalContent}>
          <AppText
            variant="hero"
            weight="bold"
            color={colors.primary}
            align="center"
          >
            +{pointsPopup.amount} pts
          </AppText>
          <AppText variant="body" color={colors.textSecondary} align="center">
            {pointsPopup.reason}
          </AppText>
          <AppButton
            title={t('Continuer', 'Continue')}
            onPress={() => dispatch(hidePointsPopup())}
          />
        </View>
      </BottomSheet>

      <BottomSheet
        visible={retryModal.visible}
        title={t('Réseau encombré', 'Network Busy')}
        onClose={() => dispatch(hideRetryModal())}
      >
        <View style={styles.modalContent}>
          <AppText variant="body" color={colors.textSecondary}>
            {retryModal.message}
          </AppText>
          <AppButton
            title={t('Réessayer sans frais', 'Retry Gasless Purchase')}
            onPress={async () => {
              dispatch(hideRetryModal());
              await purchaseGaslessTicket(1, retryModal.retryAttempt);
            }}
          />
        </View>
      </BottomSheet>

      <BottomSheet
        visible={queueModal.visible}
        title={t('File d attente active', 'Queue Active')}
        onClose={() => dispatch(hideQueueModal())}
      >
        <View style={styles.modalContent}>
          <AppText
            variant="subtitle"
            weight="semibold"
            color={colors.secondary}
            align="center"
          >
            {t(
              `Position dans la file : ${queueModal.position}`,
              `Queue position: #${queueModal.position}`
            )}
          </AppText>
          <AppText variant="body" color={colors.textSecondary} align="center">
            {t(
              'Forte affluence en cours. Votre transaction est mise en file d attente sécurisée.',
              'High traffic detected. Your transaction is safely queued.'
            )}
          </AppText>
          <AppButton
            title={t('Patienter', 'Wait in Queue')}
            onPress={() => dispatch(hideQueueModal())}
          />
        </View>
      </BottomSheet>

      <BottomSheet
        visible={sentryModal.visible}
        title={sentryModal.title || t('Information réseau', 'Network Notice')}
        onClose={() => dispatch(hideSentryModal())}
      >
        <View style={styles.modalContent}>
          <AppText variant="body" color={colors.textSecondary}>
            {sentryModal.message}
          </AppText>
          <AppButton
            title={t('Fermer', 'Close')}
            variant="secondary"
            onPress={() => dispatch(hideSentryModal())}
          />
        </View>
      </BottomSheet>

      <BottomSheet
        visible={drawerOpen}
        title={t('Notifications', 'Notifications')}
        onClose={closeDrawer}
      >
        <View style={styles.modalContent}>
          {notifications.length === 0 ? (
            <AppText variant="caption" color={colors.textMuted}>
              {t('Aucune notification pour le moment.', 'No notifications yet.')}
            </AppText>
          ) : (
            notifications.map((n) => (
              <View
                key={n.id}
                style={[
                  styles.notifCard,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderRadius: borderRadius.md,
                    borderColor: n.read ? colors.border : colors.primary,
                  },
                ]}
              >
                <AppText weight="semibold" color={colors.text}>
                  {n.title}
                </AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  {n.body}
                </AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  {formatDateShort(n.createdAt)}
                </AppText>
              </View>
            ))
          )}
        </View>
      </BottomSheet>
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
    padding: 14,
    borderWidth: 1,
    gap: 2,
  },
  modalContent: {
    gap: 14,
    paddingBottom: 8,
  },
  notifCard: {
    padding: 12,
    borderWidth: 1,
    gap: 4,
  },
});

export default RootNavigator;
