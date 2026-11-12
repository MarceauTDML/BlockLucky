import * as Clipboard from 'expo-clipboard';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import useAppTheme from '../../hooks/useAppTheme';
import AppText from '../ui/AppText';
import Card from '../ui/Card';
import Pill from '../ui/Pill';
import Icon from '../ui/icons/Icon';

export interface ReferralCodeCardProps {
  code: string;
  link?: string;
}

export const ReferralCodeCard: React.FC<ReferralCodeCardProps> = ({ code, link }) => {
  const { colors, mode, t } = useAppTheme();
  const onDark = mode === 'DARK' ? colors.ink : colors.inkInverse;
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const handleCopy = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = () => {
    const message = t(
      `Rejoins-moi sur BlockLucky, la loterie citoyenne gratuite d’EtherBay. Mon code de parrainage : ${code}${link ? ` ${link}` : ''}`,
      `Join me on BlockLucky, EtherBay's free civic lottery. My referral code: ${code}${link ? ` ${link}` : ''}`,
    );
    Share.share({ message }).catch(() => {});
  };

  return (
    <Card>
      <Pill label={t('Fidélité', 'Loyalty')} tone="lavender" style={styles.pill} />
      <AppText size={19} weight="bold">
        {t(
          'Un voisin vous rejoint ?\nVous gagnez des EtherPoints.',
          'A neighbour joins?\nYou earn EtherPoints.',
        )}
      </AppText>
      <AppText size={12} color={colors.inkMuted} style={styles.description}>
        {t(
          'Chaque ami invité vous rapporte des points, des offres en ville et une place au classement.',
          'Each friend you invite earns you points, local offers and a spot on the leaderboard.',
        )}
      </AppText>

      <View style={[styles.codeBox, { backgroundColor: colors.surfaceMuted }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            copied
              ? t('Code copié', 'Code copied')
              : t(`Copier le code ${code}`, `Copy code ${code}`)
          }
          onPress={handleCopy}
          style={({ pressed }) => [styles.copy, { opacity: pressed ? 0.7 : 1 }]}
        >
          <AppText size={16} weight="bold" numberOfLines={1} style={styles.code}>
            {code}
          </AppText>
          <Icon
            name={copied ? 'check' : 'copy'}
            size={18}
            color={copied ? colors.green : colors.inkMuted}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Partager mon code de parrainage', 'Share my referral code')}
          onPress={handleShare}
          style={({ pressed }) => [
            styles.share,
            { backgroundColor: colors.onSun, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <AppText size={12} weight="semibold" color={onDark}>
            {t('Partager', 'Share')}
          </AppText>
          <Icon name="share" size={18} color={onDark} />
        </Pressable>
      </View>
      {copied ? (
        <AppText
          size={11}
          color={colors.green}
          style={styles.feedback}
          accessibilityLiveRegion="polite"
        >
          {t('Code copié dans le presse-papiers.', 'Code copied to the clipboard.')}
        </AppText>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  pill: {
    marginBottom: 14,
    borderRadius: 10,
  },
  description: {
    marginTop: 8,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 6,
    paddingLeft: 13,
    marginTop: 18,
    gap: 10,
  },
  copy: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  code: {
    flexShrink: 1,
    letterSpacing: 0.5,
  },
  share: {
    minHeight: 44,
    minWidth: 136,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  feedback: {
    marginTop: 8,
  },
});

export default ReferralCodeCard;
