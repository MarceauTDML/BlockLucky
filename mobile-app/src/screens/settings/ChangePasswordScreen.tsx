import React, { useState } from 'react';
import { StyleSheet } from 'react-native';

import PasswordRules from '../../components/auth/PasswordRules';
import { getErrorMessage, isPasswordValid } from '../../components/auth/authErrors';
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
import { useChangePasswordMutation, useGetProfileQuery } from '../../store/api/authApi';

const ChangePasswordScreen: React.FC = () => {
  const { colors, t } = useAppTheme();
  const navigation = useRootNavigation();
  const { user, applyRenewedSession } = useAuth();
  const { data: profileRes } = useGetProfileQuery();
  const account = profileRes?.data?.profile ?? user;
  const hasPassword = Boolean(account?.hasPassword);
  const [changePassword, { isLoading }] = useChangePasswordMutation();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirmation?: string }>(
    {},
  );
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    const found: typeof errors = {};
    if (hasPassword && !current) {
      found.current = t('Saisissez votre mot de passe actuel.', 'Enter your current password.');
    }
    if (!isPasswordValid(next)) {
      found.next = t(
        'Le mot de passe ne respecte pas les règles.',
        'The password does not meet the rules.',
      );
    }
    if (next !== confirmation) {
      found.confirmation = t(
        'Les deux mots de passe sont différents.',
        'The two passwords do not match.',
      );
    }
    setErrors(found);
    if (found.current || found.next || found.confirmation) return;
    try {
      const res = await changePassword({
        newPassword: next,
        ...(hasPassword ? { currentPassword: current } : {}),
      }).unwrap();
      const renewedUser = res.data.user ? { ...res.data.user, hasPassword: true } : undefined;
      await applyRenewedSession({ ...res.data, user: renewedUser });
      setCurrent('');
      setNext('');
      setConfirmation('');
      setDone(true);
    } catch (error) {
      setErrors({
        current: getErrorMessage(
          error,
          t('Impossible de modifier le mot de passe.', 'Unable to change the password.'),
        ),
      });
    }
  };

  return (
    <Screen showSecurityFooter>
      <ScreenHeader
        title={
          hasPassword
            ? t('Mot de passe', 'Password')
            : t('Créer un mot de passe', 'Create a password')
        }
        subtitle={t(
          'Vos autres appareils seront déconnectés.',
          'Your other devices will be signed out.',
        )}
        onBack={() => navigation.goBack()}
      />

      <Card>
        {hasPassword ? (
          <AppInput
            tone="muted"
            label={t('Mot de passe actuel', 'Current password')}
            value={current}
            onChangeText={setCurrent}
            errorText={errors.current}
            icon="lock"
            secureTextEntry
            secureToggle
            autoCapitalize="none"
            autoComplete="current-password"
          />
        ) : (
          <AppText size={12} color={colors.inkMuted} style={styles.note}>
            {t(
              'Votre compte utilise un code par e-mail ou Google. Un mot de passe vous permettra aussi de vous connecter avec votre e-mail.',
              'Your account uses an e-mail code or Google. A password will also let you sign in with your e-mail.',
            )}
          </AppText>
        )}
        <AppInput
          tone="muted"
          label={t('Nouveau mot de passe', 'New password')}
          value={next}
          onChangeText={setNext}
          errorText={errors.next}
          icon="lock"
          secureTextEntry
          secureToggle
          autoCapitalize="none"
          autoComplete="new-password"
        />
        <PasswordRules password={next} />
        <AppInput
          tone="muted"
          label={t('Confirmer le nouveau mot de passe', 'Confirm the new password')}
          value={confirmation}
          onChangeText={setConfirmation}
          errorText={errors.confirmation}
          icon="lock"
          secureTextEntry
          secureToggle
          autoCapitalize="none"
          autoComplete="new-password"
        />
        {!hasPassword && errors.current ? (
          <AppText
            size={12}
            color={colors.terracotta}
            style={styles.note}
            accessibilityRole="alert"
          >
            {errors.current}
          </AppText>
        ) : null}
        <AppButton
          title={t('Enregistrer le mot de passe', 'Save the password')}
          variant="dark"
          size="md"
          loading={isLoading}
          onPress={handleSubmit}
        />
      </Card>

      <ResultDialog
        visible={done}
        status="success"
        title={t('Mot de passe enregistré', 'Password saved')}
        message={t(
          'Vous restez connecté sur cet appareil. Les autres ont été déconnectés.',
          'You stay signed in on this device. Other devices have been signed out.',
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
});

export default ChangePasswordScreen;
