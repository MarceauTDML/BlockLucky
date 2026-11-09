'use client';

import React, { useEffect } from 'react';
import PublicShell from '@/components/layout/PublicShell';
import TransparencyCharter from '@/components/lottery/TransparencyCharter';
import { LinkButton } from '@/components/ui/Button';
import { trackEvent } from '@/lib/analytics';
import { useAppTheme } from '@/theme/ThemeProvider';

export default function TransparencePage() {
  const { t } = useAppTheme();

  useEffect(() => {
    trackEvent('rules_view');
  }, []);

  const rules = [
    t('Participation réservée aux personnes majeures (18 ans et plus).', 'Adults only (18 and over).'),
    t(
      'Un ticket coûte 0,01 ether fictif. Les frais réseau sont pris en charge par la ville.',
      'A ticket costs 0.01 test ether. Network fees are covered by the city.'
    ),
    t(
      'Chaque ticket rapporte 50 EtherPoints et un certificat commémoratif POAP.',
      'Each ticket earns 50 EtherPoints and a commemorative POAP certificate.'
    ),
    t(
      'Les participations ferment à l échéance affichée. Le tirage est réalisé par Chainlink VRF.',
      'Entries close at the displayed deadline. The draw is performed by Chainlink VRF.'
    ),
    t(
      'Un plafond personnel de tickets par tirage peut être défini à tout moment (jeu responsable).',
      'A personal ticket cap per draw can be set at any time (responsible play).'
    ),
    t(
      'En cas d annulation, toutes les participations sont remboursées automatiquement.',
      'If cancelled, all entries are refunded automatically.'
    ),
  ];

  return (
    <PublicShell>
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-14">
        <section className="card mb-8 p-5 md:p-8" aria-labelledby="regles-title">
          <p className="text-caption font-medium text-secondary">{t('Règles du jeu', 'Game rules')}</p>
          <h2 id="regles-title" className="mb-4 text-title font-bold">
            {t("L'essentiel en six points", 'The essentials in six points')}
          </h2>
          <ol className="grid gap-2.5 md:grid-cols-2">
            {rules.map((rule, idx) => (
              <li key={rule} className="flex gap-3 rounded-md bg-surface-elevated p-3">
                <span className="text-caption font-bold text-secondary tabular">{idx + 1}</span>
                <span className="text-small">{rule}</span>
              </li>
            ))}
          </ol>
          <div className="mt-5 max-w-xs">
            <LinkButton href="/connexion">{t('Je participe', 'I want to take part')}</LinkButton>
          </div>
        </section>

        <TransparencyCharter />
      </div>
    </PublicShell>
  );
}
