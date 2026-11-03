import { useState, useCallback } from 'react';
import { useAppDispatch } from '../store';
import {
  showPointsPopup,
  showRetryModal,
  showSentryModal,
  showQueueModal,
} from '../store/slices/uiSlice';
import { updateUserPoints } from '../store/slices/authSlice';
import {
  useBuyTicketMutation,
  useGiftTicketMutation,
} from '../store/api/lotteryApi';
import sentryClient from '../services/sentry.client';

export const useGaslessWeb3 = () => {
  const dispatch = useAppDispatch();
  const [buyTicketMutation, { isLoading: isBuying }] = useBuyTicketMutation();
  const [giftTicketMutation, { isLoading: isGifting }] = useGiftTicketMutation();
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);

  const generateDeterministicWallet = useCallback((seed: string): string => {
    let hash = '';
    const cleanSeed = seed.toLowerCase().trim();
    for (let i = 0; i < 40; i++) {
      const charCode = cleanSeed.charCodeAt(i % cleanSeed.length) + i * 7;
      hash += (charCode % 16).toString(16);
    }
    const addr = `0x${hash}`;
    setConnectedWallet(addr);
    return addr;
  }, []);

  const purchaseGaslessTicket = useCallback(
    async (quantity = 1, retryAttempt = 0) => {
      try {
        const res = await buyTicketMutation({ quantity, retryAttempt }).unwrap();
        const data = res.data;

        dispatch(updateUserPoints(data.newPointsBalance));
        dispatch(
          showPointsPopup({
            amount: data.pointsAwarded,
            reason: `Achat Gasless de ${quantity} ticket(s) validé sur la Blockchain`,
          })
        );
        return data;
      } catch (err: any) {
        const status = err?.status;
        const message =
          err?.data?.message ||
          'Réseau blockchain momentanément congestionné. Veuillez relancer votre achat sans frais.';

        if (status === 429) {
          dispatch(showQueueModal(245));
          return null;
        }

        if (status === 503 || err?.data?.details?.canRetry) {
          dispatch(
            showRetryModal({
              message,
              retryAttempt: retryAttempt + 1,
            })
          );
          return null;
        }

        sentryClient.captureException(err, 'Erreur Transaction Gasless');
        dispatch(
          showSentryModal({
            title: 'Oups, réseau instable',
            message,
          })
        );
        return null;
      }
    },
    [buyTicketMutation, dispatch]
  );

  const sendGiftTicket = useCallback(
    async (recipientEmail: string, personalMessage?: string) => {
      try {
        const res = await giftTicketMutation({
          recipientEmail,
          personalMessage,
        }).unwrap();
        const data = res.data;

        dispatch(updateUserPoints(data.senderNewBalance));
        dispatch(
          showPointsPopup({
            amount: data.senderPointsAwarded,
            reason: `Ticket offert à ${recipientEmail} (+75 EtherPoints)`,
          })
        );
        return data;
      } catch (err: any) {
        const message =
          err?.data?.message || 'Impossible d envoyer le ticket cadeau pour le moment.';
        sentryClient.captureException(err, 'Erreur Cadeau Ticket');
        dispatch(
          showSentryModal({
            title: 'Envoi différé',
            message,
          })
        );
        return null;
      }
    },
    [dispatch, giftTicketMutation]
  );

  return {
    connectedWallet,
    isBuying,
    isGifting,
    generateDeterministicWallet,
    purchaseGaslessTicket,
    sendGiftTicket,
  };
};

export default useGaslessWeb3;
