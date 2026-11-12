'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import Icon from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import {
  getLegalDocument,
  LEGAL_DOC_ORDER,
  LEGAL_VERSION,
  LegalDocId,
  LegalDocument,
} from '@/content/legal';
import { LEGAL_PATHS, LEGAL_SHORT_LABELS } from '@/lib/legalPaths';
import { useAppTheme } from '@/theme/ThemeProvider';
import PublicShell from './PublicShell';

export interface LegalSectionView {
  heading: string;
  body: React.ReactNode;
}

export const legalSections = (document: LegalDocument): LegalSectionView[] =>
  document.sections.map((section) => ({
    heading: section.heading,
    body: (
      <div className="flex flex-col gap-3">
        {section.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {section.items?.length ? (
          <dl className="mt-1 flex flex-col divide-y divide-line rounded-[16px] border border-line">
            {section.items.map((item) => (
              <div key={item.title} className="flex flex-col gap-1 px-4 py-3 md:flex-row md:gap-6">
                <dt className="text-small font-semibold text-fg md:w-48 md:shrink-0">{item.title}</dt>
                <dd className="text-small">{item.text}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    ),
  }));

const anchorFor = (index: number) => `article-${index + 1}`;

const LegalSidebar: React.FC<{ sections: LegalSectionView[] }> = ({ sections }) => {
  const { language, t } = useAppTheme();
  const pathname = usePathname();
  const lang = language === 'EN' ? 'en' : 'fr';

  return (
    <aside className="order-last flex flex-col gap-6 lg:order-first lg:sticky lg:top-24 lg:w-64 lg:shrink-0 lg:self-start">
      <nav aria-label={t('Sur cette page', 'On this page')} className="hidden lg:block">
        <p className="mb-3 text-caption font-bold text-fg">{t('Sur cette page', 'On this page')}</p>
        <ol className="flex flex-col gap-2 border-l border-line">
          {sections.map((section, index) => (
            <li key={section.heading}>
              <a
                href={`#${anchorFor(index)}`}
                className="-ml-px block border-l-2 border-transparent py-0.5 pl-3 text-small text-fg-secondary transition-colors hover:border-fg hover:text-fg"
              >
                {section.heading}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <nav aria-label={t('Informations légales', 'Legal information')}>
        <p className="mb-3 text-caption font-bold text-fg">{t('Informations légales', 'Legal information')}</p>
        <ul className="flex flex-col gap-1">
          {LEGAL_DOC_ORDER.map((id) => {
            const href = LEGAL_PATHS[id];
            const active = pathname === href;
            return (
              <li key={id}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center justify-between rounded-[12px] px-3 py-2 text-small transition-colors',
                    active
                      ? 'bg-sun-nav font-semibold text-on-sun-nav'
                      : 'text-fg-secondary hover:bg-surface-elevated hover:text-fg'
                  )}
                >
                  {LEGAL_SHORT_LABELS[id][lang]}
                  {active ? <Icon name="chevronRight" size={14} /> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export const LegalPage: React.FC<{
  eyebrow: string;
  title: string;
  updated: string;
  intro?: string;
  sections: LegalSectionView[];
}> = ({ eyebrow, title, updated, intro, sections }) => (
  <PublicShell>
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <header className="mb-8 max-w-3xl">
        <p className="mb-3 inline-flex rounded-full bg-sun-chip px-3 py-1 text-caption font-semibold text-on-sun dark:text-sun">
          {eyebrow}
        </p>
        <h1 className="mb-3 text-hero font-bold tracking-[-0.6px] md:text-display">{title}</h1>
        <p className="inline-flex items-center gap-1.5 text-caption font-medium text-fg-muted">
          <Icon name="clock" size={14} />
          {updated}
        </p>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        <LegalSidebar sections={sections} />

        <article className="card min-w-0 flex-1 p-6 md:p-10">
          {intro ? (
            <p className="mb-8 border-b border-line pb-8 text-body leading-7 text-fg-secondary">{intro}</p>
          ) : null}
          <div className="flex flex-col divide-y divide-line">
            {sections.map((section, index) => (
              <section
                key={section.heading}
                id={anchorFor(index)}
                className="scroll-mt-24 py-7 first:pt-0 last:pb-0"
              >
                <h2 className="mb-3 flex items-baseline gap-3 text-subtitle font-bold tracking-[-0.2px]">
                  <span className="text-small font-semibold text-fg-muted tabular">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {section.heading}
                </h2>
                <div className="text-body leading-7 text-fg-secondary">{section.body}</div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </div>
  </PublicShell>
);

export const LegalDocumentPage: React.FC<{
  doc: LegalDocId;
  extraSections?: LegalSectionView[];
}> = ({ doc, extraSections = [] }) => {
  const { language } = useAppTheme();
  const document = getLegalDocument(doc, language);
  return (
    <LegalPage
      eyebrow={document.eyebrow}
      title={document.title}
      updated={LEGAL_VERSION[language]}
      intro={document.intro}
      sections={[...legalSections(document), ...extraSections]}
    />
  );
};

export default LegalPage;
