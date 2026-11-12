'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useRef, useState } from 'react';
import OnboardingCarousel from '@/components/auth/OnboardingCarousel';
import Brand from '@/components/layout/Brand';
import PreferenceToggles from '@/components/layout/PreferenceToggles';
import SecurityFooter from '@/components/layout/SecurityFooter';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Input from '@/components/ui/Input';
import { Loader } from '@/components/ui/Loader';
import { Alert, CheckboxCard } from '@/components/ui/Misc';
import { ChoicePills } from '@/components/ui/SegmentedTabs';
import Sheet from '@/components/ui/Sheet';
import useAuth, { homeForRole } from '@/hooks/useAuth';
import useIsClient from '@/hooks/useIsClient';
import { getUtmSource, trackEvent } from '@/lib/analytics';
import { safeInternalPath } from '@/lib/navigation';
import storage, { KEYS } from '@/lib/storage';
import { isValidEmail } from '@/lib/validators';
import { generateDeterministicWallet } from '@/lib/wallet';
import { getErrorMessage } from '@/store/api/baseApi';
import { useAppTheme } from '@/theme/ThemeProvider';

type AgeGroup = '18-25' | '26-35' | '36-50' | '50+';
const AGE_GROUPS: readonly AgeGroup[] = ['18-25', '26-35', '36-50', '50+'];

