import React from 'react';
import { StyleSheet, View } from 'react-native';

import useAppTheme from '../../hooks/useAppTheme';
import AppText from '../ui/AppText';
import BrandLogo from '../ui/BrandLogo';

export interface AuthHeroProps {
  title: string;
  subtitle: string;
}

export const AuthHero: React.FC<AuthHeroProps> = ({ title, subtitle }) => {
  const { colors } = useAppTheme();

  return (
    <View style={styles.container}>
      <BrandLogo />
      <AppText size={29} weight="bold" accessibilityRole="header" style={styles.title}>
        {title}
      </AppText>
      <AppText size={13} color={colors.inkMuted}>
        {subtitle}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    paddingTop: 6,
    marginBottom: 32,
  },
  title: {
    marginTop: 18,
    marginBottom: 10,
  },
});

export default AuthHero;
