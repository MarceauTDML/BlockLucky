import React from 'react';
import { TouchableOpacity, Linking, StyleSheet, ViewStyle } from 'react-native';
import useAppTheme from '../../hooks/useAppTheme';
import AppText from '../ui/AppText';

export interface ExplorerLinkProps {
  url?: string | null;
  label?: string;
  style?: ViewStyle;
}

export const ExplorerLink: React.FC<ExplorerLinkProps> = ({ url, label, style }) => {
  const { colors, borderRadius, t } = useAppTheme();

  if (!url) return null;

  return (
    <TouchableOpacity
      onPress={() => {
        Linking.openURL(url).catch(() => {});
      }}
      style={[
        styles.button,
        {
          backgroundColor: colors.surfaceElevated,
          borderRadius: borderRadius.sm,
        },
        style,
      ]}
    >
      <AppText variant="caption" weight="medium" color={colors.primary} align="center">
        {label || t('Consulter sur l explorateur blockchain', 'View on blockchain explorer')}
      </AppText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
});

export default ExplorerLink;
