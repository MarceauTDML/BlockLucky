import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import useAppTheme from '../../hooks/useAppTheme';
import AppText from '../ui/AppText';
import Icon from '../ui/icons/Icon';

export interface CheckboxRowProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  errorText?: string;
}

export const CheckboxRow: React.FC<CheckboxRowProps> = ({
  checked,
  onChange,
  label,
  errorText,
}) => {
  const { colors } = useAppTheme();

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={label}
        onPress={() => onChange(!checked)}
        style={({ pressed }) => [styles.row, { opacity: pressed ? 0.8 : 1 }]}
      >
        <View
          style={[
            styles.box,
            {
              backgroundColor: checked ? colors.sun : colors.surface,
              borderColor: checked ? colors.sun : errorText ? colors.terracotta : colors.border,
            },
          ]}
        >
          {checked ? <Icon name="check" size={14} color={colors.onSun} /> : null}
        </View>
        <AppText size={12} weight="medium" style={styles.label}>
          {label}
        </AppText>
      </Pressable>
      {errorText ? (
        <AppText size={11} weight="medium" color={colors.terracotta} style={styles.error}>
          {errorText}
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    paddingHorizontal: 4,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
  },
  error: {
    marginLeft: 40,
  },
});

export default CheckboxRow;
