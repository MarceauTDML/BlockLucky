import React from 'react';
import { StyleSheet, View } from 'react-native';

import AppText from './AppText';
import Icon from './icons/Icon';
import useAppTheme from '../../hooks/useAppTheme';

export const SecurityFooter: React.FC = () => {
  const { colors, t } = useAppTheme();

  return (
    <View style={styles.row}>
      <Icon name="shield" size={18} color={colors.green} />
      <AppText size={10} weight="medium" color={colors.green}>
        {t('Application sécurisée · Aucun argent réel', 'Secure app · No real money')}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
});

export default SecurityFooter;
