import React from 'react';
import { StyleSheet, View } from 'react-native';

import AppText from './AppText';
import useAppTheme from '../../hooks/useAppTheme';

export interface StepItem {
  title: string;
  description?: string;
}

export interface StepListProps {
  steps: StepItem[];
  variant?: 'badge' | 'numbered';
}

export const StepList: React.FC<StepListProps> = ({ steps, variant = 'numbered' }) => {
  const { colors } = useAppTheme();

  return (
    <View style={styles.list}>
      {steps.map((step, index) => (
        <View key={step.title} style={styles.row}>
          {variant === 'badge' ? (
            <View style={[styles.badge, { backgroundColor: colors.surface }]}>
              <AppText size={12} weight="bold" color={colors.violet}>
                {index + 1}
              </AppText>
            </View>
          ) : (
            <AppText size={12} weight="bold" color={colors.green} style={styles.number}>
              {String(index + 1).padStart(2, '0')}
            </AppText>
          )}
          <View style={styles.text}>
            <AppText
              size={variant === 'badge' ? 14 : 13}
              weight={variant === 'badge' ? 'bold' : 'regular'}
            >
              {step.title}
            </AppText>
            {step.description ? (
              <AppText size={11} color={colors.inkMuted}>
                {step.description}
              </AppText>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    width: 22,
    marginTop: 1,
  },
  text: {
    flex: 1,
    gap: 3,
  },
});

export default StepList;
