'use client';

import Link from 'next/link';
import React, { useSyncExternalStore } from 'react';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import {
  closeConsentManager,
  ConsentState,
  getConsentState,
  isConsentManagerOpen,
  openConsentManager,
  setAudienceConsent,
  subscribeConsent,
} from '@/lib/consent';
import { useAppTheme } from '@/theme/ThemeProvider';

const SERVER_STATE = 'server';

const readSnapshot = (): string => `${getConsentState()}|${isConsentManagerOpen() ? 'open' : 'closed'}`;

export const useConsent = (): { state: ConsentState; managing: boolean } | null => {
  const snapshot = useSyncExternalStore(subscribeConsent, readSnapshot, () => SERVER_STATE);
  if (snapshot === SERVER_STATE) return null;
  const [state, manager] = snapshot.split('|') as [ConsentState, string];
  return { state, managing: manager === 'open' };
};

export const ConsentBanner: React.FC = () => {
  const { t } = useAppTheme();
  const consent = useConsent();
  if (!consent) return null;
  const { state, managing } = consent;
  if (state !== 'unknown' && !managing) return null;

  return (
    <section
      role="region"
      aria-labelledby="consentement-titre"
      className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-xl rounded-[24px] border border-[var(--card-border)] bg-surface p-5 shadow-[0_16px_40px_rgba(17,24,39,0.18)] md:bottom-5 md:p-6"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2 id="consentement-titre" className="flex items-center gap-2 text-subtitle font-bold">
          <Icon name="shield" size={18} />
          {t('Vos choix de traceurs', 'Your tracker choices')}
        </h2>
        {managing ? (
          <button
            type="button"
            onClick={closeConsentManager}
            aria-label={t('Fermer sans modifier', 'Close without changes')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-fg-secondary hover:text-fg"
          >
            <Icon name="close" size={16} />
          </button>
        ) : null}
      </div>
      <p className="text-small text-fg-secondary">
        {t(
          "Avec votre accord, BlockLucky enregistre l'origine de votre visite et mesure les étapes du parcours pour améliorer le service. Les éléments strictement nécessaires (session, langue, thème, code de parrainage) restent actifs. Refuser ne bloque ni la navigation ni la participation.",
          'With your consent, BlockLucky records where your visit comes from and measures journey steps to improve the service. Strictly necessary items (session, language, theme, referral code) stay active. Refusing blocks neither browsing nor taking part.'
        )}
      </p>
      {managing && state !== 'unknown' ? (
        <p className="mt-2 text-caption font-semibold text-fg-muted">
          {state === 'granted'
            ? t('Choix actuel : mesure acceptée.', 'Current choice: measurement accepted.')
            : t('Choix actuel : mesure refusée.', 'Current choice: measurement refused.')}
        </p>
      ) : null}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <Button variant="outline" size="sm" onClick={() => setAudienceConsent(false)}>
          {t('Tout refuser', 'Refuse all')}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setAudienceConsent(true)}>
          {t('Tout accepter', 'Accept all')}
        </Button>
      </div>
      <Link
        href="/traceurs"
        onClick={closeConsentManager}
        className="mt-3 inline-flex text-caption font-semibold text-fg-secondary underline underline-offset-2 hover:text-fg"
      >
        {t('Politique relative aux traceurs', 'Tracker policy')}
      </Link>
    </section>
  );
};

export const ConsentControls: React.FC = () => {
  const { t } = useAppTheme();
  const consent = useConsent();
  const state = consent?.state ?? 'unknown';
  const label =
    state === 'granted'
      ? t('Mesure d’audience acceptée sur cet appareil.', 'Audience measurement accepted on this device.')
      : state === 'denied'
        ? t('Mesure d’audience refusée sur cet appareil.', 'Audience measurement refused on this device.')
        : t('Aucun choix enregistré : la mesure est désactivée.', 'No choice saved: measurement is off.');

  return (
    <div className="flex flex-col gap-3">
      <p role="status" className="text-small font-semibold text-fg">
        {label}
      </p>
      <div className="flex flex-wrap gap-2.5">
        <Button
          variant="outline"
          size="sm"
          fullWidth={false}
          aria-pressed={state === 'denied'}
          onClick={() => setAudienceConsent(false)}
        >
          {t('Tout refuser', 'Refuse all')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          fullWidth={false}
          aria-pressed={state === 'granted'}
          onClick={() => setAudienceConsent(true)}
        >
          {t('Tout accepter', 'Accept all')}
        </Button>
        <Button variant="ghost" size="sm" fullWidth={false} onClick={openConsentManager}>
          {t('Gérer mes traceurs', 'Manage trackers')}
        </Button>
      </div>
    </div>
  );
};

export default ConsentBanner;
