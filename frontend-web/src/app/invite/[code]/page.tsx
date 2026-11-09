'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader } from '@/components/ui/Loader';
import { trackEvent } from '@/lib/analytics';
import storage, { KEYS } from '@/lib/storage';

export default function InvitePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();

  useEffect(() => {
    const code = String(params?.code || '').slice(0, 64);
    if (/^[a-z0-9-]{4,64}$/i.test(code)) {
      storage.set(KEYS.referral, code);
      if (!storage.get(KEYS.utm)) storage.set(KEYS.utm, 'referral');
      trackEvent('REFERRAL_LINK_OPENED');
    }
    router.replace('/');
  }, [params, router]);

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Loader message="Invitation en cours…" skeletonRows={0} />
    </div>
  );
}
