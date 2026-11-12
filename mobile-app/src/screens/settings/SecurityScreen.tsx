import React, { useState } from 'react';
import { StyleSheet } from 'react-native';

import { getApiErrorMessage } from '../../components/marketplace/apiErrors';
import ListGroup from '../../components/profile/ListGroup';
import AppInput from '../../components/ui/AppInput';
import AppText from '../../components/ui/AppText';
import ListRow from '../../components/ui/ListRow';
import ResultDialog from '../../components/ui/ResultDialog';
import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import SectionHeader from '../../components/ui/SectionHeader';
import useAppTheme from '../../hooks/useAppTheme';
import useAuth from '../../hooks/useAuth';
import { useRootNavigation } from '../../navigation/hooks';
import { useGetProfileQuery } from '../../store/api/authApi';

type DialogState = 'none' | 'disable2fa' | 'disabled';

export const SecurityScreen: React.FC = () => {
  const { colors, t } = useAppTheme();
  const navigation = useRootNavigation();
  const { user, disable2FA, isDisabling2FA } = useAuth();
  const [dialog, setDialog] = useState<DialogState>('none');
  const [code, setCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { data: profileRes } = useGetProfileQuery();
  const account = profileRes?.data?.profile ?? user;

  const twoFactorOn = Boolean(account?.isTwoFactorEnabled);
  const methodLabel =
    account?.twoFactorMethod === 'EMAIL'
      ? t('par e-mail', 'by e-mail')
      : t('par application', 'by app');

  const closeDialog = () => {
    setDialog('none');
    setCode('');
    setErrorMessage('');
  };

  const handleDisable = async () => {
    if (isDisabling2FA) return;
    setErrorMessage('');
    try {
      await disable2FA(code.trim() ? { code: code.trim() } : {}).unwrap();
      setCode('');
      setDialog('disabled');
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(
          error,
          t(
            'Impossible de désactiver la double authentification.',
            'Unable to disable two-factor authentication.',
          ),
        ),
      );
    }
  };

  return (
    <Screen showSecurityFooter>
      <ScreenHeader
        title={t('Sécurité', 'Security')}
        subtitle={t('Protégez l’accès à votre compte', 'Protect access to your account')}
        onBack={() => navigation.goBack()}
      />

      <SectionHeader title={t('Connexion', 'Sign-in')} style={styles.firstSection} />
      <ListGroup>
        <ListRow
          title={t('Adresse e-mail', 'E-mail address')}
          subtitle={account?.email || t('Aucune adresse enregistrée', 'No address on file')}
          icon="envelope"
          iconTone="lavender"
          onPress={() => navigation.navigate('ChangeEmail')}
          divider
        />
        <ListRow
          title={t('Mot de passe', 'Password')}
          subtitle={
            account?.hasPassword
              ? t('Modifier votre mot de passe', 'Change your password')
              : t('Aucun mot de passe : en créer un', 'No password yet: create one')
          }
          icon="lock"
          iconTone="peach"
          onPress={() => navigation.navigate('ChangePassword')}
        />
      </ListGroup>

      <SectionHeader title={t('Double authentification', 'Two-factor authentication')} />
      <ListGroup>
        <ListRow
          title={twoFactorOn ? t('Activée', 'Enabled') : t('Désactivée', 'Disabled')}
          subtitle={
            twoFactorOn
              ? t(
                  `Un code ${methodLabel} est demandé à la connexion.`,
                  `A code ${methodLabel} is required at sign-in.`,
                )
              : t(
                  'Ajoutez un code à usage unique à votre mot de passe.',
                  'Add a one-time code to your password.',
                )
          }
          icon="shield"
          iconTone={twoFactorOn ? 'mint' : 'sun'}
          divider
        />
        <ListRow
          title={
            twoFactorOn
              ? t('Reconfigurer la 2FA', 'Reconfigure 2FA')
              : t('Activer la 2FA', 'Enable 2FA')
          }
          icon="lock"
          onPress={() => navigation.navigate('Setup2FA')}
          divider={twoFactorOn}
        />
        {twoFactorOn ? (
          <ListRow
            title={t('Désactiver la 2FA', 'Disable 2FA')}
            icon="close"
            destructive
            onPress={() => setDialog('disable2fa')}
          />
        ) : null}
      </ListGroup>

      <ResultDialog
        visible={dialog === 'disable2fa'}
        status="info"
        title={t('Désactiver la 2FA ?', 'Disable 2FA?')}
        message={t(
          'Saisissez un code 2FA valide. Si vous vous êtes connecté il y a moins de 15 minutes, vous pouvez laisser le champ vide.',
          'Enter a valid 2FA code. If you signed in less than 15 minutes ago, you may leave it empty.',
        )}
        primaryLabel={
          isDisabling2FA ? t('Désactivation...', 'Disabling...') : t('Désactiver', 'Disable')
        }
        onPrimary={handleDisable}
        secondaryLabel={t('Annuler', 'Cancel')}
        onSecondary={closeDialog}
      >
        <AppInput
          label={t('Code 2FA', '2FA code')}
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={10}
          tone="muted"
          errorText={errorMessage || undefined}
        />
      </ResultDialog>

      <ResultDialog
        visible={dialog === 'disabled'}
        status="success"
        title={t('2FA désactivée', '2FA disabled')}
        message={t(
          'Vous pouvez la réactiver à tout moment.',
          'You can enable it again at any time.',
        )}
        primaryLabel={t('Compris', 'Got it')}
        onPrimary={closeDialog}
      />

      {twoFactorOn ? null : (
        <AppText size={11} color={colors.inkMuted} style={styles.hint}>
          {t(
            'Conseil : activez la double authentification pour protéger vos EtherPoints et vos codes.',
            'Tip: enable two-factor authentication to protect your EtherPoints and codes.',
          )}
        </AppText>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  firstSection: {
    marginTop: 6,
  },
  hint: {
    marginTop: 14,
  },
});

export default SecurityScreen;
