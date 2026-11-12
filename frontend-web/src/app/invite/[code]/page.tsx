'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Icon from '@/components/ui/Icon';
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
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-16">
      <div className="card flex w-full max-w-md flex-col items-center p-8">
        <span
          aria-hidden
          className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-sun-chip text-on-sun dark:text-sun"
        >
          <Icon name="giftTicket" size={28} />
        </span>
        <Loader message="Invitation en cours…" skeletonRows={0} />
      </div>
    </div>
  );
}
