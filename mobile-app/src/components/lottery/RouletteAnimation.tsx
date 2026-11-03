import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import useAppTheme from '../../hooks/useAppTheme';
import AppText from '../ui/AppText';
import { shortenWallet } from '../../utils/formatters.util';

export interface RouletteAnimationProps {
  spinning: boolean;
  winnerWallet?: string | null;
  vrfRequestId?: string | null;
}

export const RouletteAnimation: React.FC<RouletteAnimationProps> = ({
  spinning,
  winnerWallet,
  vrfRequestId,
}) => {
  const { colors, borderRadius, t } = useAppTheme();
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (spinning) {
      rotateAnim.setValue(0);
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotateAnim.stopAnimation();
    }
  }, [spinning, rotateAnim]);

  const spinInterpolation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.lg,
          borderColor: colors.border,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.wheelOuter,
          {
            borderColor: spinning ? colors.secondary : colors.primary,
            backgroundColor: colors.surfaceElevated,
            transform: [{ rotate: spinInterpolation }],
          },
        ]}
      >
        <View
          style={[
            styles.wheelInner,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <AppText variant="caption" weight="bold" color={colors.textPrimary} align="center">
            {spinning ? t('Tirage...', 'Drawing...') : 'VRF'}
          </AppText>
        </View>
      </Animated.View>

      <View style={styles.resultBox}>
        <AppText variant="body" weight="bold" align="center">
          {winnerWallet
            ? t(
                `Gagnant : ${shortenWallet(winnerWallet, 6)}`,
                `Winner: ${shortenWallet(winnerWallet, 6)}`
              )
            : spinning
            ? t('Sélection aléatoire en cours...', 'Random selection in progress...')
            : t('Tirage certifié en attente', 'Certified draw pending')}
        </AppText>
        <AppText
          variant="caption"
          color={colors.textSecondary}
          align="center"
          style={styles.vrfBadge}
        >
          {t('Preuve Chainlink : ', 'Chainlink Proof: ')}
          {vrfRequestId
            ? shortenWallet(vrfRequestId, 6)
            : t('Vérifiable sur contrat', 'Verifiable on-chain')}
        </AppText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 14,
  },
  wheelOuter: {
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  wheelInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  resultBox: {
    alignItems: 'center',
  },
  vrfBadge: {
    marginTop: 4,
  },
});

export default RouletteAnimation;
