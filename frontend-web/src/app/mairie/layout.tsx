'use client';

import React from 'react';
import AppShell, { NavItem } from '@/components/layout/AppShell';
import RequireRole from '@/components/layout/RequireRole';
import { useAppTheme } from '@/theme/ThemeProvider';

export default function MairieLayout({ children }: { children: React.ReactNode }) {
  const { t } = useAppTheme();
  const nav: NavItem[] = [
    { href: '/mairie', label: t('Pilotage', 'Overview'), icon: 'tabHome', match: ['/mairie/tableau-de-bord'] },
    { href: '/mairie/analytique', label: t('Analytique', 'Analytics'), icon: 'star' },
    { href: '/mairie/partenaires', label: t('Partenaires', 'Partners'), icon: 'users' },
    { href: '/mairie/identites', label: t('Identités', 'Identities'), icon: 'idCard' },
    { href: '/mairie/securite', label: t('Sécurité', 'Security'), icon: 'shield' },
    { href: '/mairie/audit', label: t('Audit', 'Audit'), icon: 'document' },
  ];

  return (
    <RequireRole roles={['ADMIN']}>
      <AppShell navItems={nav} spaceLabel={t('Dashboard Mairie', 'City Hall Dashboard')}>
        {children}
      </AppShell>
    </RequireRole>
  );
}
