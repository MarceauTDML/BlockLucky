import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';

import DevOtpHint from '../../components/auth/DevOtpHint';
import FormMessage from '../../components/auth/FormMessage';
import HighlightCard from '../../components/auth/HighlightCard';
import { getErrorMessage } from '../../components/auth/authErrors';
import AppButton from '../../components/ui/AppButton';
import AppInput from '../../components/ui/AppInput';
import AppText from '../../components/ui/AppText';
import Card from '../../components/ui/Card';
import ListRow from '../../components/ui/ListRow';
import ResultDialog from '../../components/ui/ResultDialog';
import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import SectionHeader from '../../components/ui/SectionHeader';
import Icon from '../../components/ui/icons/Icon';
import useAppTheme from '../../hooks/useAppTheme';
import useAuth from '../../hooks/useAuth';
import { Setup2FAResponse } from '../../types/api.types';
import { TwoFactorMethod } from '../../types/user.types';
import { isValidOtpCode } from '../../utils/validators.util';

const Setup2FAScreen: React.FC = () => {
  const { colors, t } = useAppTheme();
  const navigation = useNavigation();
  const { user, setup2FA, verifyOtpCode, isSettingUp2FA, isVerifying2FA } = useAuth();

  const [pendingMethod, setPendingMethod] = useState<TwoFactorMethod | null>(null);
  const [setupData, setSetupData] = useState<Setup2FAResponse | null>(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [formError, setFormError] = useState('');
  const [copied, setCopied] = useState<'secret' | 'backup' | null>(null);
  const [done, setDone] = useState(false);

  const canGoBack = navigation.canGoBack();
  const alreadyEnabled = Boolean(user?.isTwoFactorEnabled) && !done;

  const startSetup = async (method: TwoFactorMethod) => {
    setFormError('');
    setCode('');
    setCodeError('');
    setPendingMethod(method);
    try {
      const response = await setup2FA({ method }).unwrap();
      setSetupData(response.data);
    } catch (error) {
      setFormError(
        getErrorMessage(
          error,
          t(
            'Impossible de préparer la double authentification.',
            'Unable to prepare two-factor authentication.',
          ),
        ),
      );
    } finally {
      setPendingMethod(null);
    }
  };

  const copy = async (value: string, kind: 'secret' | 'backup') => {
    await Clipboard.setStringAsync(value);
    setCopied(kind);
  };

  const confirm = async () => {
    setFormError('');
    if (!user?.id) return;
    if (!isValidOtpCode(code)) {
      setCodeError(t('Le code contient 6 chiffres.', 'The code has 6 digits.'));
      return;
    }
    try {
      await verifyOtpCode(user.id, code.trim());
      setDone(true);
    } catch (error) {
      setFormError(
        getErrorMessage(error, t('Code invalide ou expiré.', 'Invalid or expired code.')),
      );
    }
  };

  return (
    <Screen showSecurityFooter>
      <ScreenHeader
        title={t('Double authentification', 'Two-factor authentication')}
        subtitle={t('Sécurité du compte', 'Account security')}
        onBack={canGoBack ? () => navigation.goBack() : undefined}
      />

      <HighlightCard
        badge={<Icon name="shield" size={30} color={colors.onSun} />}
        title={t('Protégez votre compte', 'Protect your account')}
        message={t(
          'Un code à usage unique vous sera demandé en plus de votre mot de passe à chaque connexion.',
          'A one-time code will be requested in addition to your password each time you sign in.',
        )}
      />

      {alreadyEnabled ? (
        <Card tone="mint">
          <View style={styles.statusRow}>
            <Icon name="check" size={24} color={colors.green} />
            <View style={styles.flex}>
              <AppText size={15} weight="bold" color={colors.green}>
                {t('Double authentification active', 'Two-factor authentication on')}
              </AppText>
              <AppText size={11} color={colors.inkMuted}>
                {user?.twoFactorMethod === 'APP'
                  ? t('Méthode : application d’authentification', 'Method: authenticator app')
                  : t('Méthode : code par e-mail', 'Method: email code')}
              </AppText>
            </View>
          </View>
        </Card>
      ) : (
        <>
          <SectionHeader
            title={t('Choisissez une méthode', 'Choose a method')}
            style={styles.section}
          />
          <Card padding={4} style={styles.methods}>
            <View style={styles.methodsInner}>
              <ListRow
                icon="lock"
                iconTone="lavender"
                title={t('Application d’authentification', 'Authenticator app')}
                subtitle={t('Recommandé · fonctionne hors ligne', 'Recommended · works offline')}
                onPress={() => startSetup('APP')}
                right={
                  pendingMethod === 'APP' && isSettingUp2FA ? (
                    <ActivityIndicator color={colors.ink} />
                  ) : undefined
                }
                divider
              />
              <ListRow
                icon="envelope"
                iconTone="mint"
                title={t('Code par e-mail', 'Email code')}
                subtitle={user?.email ?? t('Envoyé à votre adresse', 'Sent to your address')}
                onPress={() => startSetup('EMAIL')}
                right={
                  pendingMethod === 'EMAIL' && isSettingUp2FA ? (
                    <ActivityIndicator color={colors.ink} />
                  ) : undefined
                }
              />
            </View>
          </Card>

          {setupData ? (
            <Card style={styles.setup}>
              {setupData.method === 'APP' ? (
                <>
                  <AppText size={15} weight="bold">
                    {t(
                      '1. Ajoutez BlockLucky à votre application',
                      '1. Add BlockLucky to your app',
                    )}
                  </AppText>
                  {setupData.qrCodeDataUrl ? (
                    <View style={[styles.qr, { backgroundColor: colors.surfaceMuted }]}>
                      <Image
                        source={{ uri: setupData.qrCodeDataUrl }}
                        style={styles.qrImage}
                        accessibilityLabel={t('QR code à scanner', 'QR code to scan')}
                      />
                    </View>
                  ) : null}
                  {setupData.secret ? (
                    <View style={[styles.secret, { backgroundColor: colors.surfaceMuted }]}>
                      <View style={styles.flex}>
                        <AppText size={10} weight="bold" color={colors.inkMuted}>
                          {t('CLÉ À SAISIR', 'KEY TO ENTER')}
                        </AppText>
                        <AppText size={13} weight="semibold" selectable>
                          {setupData.secret}
                        </AppText>
                      </View>
                      <AppButton
                        title={copied === 'secret' ? t('Copiée', 'Copied') : t('Copier', 'Copy')}
                        variant="soft"
                        size="sm"
                        fullWidth={false}
                        leftIcon="copy"
                        onPress={() => copy(setupData.secret ?? '', 'secret')}
                      />
                    </View>
                  ) : null}
                  {setupData.backupCodes?.length ? (
                    <View style={[styles.backup, { backgroundColor: colors.sunPale }]}>
                      <AppText size={12} weight="bold" color={colors.onSun}>
                        {t('Codes de secours', 'Backup codes')}
                      </AppText>
                      <AppText size={11} color={colors.onSunMuted}>
                        {t(
                          'Conservez-les en lieu sûr : chacun permet une connexion si vous perdez votre téléphone. Ils ne seront plus affichés.',
                          'Keep them safe: each one allows a sign-in if you lose your phone. They will not be shown again.',
                        )}
                      </AppText>
                      <View style={styles.codes}>
                        {setupData.backupCodes.map((backupCode) => (
                          <AppText
                            key={backupCode}
                            size={12}
                            weight="semibold"
                            color={colors.onSun}
                            style={styles.code}
                            selectable
                          >
                            {backupCode}
                          </AppText>
                        ))}
                      </View>
                      <AppButton
                        title={
                          copied === 'backup'
                            ? t('Codes copiés', 'Codes copied')
                            : t('Copier les codes', 'Copy codes')
                        }
                        variant="outline"
                        size="md"
                        leftIcon="copy"
                        onPress={() => copy(setupData.backupCodes?.join('\n') ?? '', 'backup')}
                      />
                    </View>
                  ) : null}
                  <AppText size={15} weight="bold" style={styles.step}>
                    {t('2. Saisissez le code affiché', '2. Enter the code shown')}
                  </AppText>
                </>
              ) : (
                <>
                  <AppText size={15} weight="bold">
                    {t('Code envoyé par e-mail', 'Code sent by email')}
                  </AppText>
                  <AppText size={12} color={colors.inkMuted} style={styles.step}>
                    {setupData.message ??
                      t(
                        'Saisissez le code à 6 chiffres reçu par e-mail.',
                        'Enter the 6-digit code received by email.',
                      )}
                  </AppText>
                  <DevOtpHint code={setupData.devOtpPreview} onUse={setCode} />
                </>
              )}

              <AppInput
                label={t('Code à 6 chiffres', '6-digit code')}
                icon="lock"
                tone="muted"
                value={code}
                onChangeText={(value) => {
                  setCode(value.replace(/\D/g, ''));
                  if (codeError) setCodeError('');
                }}
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                errorText={codeError}
              />
              <AppButton
                title={t('Activer la double authentification', 'Turn on two-factor authentication')}
                loading={isVerifying2FA}
                disabled={code.length !== 6}
                onPress={confirm}
              />
            </Card>
          ) : null}
        </>
      )}

      {formError ? <FormMessage message={formError} style={styles.error} /> : null}

      <ResultDialog
        visible={done}
        status="success"
        title={t('Compte protégé', 'Account protected')}
        message={t(
          'La double authentification est active. Un code vous sera demandé à chaque connexion.',
          'Two-factor authentication is on. A code will be requested each time you sign in.',
        )}
        primaryLabel={t('Terminer', 'Done')}
        onPrimary={() => {
          setDone(false);
          setSetupData(null);
          if (canGoBack) navigation.goBack();
        }}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  section: {
    marginBottom: 12,
  },
  methods: {
    marginBottom: 20,
  },
  methodsInner: {
    paddingHorizontal: 14,
  },
  setup: {
    gap: 14,
  },
  qr: {
    alignSelf: 'center',
    padding: 12,
    borderRadius: 20,
  },
  qrImage: {
    width: 180,
    height: 180,
  },
  secret: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    padding: 14,
  },
  backup: {
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  codes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  code: {
    width: '47%',
    letterSpacing: 1,
  },
  step: {
    marginTop: 4,
  },
  error: {
    marginTop: 16,
  },
});

export default Setup2FAScreen;
