import React from 'react';
import { StyleSheet, View } from 'react-native';

import useAppTheme from '../../hooks/useAppTheme';
import AppText from '../ui/AppText';
import Card from '../ui/Card';
import Icon from '../ui/icons/Icon';

export interface AgeNoticeCardProps {
  message: string;
}

export const AgeNoticeCard: React.FC<AgeNoticeCardProps> = ({ message }) => {
  const { colors, t } = useAppTheme();

  return (
    <Card tone="lavender" radius={23} padding={18} style={styles.card}>
      <View style={styles.row}>
        <Icon name="idCard" size={29} color={colors.violet} />
        <View style={styles.text}>
          <AppText size={15} weight="bold">
            {t('18 ans ou plus pour jouer', '18 or older to play')}
          </AppText>
          <AppText size={11} color={colors.inkMuted}>
            {message}
          </AppText>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginTop: 30,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  text: {
    flex: 1,
    gap: 10,
  },
});

export default AgeNoticeCard;
