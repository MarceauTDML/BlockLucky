'use client';

import React from 'react';
import AppShell, { NavItem } from '@/components/layout/AppShell';
import RequireRole from '@/components/layout/RequireRole';
import { useAppTheme } from '@/theme/ThemeProvider';

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  const { t } = useAppTheme();
  const nav: NavItem[] = [
    { href: '/accueil', label: t('Accueil', 'Home'), icon: 'tabHome' },
    { href: '/billetterie', label: t('Tickets', 'Tickets'), icon: 'ticket' },
    { href: '/tirage', label: t('Tirage', 'Live Draw'), icon: 'trophy' },
    { href: '/boutique', label: t('Boutique', 'Shop'), icon: 'bag' },
    { href: '/profil', label: t('Profil', 'Profile'), icon: 'tabProfile' },
    { href: '/historique', label: t('Historique & POAP', 'History & POAP'), icon: 'tabTickets', desktopOnly: true },
    { href: '/boutique/mes-codes', label: t('Mes codes', 'My codes'), icon: 'giftTicket', desktopOnly: true },
    { href: '/profil/aide', label: t('Charte & aide', 'Charter & help'), icon: 'help', desktopOnly: true },
  ];

  return (
    <RequireRole>
      <AppShell navItems={nav} spaceLabel={t('Espace citoyen', 'Citizen area')} showCitizenActions>
        {children}
      </AppShell>
    </RequireRole>
  );
}
