'use client';

import React from 'react';
import { LinkButton } from '@/components/ui/Button';
import { homeForRole } from '@/hooks/useAuth';
import { useAppTheme } from '@/theme/ThemeProvider';
import { Role } from '@/types/user.types';
import Icon from '@/components/ui/Icon';
import Brand from './Brand';
import SecurityFooter from './SecurityFooter';

export const AccessDenied: React.FC<{ role?: Role }> = ({ role }) => {
  const { t } = useAppTheme();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Brand />
        </div>
        <section className="card p-6 md:p-7" role="alert">
          <span
            aria-hidden
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-peach text-terracotta"
          >
            <Icon name="lock" size={24} />
          </span>
          <p className="inline-flex rounded-full bg-peach px-3 py-1 text-caption font-semibold text-error">
            {t('Accès restreint (403)', 'Restricted Access (403)')}
          </p>
          <h1 className="mt-3 mb-2 text-hero font-bold tracking-[-0.6px]">{t('Accès refusé', 'Access denied')}</h1>
          <p className="mb-6 text-body text-fg-secondary">
            {t(
              `Votre compte (${role || 'USER'}) ne dispose pas des droits nécessaires pour cet espace. L'administration du Smart Contract est réservée aux services municipaux d'EtherBay.`,
              `Your account (${role || 'USER'}) does not have the permissions required for this area. Smart Contract administration is restricted to EtherBay municipal staff.`
            )}
          </p>
          <LinkButton href={homeForRole(role)}>{t('Revenir à mon espace', 'Back to my area')}</LinkButton>
        </section>
        <SecurityFooter className="mt-6" />
      </div>
    </div>
  );
};

export default AccessDenied;
