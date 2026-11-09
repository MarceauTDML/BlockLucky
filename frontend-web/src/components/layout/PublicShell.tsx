'use client';

import Link from 'next/link';
import React from 'react';
import { LinkButton } from '@/components/ui/Button';
import { homeForRole } from '@/hooks/useAuth';
import { useAppSelector } from '@/store';
import { useAppTheme } from '@/theme/ThemeProvider';
import Brand from './Brand';
import PreferenceToggles from './PreferenceToggles';

export const PublicShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useAppTheme();
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[80] focus:rounded-md focus:bg-surface focus:px-3 focus:py-2"
      >
        {t('Aller au contenu', 'Skip to content')}
      </a>
      <header className="sticky top-0 z-20 border-b border-line bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 md:px-6">
          <Brand />
          <nav aria-label={t('Navigation publique', 'Public navigation')} className="flex items-center gap-2 md:gap-4">
            <Link href="/transparence" className="hidden text-small text-fg-secondary hover:text-fg md:inline">
              {t('Règles & transparence', 'Rules & transparency')}
            </Link>
            <PreferenceToggles compact className="hidden sm:flex" />
            <LinkButton
              href={isAuthenticated ? homeForRole(user?.role) : '/connexion'}
              size="sm"
              fullWidth={false}
            >
              {isAuthenticated ? t('Mon espace', 'My area') : t('Participer', 'Take part')}
            </LinkButton>
          </nav>
        </div>
      </header>

      <main id="contenu" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 md:flex-row md:items-start md:justify-between md:px-6">
          <div className="max-w-sm">
            <Brand />
            <p className="mt-2 text-caption text-fg-muted">
              {t(
                "Pilote pédagogique de la Ville d'EtherBay en partenariat avec Epitech Digital School. Participation réservée aux personnes majeures, en ethers fictifs sans valeur monétaire.",
                'Educational pilot by the City of EtherBay with Epitech Digital School. Adults only, using test ethers with no monetary value.'
              )}
            </p>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-small text-fg-secondary">
            <li>
              <Link href="/transparence" className="hover:text-fg">
                {t('Charte de transparence', 'Transparency charter')}
              </Link>
            </li>
            <li>
              <Link href="/confidentialite" className="hover:text-fg">
                {t('Confidentialité (RGPD)', 'Privacy (GDPR)')}
              </Link>
            </li>
            <li>
              <Link href="/mentions-legales" className="hover:text-fg">
                {t('Conditions & jeu responsable', 'Terms & responsible play')}
              </Link>
            </li>
            <li>
              <Link href="/connexion?espace=pro" className="hover:text-fg">
                {t('Accès Mairie & partenaires', 'City Hall & partners')}
              </Link>
            </li>
          </ul>
        </div>
      </footer>
    </div>
  );
};

export default PublicShell;
