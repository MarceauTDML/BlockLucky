import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  GestureResponderEvent,
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';

import useAppTheme from '../../hooks/useAppTheme';
import AppText from '../ui/AppText';

const COLUMNS = 8;
const ROWS = 4;
const TOTAL = COLUMNS * ROWS;
const AUTO_REVEAL_RATIO = 0.6;
const BRUSH = 0.6;

export interface ScratchCanvasProps {
  secretCode: string;
  partnerName: string;
  rewardTitle: string;
  revealed: boolean;
  onReveal: () => void;
  coverColor: string;
  accentColor: string;
  symbol: string;
}

export const ScratchCanvas: React.FC<ScratchCanvasProps> = ({
  secretCode,
  partnerName,
  rewardTitle,
  revealed,
  onReveal,
  coverColor,
  accentColor,
  symbol,
}) => {
  const { colors, t } = useAppTheme();
  const [cleared, setCleared] = useState<boolean[]>(() => Array(TOTAL).fill(false));
  const clearedRef = useRef<boolean[]>(cleared);
  const size = useRef({ width: 0, height: 0 });
  const revealedRef = useRef(revealed);
  const onRevealRef = useRef(onReveal);
  const coverOpacity = useRef(new Animated.Value(revealed ? 0 : 1)).current;

  useEffect(() => {
    onRevealRef.current = onReveal;
  }, [onReveal]);

  useEffect(() => {
    revealedRef.current = revealed;
    if (revealed) {
      Animated.timing(coverOpacity, { toValue: 0, duration: 380, useNativeDriver: true }).start();
    }
  }, [revealed, coverOpacity]);

  const scratchAt = useCallback((event: GestureResponderEvent) => {
    if (revealedRef.current) return;
    const { width, height } = size.current;
    if (!width || !height) return;
    const { locationX, locationY } = event.nativeEvent;
    const cellWidth = width / COLUMNS;
    const cellHeight = height / ROWS;
    const column = locationX / cellWidth;
    const row = locationY / cellHeight;
    const next = [...clearedRef.current];
    let changed = false;
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLUMNS; c += 1) {
        const dx = c + 0.5 - column;
        const dy = r + 0.5 - row;
        const index = r * COLUMNS + c;
        if (!next[index] && dx * dx + dy * dy <= (BRUSH + 0.5) * (BRUSH + 0.5)) {
          next[index] = true;
          changed = true;
        }
      }
    }
    if (!changed) return;
    clearedRef.current = next;
    setCleared(next);
    const ratio = next.filter(Boolean).length / TOTAL;
    if (ratio >= AUTO_REVEAL_RATIO) {
      revealedRef.current = true;
      onRevealRef.current();
    }
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !revealedRef.current,
        onStartShouldSetPanResponderCapture: () => !revealedRef.current,
        onMoveShouldSetPanResponder: () => !revealedRef.current,
        onMoveShouldSetPanResponderCapture: () => !revealedRef.current,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: scratchAt,
        onPanResponderMove: scratchAt,
      }),
    [scratchAt],
  );

  const onLayout = (event: LayoutChangeEvent) => {
    size.current = {
      width: event.nativeEvent.layout.width,
      height: event.nativeEvent.layout.height,
    };
  };

  const progress = Math.round((cleared.filter(Boolean).length / TOTAL) * 100);

  return (
    <View
      onLayout={onLayout}
      style={[styles.zone, { backgroundColor: colors.surface }]}
      accessible
      accessibilityRole={revealed ? 'text' : 'adjustable'}
      accessibilityLabel={
        revealed
          ? t(
              `${rewardTitle} chez ${partnerName}. Votre code : ${secretCode}`,
              `${rewardTitle} at ${partnerName}. Your code: ${secretCode}`,
            )
          : t(`Zone à gratter, ${progress} % découvert`, `Scratch area, ${progress}% uncovered`)
      }
      accessibilityActions={
        revealed ? undefined : [{ name: 'activate', label: t('Tout révéler', 'Reveal all') }]
      }
      onAccessibilityAction={() => onReveal()}
      {...panResponder.panHandlers}
    >
      <View pointerEvents="none" style={styles.content}>
        <AppText size={11} weight="semibold" color={colors.inkMuted} align="center">
          {partnerName}
        </AppText>
        <AppText size={18} weight="bold" align="center">
          {rewardTitle}
        </AppText>
        <View style={[styles.codeBox, { borderColor: accentColor }]}>
          <AppText
            size={24}
            weight="bold"
            color={accentColor}
            align="center"
            selectable
            style={styles.code}
          >
            {secretCode}
          </AppText>
        </View>
      </View>

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.grid, { opacity: coverOpacity }]}
      >
        {cleared.map((isCleared, index) => (
          <View
            key={index}
            style={[styles.cell, { backgroundColor: isCleared ? 'transparent' : coverColor }]}
          >
            {isCleared || index % 3 !== 1 ? null : (
              <AppText size={14} weight="bold" color={accentColor} align="center">
                {symbol}
              </AppText>
            )}
          </View>
        ))}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  zone: {
    height: 176,
    borderRadius: 18,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 6,
  },
  codeBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginTop: 6,
  },
  code: {
    letterSpacing: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / COLUMNS}%`,
    height: `${100 / ROWS}%`,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ScratchCanvas;
