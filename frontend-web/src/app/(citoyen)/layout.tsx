'use client';

import React from 'react';
import AppShell, { NavItem } from '@/components/layout/AppShell';
import RequireRole from '@/components/layout/RequireRole';
import { useAppTheme } from '@/theme/ThemeProvider';

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  const { t } = useAppTheme();
  const nav: NavItem[] = [
    { href: '/accueil', label: t('Accueil', 'Home') },
    { href: '/billetterie', label: t('Tickets', 'Tickets') },
    { href: '/tirage', label: t('Tirage', 'Live Draw') },
    { href: '/boutique', label: t('Boutique', 'Shop') },
    { href: '/profil', label: t('Profil', 'Profile') },
    { href: '/historique', label: t('Historique & POAP', 'History & POAP'), desktopOnly: true },
    { href: '/boutique/mes-codes', label: t('Mes codes', 'My codes'), desktopOnly: true },
    { href: '/profil/aide', label: t('Charte & aide', 'Charter & help'), desktopOnly: true },
  ];

  return (
    <RequireRole>
      <AppShell navItems={nav} spaceLabel={t('Espace citoyen', 'Citizen area')} showCitizenActions>
        {children}
      </AppShell>
    </RequireRole>
  );
}
