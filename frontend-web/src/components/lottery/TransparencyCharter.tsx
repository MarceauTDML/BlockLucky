'use client';

import React from 'react';
import Icon, { IconName } from '@/components/ui/Icon';
import { getLegalDocument, LEGAL_VERSION } from '@/content/legal';
import { useGetLotteryStatusQuery } from '@/store/api/lotteryApi';
import { useAppTheme } from '@/theme/ThemeProvider';

const SECTION_STYLES: { icon: IconName; tone: string }[] = [
  { icon: 'document', tone: 'bg-sun-soft text-on-sun' },
  { icon: 'shield', tone: 'bg-mint text-green' },
  { icon: 'check', tone: 'bg-lavender text-violet' },
  { icon: 'star', tone: 'bg-peach text-terracotta' },
];

const HARDHAT_CHAIN_ID = 31337;
const SEPOLIA_CHAIN_ID = 11155111;

type Environment = 'hardhat' | 'sepolia' | 'simulated' | null;

const ENVIRONMENT_ORDER: Exclude<Environment, null>[] = ['hardhat', 'sepolia', 'simulated'];

export const TransparencyCharter: React.FC<{ headingLevel?: 'h1' | 'h2' }> = ({ headingLevel = 'h1' }) => {
  const { language, t } = useAppTheme();
  const { data } = useGetLotteryStatusQuery();
  const blockchain = data?.data?.blockchain;
  const charter = getLegalDocument('transparence', language);
  const Heading = headingLevel;

  const environment: Environment =
    blockchain?.mode === 'simulated' || data?.data?.guarantees?.simulated
      ? 'simulated'
      : blockchain?.chainId === HARDHAT_CHAIN_ID
        ? 'hardhat'
        : blockchain?.chainId === SEPOLIA_CHAIN_ID
          ? 'sepolia'
          : null;

  return (
    <div className="flex flex-col gap-3.5">
      <div>
        <Heading className="text-title font-bold md:text-hero">{charter.title}</Heading>
        <p className="mt-1.5 inline-flex rounded-full bg-sun-chip px-3 py-1 text-caption font-semibold text-on-sun dark:text-sun">
          {t(`${LEGAL_VERSION.FR} • Ville d'EtherBay`, `${LEGAL_VERSION.EN} • City of EtherBay`)}
        </p>
        <p className="mt-3 max-w-3xl text-body text-fg-secondary">{charter.intro}</p>
      </div>
      <div className="grid gap-3.5 md:grid-cols-2">
        {charter.sections.map((sec, index) => (
          <section
            key={sec.heading}
            className={`card flex flex-col gap-3 p-5 ${sec.items?.length ? 'md:col-span-2' : ''}`}
          >
            <span
              aria-hidden
              className={`flex h-10 w-10 items-center justify-center rounded-full ${SECTION_STYLES[index % SECTION_STYLES.length].tone}`}
            >
              <Icon name={SECTION_STYLES[index % SECTION_STYLES.length].icon} size={20} />
            </span>
            <h2 className="text-subtitle font-bold">{sec.heading}</h2>
            {sec.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-body text-fg-secondary">
                {paragraph}
              </p>
            ))}
            {sec.items?.length ? (
              <dl className="grid gap-2.5 md:grid-cols-3">
                {sec.items.map((item, itemIndex) => {
                  const current = environment !== null && ENVIRONMENT_ORDER[itemIndex] === environment;
                  return (
                    <div
                      key={item.title}
                      className={`rounded-[18px] p-4 ${current ? 'bg-sun-chip' : 'bg-surface-elevated'}`}
                    >
                      <dt className="mb-1 flex flex-wrap items-center gap-2 text-small font-bold text-fg">
                        {item.title}
                        {current ? (
                          <span className="rounded-full bg-surface px-2 py-0.5 text-caption font-semibold">
                            {t('Environnement actuel', 'Current environment')}
                          </span>
                        ) : null}
                      </dt>
                      <dd className="text-small text-fg-secondary">{item.text}</dd>
                    </div>
                  );
                })}
              </dl>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
};

export default TransparencyCharter;
