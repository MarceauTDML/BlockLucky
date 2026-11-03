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
import AppText from '../../components/ui/AppText';
import AppInput from '../../components/ui/AppInput';
import AppButton from '../../components/ui/AppButton';
import BackButton from '../../components/ui/BackButton';
import { Setup2FAResponse } from '../../types/api.types';

export const Setup2FAScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { colors, borderRadius, spacing, t } = useAppTheme();
  const { user, setup2FA, verifyOtpCode, isSettingUp2FA, isVerifying2FA } = useAuth();

  const [setupData, setSetupData] = useState<Setup2FAResponse | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleInitSetup = async (method: 'APP' | 'EMAIL') => {
    setErrorMessage('');
    setStatusMessage('');
    try {
      const res = await setup2FA({ method }).unwrap();
      setSetupData(res.data);
      if (res.data.devOtpPreview) {
        setOtpCode(res.data.devOtpPreview);
      }
      setStatusMessage(
        method === 'APP'
          ? t(
              'Clé générée. Ajoutez-la dans votre application puis validez.',
              'Secret key generated. Add it to your authenticator app and confirm.'
            )
          : res.data.message || t('Code envoyé par email.', 'Code sent via email.')
      );
    } catch (err: any) {
      setErrorMessage(
        err?.data?.message ||
          t('Erreur lors de l initialisation 2FA.', 'Error initializing 2FA.')
      );
    }
  };

  const handleConfirm2FA = async () => {
    if (!user?.id || otpCode.trim().length !== 6) {
      setErrorMessage(
        t('Veuillez saisir un code à 6 chiffres.', 'Please enter a 6-digit code.')
      );
      return;
    }
    setErrorMessage('');
    try {
      await verifyOtpCode(user.id, otpCode.trim());
      setStatusMessage(
        t('Double authentification activée.', 'Two-factor authentication enabled.')
      );
    } catch (err: any) {
      setErrorMessage(err?.data?.message || t('Code invalide.', 'Invalid code.'));
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
          contentContainerStyle={[
            styles.content,
            { padding: spacing.lg, paddingBottom: spacing.xxl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {navigation?.canGoBack?.() ? (
            <BackButton onPress={() => navigation.goBack()} />
          ) : null}

          <AppText variant="title" weight="bold" style={styles.title}>
            {t('Configuration 2FA', '2FA Setup')}
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.subtitle}>
            {t(
              'Sécurisez votre compte avec une application d authentification (TOTP) ou par email.',
              'Secure your account with an authenticator app (TOTP) or email verification.'
            )}
          </AppText>

          <View style={styles.methodButtons}>
            <AppButton
              title={t(
                'Application d authentification (TOTP)',
                'Authenticator App (TOTP)'
              )}
              onPress={() => handleInitSetup('APP')}
              loading={isSettingUp2FA}
            />
            <AppButton
              title={t('Code par email', 'Email Code')}
              variant="outline"
              onPress={() => handleInitSetup('EMAIL')}
              loading={isSettingUp2FA}
            />
          </View>

          {setupData ? (
            <View
              style={[
                styles.setupCard,
                {
                  backgroundColor: colors.surface,
                  borderRadius: borderRadius.lg,
                  borderColor: colors.border,
                },
              ]}
            >
              <AppText variant="body" weight="bold">
                {t(`Méthode : ${setupData.method}`, `Method: ${setupData.method}`)}
              </AppText>

              {setupData.secret ? (
                <View style={styles.secretBox}>
                  <AppText variant="caption" color={colors.textSecondary}>
                    {t('Clé TOTP :', 'TOTP Secret:')}
                  </AppText>
                  <AppText variant="body" weight="bold" color={colors.secondary}>
                    {setupData.secret}
                  </AppText>
                </View>
              ) : null}

              {setupData.backupCodes?.length ? (
                <View style={styles.backupBox}>
                  <AppText variant="caption" color={colors.textSecondary}>
                    {t('Codes de secours :', 'Backup codes:')}
                  </AppText>
                  <AppText variant="caption" color={colors.textPrimary}>
                    {setupData.backupCodes.join('  •  ')}
                  </AppText>
                </View>
              ) : null}

              <AppInput
                label={t('Code de confirmation à 6 chiffres', '6-digit confirmation code')}
                value={otpCode}
                onChangeText={setOtpCode}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="000000"
              />

              <AppButton
                title={t('Confirmer l activation', 'Confirm Activation')}
                onPress={handleConfirm2FA}
                loading={isVerifying2FA}
              />
            </View>
          ) : null}

          {statusMessage ? (
            <AppText variant="caption" color={colors.primary} style={styles.feedback}>
              {statusMessage}
            </AppText>
          ) : null}
          {errorMessage ? (
            <AppText variant="caption" color={colors.error} style={styles.feedback}>
              {errorMessage}
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
  content: {},
  title: {
    marginBottom: 6,
  },
  subtitle: {
    marginBottom: 18,
  },
  methodButtons: {
    gap: 10,
    marginBottom: 18,
  },
  setupCard: {
    padding: 16,
    borderWidth: 1,
    gap: 10,
  },
  secretBox: {
    gap: 2,
  },
  backupBox: {
    gap: 2,
  },
  feedback: {
    marginTop: 12,
  },
});

export default Setup2FAScreen;
