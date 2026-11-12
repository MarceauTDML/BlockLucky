'use client';

import React from 'react';
import Icon, { IconName } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Loader';
import { useGetTransparencyCharterQuery } from '@/store/api/lotteryApi';
import { useAppTheme } from '@/theme/ThemeProvider';

const SECTION_STYLES: { icon: IconName; tone: string }[] = [
  { icon: 'document', tone: 'bg-sun-soft text-on-sun' },
  { icon: 'shield', tone: 'bg-mint text-green' },
  { icon: 'check', tone: 'bg-lavender text-violet' },
  { icon: 'star', tone: 'bg-peach text-terracotta' },
];

export const TransparencyCharter: React.FC<{ headingLevel?: 'h1' | 'h2' }> = ({ headingLevel = 'h1' }) => {
  const { language, t } = useAppTheme();
  const { data, isLoading } = useGetTransparencyCharterQuery();
  const charter = data?.data;
  const Heading = headingLevel;

  const fallbackSections = [
    {
      heading: t('1. Registre public Ethereum', '1. Public Ethereum Ledger'),
      body: t(
        'Chaque participation et chaque tirage sont inscrits de façon immuable sur la blockchain. Aucune intervention humaine ne peut modifier le résultat.',
        'Every entry and draw is immutably recorded on the blockchain. No human intervention can alter the outcome.'
      ),
    },
    {
      heading: t('2. Tirage aléatoire certifié (Chainlink VRF)', '2. Certified Randomness (Chainlink VRF)'),
      body: t(
        "Le gagnant est désigné par un oracle cryptographique vérifiable qui génère une preuve mathématique d'impartialité.",
        'The winner is selected by a verifiable cryptographic oracle that generates a mathematical proof of fairness.'
      ),
    },
    {
      heading: t('3. Remboursement automatique', '3. Automatic Refund Guarantee'),
      body: t(
        "Le Smart Contract intègre une clause de remboursement automatique : si le tirage est annulé, l'intégralité des fonds engagés est restituée.",
        'The Smart Contract includes an automatic refund clause: if the draw is cancelled, 100% of committed funds are returned.'
      ),
    },
    {
      heading: t('4. Ethers fictifs', '4. Test ethers'),
      body: t(
        "Ce pilote pédagogique fonctionne exclusivement avec des unités de test sans valeur monétaire. Aucune somme d'argent réelle n'est collectée ni redistribuée.",
        'This educational pilot only uses test units with no monetary value. No real money is collected or paid out.'
      ),
    },
  ];

  const sections = language === 'FR' && charter?.sections?.length ? charter.sections : fallbackSections;

  return (
    <div className="flex flex-col gap-3.5">
      <div>
        <Heading className="text-title font-bold md:text-hero">
          {language === 'FR' ? charter?.title || 'Charte de transparence' : 'Transparency Charter'}
        </Heading>
        <p className="mt-1.5 inline-flex rounded-full bg-sun-chip px-3 py-1 text-caption font-semibold text-on-sun dark:text-sun">
          {t(
            `Version ${charter?.version || '2026.1'} • Ville d'EtherBay`,
            `Version ${charter?.version || '2026.1'} • City of EtherBay`
          )}
        </p>
      </div>
      {isLoading ? (
        <>
          <Skeleton className="h-24 w-full rounded-[24px]" />
          <Skeleton className="h-24 w-full rounded-[24px]" />
        </>
      ) : (
        <div className="grid gap-3.5 md:grid-cols-2">
          {sections.map((sec, index) => (
            <section key={sec.heading} className="card flex flex-col gap-3 p-5">
              <span
                aria-hidden
                className={`flex h-10 w-10 items-center justify-center rounded-full ${SECTION_STYLES[index % SECTION_STYLES.length].tone}`}
              >
                <Icon name={SECTION_STYLES[index % SECTION_STYLES.length].icon} size={20} />
              </span>
              <h2 className="text-subtitle font-bold">{sec.heading}</h2>
              <p className="text-body text-fg-secondary">{sec.body}</p>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default TransparencyCharter;
