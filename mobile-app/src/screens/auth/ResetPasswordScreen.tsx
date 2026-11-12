import { RouteProp, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';

import DevOtpHint from '../../components/auth/DevOtpHint';
import FormMessage from '../../components/auth/FormMessage';
import HighlightCard from '../../components/auth/HighlightCard';
import PasswordRules from '../../components/auth/PasswordRules';
import TextLink from '../../components/auth/TextLink';
import { getErrorMessage, isPasswordValid } from '../../components/auth/authErrors';
import AppButton from '../../components/ui/AppButton';
import AppInput from '../../components/ui/AppInput';
import ResultDialog from '../../components/ui/ResultDialog';
import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import Icon from '../../components/ui/icons/Icon';
import useAppTheme from '../../hooks/useAppTheme';
import useAuth from '../../hooks/useAuth';
import { useAuthNavigation } from '../../navigation/hooks';
import { AuthStackParamList } from '../../types/navigation.types';
import { isValidOtpCode } from '../../utils/validators.util';

const ResetPasswordScreen: React.FC = () => {
  const { colors, t } = useAppTheme();
  const navigation = useAuthNavigation();
  const { params } = useRoute<RouteProp<AuthStackParamList, 'ResetPassword'>>();
  const { resetPassword, requestPasswordReset, isResettingPassword, isRequestingReset } = useAuth();

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [devCode, setDevCode] = useState(params.devOtpPreview);
  const [errors, setErrors] = useState<{ code?: string; password?: string; confirmation?: string }>(
    {},
  );
  const [formError, setFormError] = useState('');
  const [info, setInfo] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    setFormError('');
    setInfo('');
    const nextErrors = {
      code: isValidOtpCode(code)
        ? undefined
        : t('Le code contient 6 chiffres.', 'The code has 6 digits.'),
      password: isPasswordValid(password)
        ? undefined
        : t('Le mot de passe ne respecte pas les règles.', 'The password does not meet the rules.'),
      confirmation:
        confirmation && confirmation === password
          ? undefined
          : t('Les deux mots de passe ne correspondent pas.', 'Passwords do not match.'),
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    try {
      await resetPassword({ email: params.email, code: code.trim(), newPassword: password });
      setDone(true);
    } catch (error) {
      setFormError(
        getErrorMessage(error, t('Code invalide ou expiré.', 'Invalid or expired code.')),
      );
    }
  };

  const handleResend = async () => {
    setFormError('');
    try {
      const result = await requestPasswordReset(params.email);
      setDevCode(result?.devOtpPreview);
      setInfo(t('Un nouveau code vient d’être envoyé.', 'A new code has just been sent.'));
    } catch (error) {
      setFormError(
        getErrorMessage(
          error,
          t('Envoi impossible. Réessayez dans un instant.', 'Unable to send. Try again shortly.'),
        ),
      );
    }
  };

  return (
    <Screen showSecurityFooter edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader
        title={t('Nouveau mot de passe', 'New password')}
        subtitle={t('Réinitialisation · Étape 2 sur 2', 'Reset · Step 2 of 2')}
        onBack={() => navigation.goBack()}
      />

      <HighlightCard
        badge={<Icon name="envelope" size={30} color={colors.onSun} />}
        title={t('Vérifiez vos e-mails', 'Check your email')}
        message={t(
          `Si un compte existe pour ${params.email}, un code à 6 chiffres vient d’y être envoyé.`,
          `If an account exists for ${params.email}, a 6-digit code has just been sent there.`,
        )}
      />

      <DevOtpHint code={devCode} onUse={setCode} />

      <AppInput
        label={t('Code reçu par e-mail', 'Code received by email')}
        icon="lock"
        value={code}
        onChangeText={(value) => {
          setCode(value.replace(/\D/g, ''));
          if (errors.code) setErrors((current) => ({ ...current, code: undefined }));
        }}
        placeholder="000000"
        keyboardType="number-pad"
        maxLength={6}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        errorText={errors.code}
      />
      <AppInput
        label={t('Nouveau mot de passe', 'New password')}
        icon="lock"
        secureToggle
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
        }}
        placeholder={t('Choisissez un mot de passe', 'Choose a password')}
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        maxLength={128}
        errorText={errors.password}
      />
      <PasswordRules password={password} />
      <AppInput
        label={t('Confirmer le mot de passe', 'Confirm password')}
        icon="lock"
        secureToggle
        value={confirmation}
        onChangeText={(value) => {
          setConfirmation(value);
          if (errors.confirmation)
            setErrors((current) => ({ ...current, confirmation: undefined }));
        }}
        placeholder={t('Saisissez-le à nouveau', 'Type it again')}
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        maxLength={128}
        errorText={errors.confirmation}
      />

      {formError ? <FormMessage message={formError} /> : null}
      {info ? <FormMessage message={info} tone="success" /> : null}

      <AppButton
        title={t('Enregistrer le mot de passe', 'Save password')}
        loading={isResettingPassword}
        onPress={handleSubmit}
      />

      <TextLink
        label={t('Code non reçu ?', 'No code?')}
        emphasis={
          isRequestingReset ? t('Envoi…', 'Sending…') : t('Renvoyer un code', 'Send a new code')
        }
        onPress={() => {
          if (!isRequestingReset) handleResend();
        }}
        style={styles.link}
      />

      <ResultDialog
        visible={done}
        status="success"
        title={t('Mot de passe modifié', 'Password changed')}
        message={t(
          'Votre nouveau mot de passe est enregistré. Par sécurité, vos autres sessions ont été fermées.',
          'Your new password is saved. For security, your other sessions were signed out.',
        )}
        primaryLabel={t('Me connecter', 'Sign in')}
        onPrimary={() => {
          setDone(false);
          navigation.popTo('SignIn');
        }}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  link: {
    marginTop: 12,
  },
});

export default ResetPasswordScreen;
