'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useState } from 'react';
import Brand from '@/components/layout/Brand';
import SecurityFooter from '@/components/layout/SecurityFooter';
import BackButton from '@/components/ui/BackButton';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Input from '@/components/ui/Input';
import { Loader } from '@/components/ui/Loader';
import useAuth, { homeForRole } from '@/hooks/useAuth';
import { safeInternalPath } from '@/lib/navigation';
import { isValidOtpCode } from '@/lib/validators';
import { getErrorMessage } from '@/store/api/baseApi';
import { useAppTheme } from '@/theme/ThemeProvider';

function VerifyContent() {
  const { t } = useAppTheme();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeInternalPath(params.get('next'));
  const {
    pendingTwoFactorUserId,
    pendingTwoFactorMethod,
    pendingTwoFactorEmail,
    pendingLoginTicket,
    verifyOtpCode,
    isVerifying2FA,
    hydrated,
  } = useAuth();
  const [otpCode, setOtpCode] = useState('');
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    if (hydrated && !pendingTwoFactorUserId) router.replace('/connexion');
  }, [hydrated, pendingTwoFactorUserId, router]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');
    if (!isValidOtpCode(otpCode)) {
      setErrorText(t('Le code doit contenir 6 chiffres.', 'Code must be 6 digits.'));
      return;
    }
    if (!pendingTwoFactorUserId) return;
    try {
      const result = await verifyOtpCode(pendingTwoFactorUserId, otpCode.trim(), pendingLoginTicket);
      if (result.requiresTwoFactor) {
        setOtpCode('');
        return;
      }
      router.replace(next || homeForRole(result.user?.role));
    } catch (err) {
      setErrorText(getErrorMessage(err, t('Code invalide ou expiré.', 'Invalid or expired code.')));
    }
  };

  const method = pendingTwoFactorMethod || 'APP';

  return (
    <main id="contenu" className="flex min-h-dvh items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Brand compact />
        </div>
        <BackButton href="/connexion" />
        <form className="flex flex-col" onSubmit={handleVerify} noValidate>
          <span
            aria-hidden
            className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-sun-chip text-on-sun dark:text-sun"
          >
            <Icon name={method === 'EMAIL' ? 'envelope' : 'lock'} size={28} />
          </span>
          <p className="mb-3 self-start inline-flex rounded-full bg-sun-chip px-3 py-1 text-caption font-semibold text-on-sun dark:text-sun">
            {t(`Double authentification (${method})`, `Two-Factor Authentication (${method})`)}
          </p>
          <h1 className="mb-2.5 text-[29px] leading-[36px] font-bold tracking-[-0.6px]">
            {t('Vérification 2FA', '2FA Verification')}
          </h1>
          <p className="mb-7 text-body text-fg-secondary">
            {method === 'EMAIL'
              ? t(
                  `Saisissez le code à 6 chiffres envoyé à ${pendingTwoFactorEmail || 'votre adresse email'}.`,
                  `Enter the 6-digit code sent to ${pendingTwoFactorEmail || 'your email address'}.`
                )
              : t(
                  "Saisissez le code à 6 chiffres généré par votre application d'authentification.",
                  'Enter the 6-digit code from your authenticator app.'
                )}
          </p>
          <Input
            label={t('Code à 6 chiffres', '6-digit code')}
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            errorText={errorText}
            className="min-h-[60px] rounded-[16px] text-center font-mono text-heading font-bold tracking-[0.4em]"
          />
          <Button type="submit" loading={isVerifying2FA} className="mt-2">
            <Icon name="check" size={18} />
            {t('Valider', 'Verify')}
          </Button>
        </form>
        <SecurityFooter className="mt-8" />
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<Loader />}>
      <VerifyContent />
    </Suspense>
  );
}
