import { RouteProp, useRoute } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import AgeNoticeCard from '../../components/auth/AgeNoticeCard';
import AuthHero from '../../components/auth/AuthHero';
import CheckboxRow from '../../components/auth/CheckboxRow';
import FormMessage from '../../components/auth/FormMessage';
import OrDivider from '../../components/auth/OrDivider';
import PasswordRules from '../../components/auth/PasswordRules';
import SocialAuthButtons from '../../components/auth/SocialAuthButtons';
import TextLink from '../../components/auth/TextLink';
import { getErrorMessage, isPasswordValid } from '../../components/auth/authErrors';
import AppButton from '../../components/ui/AppButton';
import AppInput from '../../components/ui/AppInput';
import AppText from '../../components/ui/AppText';
import Screen from '../../components/ui/Screen';
import useAppTheme from '../../hooks/useAppTheme';
import useAuth, { AuthStepResult } from '../../hooks/useAuth';
import { useAuthNavigation, useRootNavigation } from '../../navigation/hooks';
import { AuthStackParamList } from '../../types/navigation.types';
import { isValidEmail } from '../../utils/validators.util';

type LegalDoc = 'cgu' | 'reglement' | 'confidentialite';

const SignUpScreen: React.FC = () => {
  const { colors, t } = useAppTheme();
  const navigation = useAuthNavigation();
  const rootNavigation = useRootNavigation();
  const openLegal = (doc: LegalDoc) => rootNavigation.navigate('Legal', { doc });
  const route = useRoute<RouteProp<AuthStackParamList, 'SignUp'>>();
  const { signUpWithPassword, isSigningUp } = useAuth();
  const initialReferral = route.params?.referralCode ?? '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [referralCode, setReferralCode] = useState(initialReferral);
  const [showReferral, setShowReferral] = useState(Boolean(initialReferral));
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [confirmAdult, setConfirmAdult] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmation?: string;
    terms?: string;
    adult?: string;
  }>({});
  const [formError, setFormError] = useState('');

  const termsError = t(
    'Acceptez les conditions d’utilisation et le règlement pour créer votre compte.',
    'Accept the terms of use and the rules to create your account.',
  );
  const adultError = t(
    'Certifiez avoir 18 ans ou plus pour créer votre compte.',
    'Certify that you are 18 or older to create your account.',
  );

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

  const requireTerms = useCallback(() => {
    if (acceptTerms && confirmAdult) return true;
    setErrors((current) => ({
      ...current,
      terms: acceptTerms ? undefined : termsError,
      adult: confirmAdult ? undefined : adultError,
    }));
    return false;
  }, [acceptTerms, adultError, confirmAdult, termsError]);

  const handleSubmit = async () => {
    setFormError('');
    const trimmed = email.trim();
    const nextErrors = {
      email: isValidEmail(trimmed)
        ? undefined
        : t('Saisissez une adresse e-mail valide.', 'Enter a valid email address.'),
      password: isPasswordValid(password)
        ? undefined
        : t('Le mot de passe ne respecte pas les règles.', 'The password does not meet the rules.'),
      confirmation:
        confirmation && confirmation === password
          ? undefined
          : t('Les deux mots de passe ne correspondent pas.', 'Passwords do not match.'),
      terms: acceptTerms ? undefined : termsError,
      adult: confirmAdult ? undefined : adultError,
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    try {
      const result = await signUpWithPassword({
        email: trimmed,
        password,
        acceptTerms: true,
        isAdultConfirmed: true,
        utmSource: 'MOBILE_APP',
        ...(referralCode.trim() ? { referralCode: referralCode.trim() } : {}),
      });
      if (result.requiresTwoFactor) {
        navigation.navigate('Verify2FA', {
          userId: result.userId,
          method: result.method,
          email: result.email ?? trimmed,
          purpose: 'signup',
          devOtpPreview: result.devOtpPreview,
        });
      }
    } catch (error) {
      setFormError(
        getErrorMessage(
          error,
          t(
            'Inscription impossible. Vérifiez votre connexion et réessayez.',
            'Unable to sign up. Check your connection and try again.',
          ),
        ),
      );
    }
  };

  return (
    <Screen showSecurityFooter edges={['top', 'left', 'right', 'bottom']}>
      <AuthHero
        title={t('Rejoignez EtherBay.', 'Join EtherBay.')}
        subtitle={t(
          'Un compte gratuit, un portefeuille déjà prêt. La Mairie vous offre des ETH fictifs pour jouer.',
          'A free account and a ready-made wallet. The City Hall gives you fictitious ETH to play.',
        )}
      />

      <AppInput
        label={t('Adresse e-mail', 'Email address')}
        icon="envelope"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
        }}
        placeholder="vous@exemple.fr"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        errorText={errors.email}
      />
      <AppInput
        label={t('Créer un mot de passe', 'Create a password')}
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
        helperText={t('Utilisez un mot de passe unique.', 'Use a unique password.')}
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

      {showReferral ? (
        <AppInput
          label={t('Code de parrainage (facultatif)', 'Referral code (optional)')}
          icon="gift"
          value={referralCode}
          onChangeText={setReferralCode}
          placeholder={t('Code reçu d’un proche', 'Code from a friend')}
          autoCapitalize="characters"
          autoCorrect={false}
        />
      ) : (
        <TextLink
          label={t('J’ai un code de parrainage', 'I have a referral code')}
          align="left"
          size={12}
          underline
          onPress={() => setShowReferral(true)}
          style={styles.referralLink}
        />
      )}

      <CheckboxRow
        checked={acceptTerms}
        onChange={(value) => {
          setAcceptTerms(value);
          if (value) setErrors((current) => ({ ...current, terms: undefined }));
        }}
        label={t(
          'J’accepte les conditions générales d’utilisation et le règlement de participation.',
          'I accept the terms of use and the participation rules.',
        )}
        errorText={errors.terms}
      />
      <AppText size={11} color={colors.inkMuted} style={styles.legalLinks}>
        {t('Lire ', 'Read ')}
        <AppText
          size={11}
          weight="bold"
          color={colors.ink}
          accessibilityRole="link"
          onPress={() => openLegal('cgu')}
          style={styles.underline}
        >
          {t('les CGU', 'the terms of use')}
        </AppText>
        {t(' et ', ' and ')}
        <AppText
          size={11}
          weight="bold"
          color={colors.ink}
          accessibilityRole="link"
          onPress={() => openLegal('reglement')}
          style={styles.underline}
        >
          {t('le règlement', 'the rules')}
        </AppText>
      </AppText>

      <CheckboxRow
        checked={confirmAdult}
        onChange={(value) => {
          setConfirmAdult(value);
          if (value) setErrors((current) => ({ ...current, adult: undefined }));
        }}
        label={t('Je certifie avoir 18 ans ou plus.', 'I certify that I am 18 or older.')}
        errorText={errors.adult}
      />

      {formError ? <FormMessage message={formError} /> : null}

      <AppButton
        title={t('Créer mon compte', 'Create my account')}
        loading={isSigningUp}
        onPress={handleSubmit}
      />

      <OrDivider />

      <SocialAuthButtons onResult={handleResult} onError={setFormError} canStart={requireTerms} />

      <TextLink
        label={t('Déjà un compte ?', 'Already have an account?')}
        emphasis={t('Me connecter', 'Sign in')}
        onPress={() => navigation.navigate('SignIn')}
        style={styles.switch}
      />

      <AgeNoticeCard
        message={t(
          'Après l’inscription, ajoutez votre carte d’identité pour confirmer vos 18 ans ou plus. L’accès aux jeux attendra cette vérification.',
          'After signing up, add your ID card to confirm you are 18 or older. Games stay locked until this check.',
        )}
      />

      <View style={styles.terms}>
        <AppText size={10} color={colors.inkMuted} align="center">
          {t(
            'En créant un compte, vous reconnaissez avoir lu la ',
            'By creating an account, you acknowledge that you have read the ',
          )}
          <AppText
            size={10}
            weight="bold"
            color={colors.ink}
            accessibilityRole="link"
            onPress={() => openLegal('confidentialite')}
            style={styles.underline}
          >
            {t('politique de confidentialité', 'privacy policy')}
          </AppText>
          .
        </AppText>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  referralLink: {
    marginTop: -6,
    marginBottom: 8,
  },
  switch: {
    marginTop: 8,
  },
  legalLinks: {
    marginTop: -10,
    marginBottom: 14,
    marginLeft: 44,
  },
  underline: {
    textDecorationLine: 'underline',
  },
  terms: {
    marginTop: 22,
    marginBottom: 6,
    paddingHorizontal: 12,
  },
});

export default SignUpScreen;
