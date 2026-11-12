import React from 'react';
import { StyleSheet, View } from 'react-native';

import { PASSWORD_MIN_LENGTH, passwordChecks } from './authErrors';
import useAppTheme from '../../hooks/useAppTheme';
import AppText from '../ui/AppText';
import Icon from '../ui/icons/Icon';

export interface PasswordRulesProps {
  password: string;
}

export const PasswordRules: React.FC<PasswordRulesProps> = ({ password }) => {
  const { colors, t } = useAppTheme();
  const checks = passwordChecks(password);
  const rules = [
    {
      key: 'length',
      ok: checks.length,
      label: t(
        `${PASSWORD_MIN_LENGTH} caractères minimum`,
        `At least ${PASSWORD_MIN_LENGTH} characters`,
      ),
    },
    { key: 'letter', ok: checks.letter, label: t('Au moins une lettre', 'At least one letter') },
    { key: 'digit', ok: checks.digit, label: t('Au moins un chiffre', 'At least one digit') },
  ];

  return (
    <View style={styles.list}>
      {rules.map((rule) => (
        <View
          key={rule.key}
          style={styles.row}
          accessible
          accessibilityLabel={`${rule.label}, ${rule.ok ? t('respecté', 'met') : t('non respecté', 'not met')}`}
        >
          <View
            style={[styles.dot, { backgroundColor: rule.ok ? colors.mint : colors.surfaceMuted }]}
          >
            {rule.ok ? <Icon name="check" size={12} color={colors.green} /> : null}
          </View>
          <AppText size={11} weight="medium" color={rule.ok ? colors.green : colors.inkMuted}>
            {rule.label}
          </AppText>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: 6,
    marginTop: -4,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default PasswordRules;
