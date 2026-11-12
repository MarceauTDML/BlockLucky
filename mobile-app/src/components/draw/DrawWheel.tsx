import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import useAppTheme from '../../hooks/useAppTheme';
import useSound, { SOUNDS } from '../../hooks/useSound';
import AppText from '../ui/AppText';
import Icon from '../ui/icons/Icon';

export const WHEEL_SECTORS = 10;
const SECTOR_ANGLE = 360 / WHEEL_SECTORS;
const SETTLE_DURATION = 5450;
const SETTLE_DELAY = 350;
const MIN_TURNS = 5;
const LOOP_DURATION = 1800;

export interface DrawWheelProps {
  size: number;
  labels: string[];
  centerLabel: string;
  spinning: boolean;
  targetIndex: number | null;
  highlightIndex?: number | null;
  onSettled?: () => void;
  accessibilityLabel?: string;
}

export const DrawWheel: React.FC<DrawWheelProps> = ({
  size,
  labels,
  centerLabel,
  spinning,
  targetIndex,
  highlightIndex = null,
  onSettled,
  accessibilityLabel,
}) => {
  const { colors } = useAppTheme();
  const rotation = useRef(new Animated.Value(0)).current;
  const mode = useRef<'idle' | 'looping' | 'settling' | 'settled'>('idle');
  const pending = useRef<{ target: number | null; spinning: boolean }>({
    target: targetIndex,
    spinning,
  });
  const settledFor = useRef<number | null>(null);
  const mounted = useRef(true);
  const onSettledRef = useRef(onSettled);
  const { play: playSpin, stop: stopSpin } = useSound(SOUNDS.wheel);

  useEffect(() => {
    onSettledRef.current = onSettled;
  }, [onSettled]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      rotation.stopAnimation();
      stopSpin();
    };
  }, [rotation, stopSpin]);

  const settle = useCallback(
    (target: number, delay: number) => {
      mode.current = 'settling';
      playSpin();
      rotation.setValue(0);
      const sectorAngle = SECTOR_ANGLE * target;
      const final = -sectorAngle - 360 * MIN_TURNS;
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(rotation, {
          toValue: final,
          duration: SETTLE_DURATION,
          easing: Easing.bezier(0.12, 0.7, 0.2, 1),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (!finished || !mounted.current) return;
        stopSpin();
        mode.current = 'settled';
        settledFor.current = target;
        onSettledRef.current?.();
      });
    },
    [rotation, playSpin, stopSpin],
  );

  const spinOnce = useCallback(() => {
    rotation.setValue(0);
    Animated.timing(rotation, {
      toValue: -360,
      duration: LOOP_DURATION,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished || !mounted.current) return;
      const next = pending.current;
      if (next.target !== null) {
        settle(next.target, 0);
      } else if (next.spinning) {
        spinOnce();
      } else {
        mode.current = 'idle';
        stopSpin();
        rotation.setValue(0);
      }
    });
  }, [rotation, settle, stopSpin]);

  useEffect(() => {
    pending.current = { target: targetIndex, spinning };
    if (targetIndex !== null) {
      if (
        settledFor.current === targetIndex ||
        mode.current === 'looping' ||
        mode.current === 'settling'
      )
        return;
      settle(targetIndex, SETTLE_DELAY);
      return;
    }
    if (spinning && (mode.current === 'idle' || mode.current === 'settled')) {
      mode.current = 'looping';
      settledFor.current = null;
      playSpin({ loop: true });
      spinOnce();
    }
  }, [spinning, targetIndex, settle, spinOnce, playSpin]);

  const rotate = rotation.interpolate({ inputRange: [-360, 0], outputRange: ['-360deg', '0deg'] });
  const scale = size / 300;
  const labelRadius = 105 * scale;
  const labelWidth = 64 * scale;
  const center = size / 2;
  const hub = Math.round(48 * scale);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={{ width: size, height: size + 14 }}
    >
      <Animated.View
        style={[styles.wheel, { width: size, height: size, top: 14, transform: [{ rotate }] }]}
      >
        <Icon name="wheel" size={size} />
        {labels.slice(0, WHEEL_SECTORS).map((label, index) => {
          const angle = ((-90 + SECTOR_ANGLE * index) * Math.PI) / 180;
          const x = center + labelRadius * Math.cos(angle);
          const y = center + labelRadius * Math.sin(angle);
          const highlighted = highlightIndex === index;
          return (
            <View
              key={`${index}-${label}`}
              style={[
                styles.label,
                { width: labelWidth, left: x - labelWidth / 2, top: y - 9 * scale },
              ]}
            >
              <AppText
                size={highlighted ? 13 : 12}
                weight="bold"
                color={colors.onSun}
                align="center"
                numberOfLines={1}
              >
                {label}
              </AppText>
            </View>
          );
        })}
      </Animated.View>
      <View
        style={[
          styles.hub,
          {
            width: hub,
            height: hub,
            borderRadius: hub / 2,
            left: center - hub / 2,
            top: 14 + center - hub / 2,
            backgroundColor: colors.onSun,
          },
        ]}
      >
        <AppText size={13} weight="bold" color={colors.sunPale} align="center">
          {centerLabel}
        </AppText>
      </View>
      <View style={[styles.pointer, { left: center - 12, borderTopColor: colors.onSun }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  wheel: {
    position: 'absolute',
    left: 0,
  },
  label: {
    position: 'absolute',
  },
  hub: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointer: {
    position: 'absolute',
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: 22,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});

export default DrawWheel;
