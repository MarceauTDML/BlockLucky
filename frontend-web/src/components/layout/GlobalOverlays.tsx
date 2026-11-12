'use client';

import React from 'react';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
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
          className="card fixed top-4 left-4 right-4 z-[70] mx-auto flex max-w-md items-start gap-3 p-4 shadow-[0_12px_32px_rgba(29,38,55,0.14)] animate-bl-drop-in md:left-auto md:right-6"
        >
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sun-chip text-on-sun dark:text-sun"
          >
            <Icon name="bell" size={18} />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-caption font-semibold text-fg-muted">
              {t('Notification EtherBay', 'EtherBay Notification')}
            </p>
            <p className="font-bold">{osPushBanner.title}</p>
            <p className="text-caption text-fg-secondary">{osPushBanner.body}</p>
          </div>
        </div>
      ) : null}

      <Sheet
        open={pointsPopup.visible}
        title={t('Points crédités', 'Points Credited')}
        onClose={() => dispatch(hidePointsPopup())}
      >
        <div className="flex flex-col gap-3.5 pb-2 text-center">
          <div className="flex flex-col items-center gap-2 rounded-[24px] bg-sun px-4 py-6 text-on-sun">
            <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-full bg-sun-soft">
              <Icon name="star" size={26} />
            </span>
            <p className="text-display font-bold tracking-[-0.8px] tabular">+{pointsPopup.amount} pts</p>
          </div>
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
          <p className="flex items-start gap-2.5 rounded-[16px] bg-mint px-4 py-3 text-caption font-medium text-green">
            <Icon name="shield" size={16} className="mt-px" />
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
          <span aria-hidden className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lavender text-violet">
            <Icon name="clock" size={26} />
          </span>
          <p className="mx-auto inline-flex rounded-full bg-lavender px-4 py-1.5 text-subtitle font-bold text-violet">
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
            <div className="flex flex-col items-center gap-3 rounded-[20px] bg-surface-elevated px-4 py-8 text-center">
              <span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-fg-muted">
                <Icon name="bell" size={20} />
              </span>
              <p className="text-caption text-fg-muted">
                {t('Aucune notification pour le moment.', 'No notifications yet.')}
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <article
                key={n.id}
                className={cn(
                  'flex items-start gap-3 rounded-[20px] p-3.5',
                  n.read ? 'bg-surface-elevated' : 'bg-sun-chip'
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                    n.read ? 'bg-surface text-fg-secondary' : 'bg-sun text-on-sun'
                  )}
                >
                  <Icon name="bell" size={18} />
                </span>
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="font-bold">{n.title}</p>
                  <p className="text-caption text-fg-secondary">{n.body}</p>
                  <p className="text-caption text-fg-muted">{formatDateShort(n.createdAt)}</p>
                </div>
              </article>
            ))
          )}
        </div>
      </Sheet>
    </>
  );
};

export default GlobalOverlays;
