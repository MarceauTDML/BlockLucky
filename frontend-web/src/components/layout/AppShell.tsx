'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import Icon, { IconName } from '@/components/ui/Icon';
import { LEGAL_DOC_ORDER } from '@/content/legal';
import { cn } from '@/lib/cn';
import { openConsentManager } from '@/lib/consent';
import { LEGAL_PATHS, LEGAL_SHORT_LABELS } from '@/lib/legalPaths';
import { shortenWallet } from '@/lib/formatters';
import useAuth from '@/hooks/useAuth';
import usePoints from '@/hooks/usePoints';
import usePushNotifications from '@/hooks/usePushNotifications';
import { useAppTheme } from '@/theme/ThemeProvider';
import Brand from './Brand';
import PreferenceToggles from './PreferenceToggles';
import SecurityFooter from './SecurityFooter';

export interface NavItem {
  href: string;
  label: string;
  icon?: IconName;
  match?: string[];
  desktopOnly?: boolean;
}

const matchLength = (pathname: string, item: NavItem): number => {
  const prefixes = [item.href, ...(item.match || [])];
  return Math.max(
    0,
    ...prefixes.map((p) => (pathname === p || pathname.startsWith(`${p}/`) ? p.length : 0))
  );
};

const MAX_MOBILE_ITEMS = 5;

const findActiveHref = (pathname: string, items: NavItem[]): string | null => {
  let best: { href: string; len: number } | null = null;
  for (const item of items) {
    const len = matchLength(pathname, item);
    if (len > 0 && (!best || len > best.len)) best = { href: item.href, len };
  }
  return best?.href ?? null;
};

