'use client';

import React from 'react';
import AppShell, { NavItem } from '@/components/layout/AppShell';
import RequireRole from '@/components/layout/RequireRole';
import { PartnerSelectionProvider } from '@/components/partner/PartnerSelection';
import { useAppTheme } from '@/theme/ThemeProvider';

export default function PartenaireLayout({ children }: { children: React.ReactNode }) {
  const { t } = useAppTheme();
  const nav: NavItem[] = [
    { href: '/partenaire', label: t('Tableau de bord', 'Dashboard') },
    { href: '/partenaire/offres', label: t('Mes offres', 'My offers') },
    { href: '/partenaire/codes', label: t('Codes promo', 'Promo codes') },
    { href: '/partenaire/validation', label: t('Validation', 'Redeem') },
  ];

  return (
    <RequireRole roles={['PARTNER', 'ADMIN']}>
      <PartnerSelectionProvider>
        <AppShell navItems={nav} spaceLabel={t('Espace Partenaires', 'Partner area')}>
          {children}
        </AppShell>
      </PartnerSelectionProvider>
    </RequireRole>
  );
}
