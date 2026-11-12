import React from 'react';
import { StyleSheet, View } from 'react-native';

import ListGroup from '../../components/profile/ListGroup';
import SwitchRow from '../../components/profile/SwitchRow';
import usePreferenceSaver from '../../components/settings/usePreferenceSaver';
import AppText from '../../components/ui/AppText';
import Card from '../../components/ui/Card';
import FilterChips from '../../components/ui/FilterChips';
import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import Icon, { IconName } from '../../components/ui/icons/Icon';
import useAppTheme from '../../hooks/useAppTheme';
import { useSoundPreference } from '../../hooks/useSound';
import { useRootNavigation } from '../../navigation/hooks';
import { LanguageCode, ThemeMode } from '../../types/user.types';

const ChoiceCard: React.FC<{
  icon: IconName;
  tone: 'lavender' | 'mint';
  title: string;
  subtitle: string;
  children: React.ReactNode;
}> = ({ icon, tone, title, subtitle, children }) => {
  const { colors } = useAppTheme();
  const palette =
    tone === 'lavender'
      ? { background: colors.lavender, color: colors.violet }
      : { background: colors.mint, color: colors.green };

  return (
    <Card radius={24}>
      <View style={styles.head}>
        <View style={[styles.iconBox, { backgroundColor: palette.background }]}>
          <Icon name={icon} size={20} color={palette.color} />
        </View>
        <View style={styles.flex}>
          <AppText size={15} weight="bold">
            {title}
          </AppText>
          <AppText size={11} color={colors.inkMuted}>
            {subtitle}
          </AppText>
        </View>
      </View>
      <View style={[styles.chips, { backgroundColor: colors.surfaceMuted }]}>{children}</View>
    </Card>
  );
};

const DisplaySettingsScreen: React.FC = () => {
  const { colors, mode, language, setThemeMode, setLanguage, t } = useAppTheme();
  const navigation = useRootNavigation();
  const { save, errorMessage } = usePreferenceSaver();
  const { soundEnabled, setSoundEnabled } = useSoundPreference();

  const handleTheme = (next: ThemeMode) => {
    if (next === mode) return;
    const previous = mode;
    setThemeMode(next);
    save({ theme: next }, () => setThemeMode(previous));
  };

  const handleLanguage = (next: LanguageCode) => {
    if (next === language) return;
    const previous = language;
    setLanguage(next);
    save({ language: next }, () => setLanguage(previous));
  };

  return (
    <Screen showSecurityFooter>
      <ScreenHeader
        title={t('Affichage', 'Display')}
        subtitle={t(
          'Apparence, langue et sons de l’application',
          'App appearance, language and sounds',
        )}
        onBack={() => navigation.goBack()}
      />

      <View style={styles.list}>
        <ChoiceCard
          icon="moon"
          tone="lavender"
          title={t('Mode d’affichage', 'Display mode')}
          subtitle={t('Clair ou sombre, sur cet appareil', 'Light or dark, on this device')}
        >
          <FilterChips<ThemeMode>
            options={[
              { value: 'LIGHT', label: t('Clair', 'Light') },
              { value: 'DARK', label: t('Sombre', 'Dark') },
            ]}
            value={mode}
            onChange={handleTheme}
          />
        </ChoiceCard>

        <ChoiceCard
          icon="globe"
          tone="mint"
          title={t('Langue', 'Language')}
          subtitle={t('Textes de l’application', 'App texts')}
        >
          <FilterChips<LanguageCode>
            options={[
              { value: 'FR', label: 'Français' },
              { value: 'EN', label: 'English' },
            ]}
            value={language}
            onChange={handleLanguage}
          />
        </ChoiceCard>

        <ListGroup>
          <SwitchRow
            icon={soundEnabled ? 'volume' : 'volumeOff'}
            iconTone="sun"
            title={t('Sons', 'Sounds')}
            subtitle={t(
              'Roue et compte à rebours du grand tirage, sur cet appareil',
              'Draw wheel and countdown, on this device',
            )}
            value={soundEnabled}
            onValueChange={setSoundEnabled}
          />
        </ListGroup>
      </View>

      {errorMessage ? (
        <AppText size={12} color={colors.terracotta} style={styles.error} accessibilityRole="alert">
          {errorMessage}
        </AppText>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: 14,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
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

export default DisplaySettingsScreen;
