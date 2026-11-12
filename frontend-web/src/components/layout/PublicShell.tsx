'use client';

import Link from 'next/link';
import React from 'react';
import { LinkButton } from '@/components/ui/Button';
import { homeForRole } from '@/hooks/useAuth';
import { openConsentManager } from '@/lib/consent';
import { LEGAL_PATHS } from '@/lib/legalPaths';
import { useAppSelector } from '@/store';
import { useAppTheme } from '@/theme/ThemeProvider';
import Brand from './Brand';
import PreferenceToggles from './PreferenceToggles';
import SecurityFooter from './SecurityFooter';

const footerHeading = 'mb-3 text-caption font-bold tracking-[0.2px] text-fg';

const footerLink =
  'text-small text-fg-secondary underline-offset-4 transition-colors hover:text-fg hover:underline';

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
        <div className="card mx-auto max-w-6xl p-6 md:p-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="max-w-sm md:col-span-2">
              <Brand />
              <p className="mt-3 text-caption leading-5 text-fg-secondary">
                {t(
                  "Pilote pédagogique de la Ville d'EtherBay en partenariat avec Epitech Digital School. Participation réservée aux personnes majeures, en ethers fictifs sans valeur monétaire.",
                  'Educational pilot by the City of EtherBay with Epitech Digital School. Adults only, using test ethers with no monetary value.'
                )}
              </p>
            </div>

            <nav aria-labelledby="footer-participer">
              <h2 id="footer-participer" className={footerHeading}>
                {t('Participer', 'Take part')}
              </h2>
              <ul className="flex flex-col gap-2.5">
                <li>
                  <Link href={LEGAL_PATHS.reglement} className={footerLink}>
                    {t('Règlement de participation', 'Participation rules')}
                  </Link>
                </li>
                <li>
                  <Link href={LEGAL_PATHS.transparence} className={footerLink}>
                    {t('Charte de transparence', 'Transparency charter')}
                  </Link>
                </li>
                <li>
                  <Link href="/connexion?espace=pro" className={footerLink}>
                    {t('Accès Mairie et partenaires', 'City Hall and partners')}
                  </Link>
                </li>
              </ul>
            </nav>

            <nav aria-labelledby="footer-legal">
              <h2 id="footer-legal" className={footerHeading}>
                {t('Informations légales', 'Legal information')}
              </h2>
              <ul className="flex flex-col gap-2.5">
                <li>
                  <Link href={LEGAL_PATHS.cgu} className={footerLink}>
                    {t("Conditions d'utilisation", 'Terms of use')}
                  </Link>
                </li>
                <li>
                  <Link href={LEGAL_PATHS.mentions} className={footerLink}>
                    {t('Mentions légales', 'Legal notice')}
                  </Link>
                </li>
                <li>
                  <Link href={LEGAL_PATHS.confidentialite} className={footerLink}>
                    {t('Confidentialité', 'Privacy')}
                  </Link>
                </li>
                <li>
                  <Link href={LEGAL_PATHS.traceurs} className={footerLink}>
                    {t('Traceurs', 'Trackers')}
                  </Link>
                </li>
                <li>
                  <button type="button" onClick={openConsentManager} className={footerLink}>
                    {t('Gérer mes traceurs', 'Manage trackers')}
                  </button>
                </li>
              </ul>
            </nav>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-line pt-5 text-caption text-fg-muted md:flex-row md:items-center md:justify-between">
            <p>{t("© 2026 Ville d'EtherBay · Projet pédagogique", '© 2026 City of EtherBay · Educational project')}</p>
            <SecurityFooter className="justify-start md:justify-end" />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicShell;
