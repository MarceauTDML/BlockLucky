'use client';

import React from 'react';
import PublicShell from './PublicShell';

export const LegalPage: React.FC<{
  eyebrow: string;
  title: string;
  updated: string;
  sections: { heading: string; body: React.ReactNode }[];
}> = ({ eyebrow, title, updated, sections }) => (
  <PublicShell>
    <article className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
      <p className="text-caption font-medium text-secondary">{eyebrow}</p>
      <h1 className="text-title font-bold md:text-hero">{title}</h1>
      <p className="mb-8 text-caption text-fg-muted">{updated}</p>
      <div className="flex flex-col gap-3.5">
        {sections.map((s) => (
          <section key={s.heading} className="card p-4 md:p-5">
            <h2 className="mb-1.5 text-subtitle font-semibold">{s.heading}</h2>
            <div className="text-body text-fg-secondary">{s.body}</div>
          </section>
        ))}
      </div>
    </article>
  </PublicShell>
);

export default LegalPage;
