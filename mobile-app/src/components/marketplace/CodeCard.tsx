import * as Clipboard from 'expo-clipboard';
import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import useAppTheme from '../../hooks/useAppTheme';
import { ClaimedRewardCode } from '../../types/api.types';
import { formatDateShort } from '../../utils/date.util';
import AppText from '../ui/AppText';
import Card from '../ui/Card';
import Pill from '../ui/Pill';
import Icon from '../ui/icons/Icon';

export interface CodeCardProps {
  code: ClaimedRewardCode;
  tone: 'sun' | 'lavender' | 'peach';
}

export const CodeCard: React.FC<CodeCardProps> = ({ code, tone }) => {
  const { colors, t } = useAppTheme();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const partner =
    code.partner?.name || code.partnerName || t('Commerce d’EtherBay', 'EtherBay shop');
  const used = code.isUsed;
  const cardTone = used ? 'muted' : tone === 'sun' ? 'sunPale' : tone;
  const textColor = !used && tone === 'sun' ? colors.onSun : colors.ink;
  const mutedColor = !used && tone === 'sun' ? colors.onSunMuted : colors.inkMuted;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(code.uniqueCode);
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Card tone={cardTone}>
      <View style={styles.head}>
        <AppText variant="overline" color={mutedColor} style={styles.flex} numberOfLines={1}>
          {partner}
        </AppText>
        <Pill
          label={used ? t('Utilisé', 'Used') : t('Actif', 'Active')}
          tone={used ? 'surface' : 'mint'}
          dot={!used}
        />
      </View>
      <AppText size={16} weight="bold" color={textColor} style={styles.title}>
        {code.rewardTitle}
      </AppText>

      <View style={[styles.codeBox, { backgroundColor: colors.surface }]}>
        <AppText
          size={20}
          weight="bold"
          selectable
          style={[styles.flex, styles.code, used ? styles.strike : null]}
        >
          {code.uniqueCode}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            copied ? t('Code copié', 'Code copied') : t('Copier le code', 'Copy the code')
          }
          onPress={handleCopy}
          hitSlop={8}
          style={({ pressed }) => [
            styles.iconButton,
            { backgroundColor: colors.surfaceMuted, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Icon
            name={copied ? 'check' : 'copy'}
            size={18}
            color={copied ? colors.green : colors.ink}
          />
        </Pressable>
      </View>

      {showQr && code.qrCodeDataUrl ? (
        <View style={[styles.qrBox, { backgroundColor: colors.surface }]}>
          <Image
            source={{ uri: code.qrCodeDataUrl }}
            style={styles.qr}
            accessibilityLabel={t(
              `QR code du code ${code.uniqueCode}`,
              `QR code for ${code.uniqueCode}`,
            )}
          />
        </View>
      ) : null}

      <View style={styles.footer}>
        <AppText size={11} color={mutedColor}>
          {t(
            `Obtenu le ${formatDateShort(code.claimedAt)}`,
            `Claimed on ${formatDateShort(code.claimedAt)}`,
          )}
        </AppText>
        {code.qrCodeDataUrl && !used ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showQr }}
            onPress={() => setShowQr((value) => !value)}
            hitSlop={10}
            style={styles.qrToggle}
          >
            <AppText size={11} weight="bold" color={textColor}>
              {showQr
                ? t('Masquer le QR code', 'Hide QR code')
                : t('Afficher le QR code', 'Show QR code')}
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  flex: {
    flex: 1,
  },
  title: {
    marginTop: 8,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    marginTop: 14,
  },
  code: {
    letterSpacing: 1.5,
  },
  strike: {
    textDecorationLine: 'line-through',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrBox: {
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  qr: {
    width: 160,
    height: 160,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 10,
  },
  qrToggle: {
    minHeight: 32,
    justifyContent: 'center',
  },
});

export default CodeCard;
