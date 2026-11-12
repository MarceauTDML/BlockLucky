import React, { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import useAppTheme from '../../hooks/useAppTheme';
import AppText from '../ui/AppText';
import Card from '../ui/Card';

export interface HighlightCardProps {
  badge: ReactNode;
  title: string;
  message: string;
}

export const HighlightCard: React.FC<HighlightCardProps> = ({ badge, title, message }) => {
  const { colors } = useAppTheme();

  return (
    <Card tone="sun" radius={25} padding={16} style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.badge, { backgroundColor: colors.sunSoft }]}>{badge}</View>
        <View style={styles.text}>
          <AppText size={19} weight="bold" color={colors.onSun}>
            {title}
          </AppText>
          <AppText size={11} weight="medium" color={colors.onSun}>
            {message}
          </AppText>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 30,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 8,
  },
});

export default HighlightCard;
