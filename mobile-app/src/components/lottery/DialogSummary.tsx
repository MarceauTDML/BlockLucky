import React from 'react';
import { StyleSheet, View } from 'react-native';

import useAppTheme from '../../hooks/useAppTheme';
import AppText from '../ui/AppText';

export interface DialogSummaryProps {
  title: string;
  detail?: string;
  tone?: 'sun' | 'muted';
}

export const DialogSummary: React.FC<DialogSummaryProps> = ({ title, detail, tone = 'sun' }) => {
  const { colors } = useAppTheme();
  const isSun = tone === 'sun';

  return (
    <View style={[styles.box, { backgroundColor: isSun ? colors.sunPale : colors.surfaceMuted }]}>
      <AppText size={13} weight="semibold" color={isSun ? colors.onSun : colors.ink}>
        {title}
      </AppText>
      {detail ? (
        <AppText size={12} weight="medium" color={isSun ? colors.onSunMuted : colors.inkMuted}>
          {detail}
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
});

export default DialogSummary;
