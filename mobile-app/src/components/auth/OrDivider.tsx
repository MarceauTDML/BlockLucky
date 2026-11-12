import React from 'react';
import { StyleSheet, View } from 'react-native';

import useAppTheme from '../../hooks/useAppTheme';
import AppText from '../ui/AppText';

export const OrDivider: React.FC = () => {
  const { colors, t } = useAppTheme();

  return (
    <View style={styles.row} accessible={false}>
      <View style={[styles.line, { backgroundColor: colors.separator }]} />
      <AppText size={12} color={colors.inkMuted} style={styles.label}>
        {t('ou', 'or')}
      </AppText>
      <View style={[styles.line, { backgroundColor: colors.separator }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
  },
  label: {
    width: 64,
    textAlign: 'center',
  },
});

export default OrDivider;
