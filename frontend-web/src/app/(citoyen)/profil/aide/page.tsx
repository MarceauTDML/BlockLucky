'use client';

import React from 'react';
import TransparencyCharter from '@/components/lottery/TransparencyCharter';
import BackButton from '@/components/ui/BackButton';
import Button from '@/components/ui/Button';
import usePushNotifications from '@/hooks/usePushNotifications';
import { useAppTheme } from '@/theme/ThemeProvider';

export default function HelpPage() {
  const { t } = useAppTheme();
  const { triggerSimulatedOsPush } = usePushNotifications();

  return (
    <div className="mx-auto max-w-4xl">
      <BackButton href="/profil" />
      <TransparencyCharter />

      <section className="mt-3.5 flex flex-col gap-2 rounded-lg border border-line bg-surface-elevated p-4">
        <h2 className="text-subtitle font-semibold">{t('Test de notification', 'Notification Test')}</h2>
        <p className="text-caption text-fg-secondary">
          {t(
            "Simulez l'affichage d'une bannière de notification en haut de l'écran.",
            'Simulate a push notification banner at the top of the screen.'
          )}
        </p>
        <div className="max-w-xs">
          <Button
            variant="secondary"
            onClick={() =>
              triggerSimulatedOsPush(
                t('Nouveau partenaire à EtherBay', 'New Partner in EtherBay'),
                t('La Boulangerie du Port propose -15% contre 100 points.', 'Harbor Bakery offers 15% off for 100 points.')
              )
            }
          >
            {t('Simuler une notification', 'Simulate Notification')}
          </Button>
        </div>
      </section>
    </div>
  );
}
