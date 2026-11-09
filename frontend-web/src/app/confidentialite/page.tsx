'use client';

import React, { useSyncExternalStore } from 'react';
import LegalPage from '@/components/layout/LegalPage';
import { isTrackingOptedOut, setTrackingOptOut } from '@/lib/analytics';
import { useAppTheme } from '@/theme/ThemeProvider';

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export default function ConfidentialitePage() {
  const { t } = useAppTheme();
  const optedOut = useSyncExternalStore(subscribe, isTrackingOptedOut, () => false);

  const toggle = () => {
    setTrackingOptOut(!optedOut);
    listeners.forEach((l) => l());
  };

  return (
    <LegalPage
      eyebrow={t('Protection des données', 'Data protection')}
      title={t('Politique de confidentialité', 'Privacy policy')}
      updated={t('Version de travail du pilote — novembre 2026', 'Pilot working version — November 2026')}
      sections={[
        {
          heading: t('Responsable de traitement', 'Data controller'),
          body: t(
            "Ville d'EtherBay — Direction des Systèmes d'Information, avec l'appui technique de l'équipe BlockLucky (Epitech Digital School).",
            'City of EtherBay — IT Department, with technical support from the BlockLucky team (Epitech Digital School).'
          ),
        },
        {
          heading: t('Données collectées', 'Data collected'),
          body: t(
            "Adresse email, adresse de portefeuille générée, tranche d'âge déclarée, tickets, points, codes partenaires obtenus et événements de parcours anonymisés. Aucune donnée bancaire n'est demandée.",
            'Email address, generated wallet address, declared age group, tickets, points, partner codes and anonymised journey events. No banking data is requested.'
          ),
        },
        {
          heading: t('Blockchain et minimisation', 'Blockchain and minimisation'),
          body: t(
            "Seule l'adresse de portefeuille figure sur la blockchain ; votre email n'y est jamais inscrit. Conformément aux lignes directrices 02/2025 du CEPD, les données identifiantes restent hors chaîne afin de permettre l'exercice de vos droits.",
            'Only the wallet address is written on-chain; your email never is. In line with EDPB guidelines 02/2025, identifying data stays off-chain so that your rights can be exercised.'
          ),
        },
        {
          heading: t('Vos droits', 'Your rights'),
          body: t(
            "Accès, portabilité (export JSON) et effacement (anonymisation définitive) sont disponibles depuis Profil → Données personnelles. Vous pouvez aussi contacter le délégué à la protection des données de la ville.",
            'Access, portability (JSON export) and erasure (permanent anonymisation) are available from Profile → Personal data. You can also contact the city data protection officer.'
          ),
        },
        {
          heading: t("Mesure d'audience", 'Audience measurement'),
          body: (
            <div className="flex flex-col gap-3">
              <p>
                {t(
                  "Nous mesurons les six étapes du parcours (découverte, règles, accès, participation, reçu, résultat) et la source de visite, sans cookie ni traceur publicitaire, pour améliorer le service. Vous pouvez vous y opposer sur cet appareil.",
                  'We measure the six journey steps (discovery, rules, access, entry, receipt, result) and the visit source, without cookies or ad trackers, to improve the service. You can opt out on this device.'
                )}
              </p>
              <button
                type="button"
                onClick={toggle}
                aria-pressed={optedOut}
                className="self-start rounded-md border border-line bg-surface-elevated px-3.5 py-2 text-caption font-semibold text-fg hover:border-fg-muted"
              >
                {optedOut
                  ? t('Mesure désactivée — la réactiver', 'Measurement disabled — enable it')
                  : t("M'opposer à la mesure d'audience", 'Opt out of audience measurement')}
              </button>
            </div>
          ),
        },
        {
          heading: t('Durée de conservation', 'Retention'),
          body: t(
            "Les données sont conservées pendant la durée du pilote puis anonymisées au plus tard six mois après le bilan, sauf obligation légale contraire (durées à valider avec le DPO de la ville).",
            'Data is kept for the duration of the pilot and anonymised no later than six months after the review, unless legally required otherwise (to be validated with the city DPO).'
          ),
        },
      ]}
    />
  );
}
