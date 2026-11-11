'use client';

import React from 'react';
import Button from '@/components/ui/Button';
import Sheet from '@/components/ui/Sheet';
import { cn } from '@/lib/cn';
import { formatDateShort } from '@/lib/date';
import useBlockLuckyWallet from '@/hooks/useBlockLuckyWallet';
import usePushNotifications from '@/hooks/usePushNotifications';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  hidePointsPopup,
  hideQueueModal,
  hideRetryModal,
  hideSentryModal,
} from '@/store/slices/uiSlice';
import { useAppTheme } from '@/theme/ThemeProvider';

export const GlobalOverlays: React.FC = () => {
  const { t } = useAppTheme();
  const dispatch = useAppDispatch();
  const { purchaseTicket } = useBlockLuckyWallet();
  const { notifications, drawerOpen, closeDrawer, osPushBanner } = usePushNotifications();
  const { pointsPopup, retryModal, queueModal, sentryModal } = useAppSelector((s) => s.ui);

  return (
    <>
      {osPushBanner.visible ? (
        <div
          role="status"
          className="fixed top-4 left-4 right-4 z-[70] mx-auto flex max-w-md flex-col gap-0.5 rounded-lg border border-line bg-surface p-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.08)] animate-bl-drop-in md:left-auto md:right-6"
        >
          <p className="eyebrow-caps text-caption font-semibold text-secondary">
            {t('Notification EtherBay', 'EtherBay Notification')}
          </p>
          <p className="font-semibold">{osPushBanner.title}</p>
          <p className="text-caption text-fg-secondary">{osPushBanner.body}</p>
        </div>
      ) : null}

      <Sheet
        open={pointsPopup.visible}
        title={t('Points crédités', 'Points Credited')}
        onClose={() => dispatch(hidePointsPopup())}
      >
        <div className="flex flex-col gap-3.5 pb-2 text-center">
          <p className="text-hero font-bold text-primary">+{pointsPopup.amount} pts</p>
          <p className="text-body text-fg-secondary">{pointsPopup.reason}</p>
          <Button onClick={() => dispatch(hidePointsPopup())}>{t('Continuer', 'Continue')}</Button>
        </div>
      </Sheet>

      <Sheet
        open={retryModal.visible}
        title={t('Réseau encombré', 'Network Busy')}
        onClose={() => dispatch(hideRetryModal())}
      >
        <div className="flex flex-col gap-3.5 pb-2">
          <p className="text-body text-fg-secondary">{retryModal.message}</p>
          <p className="text-caption text-fg-muted">
            {t(
              'Votre demande précédente n a pas été validée : aucun ticket ni débit en double.',
              'Your previous request was not validated: no duplicate ticket or charge.'
            )}
          </p>
          <Button
            onClick={async () => {
              dispatch(hideRetryModal());
              await purchaseTicket(retryModal.quantity, retryModal.retryAttempt);
            }}
          >
            {t("Réessayer l'achat", 'Retry purchase')}
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={queueModal.visible}
        title={t("File d'attente active", 'Queue Active')}
        onClose={() => dispatch(hideQueueModal())}
      >
        <div className="flex flex-col gap-3.5 pb-2 text-center">
          <p className="text-subtitle font-semibold text-secondary">
            {t(`Position dans la file : ${queueModal.position}e`, `Queue position: #${queueModal.position}`)}
          </p>
          <p className="text-body text-fg-secondary">
            {t(
              'Forte affluence en cours. Votre transaction est mise en file d attente sécurisée.',
              'High traffic detected. Your transaction is safely queued.'
            )}
          </p>
          <Button onClick={() => dispatch(hideQueueModal())}>{t('Patienter', 'Wait in Queue')}</Button>
        </div>
      </Sheet>

      <Sheet
        open={sentryModal.visible}
        title={sentryModal.title || t('Information réseau', 'Network Notice')}
        onClose={() => dispatch(hideSentryModal())}
      >
        <div className="flex flex-col gap-3.5 pb-2">
          <p className="text-body text-fg-secondary">{sentryModal.message}</p>
          <Button variant="secondary" onClick={() => dispatch(hideSentryModal())}>
            {t('Fermer', 'Close')}
          </Button>
        </div>
      </Sheet>

      <Sheet open={drawerOpen} title={t('Notifications', 'Notifications')} onClose={closeDrawer}>
        <div className="flex flex-col gap-2.5 pb-2">
          {notifications.length === 0 ? (
            <p className="text-caption text-fg-muted">
              {t('Aucune notification pour le moment.', 'No notifications yet.')}
            </p>
          ) : (
            notifications.map((n) => (
              <article
                key={n.id}
                className={cn(
                  'flex flex-col gap-1 rounded-md border bg-surface-elevated p-3',
                  n.read ? 'border-line' : 'border-primary'
                )}
              >
                <p className="font-semibold">{n.title}</p>
                <p className="text-caption text-fg-secondary">{n.body}</p>
                <p className="text-caption text-fg-muted">{formatDateShort(n.createdAt)}</p>
              </article>
            ))
          )}
        </div>
      </Sheet>
    </>
  );
};

export default GlobalOverlays;
