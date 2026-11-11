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
import { baseApi } from '@/store/api/baseApi';
import {
  useBuyTicketMutation,
  useClaimPrizeMutation,
  useGiftTicketMutation,
} from '@/store/api/lotteryApi';
import { trackEvent } from '@/lib/analytics';
import { useAppTheme } from '@/theme/ThemeProvider';
import { ApiErrorPayload, ClaimPrizeResponse } from '@/types/api.types';

export type ClaimPrizeOutcome =
  | { status: 'claimed'; data: ClaimPrizeResponse }
  | { status: 'already-paid' }
  | { status: 'error'; tone: 'error' | 'warning'; message: string };

const isCircuitBreakerError = (err: ApiErrorPayload): boolean => Boolean(err?.data?.errors?.circuitBreaker);

const isInsufficientFundsError = (err: ApiErrorPayload): boolean =>
  err?.status === 402 || err?.data?.errors?.contractError === 'InsufficientFunds';

export const useBlockLuckyWallet = () => {
  const dispatch = useAppDispatch();
  const { t } = useAppTheme();
  const [buyTicketMutation, { isLoading: isBuying }] = useBuyTicketMutation();
  const [giftTicketMutation, { isLoading: isGifting }] = useGiftTicketMutation();
  const [claimPrizeMutation, { isLoading: isClaiming }] = useClaimPrizeMutation();

  const pausedMessage = useCallback(
    (err: ApiErrorPayload) =>
      err?.data?.message ||
      t(
        'Le Smart Contract est temporairement en pause de sécurité par la Mairie. Vos tickets restent valides.',
        'The Smart Contract is temporarily paused by City Hall for security. Your tickets remain valid.'
      ),
    [t]
  );

  const notifyChainError = useCallback(
    (
      err: ApiErrorPayload,
      fallback: { title: string; message: string },
      retry?: { quantity: number; retryAttempt: number }
    ) => {
      if (err?.status === 429) {
        dispatch(showQueueModal(245));
        return;
      }
      if (isCircuitBreakerError(err)) {
        dispatch(baseApi.util.invalidateTags(['Lottery']));
        dispatch(
          showSentryModal({
            title: t('Participations suspendues', 'Entries paused'),
            message: pausedMessage(err),
          })
        );
        return;
      }
      if (isInsufficientFundsError(err)) {
        dispatch(baseApi.util.invalidateTags(['Wallet']));
        dispatch(
          showSentryModal({
            title: t('Solde insuffisant', 'Insufficient balance'),
            message: t(
              "Le solde d'ethers fictifs de votre portefeuille BlockLucky ne couvre pas le prix du ticket et les frais réseau. Aucun ticket n'a été débité.",
              'Your BlockLucky wallet test-ether balance does not cover the ticket price and network fees. No ticket was charged.'
            ),
          })
        );
        return;
      }
      if (err?.status === 409) {
        dispatch(baseApi.util.invalidateTags(['Lottery']));
        dispatch(
          showSentryModal({
            title: t('Action impossible pour ce tour', 'Not available for this round'),
            message: err?.data?.message || fallback.message,
          })
        );
        return;
      }
      if (retry && (err?.status === 503 || err?.data?.errors?.canRetry)) {
        dispatch(
          showRetryModal({
            message: err?.data?.message || fallback.message,
            retryAttempt: retry.retryAttempt + 1,
            quantity: retry.quantity,
          })
        );
        return;
      }
      dispatch(showSentryModal({ title: fallback.title, message: err?.data?.message || fallback.message }));
    },
    [dispatch, pausedMessage, t]
  );

  const purchaseTicket = useCallback(
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
              `${quantity} ticket(s) signé(s) par votre portefeuille BlockLucky et validé(s) sur la blockchain`,
              `${quantity} ticket(s) signed by your BlockLucky wallet and confirmed on-chain`
            ),
          })
        );
        return data;
      } catch (rawErr) {
        notifyChainError(
          rawErr as ApiErrorPayload,
          {
            title: t('Oups, réseau instable', 'Oops, unstable network'),
            message: t(
              'Réseau blockchain momentanément congestionné. Veuillez relancer votre achat.',
              'The blockchain network is congested. Please retry your purchase.'
            ),
          },
          { quantity, retryAttempt }
        );
        return null;
      }
    },
    [buyTicketMutation, dispatch, notifyChainError, t]
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
        notifyChainError(rawErr as ApiErrorPayload, {
          title: t('Envoi différé', 'Delivery delayed'),
          message: t(
            "Impossible d'envoyer le ticket cadeau pour le moment.",
            'Unable to send the gift ticket right now.'
          ),
        });
        return null;
      }
    },
    [dispatch, giftTicketMutation, notifyChainError, t]
  );

  const claimPrize = useCallback(
    async (contractRoundId: number): Promise<ClaimPrizeOutcome> => {
      try {
        const res = await claimPrizeMutation({ contractRoundId }).unwrap();
        return { status: 'claimed', data: res.data };
      } catch (rawErr) {
        const err = rawErr as ApiErrorPayload;
        if (err?.data?.errors?.contractError === 'PrizeAlreadyClaimed') {
          dispatch(baseApi.util.invalidateTags(['Wallet']));
          return { status: 'already-paid' };
        }
        if (isCircuitBreakerError(err)) {
          dispatch(baseApi.util.invalidateTags(['Lottery']));
          return { status: 'error', tone: 'warning', message: pausedMessage(err) };
        }
        if (isInsufficientFundsError(err)) {
          return {
            status: 'error',
            tone: 'error',
            message: t(
              "Le solde d'ethers fictifs de votre portefeuille BlockLucky ne couvre pas les frais réseau du retrait.",
              'Your BlockLucky wallet test-ether balance does not cover the network fees for this withdrawal.'
            ),
          };
        }
        return {
          status: 'error',
          tone: 'error',
          message:
            err?.data?.message ||
            t(
              'Retrait momentanément impossible. Réessayez dans quelques instants.',
              'Withdrawal temporarily unavailable. Please retry shortly.'
            ),
        };
      }
    },
    [claimPrizeMutation, dispatch, pausedMessage, t]
  );

  return { isBuying, isGifting, isClaiming, purchaseTicket, sendGiftTicket, claimPrize };
};

export default useBlockLuckyWallet;
