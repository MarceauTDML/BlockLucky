import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import ListGroup from '../../components/profile/ListGroup';
import SwitchRow from '../../components/profile/SwitchRow';
import usePreferenceSaver from '../../components/settings/usePreferenceSaver';
import AppText from '../../components/ui/AppText';
import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import SectionHeader from '../../components/ui/SectionHeader';
import { IconName } from '../../components/ui/icons/Icon';
import useAppTheme from '../../hooks/useAppTheme';
import { useRootNavigation } from '../../navigation/hooks';
import { useGetProfileQuery } from '../../store/api/authApi';
import { NotificationCategory, NotificationPreferences } from '../../types/user.types';

const DEFAULT_CATEGORIES: NotificationPreferences = {
  drawReminders: true,
  results: true,
  rewards: true,
  referrals: true,
};

const NotificationSettingsScreen: React.FC = () => {
  const { colors, t } = useAppTheme();
  const navigation = useRootNavigation();
  const { data: profileRes } = useGetProfileQuery();
  const { save, errorMessage } = usePreferenceSaver();
  const serverPrefs = profileRes?.data?.profile?.preferences;

  const [pushEnabled, setPushEnabled] = useState(serverPrefs?.pushNotificationsEnabled ?? true);
  const [categories, setCategories] = useState<NotificationPreferences>({
    ...DEFAULT_CATEGORIES,
    ...(serverPrefs?.notifications ?? {}),
  });

  const serverPush = serverPrefs?.pushNotificationsEnabled;
  const serverCategories = serverPrefs?.notifications;
  useEffect(() => {
    if (typeof serverPush === 'boolean') setPushEnabled(serverPush);
  }, [serverPush]);
  useEffect(() => {
    if (serverCategories) setCategories({ ...DEFAULT_CATEGORIES, ...serverCategories });
  }, [serverCategories]);

  const handlePush = (enabled: boolean) => {
    setPushEnabled(enabled);
    save({ pushNotificationsEnabled: enabled }, () => setPushEnabled(!enabled));
  };

  const handleCategory = (key: NotificationCategory, enabled: boolean) => {
    setCategories((current) => ({ ...current, [key]: enabled }));
    save({ notifications: { [key]: enabled } }, () =>
      setCategories((current) => ({ ...current, [key]: !enabled })),
    );
  };

  const rows: {
    key: NotificationCategory;
    title: string;
    subtitle: string;
    icon: IconName;
    tone: 'sun' | 'lavender' | 'mint' | 'peach';
  }[] = [
    {
      key: 'drawReminders',
      title: t('Rappels du tirage', 'Draw reminders'),
      subtitle: t(
        'Ouverture de la salle d’attente, fin des achats',
        'Waiting room opening, end of sales',
      ),
      icon: 'clock',
      tone: 'sun',
    },
    {
      key: 'results',
      title: t('Résultats', 'Results'),
      subtitle: t(
        'Annonce du gagnant et gains à réclamer',
        'Winner announcement and prizes to claim',
      ),
      icon: 'trophy',
      tone: 'lavender',
    },
    {
      key: 'rewards',
      title: t('Offres et récompenses', 'Offers and rewards'),
      subtitle: t('Nouvelles offres des commerçants, EtherPoints', 'New shop offers, EtherPoints'),
      icon: 'gift',
      tone: 'peach',
    },
    {
      key: 'referrals',
      title: t('Parrainage', 'Referrals'),
      subtitle: t(
        'Inscription de vos filleuls, tickets offerts',
        'Referral sign-ups, gifted tickets',
      ),
      icon: 'users',
      tone: 'mint',
    },
  ];

  return (
    <Screen showSecurityFooter>
      <ScreenHeader
        title={t('Notifications', 'Notifications')}
        subtitle={t('Choisissez les alertes que vous recevez', 'Choose the alerts you receive')}
        onBack={() => navigation.goBack()}
      />

      <ListGroup>
        <SwitchRow
          title={t('Autoriser les notifications', 'Allow notifications')}
          subtitle={pushEnabled ? t('Activées', 'On') : t('Toutes coupées', 'All off')}
          icon="bell"
          iconTone="sun"
          value={pushEnabled}
          onValueChange={handlePush}
        />
      </ListGroup>

      <SectionHeader title={t('Par catégorie', 'By category')} />
      <ListGroup>
        {rows.map((row, index) => (
          <SwitchRow
            key={row.key}
            title={row.title}
            subtitle={row.subtitle}
            icon={row.icon}
            iconTone={row.tone}
            value={pushEnabled && categories[row.key]}
            disabled={!pushEnabled}
            onValueChange={(enabled) => handleCategory(row.key, enabled)}
            divider={index < rows.length - 1}
          />
        ))}
      </ListGroup>

      {!pushEnabled ? (
        <AppText size={11} color={colors.inkMuted} style={styles.note}>
          {t(
            'Réactivez les notifications pour choisir les catégories.',
            'Turn notifications back on to choose categories.',
          )}
        </AppText>
      ) : null}

      {errorMessage ? (
        <AppText size={12} color={colors.terracotta} style={styles.note} accessibilityRole="alert">
          {errorMessage}
        </AppText>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  note: {
    marginTop: 12,
  },
});

export default NotificationSettingsScreen;
