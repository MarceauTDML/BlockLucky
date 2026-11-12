import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { getApiErrorMessage } from '../../components/marketplace/apiErrors';
import ListGroup from '../../components/profile/ListGroup';
import SwitchRow from '../../components/profile/SwitchRow';
import AppText from '../../components/ui/AppText';
import Card from '../../components/ui/Card';
import FilterChips from '../../components/ui/FilterChips';
import ListRow from '../../components/ui/ListRow';
import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import SectionHeader from '../../components/ui/SectionHeader';
import Icon from '../../components/ui/icons/Icon';
import useAppTheme from '../../hooks/useAppTheme';
import { useRootNavigation } from '../../navigation/hooks';
import { useGetProfileQuery, useUpdatePreferencesMutation } from '../../store/api/authApi';
import { LanguageCode } from '../../types/user.types';

const SettingsScreen: React.FC = () => {
  const { colors, mode, language, setThemeMode, setLanguage, t } = useAppTheme();
  const navigation = useRootNavigation();
  const { data: profileRes } = useGetProfileQuery();
  const [updatePreferences] = useUpdatePreferencesMutation();
  const serverPush = profileRes?.data?.profile?.preferences?.pushNotificationsEnabled;
  const [pushEnabled, setPushEnabled] = useState(serverPush ?? true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (typeof serverPush === 'boolean') setPushEnabled(serverPush);
  }, [serverPush]);

  const save = async (prefs: Parameters<typeof updatePreferences>[0], rollback: () => void) => {
    setErrorMessage('');
    try {
      await updatePreferences(prefs).unwrap();
    } catch (error) {
      rollback();
      setErrorMessage(
        getApiErrorMessage(
          error,
          t(
            'Impossible d’enregistrer ce réglage pour le moment.',
            'Unable to save this setting right now.',
          ),
        ),
      );
    }
  };

  const handleDarkMode = (enabled: boolean) => {
    const previous = mode;
    const next = enabled ? 'DARK' : 'LIGHT';
    setThemeMode(next);
    save({ theme: next }, () => setThemeMode(previous));
  };

  const handleLanguage = (next: LanguageCode) => {
    if (next === language) return;
    const previous = language;
    setLanguage(next);
    save({ language: next }, () => setLanguage(previous));
  };

  const handlePush = (enabled: boolean) => {
    setPushEnabled(enabled);
    save({ pushNotificationsEnabled: enabled }, () => setPushEnabled(!enabled));
  };

  return (
    <Screen showSecurityFooter>
      <ScreenHeader
        title={t('Paramètres', 'Settings')}
        subtitle={t('Affichage, langue et notifications', 'Display, language and notifications')}
        onBack={() => navigation.goBack()}
      />

      <SectionHeader title={t('Affichage', 'Display')} style={styles.firstSection} />
      <ListGroup>
        <SwitchRow
          title={t('Mode sombre', 'Dark mode')}
          subtitle={mode === 'DARK' ? t('Activé', 'On') : t('Désactivé', 'Off')}
          icon="moon"
          iconTone="lavender"
          value={mode === 'DARK'}
          onValueChange={handleDarkMode}
        />
      </ListGroup>

      <SectionHeader title={t('Langue', 'Language')} />
      <Card>
        <View style={styles.languageHead}>
          <View style={[styles.iconBox, { backgroundColor: colors.mint }]}>
            <Icon name="globe" size={20} color={colors.green} />
          </View>
          <View style={styles.flex}>
            <AppText size={14} weight="semibold">
              {t('Langue de l’application', 'App language')}
            </AppText>
            <AppText size={11} color={colors.inkMuted}>
              {t('Textes, e-mails et notifications', 'Texts, e-mails and notifications')}
            </AppText>
          </View>
        </View>
        <View style={[styles.chips, { backgroundColor: colors.surfaceMuted }]}>
          <FilterChips<LanguageCode>
            options={[
              { value: 'FR', label: 'Français' },
              { value: 'EN', label: 'English' },
            ]}
            value={language}
            onChange={handleLanguage}
          />
        </View>
      </Card>

      <SectionHeader title={t('Notifications', 'Notifications')} />
      <ListGroup>
        <SwitchRow
          title={t('Notifications push', 'Push notifications')}
          subtitle={t('Ouverture de la salle, résultats, offres', 'Room opening, results, offers')}
          icon="bell"
          iconTone="sun"
          value={pushEnabled}
          onValueChange={handlePush}
          divider
        />
        <ListRow
          title={t('Voir mes notifications', 'See my notifications')}
          icon="envelope"
          onPress={() => navigation.navigate('Notifications')}
        />
      </ListGroup>

      {errorMessage ? (
        <AppText size={12} color={colors.terracotta} style={styles.error} accessibilityRole="alert">
          {errorMessage}
        </AppText>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  firstSection: {
    marginTop: 6,
  },
  languageHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
    gap: 2,
  },
  chips: {
    borderRadius: 16,
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 2,
  },
  error: {
    marginTop: 16,
  },
});

export default SettingsScreen;
