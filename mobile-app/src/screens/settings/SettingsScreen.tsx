import React from 'react';
import { StyleSheet, View } from 'react-native';

import SettingsLinkCard from '../../components/settings/SettingsLinkCard';
import { fullName, nameInitials } from '../../components/settings/displayName';
import AppText from '../../components/ui/AppText';
import Card from '../../components/ui/Card';
import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import { IconName } from '../../components/ui/icons/Icon';
import useAppTheme from '../../hooks/useAppTheme';
import useAuth from '../../hooks/useAuth';
import { useRootNavigation } from '../../navigation/hooks';
import { useGetProfileQuery } from '../../store/api/authApi';
import { RootStackParamList } from '../../types/navigation.types';

type SettingsRoute = keyof Pick<
  RootStackParamList,
  'DisplaySettings' | 'NotificationSettings' | 'PersonalData' | 'Security' | 'HelpSupport'
>;

const SettingsScreen: React.FC = () => {
  const { colors, t } = useAppTheme();
  const navigation = useRootNavigation();
  const { user } = useAuth();
  const { data: profileRes } = useGetProfileQuery();
  const profile = profileRes?.data?.profile ?? user;
  const name = fullName(profile);

  const sections: { route: SettingsRoute; title: string; subtitle: string; icon: IconName }[] = [
    {
      route: 'DisplaySettings',
      title: t('Affichage', 'Display'),
      subtitle: t('Mode clair ou sombre, langue', 'Light or dark mode, language'),
      icon: 'moon',
    },
    {
      route: 'NotificationSettings',
      title: t('Notifications', 'Notifications'),
      subtitle: t('Choisir les alertes reçues', 'Choose which alerts you get'),
      icon: 'bell',
    },
    {
      route: 'PersonalData',
      title: t('Données personnelles', 'Personal data'),
      subtitle: t('Nom, prénom, export de vos données', 'Name, export of your data'),
      icon: 'idCard',
    },
    {
      route: 'Security',
      title: t('Sécurité', 'Security'),
      subtitle: t('E-mail, mot de passe, double authentification', 'E-mail, password, two-factor'),
      icon: 'lock',
    },
    {
      route: 'HelpSupport',
      title: t('Aide & Support', 'Help & Support'),
      subtitle: t('Écrire à la Mairie, centre d’aide', 'Write to the city hall, help center'),
      icon: 'chat',
    },
  ];

  return (
    <Screen showSecurityFooter>
      <ScreenHeader title={t('Paramètres', 'Settings')} onBack={() => navigation.goBack()} />

      <Card tone="sunSoft" radius={24} padding={18}>
        <View style={styles.identity}>
          <View
            style={[styles.avatar, { backgroundColor: colors.sun }]}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            <AppText size={20} weight="bold" color={colors.onSun}>
              {nameInitials(profile)}
            </AppText>
          </View>
          <View style={styles.identityText}>
            <AppText size={22} weight="bold" color={colors.onSun} numberOfLines={1}>
              {name || t('Citoyen d’EtherBay', 'EtherBay citizen')}
            </AppText>
            {profile?.email ? (
              <AppText size={12} color={colors.onSunMuted} numberOfLines={1}>
                {profile.email}
              </AppText>
            ) : null}
          </View>
        </View>
      </Card>

      <View style={styles.list}>
        {sections.map((section) => (
          <SettingsLinkCard
            key={section.route}
            title={section.title}
            subtitle={section.subtitle}
            icon={section.icon}
            onPress={() => navigation.navigate(section.route)}
          />
        ))}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 64,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityText: {
    flex: 1,
    gap: 2,
  },
  list: {
    marginTop: 14,
    gap: 12,
  },
});

export default SettingsScreen;
