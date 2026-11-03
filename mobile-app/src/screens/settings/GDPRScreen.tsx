import React, { useState } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAppTheme from '../../hooks/useAppTheme';
import useAuth from '../../hooks/useAuth';
import {
  useExportGdprDataMutation,
  useRequestGdprDeletionMutation,
  useConfirmGdprDeletionMutation,
} from '../../store/api/authApi';
import AppText from '../../components/ui/AppText';
import AppInput from '../../components/ui/AppInput';
import AppButton from '../../components/ui/AppButton';
import BackButton from '../../components/ui/BackButton';

export const GDPRScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors, borderRadius, spacing, t } = useAppTheme();
  const { signOut } = useAuth();

  const [exportGdpr, { isLoading: isExporting }] = useExportGdprDataMutation();
  const [requestDeletion, { isLoading: isRequestingDelete }] =
    useRequestGdprDeletionMutation();
  const [confirmDeletion, { isLoading: isConfirmingDelete }] =
    useConfirmGdprDeletionMutation();

  const [exportedJsonPreview, setExportedJsonPreview] = useState('');
  const [deletionToken, setDeletionToken] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const handleExport = async () => {
    try {
      const res = await exportGdpr().unwrap();
      setExportedJsonPreview(JSON.stringify(res.data, null, 2));
      setStatusMessage(
        t(
          'Vos données personnelles ont été exportées au format JSON.',
          'Your personal data has been exported in JSON format.'
        )
      );
    } catch {
      setStatusMessage(
        t(
          'Erreur lors de la génération de l export RGPD.',
          'Error generating GDPR data export.'
        )
      );
    }
  };

  const handleRequestDeletion = async () => {
    try {
      const res = await requestDeletion().unwrap();
      if (res.data.confirmationToken) {
        setDeletionToken(res.data.confirmationToken);
      }
      setStatusMessage(res.data.message);
    } catch {
      setStatusMessage(
        t(
          'Erreur lors de la demande de suppression.',
          'Error requesting account deletion.'
        )
      );
    }
  };

  const handleConfirmDeletion = async () => {
    if (!deletionToken.trim()) return;
    try {
      await confirmDeletion({ token: deletionToken.trim() }).unwrap();
      await signOut();
    } catch {
      setStatusMessage(
        t(
          'Jeton de confirmation invalide ou expiré.',
          'Invalid or expired confirmation token.'
        )
      );
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 24}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.content,
            { padding: spacing.lg, paddingBottom: spacing.xxl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <BackButton onPress={() => navigation.goBack()} />

          <AppText variant="title" weight="bold" style={styles.title}>
            {t('Données personnelles (RGPD)', 'Personal Data (GDPR)')}
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.subtitle}>
            {t(
              'Vous disposez d un droit d accès, de portabilité et d anonymisation complète de vos informations.',
              'You have the right to access, export, and permanently anonymize your personal data.'
            )}
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
              {t('1. Export de vos données (JSON)', '1. Data Portability (JSON Export)')}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {t(
                'Récupérez l intégralité des données associées à votre compte (profil, tickets, points et codes).',
                'Download all data associated with your account (profile, tickets, points, and codes).'
              )}
            </AppText>
            <AppButton
              title={t('Exporter mes données', 'Export My Data')}
              onPress={handleExport}
              loading={isExporting}
            />

            {exportedJsonPreview ? (
              <View
                style={[
                  styles.jsonBox,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderRadius: borderRadius.md,
                  },
                ]}
              >
                <AppText variant="caption" color={colors.textSecondary}>
                  {exportedJsonPreview.slice(0, 700)}...
                </AppText>
              </View>
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
            <AppText variant="subtitle" weight="semibold" color={colors.error}>
              {t('2. Suppression et anonymisation', '2. Account Deletion & Anonymization')}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {t(
                'La suppression anonymise définitivement votre adresse de portefeuille et votre email en base de données.',
                'Deletion permanently anonymizes your wallet address and email in our database.'
              )}
            </AppText>

            <AppButton
              title={t('Demander la suppression du compte', 'Request Account Deletion')}
              variant="danger"
              onPress={handleRequestDeletion}
              loading={isRequestingDelete}
            />

            <AppInput
              label={t('Jeton de confirmation', 'Confirmation Token')}
              value={deletionToken}
              onChangeText={setDeletionToken}
              placeholder={t('Collez le jeton reçu', 'Paste the confirmation token')}
            />

            {deletionToken ? (
              <AppButton
                title={t(
                  'Confirmer l anonymisation définitive',
                  'Confirm Permanent Anonymization'
                )}
                variant="outline"
                onPress={handleConfirmDeletion}
                loading={isConfirmingDelete}
              />
            ) : null}
          </View>

          {statusMessage ? (
            <AppText variant="caption" weight="medium" color={colors.primary}>
              {statusMessage}
            </AppText>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    gap: 14,
  },
  title: {
    marginBottom: 2,
  },
  subtitle: {
    lineHeight: 22,
  },
  card: {
    padding: 18,
    borderWidth: 1,
    gap: 12,
  },
  jsonBox: {
    padding: 12,
    maxHeight: 200,
  },
});

export default GDPRScreen;