function LoginContent() {
  const { t } = useAppTheme();
  const router = useRouter();
  const params = useSearchParams();
  const { loginWithSocial, isLoggingIn, hydrated, isAuthenticated, user } = useAuth();

  const isProSpace = params.get('espace') === 'pro';
  const next = safeInternalPath(params.get('next'));

  const [email, setEmail] = useState('');
  const isClient = useIsClient();
  const [referralInput, setReferralInput] = useState<string | null>(null);
  const referralCode = referralInput ?? (isClient ? storage.get(KEYS.referral) || '' : '');
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('18-25');
  const [isAdultConfirmed, setIsAdultConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [ageModalVisible, setAgeModalVisible] = useState(!isProSpace);
  const [onboardingFinished, setOnboardingFinished] = useState(false);
  const onboardingDone =
    isProSpace || onboardingFinished || (isClient && storage.get(KEYS.onboarding) === '1');
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingProvider, setPendingProvider] = useState<'GOOGLE' | 'EMAIL' | null>(null);
  const accessTracked = useRef(false);

  useEffect(() => {
    if (hydrated && isAuthenticated) router.replace(next || homeForRole(user?.role));
  }, [hydrated, isAuthenticated, next, router, user?.role]);

  const markAccessStarted = () => {
    if (accessTracked.current) return;
    accessTracked.current = true;
    trackEvent('access_started', { ageGroup });
  };

  const finishOnboarding = () => {
    storage.set(KEYS.onboarding, '1');
    setOnboardingFinished(true);
  };

  const handleAuth = async (provider: 'GOOGLE' | 'EMAIL') => {
    setErrorMessage('');
    markAccessStarted();
    if (!isAdultConfirmed) {
      setAgeModalVisible(true);
      return;
    }
    if (!termsAccepted) {
      setErrorMessage(
        t(
          "Acceptez les conditions générales d'utilisation et le règlement de participation pour continuer.",
          'Accept the terms of use and the participation rules to continue.'
        )
      );
      return;
    }
    if (!isValidEmail(email)) {
      setErrorMessage(t('Veuillez saisir une adresse email valide.', 'Please enter a valid email address.'));
      return;
    }

    const seed = email.trim().toLowerCase();
    setPendingProvider(provider);
    try {
      const result = await loginWithSocial({
        walletAddress: generateDeterministicWallet(seed),
        email: seed,
        provider,
        isAdultConfirmed: true,
        acceptTerms: true,
        ageGroup,
        ...(referralCode.trim() ? { referralCode: referralCode.trim() } : {}),
        utmSource: getUtmSource(),
      });
      trackEvent(result.requiresTwoFactor ? 'LOGIN_2FA_REQUIRED' : 'LOGIN_SUCCESS', { ageGroup, provider });
      storage.remove(KEYS.referral);
      if (result.requiresTwoFactor) {
        router.push(`/connexion/verification${next ? `?next=${encodeURIComponent(next)}` : ''}`);
        return;
      }
      router.replace(next || homeForRole(result.user?.role));
    } catch (err) {
      setErrorMessage(
        getErrorMessage(err, t('Impossible de vous connecter au serveur.', 'Unable to connect to the server.'))
      );
    } finally {
      setPendingProvider(null);
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto grid min-h-dvh max-w-6xl lg:grid-cols-2 lg:gap-16">
        {}
        <aside className="hidden flex-col justify-center px-6 py-12 lg:flex">
          <Brand />
          <p className="mt-10 mb-4 self-start inline-flex rounded-full bg-sun-chip px-3 py-1 text-caption font-semibold text-on-sun dark:text-sun">
            {t('Avant de commencer', 'Before you start')}
          </p>
          <OnboardingCarousel />
          <p className="mt-6 text-caption text-fg-muted">
            {t(
              'Pilote pédagogique en ethers fictifs, sans valeur monétaire.',
              'Educational pilot using test ethers with no monetary value.'
            )}{' '}
            <Link href="/transparence" className="underline underline-offset-2 hover:text-fg">
              {t('Lire les règles', 'Read the rules')}
            </Link>
          </p>
        </aside>

        {}
        <main id="contenu" className="flex flex-col justify-center px-5 py-8 md:px-10 lg:px-6">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-6 flex items-center justify-between gap-3">
              <span className="lg:invisible">
                <Brand compact />
              </span>
              <PreferenceToggles compact />
            </div>

            {!onboardingDone ? (
              <div className="lg:hidden">
                <div className="mb-3 flex justify-end">
                  <button
                    type="button"
                    onClick={finishOnboarding}
                    className="rounded-full bg-surface px-3.5 py-1.5 text-caption font-semibold text-fg-secondary transition-colors hover:text-fg"
                  >
                    {t('Passer', 'Skip')}
                  </button>
                </div>
                <OnboardingCarousel onDone={finishOnboarding} />
              </div>
            ) : null}

            <div className={onboardingDone ? '' : 'hidden lg:block'}>
              <header className="mb-7">
                <h1 className="mb-2.5 text-[29px] leading-[36px] font-bold tracking-[-0.6px] md:text-display">
                  {isProSpace
                    ? t('Accès Mairie & partenaires', 'City Hall & partner access')
                    : t('Connexion citoyenne', 'Citizen Sign In')}
                </h1>
                <p className="text-body text-fg-secondary">
                  {isProSpace
                    ? t(
                        "Utilisez l'adresse email professionnelle enregistrée par la DSI d'EtherBay. Vous serez redirigé vers votre espace selon vos droits.",
                        'Use the work email registered by the EtherBay IT department. You will be redirected according to your permissions.'
                      )
                    : t(
                        'Accédez à la loterie municipale avec votre compte habituel. Votre portefeuille est généré automatiquement.',
                        'Access the municipal lottery with your account. Your wallet is generated automatically.'
                      )}
                </p>
              </header>

              <form
                className="flex flex-col"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleAuth('EMAIL');
                }}
                onFocus={markAccessStarted}
                noValidate
              >
                <div className="mb-5 flex gap-3.5 rounded-[23px] bg-lavender p-4">
                  <Icon name="idCard" size={29} className="text-violet" />
                  <div className="flex min-w-0 flex-1 flex-col gap-3">
                    <CheckboxCard id="terms" checked={termsAccepted} onChange={setTermsAccepted}>
                      {t("J'accepte les ", 'I accept the ')}
                      <Link href="/cgu" target="_blank" className="underline underline-offset-2 hover:text-fg-secondary">
                        {t("conditions générales d'utilisation", 'terms of use')}
                      </Link>
                      {t(' et le ', ' and the ')}
                      <Link href="/reglement" target="_blank" className="underline underline-offset-2 hover:text-fg-secondary">
                        {t('règlement de participation', 'participation rules')}
                      </Link>
                      .
                    </CheckboxCard>

                    <CheckboxCard id="adult" checked={isAdultConfirmed} onChange={setIsAdultConfirmed}>
                      {t('Je certifie être majeur (18 ans et plus)', 'I confirm that I am 18 years of age or older')}
                    </CheckboxCard>

                    {!isProSpace ? (
                      <div>
                        <p className="mb-1.5 text-caption font-semibold text-fg" id="age-label">
                          {t("Tranche d'âge", 'Age group')}
                        </p>
                        <ChoicePills
                          options={AGE_GROUPS}
                          value={ageGroup}
                          onChange={setAgeGroup}
                          ariaLabel={t("Tranche d'âge", 'Age group')}
                          size="sm"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                <Input
                  label={t('Adresse email', 'Email address')}
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isProSpace ? 'prenom.nom@etherbay.fr' : 'citoyen@etherbay.fr'}
                  required
                />

                {!isProSpace ? (
                  <Input
                    label={t('Code de parrainage (optionnel)', 'Referral code (optional)')}
                    value={referralCode}
                    onChange={(e) => setReferralInput(e.target.value)}
                    autoCapitalize="none"
                    placeholder={t('Code ambassadeur', 'Referral code')}
                  />
                ) : null}

                {errorMessage ? (
                  <Alert tone="error" className="mb-2.5">
                    {errorMessage}
                  </Alert>
                ) : null}

                <div className="mt-2 flex flex-col gap-3">
                  {!isProSpace ? (
                    <Button
                      onClick={() => void handleAuth('GOOGLE')}
                      loading={isLoggingIn && pendingProvider === 'GOOGLE'}
                      disabled={isLoggingIn && pendingProvider !== 'GOOGLE'}
                    >
                      <Icon name="google" size={18} />
                      {t('Continuer avec Google', 'Continue with Google')}
                    </Button>
                  ) : null}
                  <Button
                    type="submit"
                    variant={isProSpace ? 'primary' : 'outline'}
                    loading={isLoggingIn && pendingProvider === 'EMAIL'}
                    disabled={isLoggingIn && pendingProvider !== 'EMAIL'}
                  >
                    <Icon name={isProSpace ? 'arrowRight' : 'envelope'} size={18} />
                    {isProSpace
                      ? t('Accéder à mon espace', 'Open my area')
                      : t('Connexion par email sans mot de passe', 'Passwordless Email Sign In')}
                  </Button>
                </div>
              </form>

              <p className="mt-6 px-3 text-center text-caption text-fg-muted">
                {t(
                  'En créant un compte, vous reconnaissez avoir lu la ',
                  'By creating an account, you acknowledge that you have read the '
                )}
                <Link href="/confidentialite" className="underline underline-offset-2 hover:text-fg">
                  {t('politique de confidentialité', 'privacy policy')}
                </Link>
                .
              </p>
              {isProSpace ? (
                <p className="mt-3 px-3 text-center text-caption text-fg-muted">
                  <Link href="/connexion" className="underline underline-offset-2 hover:text-fg">
                    {t('Je suis un habitant', 'I am a resident')}
                  </Link>
                </p>
              ) : null}
              <SecurityFooter className="mt-6" />
            </div>
          </div>
        </main>
      </div>

      <Sheet
        open={ageModalVisible}
        title={t('Vérification de majorité (18+)', 'Age Verification (18+)')}
        eyebrow={t('Cadre réglementaire', 'Regulatory Notice')}
        onClose={() => setAgeModalVisible(false)}
      >
        <span
          aria-hidden
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-lavender text-violet"
        >
          <Icon name="idCard" size={26} />
        </span>
        <p className="mb-[18px] text-body text-fg-secondary">
          {t(
            "La participation à la loterie de la Ville d'EtherBay est réservée aux personnes majeures (18 ans révolus).",
            'Participation in the City of EtherBay lottery is strictly reserved for adults (18 years and older).'
          )}
        </p>
        <div className="flex flex-col gap-2.5 pb-2">
          <Button
            onClick={() => {
              setIsAdultConfirmed(true);
              setAgeModalVisible(false);
            }}
          >
            {t("Je confirme avoir 18 ans ou plus", 'I confirm I am 18 or older')}
          </Button>
          <Button variant="ghost" onClick={() => router.push('/')}>
            {t("J'ai moins de 18 ans", 'I am under 18')}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Loader />}>
      <LoginContent />
    </Suspense>
  );
}