export const AppShell: React.FC<{
  navItems: NavItem[];
  spaceLabel: string;
  showCitizenActions?: boolean;
  children: React.ReactNode;
}> = ({ navItems, spaceLabel, showCitizenActions = false, children }) => {
  const pathname = usePathname() || '/';
  const { t } = useAppTheme();
  const { user, signOut } = useAuth();
  const allMobileItems = navItems.filter((i) => !i.desktopOnly);
  const hasOverflow = allMobileItems.length > MAX_MOBILE_ITEMS;
  const mobileItems = hasOverflow ? allMobileItems.slice(0, MAX_MOBILE_ITEMS - 1) : allMobileItems;
  const overflowItems = hasOverflow ? allMobileItems.slice(MAX_MOBILE_ITEMS - 1) : [];
  const activeHref = findActiveHref(pathname, navItems);
  const activeMobileHref = findActiveHref(pathname, allMobileItems);
  const overflowActive = overflowItems.some((i) => i.href === activeMobileHref);
  const [moreOpenOn, setMoreOpenOn] = useState<string | null>(null);
  const moreOpen = moreOpenOn === pathname;
  const setMoreOpen = (open: boolean) => setMoreOpenOn(open ? pathname : null);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpenOn(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[80] focus:rounded-full focus:bg-surface focus:px-4 focus:py-2"
      >
        {t('Aller au contenu', 'Skip to content')}
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[272px] flex-col p-4 lg:flex">
        <div className="flex h-full flex-col rounded-[28px] border border-[var(--card-border)] bg-surface shadow-[var(--card-shadow)]">
          <div className="px-5 pt-6 pb-5">
            <Brand />
            <p className="mt-3 inline-flex rounded-full bg-sun-chip px-3 py-1 text-caption font-semibold text-on-sun dark:text-sun">
              {spaceLabel}
            </p>
          </div>
          <nav aria-label={t('Navigation principale', 'Main navigation')} className="flex-1 overflow-y-auto px-3">
            <ul className="flex flex-col gap-1">
              {navItems.map((item) => {
                const active = item.href === activeHref;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-3 rounded-[16px] px-3.5 py-2.5 text-small transition-colors',
                        active
                          ? 'bg-sun-nav font-bold text-on-sun-nav'
                          : 'font-medium text-fg-secondary hover:bg-surface-elevated hover:text-fg'
                      )}
                    >
                      {item.icon ? <Icon name={item.icon} size={20} /> : null}
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="flex flex-col gap-3 p-4">
            <PreferenceToggles compact />
            {user ? (
              <div className="flex items-center justify-between gap-2 rounded-[16px] bg-surface-elevated px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-caption text-fg-muted">{user.role}</p>
                  <p className="truncate font-mono text-caption font-bold">{shortenWallet(user.walletAddress, 4)}</p>
                </div>
                <button
                  type="button"
                  onClick={signOut}
                  aria-label={t('Se déconnecter', 'Sign out')}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-error hover:bg-peach"
                >
                  <Icon name="logout" size={18} />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      <div className="lg:pl-[272px]">
        <header className="sticky top-0 z-20 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 md:px-6 lg:px-8">
            <div className="lg:hidden">
              <Brand compact />
            </div>
            <p className="hidden text-small font-semibold text-fg-secondary lg:block">{spaceLabel}</p>
            <div className="flex items-center gap-2">
              {showCitizenActions ? <CitizenHeaderActions /> : <PreferenceToggles compact className="lg:hidden" />}
            </div>
          </div>
        </header>

        <main
          id="contenu"
          className="mx-auto w-full max-w-6xl px-4 pt-3 pb-36 md:px-6 md:pt-5 lg:px-8 lg:pb-12"
        >
          {children}
          <ShellLegalLinks className="mt-12" />
        </main>
      </div>

      <nav
        aria-label={t('Navigation principale', 'Main navigation')}
        className="fixed inset-x-0 bottom-0 z-30 rounded-t-[24px] bg-surface px-3 pt-2.5 pb-[max(8px,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(29,38,55,0.06)] lg:hidden"
      >
        <ul className="mx-auto flex max-w-xl gap-1.5">
          {mobileItems.map((item) => {
            const active = item.href === activeMobileHref;
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 rounded-[17px] py-2 text-[10px] transition-colors',
                    active ? 'bg-sun-nav font-bold text-on-sun-nav' : 'font-medium text-fg-secondary hover:text-fg'
                  )}
                >
                  {item.icon ? <Icon name={item.icon} size={22} /> : <span className="h-[22px]" aria-hidden />}
                  {item.label}
                </Link>
              </li>
            );
          })}
          {hasOverflow ? (
            <li className="flex-1">
              <button
                type="button"
                onClick={() => setMoreOpen(!moreOpen)}
                aria-expanded={moreOpen}
                aria-controls="menu-plus"
                className={cn(
                  'flex w-full flex-col items-center justify-center gap-1 rounded-[17px] py-2 text-[10px] transition-colors',
                  overflowActive || moreOpen
                    ? 'bg-sun-nav font-bold text-on-sun-nav'
                    : 'font-medium text-fg-secondary hover:text-fg'
                )}
              >
                <Icon name="settings" size={22} />
                {t('Plus', 'More')}
              </button>
            </li>
          ) : null}
        </ul>
        {hasOverflow && moreOpen ? (
          <ul
            id="menu-plus"
            className="absolute right-3 bottom-full mb-2 flex min-w-48 flex-col gap-1 rounded-[20px] border border-[var(--card-border)] bg-surface p-1.5 shadow-[0_16px_40px_rgba(17,24,39,0.16)]"
          >
            {overflowItems.map((item) => {
              const active = item.href === activeMobileHref;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      'flex items-center gap-2.5 rounded-[14px] px-3.5 py-2.5 text-small transition-colors',
                      active
                        ? 'bg-sun-nav font-bold text-on-sun-nav'
                        : 'font-medium text-fg-secondary hover:bg-surface-elevated hover:text-fg'
                    )}
                  >
                    {item.icon ? <Icon name={item.icon} size={18} /> : null}
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
        <SecurityFooter className="mt-1.5" />
      </nav>
      {hasOverflow && moreOpen ? (
        <button
          type="button"
          aria-label={t('Fermer le menu', 'Close menu')}
          onClick={() => setMoreOpen(false)}
          className="fixed inset-0 z-20 cursor-default lg:hidden"
        />
      ) : null}
    </div>
  );
};

const ShellLegalLinks: React.FC<{ className?: string }> = ({ className }) => {
  const { language, t } = useAppTheme();
  return (
    <footer className={cn('border-t border-line pt-5 text-[11px] text-fg-muted', className)}>
      <nav aria-label={t('Informations légales', 'Legal information')}>
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
          {LEGAL_DOC_ORDER.map((id) => (
            <li key={id}>
              <Link href={LEGAL_PATHS[id]} className="transition-colors hover:text-fg hover:underline">
                {LEGAL_SHORT_LABELS[id][language === 'EN' ? 'en' : 'fr']}
              </Link>
            </li>
          ))}
          <li>
            <button type="button" onClick={openConsentManager} className="transition-colors hover:text-fg hover:underline">
              {t('Gérer mes traceurs', 'Manage trackers')}
            </button>
          </li>
        </ul>
      </nav>
      <p className="mt-2 text-center">
        {t("© 2026 Ville d'EtherBay · Projet pédagogique", '© 2026 City of EtherBay · Educational project')}
      </p>
      <div className="mt-1.5 hidden lg:block">
        <SecurityFooter />
      </div>
    </footer>
  );
};

const CitizenHeaderActions: React.FC = () => {
  const { t } = useAppTheme();
  const { user } = useAuth();
  const { pointsBalance } = usePoints();
  const { unreadCount, openDrawer } = usePushNotifications();

  return (
    <>
      <Link
        href="/historique"
        className="hidden items-center gap-2 rounded-full border border-[var(--card-border)] bg-surface py-1.5 pr-3.5 pl-1.5 shadow-[var(--card-shadow)] hover:bg-surface-elevated sm:flex"
        aria-label={t('Mon portefeuille et mes tickets', 'My wallet and tickets')}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-mint text-green">
          <Icon name="ticket" size={15} />
        </span>
        <span className="flex flex-col leading-none">
          <span className="text-[10px] font-medium text-fg-muted">{t('Portefeuille', 'Wallet')}</span>
          <span className="font-mono text-caption font-bold">{shortenWallet(user?.walletAddress, 4)}</span>
        </span>
      </Link>
      <Link
        href="/boutique"
        className="flex items-center gap-1.5 rounded-full bg-sun px-3.5 py-2 text-caption font-bold text-on-sun tabular hover:bg-sun-light"
        aria-label={t(`${pointsBalance} EtherPoints`, `${pointsBalance} EtherPoints`)}
      >
        <Icon name="star" size={14} />
        {Number(pointsBalance || 0)} pts
      </Link>
      <button
        type="button"
        onClick={openDrawer}
        aria-label={t(`Notifications (${unreadCount} non lues)`, `Notifications (${unreadCount} unread)`)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[var(--card-border)] bg-surface shadow-[var(--card-shadow)] hover:bg-surface-elevated"
      >
        <Icon name="bell" size={20} />
        {unreadCount > 0 ? (
          <span aria-hidden className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-coral ring-2 ring-surface" />
        ) : null}
      </button>
    </>
  );
};

export default AppShell;
