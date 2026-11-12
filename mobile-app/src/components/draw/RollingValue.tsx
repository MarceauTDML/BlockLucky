import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import AppText from '../ui/AppText';

export interface RollingValueProps {
  value: string;
  height: number;
  width: number;
  fontSize: number;
  color: string;
  backgroundColor: string;
  radius?: number;
}

export const RollingValue: React.FC<RollingValueProps> = ({
  value,
  height,
  width,
  fontSize,
  color,
  backgroundColor,
  radius = 18,
}) => {
  const progress = useRef(new Animated.Value(1)).current;
  const lastValue = useRef(value);
  const [previous, setPrevious] = useState(value);

  useEffect(() => {
    if (lastValue.current === value) return;
    setPrevious(lastValue.current);
    lastValue.current = value;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [value, progress]);

  const outgoing = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -height] });
  const incoming = progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });

  return (
    <View style={[styles.slot, { height, width, borderRadius: radius, backgroundColor }]}>
      {previous !== value ? (
        <Animated.View style={[styles.layer, { height, transform: [{ translateY: outgoing }] }]}>
          <AppText size={fontSize} weight="bold" color={color} align="center" lineHeight={height}>
            {previous}
          </AppText>
        </Animated.View>
      ) : null}
      <Animated.View style={[styles.layer, { height, transform: [{ translateY: incoming }] }]}>
        <AppText size={fontSize} weight="bold" color={color} align="center" lineHeight={height}>
          {value}
        </AppText>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  slot: {
    overflow: 'hidden',
  },
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    justifyContent: 'center',
  },
});

export default RollingValue;
