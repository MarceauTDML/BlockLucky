import React from 'react';
import { StyleSheet, View } from 'react-native';

import useAppTheme from '../../hooks/useAppTheme';
import AppText from '../ui/AppText';
import Card, { CardTone } from '../ui/Card';

export interface SummaryTile {
  key: string;
  value: string;
  label: string;
  tone: CardTone;
  onPress?: () => void;
}

export interface SummaryTilesProps {
  title: string;
  tiles: SummaryTile[];
  note?: string;
}

export const SummaryTiles: React.FC<SummaryTilesProps> = ({ title, tiles, note }) => {
  const { colors } = useAppTheme();

  return (
    <Card>
      <AppText variant="overline" color={colors.ink} style={styles.title}>
        {title}
      </AppText>
      <View style={styles.row}>
        {tiles.map((tile) => {
          const textColor = tile.tone.startsWith('sun') ? colors.onSun : colors.ink;
          return (
            <Card
              key={tile.key}
              tone={tile.tone}
              radius={16}
              padding={12}
              onPress={tile.onPress}
              accessibilityLabel={`${tile.value} ${tile.label}`}
              style={styles.tile}
            >
              <AppText
                size={20}
                weight="bold"
                color={textColor}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {tile.value}
              </AppText>
              <AppText size={10} color={textColor} numberOfLines={2}>
                {tile.label}
              </AppText>
            </Card>
          );
        })}
      </View>
      {note ? (
        <AppText size={11} color={colors.inkMuted} style={styles.note}>
          {note}
        </AppText>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  title: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  tile: {
    flex: 1,
    minHeight: 76,
    gap: 6,
  },
  note: {
    marginTop: 12,
  },
});

export default SummaryTiles;
