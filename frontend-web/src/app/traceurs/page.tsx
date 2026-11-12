'use client';

import React from 'react';
import { ConsentControls } from '@/components/layout/ConsentBanner';
import { LegalDocumentPage } from '@/components/layout/LegalPage';
import { useAppTheme } from '@/theme/ThemeProvider';

export default function TraceursPage() {
  const { t } = useAppTheme();
  return (
    <LegalDocumentPage
      doc="traceurs"
      extraSections={[
        {
          heading: t('Gérer mes traceurs', 'Manage trackers'),
          body: <ConsentControls />,
        },
      ]}
    />
  );
}
