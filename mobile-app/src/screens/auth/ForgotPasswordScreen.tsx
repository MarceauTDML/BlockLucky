import { RouteProp, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';

import FormMessage from '../../components/auth/FormMessage';
import HighlightCard from '../../components/auth/HighlightCard';
import TextLink from '../../components/auth/TextLink';
import { getErrorMessage } from '../../components/auth/authErrors';
import AppButton from '../../components/ui/AppButton';
import AppInput from '../../components/ui/AppInput';
import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import Icon from '../../components/ui/icons/Icon';
import useAppTheme from '../../hooks/useAppTheme';
import useAuth from '../../hooks/useAuth';
import { useAuthNavigation } from '../../navigation/hooks';
import { AuthStackParamList } from '../../types/navigation.types';
import { isValidEmail } from '../../utils/validators.util';

const ForgotPasswordScreen: React.FC = () => {
  const { colors, t } = useAppTheme();
  const navigation = useAuthNavigation();
  const route = useRoute<RouteProp<AuthStackParamList, 'ForgotPassword'>>();
  const { requestPasswordReset, isRequestingReset } = useAuth();

  const [email, setEmail] = useState(route.params?.email ?? '');
  const [emailError, setEmailError] = useState('');
  const [formError, setFormError] = useState('');

  const handleSubmit = async () => {
    setFormError('');
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      setEmailError(t('Saisissez une adresse e-mail valide.', 'Enter a valid email address.'));
      return;
    }
    try {
      const result = await requestPasswordReset(trimmed);
      navigation.navigate('ResetPassword', {
        email: trimmed,
        devOtpPreview: result?.devOtpPreview,
      });
    } catch (error) {
      setFormError(
        getErrorMessage(
          error,
          t(
            'Envoi impossible. Vérifiez votre connexion et réessayez.',
            'Unable to send. Check your connection and try again.',
          ),
        ),
      );
    }
  };

  return (
    <Screen showSecurityFooter edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader
        title={t('Mot de passe oublié', 'Forgot password')}
        subtitle={t('Réinitialisation · Étape 1 sur 2', 'Reset · Step 1 of 2')}
        onBack={() => navigation.goBack()}
      />

      <HighlightCard
        badge={<Icon name="lock" size={30} color={colors.onSun} />}
        title={t('Recevez un code', 'Get a code')}
        message={t(
          'Indiquez l’adresse de votre compte. Si elle est connue, un code à 6 chiffres valable 10 minutes vous sera envoyé.',
          'Enter your account address. If it is known, a 6-digit code valid for 10 minutes will be sent to you.',
        )}
      />

      <AppInput
        label={t('Adresse e-mail', 'Email address')}
        icon="envelope"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          if (emailError) setEmailError('');
        }}
        placeholder="vous@exemple.fr"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={handleSubmit}
        errorText={emailError}
      />

      {formError ? <FormMessage message={formError} /> : null}

      <AppButton
        title={t('Recevoir un code', 'Send me a code')}
        loading={isRequestingReset}
        onPress={handleSubmit}
      />

      <TextLink
        label={t('Vous vous en souvenez ?', 'Remembered it?')}
        emphasis={t('Me connecter', 'Sign in')}
        onPress={() => navigation.navigate('SignIn')}
        style={styles.link}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  link: {
    marginTop: 12,
  },
});

export default ForgotPasswordScreen;
