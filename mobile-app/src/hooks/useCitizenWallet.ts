import { useCallback } from 'react';
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
  useClaimPrizeMutation,
} from '../store/api/lotteryApi';
import { ApiErrorDetails, ClaimPrizeResponse } from '../types/api.types';
import sentryClient from '../services/sentry.client';

export interface BlockchainErrorNotice {
  title: string;
  message: string;
}

export interface ClaimPrizeOutcome {
  status: 'CLAIMED' | 'ALREADY_CLAIMED' | 'FAILED';
  data?: ClaimPrizeResponse;
  message?: string;
}

const readErrorDetails = (err: any): ApiErrorDetails => {
  const details = err?.data?.errors ?? err?.data?.details;
  return details && typeof details === 'object' ? details : {};
};

export const describeBlockchainError = (err: any): BlockchainErrorNotice | null => {
  const status = err?.status;
  const details = readErrorDetails(err);
  const apiMessage: string | undefined = err?.data?.message;

  if (status === 402 || details.contractError === 'InsufficientFunds') {
    return {
      title: 'Solde insuffisant',
      message:
        'Votre portefeuille BlockLucky ne contient pas assez d ethers fictifs pour couvrir le prix du ticket et les frais de réseau.',
    };
  }

  if (status === 503 && details.circuitBreaker) {
    return {
      title: 'Loterie en pause',
      message:
        apiMessage ||
        'Le Smart Contract a été mis en pause de sécurité par la Mairie. Les opérations reprendront dès sa réactivation.',
    };
  }

  if (status === 409) {
    return {
      title: 'Opération impossible',
      message: apiMessage || 'Cette opération n est pas possible pour le moment.',
    };
  }

  return null;
};

export const useCitizenWallet = () => {
  const dispatch = useAppDispatch();
  const [buyTicketMutation, { isLoading: isBuying }] = useBuyTicketMutation();
  const [giftTicketMutation, { isLoading: isGifting }] = useGiftTicketMutation();
  const [claimPrizeMutation, { isLoading: isClaiming }] = useClaimPrizeMutation();

  const generateDeterministicWallet = useCallback((seed: string): string => {
    let hash = '';
    const cleanSeed = seed.toLowerCase().trim();
    for (let i = 0; i < 40; i++) {
      const charCode = cleanSeed.charCodeAt(i % cleanSeed.length) + i * 7;
      hash += (charCode % 16).toString(16);
    }
    return `0x${hash}`;
  }, []);

  const purchaseTickets = useCallback(
    async (quantity = 1, retryAttempt = 0) => {
      try {
        const res = await buyTicketMutation({ quantity, retryAttempt }).unwrap();
        const data = res.data;

        dispatch(updateUserPoints(data.newPointsBalance));
        dispatch(
          showPointsPopup({
            amount: data.pointsAwarded,
            reason: `Achat de ${quantity} ticket(s) signé par votre portefeuille BlockLucky`,
          })
        );
        return data;
      } catch (err: any) {
        const status = err?.status;
        const details = readErrorDetails(err);

        if (status === 429) {
          dispatch(showQueueModal(245));
          return null;
        }

        const notice = describeBlockchainError(err);
        if (notice) {
          dispatch(showSentryModal(notice));
          return null;
        }

        const message =
          err?.data?.message ||
          'Réseau blockchain momentanément congestionné. Veuillez relancer votre achat.';

        if (status === 503 || details.canRetry) {
          dispatch(
            showRetryModal({
              message,
              retryAttempt: retryAttempt + 1,
            })
          );
          return null;
        }

        sentryClient.captureException(err, 'Erreur Transaction Ticket');
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
        const notice = describeBlockchainError(err);
        if (notice) {
          dispatch(showSentryModal(notice));
          return null;
        }

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

  const claimPrize = useCallback(
    async (contractRoundId: number): Promise<ClaimPrizeOutcome> => {
      try {
        const res = await claimPrizeMutation({ contractRoundId }).unwrap();
        return { status: 'CLAIMED', data: res.data };
      } catch (err: any) {
        const status = err?.status;
        const details = readErrorDetails(err);

        if (status === 409 && details.contractError === 'PrizeAlreadyClaimed') {
          return {
            status: 'ALREADY_CLAIMED',
            message: 'La cagnotte a déjà été versée sur votre portefeuille BlockLucky.',
          };
        }

        if (status === 403) {
          return {
            status: 'FAILED',
            message:
              err?.data?.message || 'Ce portefeuille n est pas le gagnant de ce tour.',
          };
        }

        const notice = describeBlockchainError(err);
        if (notice) {
          return { status: 'FAILED', message: notice.message };
        }

        sentryClient.captureException(err, 'Erreur Retrait Cagnotte');
        return {
          status: 'FAILED',
          message:
            err?.data?.message ||
            'Le retrait de la cagnotte est momentanément indisponible. Veuillez réessayer.',
        };
      }
    },
    [claimPrizeMutation]
  );

  return {
    isBuying,
    isGifting,
    isClaiming,
    generateDeterministicWallet,
    purchaseTickets,
    sendGiftTicket,
    claimPrize,
  };
};

export default useCitizenWallet;
