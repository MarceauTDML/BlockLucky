import { RouteProp, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';

import DevOtpHint from '../../components/auth/DevOtpHint';
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
import { isValidOtpCode } from '../../utils/validators.util';

const Verify2FAScreen: React.FC = () => {
  const { colors, t } = useAppTheme();
  const navigation = useAuthNavigation();
  const { params } = useRoute<RouteProp<AuthStackParamList, 'Verify2FA'>>();
  const { userId, method, loginTicket, email, purpose = 'signin', devOtpPreview } = params;
  const { verifyOtpCode, isVerifying2FA } = useAuth();

  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [formError, setFormError] = useState('');
  const [useBackup, setUseBackup] = useState(false);

  const isEmail = method === 'EMAIL';
  const isSignUp = purpose === 'signup';
  const destination = email ?? t('votre adresse e-mail', 'your email address');

  const handleVerify = async () => {
    setFormError('');
    const trimmed = code.trim();
    if (useBackup ? trimmed.replace(/[^A-Za-z0-9]/g, '').length < 6 : !isValidOtpCode(trimmed)) {
      setCodeError(
        useBackup
          ? t('Saisissez un code de secours complet.', 'Enter a full backup code.')
          : t('Le code contient 6 chiffres.', 'The code has 6 digits.'),
      );
      return;
    }
    try {
      const result = await verifyOtpCode(userId, trimmed, loginTicket);
      if (result.requiresTwoFactor && result.userId && result.loginTicket) {
        setCode('');
        setUseBackup(false);
        navigation.replace('Verify2FA', {
          userId: result.userId,
          method: result.twoFactorMethod ?? 'APP',
          loginTicket: result.loginTicket,
          email,
          purpose: 'signin',
        });
      }
    } catch (error) {
      setFormError(
        getErrorMessage(error, t('Code invalide ou expiré.', 'Invalid or expired code.')),
      );
    }
  };

  return (
    <Screen showSecurityFooter edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader
        title={
          isEmail
            ? t('Vérifier mon e-mail', 'Verify my email')
            : t('Double authentification', 'Two-factor authentication')
        }
        subtitle={
          isSignUp
            ? t('Inscription · Étape 1 sur 2', 'Sign-up · Step 1 of 2')
            : t('Connexion sécurisée', 'Secure sign-in')
        }
        onBack={() => navigation.goBack()}
      />

      <HighlightCard
        badge={<Icon name={isEmail ? 'envelope' : 'shield'} size={30} color={colors.onSun} />}
        title={isEmail ? t('Code envoyé', 'Code sent') : t('Code de sécurité', 'Security code')}
        message={
          isEmail
            ? t(
                `Saisissez le code à 6 chiffres envoyé à ${destination}. Il est valable quelques minutes.`,
                `Enter the 6-digit code sent to ${destination}. It is valid for a few minutes.`,
              )
            : t(
                'Saisissez le code à 6 chiffres affiché dans votre application d’authentification.',
                'Enter the 6-digit code shown in your authenticator app.',
              )
        }
      />

      <DevOtpHint code={devOtpPreview} onUse={setCode} />

      <AppInput
        label={
          useBackup ? t('Code de secours', 'Backup code') : t('Code à 6 chiffres', '6-digit code')
        }
        icon="lock"
        value={code}
        onChangeText={(value) => {
          setCode(useBackup ? value.toUpperCase() : value.replace(/\D/g, ''));
          if (codeError) setCodeError('');
        }}
        placeholder={useBackup ? 'XXXXX-XXXXX' : '000000'}
        keyboardType={useBackup ? 'default' : 'number-pad'}
        autoCapitalize={useBackup ? 'characters' : 'none'}
        autoCorrect={false}
        maxLength={useBackup ? 16 : 6}
        autoComplete={useBackup ? 'off' : 'one-time-code'}
        textContentType={useBackup ? 'none' : 'oneTimeCode'}
        returnKeyType="done"
        onSubmitEditing={handleVerify}
        errorText={codeError}
        style={useBackup ? undefined : styles.codeInput}
      />

      {formError ? <FormMessage message={formError} /> : null}

      <AppButton
        title={
          isSignUp
            ? t('Valider et créer mon compte', 'Verify and create my account')
            : t('Valider', 'Verify')
        }
        loading={isVerifying2FA}
        disabled={useBackup ? code.trim().length < 6 : code.trim().length !== 6}
        onPress={handleVerify}
      />

      {isEmail ? (
        <TextLink
          label={t(
            'Pas reçu ? Vérifiez vos courriers indésirables ou',
            'Nothing received? Check your spam folder or',
          )}
          emphasis={
            isSignUp
              ? t('modifiez l’adresse', 'change the address')
              : t('recommencez', 'start again')
          }
          onPress={() => navigation.goBack()}
          style={styles.link}
        />
      ) : (
        <TextLink
          label={
            useBackup
              ? t('Application retrouvée ?', 'Found your app?')
              : t('Application perdue ?', 'Lost your app?')
          }
          emphasis={
            useBackup
              ? t('Saisir le code à 6 chiffres', 'Enter the 6-digit code')
              : t('Utiliser un code de secours', 'Use a backup code')
          }
          onPress={() => {
            setUseBackup((value) => !value);
            setCode('');
            setCodeError('');
            setFormError('');
          }}
          style={styles.link}
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  codeInput: {
    letterSpacing: 6,
  },
  link: {
    marginTop: 12,
  },
});

export default Verify2FAScreen;
