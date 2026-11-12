import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AgeVerificationState, getInitials } from './ageStatus';
import useAppTheme from '../../hooks/useAppTheme';
import AppText from '../ui/AppText';
import Card from '../ui/Card';
import Pill from '../ui/Pill';
import Icon from '../ui/icons/Icon';

export interface IdentityCardProps {
  email?: string | null;
  ageStatus: AgeVerificationState;
  rejectionNote?: string | null;
  onVerifyAge: () => void;
}

export const IdentityCard: React.FC<IdentityCardProps> = ({
  email,
  ageStatus,
  rejectionNote,
  onVerifyAge,
}) => {
  const { colors, t } = useAppTheme();

  return (
    <Card>
      <View style={styles.identity}>
        <View
          style={[styles.avatar, { backgroundColor: colors.sun }]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          <AppText size={20} weight="bold" color={colors.onSun}>
            {getInitials(email)}
          </AppText>
        </View>
        <View style={styles.identityText}>
          <AppText size={16} weight="bold" numberOfLines={1}>
            {email || t('Citoyen d’EtherBay', 'EtherBay citizen')}
          </AppText>
          <View style={styles.city}>
            <Icon name="location" size={15} color={colors.inkMuted} />
            <AppText size={12} color={colors.inkMuted}>
              {t('EtherBay · Loterie citoyenne gratuite', 'EtherBay · Free civic lottery')}
            </AppText>
          </View>
          {ageStatus === 'VERIFIED' ? (
            <Pill label={t('Âge vérifié', 'Age verified')} tone="mint" dot style={styles.pill} />
          ) : null}
        </View>
      </View>

      {ageStatus === 'PENDING' ? (
        <View style={[styles.statusBox, { backgroundColor: colors.lavenderSoft }]}>
          <Icon name="clock" size={22} color={colors.violet} />
          <View style={styles.statusText}>
            <AppText size={13} weight="semibold">
              {t('Vérification de l’âge en cours', 'Age verification in progress')}
            </AppText>
            <AppText size={11} color={colors.inkMuted}>
              {t(
                'La Mairie examine votre pièce d’identité. Vous serez prévenu par e-mail.',
                'The city hall is reviewing your ID. You will be notified by e-mail.',
              )}
            </AppText>
          </View>
        </View>
      ) : null}

      {ageStatus === 'NONE' || ageStatus === 'REJECTED' ? (
        <Card
          tone="sun"
          radius={18}
          padding={14}
          onPress={onVerifyAge}
          accessibilityLabel={t('Vérifier mon âge', 'Verify my age')}
          style={styles.action}
        >
          <View style={styles.actionRow}>
            <Icon name="idCard" size={24} color={colors.onSun} />
            <View style={styles.statusText}>
              <AppText size={13} weight="bold" color={colors.onSun}>
                {ageStatus === 'REJECTED'
                  ? t('Vérification refusée : réessayez', 'Verification refused: try again')
                  : t('Vérifiez votre âge pour jouer', 'Verify your age to play')}
              </AppText>
              <AppText size={11} color={colors.onSunMuted}>
                {ageStatus === 'REJECTED' && rejectionNote
                  ? rejectionNote
                  : t(
                      'Recto et verso de votre pièce d’identité, examinés par la Mairie.',
                      'Front and back of your ID, reviewed by the city hall.',
                    )}
              </AppText>
            </View>
            <Icon name="arrowRight" size={20} color={colors.onSun} />
          </View>
        </Card>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityText: {
    flex: 1,
    gap: 4,
  },
  city: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pill: {
    marginTop: 4,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    padding: 14,
    marginTop: 16,
  },
  statusText: {
    flex: 1,
    gap: 3,
  },
  action: {
    marginTop: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});

export default IdentityCard;
