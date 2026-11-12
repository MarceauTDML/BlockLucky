import React from 'react';
import { StyleSheet, View } from 'react-native';

import useAppTheme from '../../hooks/useAppTheme';
import AppText from '../ui/AppText';
import Card from '../ui/Card';
import Icon, { IconName } from '../ui/icons/Icon';

export interface SettingsLinkCardProps {
  title: string;
  subtitle?: string;
  icon: IconName;
  onPress: () => void;
}

export const SettingsLinkCard: React.FC<SettingsLinkCardProps> = ({
  title,
  subtitle,
  icon,
  onPress,
}) => {
  const { colors } = useAppTheme();

  return (
    <Card radius={20} padding={18} onPress={onPress} accessibilityLabel={title}>
      <View style={styles.row}>
        <Icon name={icon} size={26} color={colors.ink} />
        <View style={styles.texts}>
          <AppText size={17} weight="bold">
            {title}
          </AppText>
          {subtitle ? (
            <AppText size={11} color={colors.inkMuted} numberOfLines={1}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
        <Icon name="arrowRight" size={22} color={colors.ink} />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
});

export default SettingsLinkCard;
