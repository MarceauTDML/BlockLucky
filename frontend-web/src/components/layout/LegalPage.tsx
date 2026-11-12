'use client';

import React from 'react';
import Icon from '@/components/ui/Icon';
import PublicShell from './PublicShell';

export const LegalPage: React.FC<{
  eyebrow: string;
  title: string;
  updated: string;
  sections: { heading: string; body: React.ReactNode }[];
}> = ({ eyebrow, title, updated, sections }) => (
  <PublicShell>
    <article className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
      <p className="mb-3 inline-flex rounded-full bg-sun-chip px-3 py-1 text-caption font-semibold text-on-sun dark:text-sun">
        {eyebrow}
      </p>
      <h1 className="mb-2 text-hero font-bold tracking-[-0.6px] md:text-display">{title}</h1>
      <p className="mb-8 inline-flex items-center gap-1.5 text-caption font-medium text-fg-muted">
        <Icon name="clock" size={14} />
        {updated}
      </p>
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
    </article>
  </PublicShell>
);

export default LegalPage;
