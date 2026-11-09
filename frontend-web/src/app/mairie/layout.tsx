'use client';

import React from 'react';
import AppShell, { NavItem } from '@/components/layout/AppShell';
import RequireRole from '@/components/layout/RequireRole';
import { useAppTheme } from '@/theme/ThemeProvider';

export default function MairieLayout({ children }: { children: React.ReactNode }) {
  const { t } = useAppTheme();
  const nav: NavItem[] = [
    { href: '/mairie', label: t('Pilotage', 'Overview'), match: ['/mairie/tableau-de-bord'] },
    { href: '/mairie/analytique', label: t('Analytique', 'Analytics') },
    { href: '/mairie/partenaires', label: t('Partenaires', 'Partners') },
    { href: '/mairie/securite', label: t('Sécurité', 'Security') },
    { href: '/mairie/audit', label: t('Audit', 'Audit') },
  ];

  return (
    <RequireRole roles={['ADMIN']}>
      <AppShell navItems={nav} spaceLabel={t('Dashboard Mairie', 'City Hall Dashboard')}>
        {children}
      </AppShell>
    </RequireRole>
  );
}
