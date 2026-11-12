import React, { ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

export interface CrossFadeItem {
  key: string;
  content: ReactNode;
}

export interface CrossFadeProps {
  items: CrossFadeItem[];
  activeKey: string;
  height: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

export const CrossFade: React.FC<CrossFadeProps> = ({
  items,
  activeKey,
  height,
  duration = 300,
  style,
}) => {
  const opacities = useRef(new Map<string, Animated.Value>()).current;

  items.forEach((item) => {
    if (!opacities.has(item.key))
      opacities.set(item.key, new Animated.Value(item.key === activeKey ? 1 : 0));
  });

  useEffect(() => {
    const animations = Array.from(opacities.entries()).map(([key, value]) =>
      Animated.timing(value, {
        toValue: key === activeKey ? 1 : 0,
        duration,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    const group = Animated.parallel(animations);
    group.start();
    return () => group.stop();
  }, [activeKey, duration, opacities]);

  return (
    <View style={[{ height }, style]}>
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <Animated.View
            key={item.key}
            pointerEvents={active ? 'auto' : 'none'}
            accessibilityElementsHidden={!active}
            importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
            style={[styles.layer, { opacity: opacities.get(item.key) }]}
          >
            {item.content}
          </Animated.View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
  },
});

export default CrossFade;
