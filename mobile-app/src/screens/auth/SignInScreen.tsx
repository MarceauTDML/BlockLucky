import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import AgeNoticeCard from '../../components/auth/AgeNoticeCard';
import AuthHero from '../../components/auth/AuthHero';
import FormMessage from '../../components/auth/FormMessage';
import OrDivider from '../../components/auth/OrDivider';
import SocialAuthButtons from '../../components/auth/SocialAuthButtons';
import TextLink from '../../components/auth/TextLink';
import { getErrorMessage } from '../../components/auth/authErrors';
import AppButton from '../../components/ui/AppButton';
import AppInput from '../../components/ui/AppInput';
import AppText from '../../components/ui/AppText';
import Screen from '../../components/ui/Screen';
import useAppTheme from '../../hooks/useAppTheme';
import useAuth, { AuthStepResult } from '../../hooks/useAuth';
import { useAuthNavigation } from '../../navigation/hooks';
import { isValidEmail } from '../../utils/validators.util';

const SignInScreen: React.FC = () => {
  const { colors, t } = useAppTheme();
  const navigation = useAuthNavigation();
  const { signInWithPassword, isSigningIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');

  const handleResult = useCallback(
    (result: AuthStepResult) => {
      if (result.requiresTwoFactor) {
        navigation.navigate('Verify2FA', {
          userId: result.userId,
          method: result.method,
          loginTicket: result.loginTicket,
          email: result.email,
          purpose: 'signin',
          devOtpPreview: result.devOtpPreview,
        });
      }
    },
    [navigation],
  );

  const handleSubmit = async () => {
    setFormError('');
    const trimmed = email.trim();
    const nextEmailError = isValidEmail(trimmed)
      ? ''
      : t('Saisissez une adresse e-mail valide.', 'Enter a valid email address.');
    const nextPasswordError = password
      ? ''
      : t('Saisissez votre mot de passe.', 'Enter your password.');
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    if (nextEmailError || nextPasswordError) return;

    try {
      handleResult(await signInWithPassword({ email: trimmed, password }));
    } catch (error) {
      setFormError(
        getErrorMessage(
          error,
          t(
            'Connexion impossible. Vérifiez votre connexion et réessayez.',
            'Unable to sign in. Check your connection and try again.',
          ),
        ),
      );
    }
  };

  return (
    <Screen showSecurityFooter edges={['top', 'left', 'right', 'bottom']}>
      <AuthHero
        title={t('Bonjour', 'Hello')}
        subtitle={t(
          'Connectez-vous pour retrouver vos tickets et les offres de votre ville.',
          'Sign in to find your tickets and your city’s offers.',
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
        returnKeyType="next"
        errorText={emailError}
      />
      <AppInput
        label={t('Mot de passe', 'Password')}
        icon="lock"
        secureToggle
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          if (passwordError) setPasswordError('');
        }}
        placeholder={t('Votre mot de passe', 'Your password')}
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
        errorText={passwordError}
      />

      <TextLink
        label={t('Mot de passe oublié ?', 'Forgot password?')}
        align="right"
        size={11}
        muted
        onPress={() =>
          navigation.navigate(
            'ForgotPassword',
            isValidEmail(email) ? { email: email.trim() } : undefined,
          )
        }
        style={styles.forgot}
      />

      {formError ? <FormMessage message={formError} /> : null}

      <AppButton
        title={t('Me connecter', 'Sign in')}
        loading={isSigningIn}
        onPress={handleSubmit}
      />

      <OrDivider />

      <SocialAuthButtons onResult={handleResult} onError={setFormError} />

      <TextLink
        label={t('Pas encore de compte ?', 'No account yet?')}
        emphasis={t('Créer un compte', 'Create an account')}
        onPress={() => navigation.navigate('SignUp')}
        style={styles.switch}
      />

      <AgeNoticeCard
        message={t(
          'À votre première connexion, votre carte d’identité sera demandée pour vérifier votre âge, quelle que soit la connexion choisie.',
          'On your first sign-in, your ID card will be requested to verify your age, whichever sign-in method you choose.',
        )}
      />

      <View style={styles.terms}>
        <AppText size={10} color={colors.inkMuted} align="center">
          {t(
            'En continuant, vous acceptez nos conditions. Consultez notre politique de confidentialité.',
            'By continuing, you accept our terms. Read our privacy policy.',
          )}
        </AppText>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  forgot: {
    marginTop: -10,
    marginBottom: 4,
  },
  switch: {
    marginTop: 8,
  },
  terms: {
    marginTop: 22,
    marginBottom: 6,
    paddingHorizontal: 12,
  },
});

export default SignInScreen;
