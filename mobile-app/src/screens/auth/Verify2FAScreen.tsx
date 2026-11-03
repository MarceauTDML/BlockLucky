import React, { useState } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation.types';
import useAppTheme from '../../hooks/useAppTheme';
import useAuth from '../../hooks/useAuth';
import AppText from '../../components/ui/AppText';
import AppInput from '../../components/ui/AppInput';
import AppButton from '../../components/ui/AppButton';
import BackButton from '../../components/ui/BackButton';
import { isValidOtpCode } from '../../utils/validators.util';

type Props = NativeStackScreenProps<AuthStackParamList, 'Verify2FA'>;

export const Verify2FAScreen: React.FC<Props> = ({ route, navigation }) => {
  const { userId, method, email } = route.params;
  const { colors, borderRadius, spacing, t } = useAppTheme();
  const { verifyOtpCode, isVerifying2FA } = useAuth();

  const [otpCode, setOtpCode] = useState('');
  const [errorText, setErrorText] = useState('');

  const handleVerify = async () => {
    setErrorText('');
    if (!isValidOtpCode(otpCode)) {
      setErrorText(
        t('Le code doit contenir 6 chiffres.', 'Code must be 6 digits.')
      );
      return;
    }

    try {
      await verifyOtpCode(userId, otpCode.trim());
    } catch (err: any) {
      setErrorText(
        err?.data?.message || t('Code invalide ou expiré.', 'Invalid or expired code.')
      );
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'bottom', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 24}
      >
        <ScrollView
          contentContainerStyle={[styles.container, { padding: spacing.lg }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <BackButton onPress={() => navigation.goBack()} />

          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderRadius: borderRadius.lg,
                borderColor: colors.border,
                padding: spacing.lg,
              },
            ]}
          >
            <AppText variant="caption" color={colors.secondary}>
              {t(
                `Double authentification (${method})`,
                `Two-Factor Authentication (${method})`
              )}
            </AppText>
            <AppText variant="title" weight="bold" style={styles.title}>
              {t('Vérification 2FA', '2FA Verification')}
            </AppText>
            <AppText variant="body" color={colors.textSecondary} style={styles.subtitle}>
              {method === 'EMAIL'
                ? t(
                    `Saisissez le code à 6 chiffres envoyé à ${email || 'votre adresse email'}.`,
                    `Enter the 6-digit code sent to ${email || 'your email address'}.`
                  )
                : t(
                    'Saisissez le code à 6 chiffres généré par votre application d authentification.',
                    'Enter the 6-digit code from your authenticator app.'
                  )}
            </AppText>

            <AppInput
              label={t('Code à 6 chiffres', '6-digit code')}
              value={otpCode}
              onChangeText={setOtpCode}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              errorText={errorText}
            />

            <AppButton
              title={t('Valider', 'Verify')}
              onPress={handleVerify}
              loading={isVerifying2FA}
            />
          </View>
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
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    borderWidth: 1,
  },
  title: {
    marginVertical: 6,
  },
  subtitle: {
    marginBottom: 18,
  },
});

export default Verify2FAScreen;
