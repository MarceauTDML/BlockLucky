'use client';

import React from 'react';
import { LinkButton } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Misc';
import { getErrorMessage } from '@/store/api/baseApi';
import { useAppTheme } from '@/theme/ThemeProvider';

const isMfaRequired = (error: unknown): boolean => {
  const e = error as { status?: number | string; data?: { errors?: { code?: string } } } | undefined;
  return e?.status === 403 && e.data?.errors?.code === 'ADMIN_MFA_REQUIRED';
};

export const AdminQueryError: React.FC<{ error: unknown; fallback: string; className?: string }> = ({
  error,
  fallback,
  className,
}) => {
  const { t } = useAppTheme();

  if (isMfaRequired(error)) {
    return (
      <Alert tone="warning" className={className}>
        <span className="flex flex-col gap-2.5">
          <span>
            {t(
              "La double authentification est obligatoire pour les comptes de la Mairie. Activez-la pour accéder au dashboard.",
              'Two-factor authentication is required for City Hall accounts. Enable it to access the dashboard.'
            )}
          </span>
          <LinkButton href="/profil/securite/2fa" size="sm" className="self-start">
            {t('Activer la double authentification', 'Enable two-factor authentication')}
          </LinkButton>
        </span>
      </Alert>
    );
  }

  return (
    <Alert tone="error" className={className}>
      {getErrorMessage(error, fallback)}
    </Alert>
  );
};

export default AdminQueryError;
