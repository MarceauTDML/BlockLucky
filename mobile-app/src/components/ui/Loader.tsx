import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import useAppTheme from '../../hooks/useAppTheme';
import AppText from './AppText';

export interface LoaderProps {
  message?: string;
  skeletonRows?: number;
}

export const Loader: React.FC<LoaderProps> = ({
  message,
  skeletonRows = 2,
}) => {
  const { colors, borderRadius, t } = useAppTheme();
  const displayMessage = message || t('Chargement...', 'Loading...');

  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color={colors.primary} />
      <AppText
        variant="caption"
        color={colors.textSecondary}
        align="center"
        style={styles.text}
      >
        {displayMessage}
      </AppText>
      <View style={styles.skeletonList}>
        {Array.from({ length: skeletonRows }).map((_, idx) => (
          <View
            key={`skeleton-${idx}`}
            style={[
              styles.skeletonItem,
              {
                backgroundColor: colors.surfaceElevated,
                borderRadius: borderRadius.md,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    marginTop: 8,
    marginBottom: 14,
  },
  skeletonList: {
    width: '100%',
    gap: 8,
  },
  skeletonItem: {
    height: 52,
    width: '100%',
  },
});

export default Loader;
