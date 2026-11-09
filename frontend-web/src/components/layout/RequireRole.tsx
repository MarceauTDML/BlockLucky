'use client';

import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { Loader } from '@/components/ui/Loader';
import { useAppSelector } from '@/store';
import { Role } from '@/types/user.types';
import AccessDenied from './AccessDenied';

export const RequireRole: React.FC<{ roles?: Role[]; children: React.ReactNode }> = ({ roles, children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { hydrated, isAuthenticated, user } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace(`/connexion?next=${encodeURIComponent(pathname || '/accueil')}`);
    }
  }, [hydrated, isAuthenticated, pathname, router]);

  if (!hydrated || !isAuthenticated) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Loader message="Vérification de la session…" />
      </div>
    );
  }

  if (roles && user && !roles.includes(user.role)) {
    return <AccessDenied role={user.role} />;
  }

  return <>{children}</>;
};

export default RequireRole;
