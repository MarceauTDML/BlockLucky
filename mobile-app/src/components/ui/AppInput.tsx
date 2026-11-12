import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, TextInputProps, View } from 'react-native';

import AppText from './AppText';
import Icon, { IconName } from './icons/Icon';
import useAppTheme from '../../hooks/useAppTheme';
import { rf } from '../../theme/typography';

export interface AppInputProps extends TextInputProps {
  label?: string;
  errorText?: string;
  helperText?: string;
  icon?: IconName;
  tone?: 'surface' | 'muted';
  secureToggle?: boolean;
}

export const AppInput: React.FC<AppInputProps> = ({
  label,
  errorText,
  helperText,
  icon,
  tone = 'surface',
  secureToggle = false,
  secureTextEntry,
  style,
  ...props
}) => {
  const { colors, typography, t } = useAppTheme();
  const [hidden, setHidden] = useState(Boolean(secureTextEntry || secureToggle));
  const isMuted = tone === 'muted';

  return (
    <View style={styles.container}>
      {label ? (
        <AppText size={12} weight="semibold" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <View
        style={[
          styles.field,
          {
            backgroundColor: isMuted ? colors.surfaceMuted : colors.surface,
            borderRadius: isMuted ? 11 : 14,
            minHeight: isMuted ? 43 : 48,
            borderColor: errorText ? colors.terracotta : 'transparent',
          },
        ]}
      >
        {icon ? <Icon name={icon} color={colors.ink} size={isMuted ? 19 : 21} /> : null}
        <TextInput
          placeholderTextColor={colors.inkMuted}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          style={[
            styles.input,
            {
              color: colors.ink,
              fontFamily: typography.fontFamily.regular,
              fontSize: rf(isMuted ? 12 : 13),
            },
            style,
          ]}
          {...props}
        />
        {secureToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              hidden
                ? t('Afficher le mot de passe', 'Show password')
                : t('Masquer le mot de passe', 'Hide password')
            }
            hitSlop={10}
            onPress={() => setHidden((value) => !value)}
          >
            <Icon name="eye" color={hidden ? colors.ink : colors.inkMuted} size={21} />
          </Pressable>
        ) : null}
      </View>
      {errorText ? (
        <AppText size={11} weight="medium" color={colors.terracotta} style={styles.helper}>
          {errorText}
        </AppText>
      ) : helperText ? (
        <AppText size={11} weight="semibold" color={colors.inkMuted} style={styles.helper}>
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  label: {
    marginBottom: 8,
    marginLeft: 4,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
  },
  helper: {
    marginTop: 8,
    marginLeft: 4,
  },
});

export default AppInput;
