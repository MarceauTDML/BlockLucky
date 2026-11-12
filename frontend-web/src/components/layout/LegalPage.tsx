'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import Icon from '@/components/ui/Icon';
import {
  getLegalDocument,
  LEGAL_DOC_ORDER,
  LEGAL_VERSION,
  LegalDocId,
  LegalDocument,
} from '@/content/legal';
import { LEGAL_PATHS } from '@/lib/legalPaths';
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
      <div className="flex flex-col gap-2.5">
        {section.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {section.items?.length ? (
          <dl className="flex flex-col gap-2">
            {section.items.map((item) => (
              <div key={item.title} className="rounded-[16px] bg-surface-elevated p-3.5">
                <dt className="mb-0.5 text-small font-bold text-fg">{item.title}</dt>
                <dd className="text-small">{item.text}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    ),
  }));

export const LegalLinks: React.FC = () => {
  const { language, t } = useAppTheme();
  const pathname = usePathname();
  return (
    <nav aria-label={t('Informations légales', 'Legal information')} className="mt-8">
      <h2 className="mb-3 text-subtitle font-bold">{t('Informations légales', 'Legal information')}</h2>
      <ul className="flex flex-wrap gap-2 text-small font-semibold">
        {LEGAL_DOC_ORDER.map((id) => {
          const href = LEGAL_PATHS[id];
          const active = pathname === href;
          return (
            <li key={id}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={
                  active
                    ? 'inline-flex rounded-full bg-sun-chip px-3.5 py-2 text-on-sun dark:text-sun'
                    : 'inline-flex rounded-full bg-surface-elevated px-3.5 py-2 text-fg-secondary transition-colors hover:bg-sun-chip hover:text-fg'
                }
              >
                {getLegalDocument(id, language).title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
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
    <article className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
      <p className="mb-3 inline-flex rounded-full bg-sun-chip px-3 py-1 text-caption font-semibold text-on-sun dark:text-sun">
        {eyebrow}
      </p>
      <h1 className="mb-2 text-hero font-bold tracking-[-0.6px] md:text-display">{title}</h1>
      <p className="mb-6 inline-flex items-center gap-1.5 text-caption font-medium text-fg-muted">
        <Icon name="clock" size={14} />
        {updated}
      </p>
      {intro ? <p className="mb-8 text-body text-fg-secondary">{intro}</p> : null}
      <div className="flex flex-col gap-3.5">
        {sections.map((s, idx) => (
          <section key={s.heading} className="card flex gap-4 p-5 md:p-6">
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sun-chip text-small font-bold text-on-sun tabular dark:text-sun"
            >
              {idx + 1}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="mb-1.5 text-subtitle font-bold tracking-[-0.2px]">{s.heading}</h2>
              <div className="text-body text-fg-secondary">{s.body}</div>
            </div>
          </section>
        ))}
      </div>
      <LegalLinks />
    </article>
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
