import React from 'react';
import { StyleSheet, View } from 'react-native';

import useAppTheme from '../../hooks/useAppTheme';
import AppButton from '../ui/AppButton';
import AppText from '../ui/AppText';

export interface DevOtpHintProps {
  code?: string;
  onUse: (code: string) => void;
}

export const DevOtpHint: React.FC<DevOtpHintProps> = ({ code, onUse }) => {
  const { colors, t } = useAppTheme();
  if (!__DEV__ || !code) return null;

  return (
    <View style={[styles.box, { backgroundColor: colors.lavender }]}>
      <View style={styles.text}>
        <AppText size={10} weight="bold" color={colors.violet} style={styles.overline}>
          {t('Mode développement', 'Development mode')}
        </AppText>
        <AppText size={18} weight="bold" color={colors.ink} style={styles.code}>
          {code}
        </AppText>
      </View>
      <AppButton
        title={t('Utiliser', 'Use')}
        variant="soft"
        size="sm"
        fullWidth={false}
        onPress={() => onUse(code)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  overline: {
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  code: {
    letterSpacing: 4,
  },
});

export default DevOtpHint;
