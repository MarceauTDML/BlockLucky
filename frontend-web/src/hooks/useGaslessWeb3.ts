'use client';

import { useCallback } from 'react';
import { useAppDispatch } from '@/store';
import {
  showPointsPopup,
  showQueueModal,
  showRetryModal,
  showSentryModal,
} from '@/store/slices/uiSlice';
import { updateUserPoints } from '@/store/slices/authSlice';
import { useBuyTicketMutation, useGiftTicketMutation } from '@/store/api/lotteryApi';
import { trackEvent } from '@/lib/analytics';
import { useAppTheme } from '@/theme/ThemeProvider';

interface ApiError {
  status?: number | string;
  data?: { message?: string; errors?: { canRetry?: boolean; circuitBreaker?: boolean } };
}

export const useGaslessWeb3 = () => {
  const dispatch = useAppDispatch();
  const { t } = useAppTheme();
  const [buyTicketMutation, { isLoading: isBuying }] = useBuyTicketMutation();
  const [giftTicketMutation, { isLoading: isGifting }] = useGiftTicketMutation();

  const purchaseGaslessTicket = useCallback(
    async (quantity = 1, retryAttempt = 0) => {
      trackEvent('ticket_submitted', { quantity, retryAttempt });
      try {
        const res = await buyTicketMutation({ quantity, retryAttempt }).unwrap();
        const data = res.data;
        trackEvent('ticket_confirmed', { quantity, tickets: data.tickets.length });
        dispatch(updateUserPoints(data.newPointsBalance));
        dispatch(
          showPointsPopup({
            amount: data.pointsAwarded,
            reason: t(
              `Achat sans frais de ${quantity} ticket(s) validé sur la blockchain`,
              `Gasless purchase of ${quantity} ticket(s) confirmed on-chain`
            ),
          })
        );
        return data;
      } catch (rawErr) {
        const err = rawErr as ApiError;
        const message =
          err?.data?.message ||
          t(
            'Réseau blockchain momentanément congestionné. Veuillez relancer votre achat sans frais.',
            'The blockchain network is congested. Please retry your gasless purchase.'
          );

        if (err?.status === 429) {
          dispatch(showQueueModal(245));
          return null;
        }
        if (err?.data?.errors?.circuitBreaker) {
          dispatch(
            showSentryModal({
              title: t('Participations suspendues', 'Entries paused'),
              message,
            })
          );
          return null;
        }
        if (err?.status === 503 || err?.data?.errors?.canRetry) {
          dispatch(showRetryModal({ message, retryAttempt: retryAttempt + 1, quantity }));
          return null;
        }
        dispatch(
          showSentryModal({
            title: t('Oups, réseau instable', 'Oops, unstable network'),
            message,
          })
        );
        return null;
      }
    },
    [buyTicketMutation, dispatch, t]
  );

  const sendGiftTicket = useCallback(
    async (recipientEmail: string, personalMessage?: string) => {
      try {
        const res = await giftTicketMutation({ recipientEmail, personalMessage }).unwrap();
        const data = res.data;
        dispatch(updateUserPoints(data.senderNewBalance));
        dispatch(
          showPointsPopup({
            amount: data.senderPointsAwarded,
            reason: t(
              `Ticket offert à ${recipientEmail}`,
              `Gift ticket sent to ${recipientEmail}`
            ),
          })
        );
        return data;
      } catch (rawErr) {
        const err = rawErr as ApiError;
        dispatch(
          showSentryModal({
            title: t('Envoi différé', 'Delivery delayed'),
            message:
              err?.data?.message ||
              t(
                "Impossible d'envoyer le ticket cadeau pour le moment.",
                'Unable to send the gift ticket right now.'
              ),
          })
        );
        return null;
      }
    },
    [dispatch, giftTicketMutation, t]
  );

  return { isBuying, isGifting, purchaseGaslessTicket, sendGiftTicket };
};

export default useGaslessWeb3;
