'use client';

import Link from 'next/link';
import React from 'react';
import { LinkButton } from '@/components/ui/Button';
import { homeForRole } from '@/hooks/useAuth';
import { useAppSelector } from '@/store';
import { useAppTheme } from '@/theme/ThemeProvider';
import Brand from './Brand';
import PreferenceToggles from './PreferenceToggles';
import SecurityFooter from './SecurityFooter';

const footerLink =
  'inline-flex rounded-full bg-surface-elevated px-3.5 py-2 text-fg-secondary transition-colors hover:bg-sun-chip hover:text-fg';

export const PublicShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useAppTheme();
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[80] focus:rounded-full focus:bg-surface focus:px-3 focus:py-2"
      >
        {t('Aller au contenu', 'Skip to content')}
      </a>
      <header className="sticky top-0 z-20 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 md:px-6">
          <Brand />
          <nav aria-label={t('Navigation publique', 'Public navigation')} className="flex items-center gap-2 md:gap-3">
            <Link href="/transparence" className="hidden rounded-full px-3.5 py-2 text-small font-semibold text-fg-secondary transition-colors hover:bg-surface hover:text-fg md:inline-flex">
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

      <footer className="px-4 pt-4 pb-8 md:px-6">
        <div className="card mx-auto flex max-w-6xl flex-col gap-6 p-6 md:flex-row md:items-start md:justify-between md:p-8">
          <div className="max-w-sm">
            <Brand />
            <p className="mt-3 text-caption text-fg-secondary">
              {t(
                "Pilote pédagogique de la Ville d'EtherBay en partenariat avec Epitech Digital School. Participation réservée aux personnes majeures, en ethers fictifs sans valeur monétaire.",
                'Educational pilot by the City of EtherBay with Epitech Digital School. Adults only, using test ethers with no monetary value.'
              )}
            </p>
          </div>
          <ul className="flex flex-wrap gap-2 text-small font-semibold md:max-w-md md:justify-end">
            <li>
              <Link href="/transparence" className={footerLink}>
                {t('Charte de transparence', 'Transparency charter')}
              </Link>
            </li>
            <li>
              <Link href="/confidentialite" className={footerLink}>
                {t('Confidentialité (RGPD)', 'Privacy (GDPR)')}
              </Link>
            </li>
            <li>
              <Link href="/mentions-legales" className={footerLink}>
                {t('Conditions & jeu responsable', 'Terms & responsible play')}
              </Link>
            </li>
            <li>
              <Link href="/connexion?espace=pro" className={footerLink}>
                {t('Accès Mairie & partenaires', 'City Hall & partners')}
              </Link>
            </li>
          </ul>
        </div>
        <SecurityFooter className="mt-5" />
      </footer>
    </div>
  );
};

export default PublicShell;
