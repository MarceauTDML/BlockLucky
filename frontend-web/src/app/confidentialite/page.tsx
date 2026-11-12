'use client';

import Link from 'next/link';
import React from 'react';
import { ConsentControls } from '@/components/layout/ConsentBanner';
import { LegalDocumentPage } from '@/components/layout/LegalPage';
import { useAppTheme } from '@/theme/ThemeProvider';

export default function ConfidentialitePage() {
  const { t } = useAppTheme();
  return (
    <LegalDocumentPage
      doc="confidentialite"
      extraSections={[
        {
          heading: t("Mon choix de mesure d'audience", 'My audience measurement choice'),
          body: (
            <div className="flex flex-col gap-3">
              <p>
                {t(
                  'La mesure du parcours et de l’origine de visite ne fonctionne sur le web qu’avec votre accord. Vous pouvez le donner ou le retirer ici à tout moment.',
                  'Journey and visit source measurement only runs on the website with your consent. You can give or withdraw it here at any time.'
                )}{' '}
                <Link href="/traceurs" className="font-semibold text-fg underline underline-offset-2">
                  {t('Politique relative aux traceurs', 'Tracker policy')}
                </Link>
              </p>
              <ConsentControls />
            </div>
          ),
        },
      ]}
    />
  );
}
