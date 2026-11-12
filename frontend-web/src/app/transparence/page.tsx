'use client';

import Link from 'next/link';
import React, { useEffect } from 'react';
import PublicShell from '@/components/layout/PublicShell';
import TransparencyCharter from '@/components/lottery/TransparencyCharter';
import { LinkButton } from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import { trackEvent } from '@/lib/analytics';
import { useAppTheme } from '@/theme/ThemeProvider';

export default function TransparencePage() {
  const { t } = useAppTheme();

  useEffect(() => {
    trackEvent('rules_view');
  }, []);

  const rules = [
    t(
      'Participation réservée aux personnes majeures dont l’âge a été vérifié par la Mairie.',
      'Adults only, with age verified by City Hall.'
    ),
    t(
      'Un ticket coûte 0,01 ether de test par défaut, payé par votre portefeuille BlockLucky intégré grâce à la dotation de bienvenue de la Mairie.',
      'A ticket costs 0.01 test ether by default, paid by your integrated BlockLucky wallet from the City Hall welcome grant.'
    ),
    t('Un seul ticket par participant et par tirage.', 'One ticket per participant per draw.'),
    t(
      'Chaque ticket rapporte 50 EtherPoints et un certificat commémoratif POAP.',
      'Each ticket earns 50 EtherPoints and a commemorative POAP certificate.'
    ),
    t(
      'Les participations ferment à l’échéance affichée. Le contrat sélectionne le ticket gagnant à partir d’une demande d’aléa.',
      'Entries close at the displayed deadline. The contract selects the winning ticket from a randomness request.'
    ),
    t(
      'Si le seuil minimum n’est pas atteint, le tour est annulé et le ticket est remboursé en ETH de test.',
      'If the minimum threshold is not met, the round is cancelled and the ticket is refunded in test ETH.'
    ),
  ];

  return (
    <PublicShell>
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-14">
        <section
          className="mb-8 rounded-[28px] bg-sun p-6 text-on-sun shadow-[0_16px_40px_rgba(172,141,10,0.2)] md:p-8"
          aria-labelledby="regles-title"
        >
          <p className="mb-3 inline-flex rounded-full bg-sun-soft px-3 py-1 text-caption font-semibold">
            {t('Règles du jeu', 'Game rules')}
          </p>
          <h2 id="regles-title" className="mb-5 text-hero font-bold tracking-[-0.6px] md:text-display">
            {t("L'essentiel en six points", 'The essentials in six points')}
          </h2>
          <ol className="grid gap-2.5 md:grid-cols-2">
            {rules.map((rule, idx) => (
              <li key={rule} className="flex items-start gap-3 rounded-[20px] bg-surface p-4 text-fg">
                <span
                  aria-hidden
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sun-chip text-caption font-bold text-on-sun tabular dark:text-sun"
                >
                  {idx + 1}
                </span>
                <span className="text-small font-medium">{rule}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-small font-semibold">
            <Link href="/reglement" className="underline underline-offset-2">
              {t('Lire le règlement de participation complet', 'Read the full participation rules')}
            </Link>
          </p>
          <div className="mt-6 max-w-xs">
            <LinkButton href="/connexion" variant="secondary">
              {t('Je participe', 'I want to take part')}
              <Icon name="arrowRight" size={18} />
            </LinkButton>
          </div>
        </section>

        <TransparencyCharter />
      </div>
    </PublicShell>
  );
}
