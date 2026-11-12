import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import AppButton from '../../components/ui/AppButton';
import AppText from '../../components/ui/AppText';
import Card from '../../components/ui/Card';
import Loader from '../../components/ui/Loader';
import Pill from '../../components/ui/Pill';
import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import Icon from '../../components/ui/icons/Icon';
import useAppTheme from '../../hooks/useAppTheme';
import usePushNotifications from '../../hooks/usePushNotifications';
import { useRootNavigation } from '../../navigation/hooks';
import { formatDateShort } from '../../utils/date.util';

const relativeTime = (iso: string, t: (fr: string, en: string) => string): string => {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return '';
  const minutes = Math.max(0, Math.round((Date.now() - time) / 60000));
  if (minutes < 1) return t('À l’instant', 'Just now');
  if (minutes < 60) return t(`Il y a ${minutes} min`, `${minutes} min ago`);
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t(`Il y a ${hours} h`, `${hours} h ago`);
  const days = Math.round(hours / 24);
  if (days < 7) return t(`Il y a ${days} j`, `${days} d ago`);
  return formatDateShort(iso);
};

const NotificationsScreen: React.FC = () => {
  const { colors, t } = useAppTheme();
  const navigation = useRootNavigation();
  const { notifications, unreadCount, isLoading, isError, refetchNotifications, markAllAsSeen } =
    usePushNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const markRef = useRef(markAllAsSeen);

  useEffect(() => {
    markRef.current = markAllAsSeen;
  }, [markAllAsSeen]);

  useEffect(() => () => markRef.current(), []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchNotifications();
    } finally {
      setRefreshing(false);
    }
  }, [refetchNotifications]);

  const sorted = [...notifications].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );

  return (
    <Screen showSecurityFooter refreshing={refreshing} onRefresh={onRefresh}>
      <ScreenHeader
        title={t('Notifications', 'Notifications')}
        subtitle={
          unreadCount > 0
            ? t(`${unreadCount} non lue${unreadCount > 1 ? 's' : ''}`, `${unreadCount} unread`)
            : t('Tout est lu', 'All caught up')
        }
        onBack={() => navigation.goBack()}
      />

      {isLoading ? (
        <Loader message={t('Chargement des notifications…', 'Loading notifications…')} />
      ) : isError && notifications.length === 0 ? (
        <Card tone="peach">
          <AppText size={16} weight="bold">
            {t('Impossible de charger vos notifications.', 'Unable to load your notifications.')}
          </AppText>
          <AppText size={12} color={colors.inkMuted} style={styles.emptyBody}>
            {t('Vérifiez votre connexion puis réessayez.', 'Check your connection and try again.')}
          </AppText>
          <AppButton
            title={t('Réessayer', 'Try again')}
            variant="dark"
            size="md"
            onPress={onRefresh}
          />
        </Card>
      ) : sorted.length === 0 ? (
        <Card style={styles.emptyCard}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.lavender }]}>
            <Icon name="bell" size={26} color={colors.violet} />
          </View>
          <AppText size={16} weight="bold" align="center">
            {t('Aucune notification pour le moment', 'No notifications yet')}
          </AppText>
          <AppText size={12} color={colors.inkMuted} align="center" style={styles.emptyBody}>
            {t(
              'Nous vous préviendrons à l’ouverture de la salle d’attente, au tirage et à chaque nouvelle offre.',
              'We will let you know when the waiting room opens, at the draw and for every new offer.',
            )}
          </AppText>
        </Card>
      ) : (
        <View style={styles.list}>
          {sorted.map((notification) => (
            <Card
              key={notification.id}
              tone={notification.read ? 'surface' : 'sunChip'}
              padding={16}
              radius={20}
            >
              <View
                style={styles.row}
                accessible
                accessibilityLabel={`${notification.read ? '' : t('Non lue. ', 'Unread. ')}${notification.title}. ${notification.body}`}
              >
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: notification.read ? colors.surfaceMuted : colors.sun },
                  ]}
                >
                  <Icon
                    name="bell"
                    size={19}
                    color={notification.read ? colors.ink : colors.onSun}
                  />
                  {!notification.read ? (
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: colors.coral, borderColor: colors.sunChip },
                      ]}
                    />
                  ) : null}
                </View>
                <View style={styles.text}>
                  <View style={styles.titleRow}>
                    <AppText
                      size={13}
                      weight={notification.read ? 'semibold' : 'bold'}
                      color={notification.read ? colors.ink : colors.onSun}
                      style={styles.flex}
                    >
                      {notification.title}
                    </AppText>
                    {!notification.read ? <Pill label={t('Nouveau', 'New')} tone="sun" /> : null}
                  </View>
                  <AppText
                    size={12}
                    color={notification.read ? colors.inkMuted : colors.onSunMuted}
                  >
                    {notification.body}
                  </AppText>
                  <AppText
                    size={10}
                    weight="medium"
                    color={notification.read ? colors.inkMuted : colors.onSunMuted}
                  >
                    {relativeTime(notification.createdAt, t)}
                  </AppText>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  text: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyBody: {
    marginTop: 6,
    marginBottom: 14,
  },
});

export default NotificationsScreen;
