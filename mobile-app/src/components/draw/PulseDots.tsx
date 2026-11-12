import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

export interface PulseDotsProps {
  color: string;
  count?: number;
}

const LOW = 0.35;

export const PulseDots: React.FC<PulseDotsProps> = ({ color, count = 3 }) => {
  const values = useRef(Array.from({ length: count }, () => new Animated.Value(LOW))).current;

  useEffect(() => {
    const ease = Easing.inOut(Easing.ease);
    const loops = values.map((value, index) =>
      Animated.sequence([
        Animated.delay(index * 250),
        Animated.timing(value, { toValue: 1, duration: 600, easing: ease, useNativeDriver: true }),
        Animated.timing(value, {
          toValue: LOW,
          duration: 1400,
          easing: ease,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(value, {
              toValue: 1,
              duration: 2600,
              easing: ease,
              useNativeDriver: true,
            }),
            Animated.timing(value, {
              toValue: LOW,
              duration: 1400,
              easing: ease,
              useNativeDriver: true,
            }),
          ]),
        ),
      ]),
    );
    loops.forEach((animation) => animation.start());
    return () => loops.forEach((animation) => animation.stop());
  }, [values]);

  return (
    <View
      style={styles.row}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {values.map((value, index) => (
        <Animated.View
          key={index}
          style={[styles.dot, { backgroundColor: color, opacity: value }]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});

export default PulseDots;
