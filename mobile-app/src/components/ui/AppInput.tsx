import React from 'react';
import { View, TextInput, TextInputProps, StyleSheet } from 'react-native';
import useAppTheme from '../../hooks/useAppTheme';
import AppText from './AppText';

export interface AppInputProps extends TextInputProps {
  label?: string;
  errorText?: string;
}

export const AppInput: React.FC<AppInputProps> = ({
  label,
  errorText,
  style,
  ...rest
}) => {
  const { colors, borderRadius, typography, isCompactScreen } = useAppTheme();

  return (
    <View style={styles.container}>
      {label ? (
        <AppText
          variant="caption"
          weight="medium"
          color={colors.textSecondary}
          style={styles.label}
        >
          {label}
        </AppText>
      ) : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            color: colors.textPrimary,
            borderColor: errorText ? colors.error : colors.border,
            borderRadius: borderRadius.md,
            fontSize: typography.fontSize.md,
            paddingVertical: isCompactScreen ? 9 : 11,
          },
          style,
        ]}
        {...rest}
      />
      {errorText ? (
        <AppText variant="caption" color={colors.error} style={styles.error}>
          {errorText}
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  error: {
    marginTop: 4,
  },
});

export default AppInput;
