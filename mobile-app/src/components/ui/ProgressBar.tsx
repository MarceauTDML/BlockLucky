import React from 'react';
import { StyleSheet, View } from 'react-native';

import useAppTheme from '../../hooks/useAppTheme';

export interface ProgressBarProps {
  percentage: number;
  markers?: { at: number; reached: boolean }[];
  tone?: 'sun' | 'surface';
  height?: number;
  accessibilityLabel?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  markers = [],
  tone = 'sun',
  height = 8,
  accessibilityLabel,
}) => {
  const { colors } = useAppTheme();
  const clamped = Math.max(0, Math.min(100, percentage));
  const track = tone === 'sun' ? colors.sunTrack : colors.surfaceMuted;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
      style={[styles.wrapper, { height: Math.max(height, markers.length ? 14 : height) }]}
    >
      <View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: track }]}>
        <View
          style={[
            styles.fill,
            { width: `${clamped}%`, borderRadius: height / 2, backgroundColor: colors.onSun },
          ]}
        />
      </View>
      {markers.map((marker) => (
        <View
          key={marker.at}
          style={[
            styles.marker,
            {
              left: `${Math.min(100, Math.max(0, marker.at))}%`,
              backgroundColor: marker.reached ? colors.onSun : colors.surface,
              borderColor: colors.onSun,
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    justifyContent: 'center',
  },
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  marker: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    marginLeft: -6,
  },
});

export default ProgressBar;
