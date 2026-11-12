'use client';

import React, { useState } from 'react';
import BackButton from '@/components/ui/BackButton';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Input from '@/components/ui/Input';
import { Alert, PageHeader } from '@/components/ui/Misc';
import useAuth from '@/hooks/useAuth';
import { isValidOtpCode } from '@/lib/validators';
import { getErrorMessage } from '@/store/api/baseApi';
import { useAppTheme } from '@/theme/ThemeProvider';
import { Setup2FAResponse } from '@/types/api.types';

export default function Setup2FAPage() {
  const { t } = useAppTheme();
  const { user, setup2FA, verifyOtpCode, isSettingUp2FA, isVerifying2FA } = useAuth();
  const [setupData, setSetupData] = useState<Setup2FAResponse | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const init = async (method: 'APP' | 'EMAIL') => {
    setError('');
    setStatus('');
    setDone(false);
    setOtpCode('');
    try {
      const res = await setup2FA({ method }).unwrap();
      setSetupData(res.data);
      if (res.data.devOtpPreview) setOtpCode(res.data.devOtpPreview);
      setStatus(
        method === 'APP'
          ? t(
              'Scannez le QR code avec votre application, puis saisissez le code généré.',
              'Scan the QR code with your app, then enter the generated code.'
            )
          : res.data.message || t('Code envoyé par email.', 'Code sent via email.')
      );
    } catch (err) {
      setError(getErrorMessage(err, t("Erreur lors de l'initialisation 2FA.", 'Error initializing 2FA.')));
    }
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !isValidOtpCode(otpCode)) {
      setError(t('Veuillez saisir un code à 6 chiffres.', 'Please enter a 6-digit code.'));
      return;
    }
    setError('');
    try {
      await verifyOtpCode(user.id, otpCode.trim());
      setDone(true);
      setStatus(t('Double authentification activée.', 'Two-factor authentication enabled.'));
    } catch (err) {
      setError(getErrorMessage(err, t('Code invalide.', 'Invalid code.')));
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <BackButton href="/profil/securite" />
      <PageHeader
        title={t('Configuration 2FA', '2FA Setup')}
        subtitle={t(
          "Sécurisez votre compte avec une application d'authentification (TOTP) ou par email.",
          'Secure your account with an authenticator app (TOTP) or email verification.'
        )}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <Button onClick={() => init('APP')} loading={isSettingUp2FA}>
          <Icon name="shield" size={20} />
          {t("Application d'authentification (TOTP)", 'Authenticator App (TOTP)')}
        </Button>
        <Button variant="outline" onClick={() => init('EMAIL')} loading={isSettingUp2FA}>
          <Icon name="envelope" size={20} />
          {t('Code par email', 'Email Code')}
        </Button>
      </div>

      {setupData ? (
        <form className="card flex flex-col gap-4 p-5 md:p-6" onSubmit={confirm} noValidate>
          <div className="flex items-center gap-3">
            <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint text-green">
              <Icon name="lock" size={20} />
            </span>
            <h2 className="text-subtitle font-bold">{t(`Méthode : ${setupData.method}`, `Method: ${setupData.method}`)}</h2>
          </div>

          {setupData.qrCodeDataUrl ? (
            <div className="flex flex-col items-center gap-3 rounded-[20px] bg-sun-soft p-4 text-on-sun sm:flex-row sm:items-start sm:gap-5">
              <img
                src={setupData.qrCodeDataUrl}
                alt={t('QR code de configuration TOTP', 'TOTP setup QR code')}
                width={160}
                height={160}
                className="rounded-[14px] bg-white p-2"
              />
              {setupData.secret ? (
                <div className="flex flex-col gap-0.5">
                  <p className="text-caption font-semibold text-on-sun-muted">{t('Clé TOTP (saisie manuelle) :', 'TOTP secret (manual entry):')}</p>
                  <p className="break-all font-mono text-body font-bold text-on-sun">{setupData.secret}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {setupData.backupCodes?.length ? (
            <div className="flex flex-col gap-1">
              <p className="text-caption text-fg-secondary">
                {t('Codes de secours (à conserver en lieu sûr) :', 'Backup codes (keep them safe):')}
              </p>
              <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
                {setupData.backupCodes.map((code) => (
                  <li key={code} className="rounded-full bg-surface-elevated px-2 py-1.5 text-center font-mono text-caption font-semibold">
                    {code}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <Input
            label={t('Code de confirmation à 6 chiffres', '6-digit confirmation code')}
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
          />
          <Button type="submit" loading={isVerifying2FA} disabled={done}>
            {t("Confirmer l'activation", 'Confirm Activation')}
          </Button>
        </form>
      ) : null}

      {status ? <Alert className="mt-3">{status}</Alert> : null}
      {error ? (
        <Alert tone="error" className="mt-3">
          {error}
        </Alert>
      ) : null}
    </div>
  );
}
