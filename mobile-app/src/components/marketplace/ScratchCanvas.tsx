import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  PanResponder,
  StyleSheet,
} from 'react-native';
import useAppTheme from '../../hooks/useAppTheme';
import AppText from '../ui/AppText';

export interface ScratchCanvasProps {
  secretCode: string;
  partnerName: string;
  rewardTitle: string;
  onRevealed?: () => void;
}

export const ScratchCanvas: React.FC<ScratchCanvasProps> = ({
  secretCode,
  partnerName,
  rewardTitle,
  onRevealed,
}) => {
  const { colors, borderRadius, t } = useAppTheme();
  const [scratchProgress, setScratchProgress] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const handleScratchStep = () => {
    setScratchProgress((prev) => {
      const next = Math.min(100, prev + 25);
      if (next >= 100 && !revealed) {
        setRevealed(true);
        if (onRevealed) onRevealed();
      }
      return next;
    });
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: () => {
      handleScratchStep();
    },
    onPanResponderRelease: () => {
      handleScratchStep();
    },
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
      <AppText variant="caption" color={colors.textMuted} align="center">
        {partnerName}
      </AppText>
      <AppText variant="subtitle" weight="bold" align="center" style={styles.title}>
        {rewardTitle}
      </AppText>

      <View
        {...panResponder.panHandlers}
        style={[
          styles.scratchArea,
          {
            backgroundColor: revealed ? colors.surfaceElevated : colors.primary,
            borderRadius: borderRadius.md,
          },
        ]}
      >
        {revealed ? (
          <View style={styles.revealedContent}>
            <AppText variant="caption" color={colors.textSecondary}>
              {t('Code promotionnel débloqué', 'Promo Code Unlocked')}
            </AppText>
            <AppText
              variant="title"
              weight="bold"
              color={colors.secondary}
              style={styles.codeText}
            >
              {secretCode}
            </AppText>
            <AppText variant="caption" color={colors.textMuted} align="center">
              {t(
                `Présentez ce code en caisse chez ${partnerName}`,
                `Present this code in store at ${partnerName}`
              )}
            </AppText>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleScratchStep}
            style={styles.foilOverlay}
          >
            <AppText variant="body" weight="medium" color="#F7F6F2" align="center">
              {t(
                `Grattez ou touchez pour révéler (${scratchProgress}%)`,
                `Scratch or tap to reveal (${scratchProgress}%)`
              )}
            </AppText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 18,
    borderWidth: 1,
    marginVertical: 12,
  },
  title: {
    marginVertical: 6,
  },
  scratchArea: {
    minHeight: 136,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 8,
  },
  foilOverlay: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealedContent: {
    alignItems: 'center',
    gap: 4,
  },
  codeText: {
    letterSpacing: 1.5,
  },
});

export default ScratchCanvas;
