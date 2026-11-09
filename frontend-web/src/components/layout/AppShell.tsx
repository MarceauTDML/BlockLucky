'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import { cn } from '@/lib/cn';
import { shortenWallet } from '@/lib/formatters';
import useAuth from '@/hooks/useAuth';
import usePoints from '@/hooks/usePoints';
import usePushNotifications from '@/hooks/usePushNotifications';
import { useAppTheme } from '@/theme/ThemeProvider';
import Brand from './Brand';
import PreferenceToggles from './PreferenceToggles';

export interface NavItem {
  href: string;
  label: string;
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
  const mobileItems = navItems.filter((i) => !i.desktopOnly).slice(0, 5);
  const activeHref = findActiveHref(pathname, navItems);
  const activeMobileHref = findActiveHref(pathname, mobileItems);

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[80] focus:rounded-md focus:bg-surface focus:px-3 focus:py-2"
      >
        {t('Aller au contenu', 'Skip to content')}
      </a>

      {}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface lg:flex">
        <div className="px-5 pt-6 pb-5">
          <Brand />
          <p className="mt-1 text-caption text-fg-muted">{spaceLabel}</p>
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
                      'relative flex items-center rounded-md px-3.5 py-2.5 text-small transition-colors',
                      active
                        ? 'bg-surface-elevated font-semibold text-primary'
                        : 'text-fg-secondary hover:bg-surface-elevated hover:text-fg'
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'absolute left-0 top-1/2 h-3.5 w-0.5 -translate-y-1/2 rounded-full',
                        active ? 'bg-primary' : 'bg-transparent'
                      )}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="flex flex-col gap-3 border-t border-line p-4">
          <PreferenceToggles compact />
          {user ? (
            <div className="flex items-center justify-between gap-2 rounded-md bg-surface-elevated px-3 py-2">
              <div className="min-w-0">
                <p className="text-caption text-fg-muted">{user.role}</p>
                <p className="truncate font-mono text-caption font-bold">{shortenWallet(user.walletAddress, 4)}</p>
              </div>
              <button
                type="button"
                onClick={signOut}
                className="rounded-sm px-2 py-1 text-caption font-medium text-error hover:bg-surface"
              >
                {t('Quitter', 'Sign out')}
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      <div className="lg:pl-64">
        {}
        <header className="sticky top-0 z-20 border-b border-line bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 md:px-6 lg:h-16 lg:px-8">
            <div className="lg:hidden">
              <Brand compact />
            </div>
            <p className="hidden text-caption text-fg-muted lg:block">{spaceLabel}</p>
            <div className="flex items-center gap-2">
              {showCitizenActions ? <CitizenHeaderActions /> : <PreferenceToggles compact className="lg:hidden" />}
            </div>
          </div>
        </header>

        <main
          id="contenu"
          className="mx-auto w-full max-w-6xl px-3.5 pt-4 pb-28 md:px-6 md:pt-6 lg:px-8 lg:pb-12"
        >
          {children}
        </main>
      </div>

      {}
      <nav
        aria-label={t('Navigation principale', 'Main navigation')}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-2.5 pt-2 pb-[max(10px,env(safe-area-inset-bottom))] lg:hidden"
      >
        <ul className="mx-auto flex max-w-xl gap-1">
          {mobileItems.map((item) => {
            const active = item.href === activeMobileHref;
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 rounded-md py-2 text-caption transition-colors',
                    active ? 'bg-surface-elevated font-semibold text-primary' : 'text-fg-muted hover:text-fg'
                  )}
                >
                  <span aria-hidden className={cn('h-0.5 w-3.5 rounded-full', active ? 'bg-primary' : 'bg-transparent')} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
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
        className="hidden items-center gap-2 rounded-md border border-line bg-surface px-[11px] py-[7px] hover:bg-surface-elevated sm:flex"
        aria-label={t('Mon portefeuille et mes tickets', 'My wallet and tickets')}
      >
        <span aria-hidden className={cn('h-[7px] w-[7px] rounded-full', user ? 'bg-primary' : 'bg-secondary')} />
        <span className="flex flex-col leading-none">
          <span className="text-caption text-fg-muted">{t('Portefeuille', 'Wallet')}</span>
          <span className="font-mono text-caption font-bold">{shortenWallet(user?.walletAddress, 4)}</span>
        </span>
      </Link>
      <Link
        href="/boutique"
        className="rounded-md border border-line bg-surface px-3 py-2 text-caption font-semibold text-secondary tabular hover:bg-surface-elevated"
        aria-label={t(`${pointsBalance} EtherPoints`, `${pointsBalance} EtherPoints`)}
      >
        {Number(pointsBalance || 0)} pts
      </Link>
      <button
        type="button"
        onClick={openDrawer}
        className="rounded-md border border-line bg-surface px-3 py-2 text-caption font-medium hover:bg-surface-elevated"
      >
        {t(`Alertes (${unreadCount})`, `Alerts (${unreadCount})`)}
      </button>
    </>
  );
};

export default AppShell;
