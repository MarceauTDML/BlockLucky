import React from 'react';
import { Switch } from 'react-native';

import useAppTheme from '../../hooks/useAppTheme';
import ListRow, { ListRowProps } from '../ui/ListRow';

export interface SwitchRowProps extends Pick<
  ListRowProps,
  'title' | 'subtitle' | 'icon' | 'iconTone' | 'divider'
> {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export const SwitchRow: React.FC<SwitchRowProps> = ({
  value,
  onValueChange,
  disabled = false,
  ...row
}) => {
  const { colors } = useAppTheme();

  return (
    <ListRow
      {...row}
      right={
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          accessibilityLabel={row.title}
          accessibilityHint={row.subtitle}
          trackColor={{ false: colors.disabled, true: colors.sun }}
          thumbColor={colors.surface}
          ios_backgroundColor={colors.disabled}
        />
      }
    />
  );
};

export default SwitchRow;
