import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import useAppTheme from '../../hooks/useAppTheme';
import AppText from '../ui/AppText';
import Icon from '../ui/icons/Icon';

export interface IdentitySideCardProps {
  title: string;
  description: string;
  previewUri?: string;
  disabled?: boolean;
  onPress: () => void;
}

export const IdentitySideCard: React.FC<IdentitySideCardProps> = ({
  title,
  description,
  previewUri,
  disabled = false,
  onPress,
}) => {
  const { colors, t } = useAppTheme();
  const added = Boolean(previewUri);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${added ? t('photo ajoutée, appuyez pour la remplacer', 'photo added, tap to replace') : t('ajouter une photo', 'add a photo')}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <View style={[styles.thumb, { backgroundColor: colors.lavender }]}>
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={styles.preview} />
        ) : (
          <Icon name="camera" size={24} color={colors.violet} />
        )}
      </View>
      <View style={styles.text}>
        <AppText size={15} weight="bold">
          {title}
        </AppText>
        <AppText size={10} color={colors.inkMuted}>
          {description}
        </AppText>
        <AppText
          size={10}
          weight={added ? 'semibold' : 'regular'}
          color={added ? colors.green : colors.inkMuted}
        >
          {added ? t('Photo ajoutée', 'Photo added') : t('Photo ou fichier', 'Photo or file')}
        </AppText>
      </View>
      <View style={[styles.action, { backgroundColor: added ? colors.mint : colors.lavenderSoft }]}>
        {added ? <Icon name="check" size={14} color={colors.green} /> : null}
        <AppText size={11} weight="semibold" color={added ? colors.green : colors.violet}>
          {added ? t('Modifier', 'Change') : t('Ajouter +', 'Add +')}
        </AppText>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 82,
    marginBottom: 12,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  preview: {
    width: 44,
    height: 44,
  },
  text: {
    flex: 1,
    gap: 4,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 80,
    height: 32,
    borderRadius: 10,
    paddingHorizontal: 10,
  },
});

export default IdentitySideCard;
