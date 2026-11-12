import React from 'react';
import { StyleSheet, View } from 'react-native';

import useAppTheme from '../../hooks/useAppTheme';
import AppButton from '../ui/AppButton';
import AppText from '../ui/AppText';
import Card from '../ui/Card';

export interface PointsBalanceCardProps {
  pointsBalance: number;
  ledgerIntegrityValid?: boolean;
  onPressMyCodes?: () => void;
}

export const PointsBalanceCard: React.FC<PointsBalanceCardProps> = ({
  pointsBalance,
  ledgerIntegrityValid = true,
  onPressMyCodes,
}) => {
  const { colors, t } = useAppTheme();
  const balance = Number(pointsBalance || 0);

  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.text}>
          <AppText size={16} weight="bold" accessibilityRole="header">
            {t(`${balance} EtherPoints disponibles`, `${balance} EtherPoints available`)}
          </AppText>
          <AppText size={11} color={colors.inkMuted}>
            {t(
              'À échanger contre des réductions à EtherBay.',
              'To exchange for discounts in EtherBay.',
            )}
          </AppText>
          {!ledgerIntegrityValid ? (
            <AppText size={11} color={colors.terracotta}>
              {t('Solde en cours de vérification.', 'Balance being verified.')}
            </AppText>
          ) : null}
        </View>
        {onPressMyCodes ? (
          <AppButton
            title={t('Mes codes', 'My codes')}
            variant="soft"
            size="sm"
            fullWidth={false}
            onPress={onPressMyCodes}
            style={styles.button}
          />
        ) : null}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  text: {
    flex: 1,
    gap: 4,
  },
  button: {
    minHeight: 44,
  },
});

export default PointsBalanceCard;
