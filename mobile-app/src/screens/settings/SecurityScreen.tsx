import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAppTheme from '../../hooks/useAppTheme';
import useAuth from '../../hooks/useAuth';
import { useSetResponsibleLimitMutation } from '../../store/api/authApi';
import AppText from '../../components/ui/AppText';
import AppButton from '../../components/ui/AppButton';
import BackButton from '../../components/ui/BackButton';

const LIMIT_PRESETS = [5, 10, 25, 50, 100];

export const SecurityScreen: React.FC<{ navigation: any }> = ({
  navigation,
}) => {
  const { colors, borderRadius, spacing, t } = useAppTheme();
  const { user, disable2FA, isDisabling2FA } = useAuth();
  const [setResponsibleLimit, { isLoading: isSavingLimit }] =
    useSetResponsibleLimitMutation();

  const [selectedLimit, setSelectedLimit] = useState(
    user?.responsibleGaming?.maxTicketsPerRound ?? 25
  );
  const [feedback, setFeedback] = useState('');
  const [rbacDeniedModal, setRbacDeniedModal] = useState(false);

  const handleSaveLimit = async () => {
    setFeedback('');
    try {
      await setResponsibleLimit({ maxTicketsPerRound: selectedLimit }).unwrap();
      setFeedback(
        t(
          `Limite enregistrée : maximum ${selectedLimit} tickets par tirage.`,
          `Limit saved: maximum ${selectedLimit} tickets per draw.`
        )
      );
    } catch {
      setFeedback(
        t(
          'Impossible de mettre à jour votre limite pour le moment.',
          'Unable to update your limit at the moment.'
        )
      );
    }
  };

  const handleDisable2FA = async () => {
    setFeedback('');
    try {
      await disable2FA({}).unwrap();
      setFeedback(
        t(
          'La double authentification 2FA a été désactivée.',
          'Two-factor authentication has been disabled.'
        )
      );
    } catch {}
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { padding: spacing.lg, paddingBottom: spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <BackButton onPress={() => navigation.goBack()} />

        <AppText variant="title" weight="bold" style={styles.title}>
          {t('Sécurité & Jeu responsable', 'Security & Responsible Play')}
        </AppText>

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
          <AppText variant="subtitle" weight="semibold">
            {t('Plafond de participation', 'Participation Cap')}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {t(
              'Définissez votre limite personnelle de tickets par tirage.',
              'Set your personal maximum number of tickets per draw.'
            )}
          </AppText>

          <View style={styles.presetsRow}>
            {LIMIT_PRESETS.map((val) => {
              const selected = selectedLimit === val;
              return (
                <TouchableOpacity
                  key={val}
                  onPress={() => setSelectedLimit(val)}
                  style={[
                    styles.presetBtn,
                    {
                      backgroundColor: selected
                        ? colors.primary
                        : colors.surfaceElevated,
                      borderRadius: borderRadius.md,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <AppText
                    weight="semibold"
                    color={selected ? '#FFFFFF' : colors.text}
                  >
                    {val}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          <AppButton
            title={t(
              `Enregistrer (${selectedLimit} tickets max)`,
              `Save Limit (${selectedLimit} tickets max)`
            )}
            onPress={handleSaveLimit}
            loading={isSavingLimit}
          />
        </View>

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
          <AppText variant="subtitle" weight="semibold">
            {t('Double authentification (2FA)', 'Two-Factor Authentication (2FA)')}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {t('Statut : ', 'Status: ')}
            {user?.isTwoFactorEnabled
              ? t(
                  `Activée (${user.twoFactorMethod || 'APP'})`,
                  `Enabled (${user.twoFactorMethod || 'APP'})`
                )
              : t('Désactivée', 'Disabled')}
          </AppText>

          <AppButton
            title={t('Configurer la 2FA', 'Configure 2FA')}
            variant="secondary"
            onPress={() => navigation.navigate('Setup2FA')}
          />

          {user?.isTwoFactorEnabled ? (
            <AppButton
              title={t('Désactiver la 2FA', 'Disable 2FA')}
              variant="danger"
              onPress={handleDisable2FA}
              loading={isDisabling2FA}
            />
          ) : null}
        </View>

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
          <AppText variant="subtitle" weight="semibold">
            {t('Droits d administration (RBAC)', 'Admin Permissions (RBAC)')}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {t(
              `Rôle actuel : ${user?.role || 'USER'}. L administration du Smart Contract est réservée aux services municipaux d EtherBay.`,
              `Current role: ${user?.role || 'USER'}. Smart Contract administration is restricted to EtherBay municipal staff.`
            )}
          </AppText>
          <AppButton
            title={t(
              'Vérifier les permissions d administration',
              'Verify Admin Permissions'
            )}
            variant="outline"
            onPress={() => setRbacDeniedModal(true)}
          />
          {rbacDeniedModal && user?.role !== 'ADMIN' ? (
            <View
              style={[
                styles.rbacBox,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.error,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <AppText variant="caption" weight="semibold" color={colors.error}>
                {t('Accès restreint (403)', 'Restricted Access (403)')}
              </AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                {t(
                  `Votre compte (${user?.role || 'USER'}) ne dispose pas des droits d administration.`,
                  `Your account (${user?.role || 'USER'}) does not have administrator privileges.`
                )}
              </AppText>
            </View>
          ) : null}
        </View>

        {feedback ? (
          <AppText variant="caption" weight="medium" color={colors.primary}>
            {feedback}
          </AppText>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    gap: 14,
  },
  title: {
    marginBottom: 4,
  },
  card: {
    padding: 18,
    borderWidth: 1,
    gap: 12,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  rbacBox: {
    padding: 12,
    borderWidth: 1,
    gap: 4,
  },
});

export default SecurityScreen;
