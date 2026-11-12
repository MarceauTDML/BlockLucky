import React from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import AppText from './AppText';
import useAppTheme from '../../hooks/useAppTheme';

export interface FilterOption<T extends string> {
  value: T;
  label: string;
}

export interface FilterChipsProps<T extends string> {
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function FilterChips<T extends string>({ options, value, onChange }: FilterChipsProps<T>) {
  const { colors } = useAppTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[styles.chip, { backgroundColor: active ? colors.onSun : colors.surface }]}
          >
            <AppText
              size={12}
              weight={active ? 'bold' : 'medium'}
              color={active ? colors.onInk : colors.ink}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingBottom: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
});

export default FilterChips;
