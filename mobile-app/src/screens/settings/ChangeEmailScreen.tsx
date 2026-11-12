import React, { useState } from 'react';
import { StyleSheet } from 'react-native';

import DevOtpHint from '../../components/auth/DevOtpHint';
import { getErrorMessage } from '../../components/auth/authErrors';
import AppButton from '../../components/ui/AppButton';
import AppInput from '../../components/ui/AppInput';
import AppText from '../../components/ui/AppText';
import Card from '../../components/ui/Card';
import ResultDialog from '../../components/ui/ResultDialog';
import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import useAppTheme from '../../hooks/useAppTheme';
import useAuth from '../../hooks/useAuth';
import { useRootNavigation } from '../../navigation/hooks';
import {
  useConfirmEmailChangeMutation,
  useGetProfileQuery,
  useRequestEmailChangeMutation,
} from '../../store/api/authApi';
import { isValidEmail } from '../../utils/validators.util';

const ChangeEmailScreen: React.FC = () => {
  const { colors, t } = useAppTheme();
  const navigation = useRootNavigation();
  const { user, patchUser } = useAuth();
  const { data: profileRes } = useGetProfileQuery();
  const account = profileRes?.data?.profile ?? user;
  const needsPassword = Boolean(account?.hasPassword);

  const [requestChange, { isLoading: isRequesting }] = useRequestEmailChangeMutation();
  const [confirmChange, { isLoading: isConfirming }] = useConfirmEmailChangeMutation();

  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'form' | 'code'>('form');
  const [devCode, setDevCode] = useState<string | undefined>();
  const [errors, setErrors] = useState<{ email?: string; password?: string; code?: string }>({});
  const [done, setDone] = useState(false);

  const handleRequest = async () => {
    const email = newEmail.trim().toLowerCase();
    const next: typeof errors = {};
    if (!isValidEmail(email)) next.email = t('Adresse e-mail invalide.', 'Invalid e-mail address.');
    else if (email === (account?.email ?? '').toLowerCase()) {
      next.email = t('C’est déjà votre adresse actuelle.', 'This is already your current address.');
    }
    if (needsPassword && !password) {
      next.password = t('Saisissez votre mot de passe.', 'Enter your password.');
    }
    setErrors(next);
    if (next.email || next.password) return;
    try {
      const res = await requestChange({
        newEmail: email,
        ...(needsPassword ? { password } : {}),
      }).unwrap();
      setDevCode(res.data.devOtpPreview);
      setStep('code');
    } catch (error) {
      setErrors({
        email: getErrorMessage(
          error,
          t('Impossible d’envoyer le code pour le moment.', 'Unable to send the code right now.'),
        ),
      });
    }
  };

  const handleConfirm = async () => {
    if (!/^\d{6}$/.test(code.trim())) {
      setErrors({ code: t('Le code contient 6 chiffres.', 'The code has 6 digits.') });
      return;
    }
    setErrors({});
    try {
      const res = await confirmChange({ code: code.trim() }).unwrap();
      await patchUser({ email: res.data.profile.email });
      setDone(true);
    } catch (error) {
      setErrors({
        code: getErrorMessage(error, t('Code invalide ou expiré.', 'Invalid or expired code.')),
      });
    }
  };

  return (
    <Screen showSecurityFooter>
      <ScreenHeader
        title={t('Adresse e-mail', 'E-mail address')}
        subtitle={account?.email ?? undefined}
        onBack={() => navigation.goBack()}
      />

      {step === 'form' ? (
        <Card>
          <AppInput
            tone="muted"
            label={t('Nouvelle adresse e-mail', 'New e-mail address')}
            value={newEmail}
            onChangeText={setNewEmail}
            errorText={errors.email}
            icon="envelope"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            placeholder="prenom.nom@exemple.fr"
          />
          {needsPassword ? (
            <AppInput
              tone="muted"
              label={t('Mot de passe actuel', 'Current password')}
              value={password}
              onChangeText={setPassword}
              errorText={errors.password}
              icon="lock"
              secureTextEntry
              secureToggle
              autoCapitalize="none"
              autoComplete="current-password"
            />
          ) : null}
          <AppText size={11} color={colors.inkMuted} style={styles.note}>
            {t(
              'Un code à 6 chiffres sera envoyé à la nouvelle adresse pour la confirmer.',
              'A 6-digit code will be sent to the new address to confirm it.',
            )}
          </AppText>
          <AppButton
            title={t('Recevoir le code', 'Get the code')}
            variant="dark"
            size="md"
            loading={isRequesting}
            onPress={handleRequest}
          />
        </Card>
      ) : (
        <Card>
          <AppText size={13} style={styles.note}>
            {t(
              `Saisissez le code envoyé à ${newEmail.trim().toLowerCase()}.`,
              `Enter the code sent to ${newEmail.trim().toLowerCase()}.`,
            )}
          </AppText>
          <AppInput
            tone="muted"
            label={t('Code de confirmation', 'Confirmation code')}
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
            errorText={errors.code}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            placeholder="000000"
          />
          <DevOtpHint code={devCode} onUse={setCode} />
          <AppButton
            title={t('Confirmer la nouvelle adresse', 'Confirm the new address')}
            variant="dark"
            size="md"
            loading={isConfirming}
            onPress={handleConfirm}
          />
          <AppButton
            title={t('Modifier l’adresse', 'Change the address')}
            variant="ghost"
            size="md"
            onPress={() => {
              setStep('form');
              setCode('');
              setErrors({});
            }}
            style={styles.secondary}
          />
        </Card>
      )}

      <ResultDialog
        visible={done}
        status="success"
        title={t('Adresse modifiée', 'Address changed')}
        message={t(
          'Votre nouvelle adresse e-mail est enregistrée. L’ancienne adresse a été prévenue.',
          'Your new e-mail address is saved. The previous address has been notified.',
        )}
        primaryLabel={t('Terminer', 'Done')}
        onPrimary={() => {
          setDone(false);
          navigation.goBack();
        }}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  note: {
    marginBottom: 14,
  },
  secondary: {
    marginTop: 8,
  },
});

export default ChangeEmailScreen;
