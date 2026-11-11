import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SvgUri } from 'react-native-svg';
import useAppTheme from '../../hooks/useAppTheme';
import AppText from '../ui/AppText';
import ExplorerLink from '../web3/ExplorerLink';
import { PoapBadge } from '../../types/api.types';
import { formatDateShort } from '../../utils/date.util';
import { shortenWallet } from '../../utils/formatters.util';

export interface POAPBadgeProps {
  badge: PoapBadge;
}

export const POAPBadge: React.FC<POAPBadgeProps> = ({ badge }) => {
  const { colors, borderRadius, t } = useAppTheme();
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(badge.imageUrl) && !imageFailed;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.lg,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.row}>
        <View
          style={[
            styles.emblemBox,
            {
              backgroundColor: colors.surfaceElevated,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          {showImage && badge.imageUrl ? (
            <SvgUri
              uri={badge.imageUrl}
              width={48}
              height={48}
              onError={() => setImageFailed(true)}
            />
          ) : (
            <AppText variant="caption" weight="bold" color={colors.secondary}>
              POAP
            </AppText>
          )}
        </View>

        <View style={styles.infoCol}>
          <AppText variant="body" weight="bold">
            {badge.title}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {badge.edition} • Token #{badge.tokenId}
          </AppText>
          {badge.contractAddress ? (
            <AppText variant="caption" color={colors.textSecondary}>
              {t(
                `Contrat : ${shortenWallet(badge.contractAddress, 6)}`,
                `Contract: ${shortenWallet(badge.contractAddress, 6)}`
              )}
            </AppText>
          ) : null}
          <AppText variant="caption" color={colors.textMuted}>
            {badge.mintedAt
              ? formatDateShort(badge.mintedAt)
              : t('Émission en cours', 'Minting in progress')}
          </AppText>
        </View>
      </View>

      <ExplorerLink
        url={badge.explorerUrl}
        label={t('Voir le contrat POAP sur l explorateur', 'View the POAP contract on the explorer')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emblemBox: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  infoCol: {
    flex: 1,
    gap: 2,
  },
});

export default POAPBadge;
