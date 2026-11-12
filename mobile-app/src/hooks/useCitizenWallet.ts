import { useCallback } from 'react';

import sentryClient from '../services/sentry.client';
import { useAppDispatch } from '../store';
import {
  useBuyTicketMutation,
  useGiftTicketMutation,
  useClaimPrizeMutation,
} from '../store/api/lotteryApi';
import { updateUserPoints } from '../store/slices/authSlice';
import {
  showPointsPopup,
  showRetryModal,
  showSentryModal,
  showQueueModal,
} from '../store/slices/uiSlice';
import {
  ApiErrorDetails,
  BuyTicketResponse,
  ClaimPrizeResponse,
  GiftTicketResponse,
} from '../types/api.types';

export interface BlockchainErrorNotice {
  title: string;
  message: string;
}

export type TicketOperationFailure =
  | { status: 'ALREADY_OWNED'; message: string }
  | { status: 'AGE_REQUIRED'; message: string }
  | { status: 'FAILED'; title: string; message: string; canRetry: boolean; queued: boolean };

export type TicketOperationOutcome<T> = { status: 'SUCCESS'; data: T } | TicketOperationFailure;

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

export const classifyTicketError = (
  err: any,
  alreadyOwnedMessage: string,
): TicketOperationFailure => {
  const status = err?.status;
  const details = readErrorDetails(err);
  const apiMessage: string | undefined = err?.data?.message;

  if (status === 403 && details.code === 'AGE_VERIFICATION_REQUIRED') {
    return { status: 'AGE_REQUIRED', message: apiMessage || 'Vérifiez votre âge pour jouer.' };
  }

  if (
    status === 409 &&
    (details.contractError === 'PlayerLimitReached' || !details.contractError)
  ) {
    return { status: 'ALREADY_OWNED', message: apiMessage || alreadyOwnedMessage };
  }

  if (status === 429) {
    return {
      status: 'FAILED',
      title: 'Forte affluence',
      message:
        apiMessage || 'Beaucoup de participants achètent en même temps. Réessayez dans un instant.',
      canRetry: true,
      queued: true,
    };
  }

  const notice = describeBlockchainError(err);
  if (notice) {
    return {
      status: 'FAILED',
      title: notice.title,
      message: notice.message,
      canRetry: false,
      queued: false,
    };
  }

  return {
    status: 'FAILED',
    title: 'L’achat n’a pas abouti.',
    message: apiMessage || 'Le réseau est momentanément encombré. Réessayez dans un instant.',
    canRetry: status === 503 || Boolean(details.canRetry) || !status || status === 'FETCH_ERROR',
    queued: false,
  };
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
    async (retryAttempt = 0): Promise<TicketOperationOutcome<BuyTicketResponse>> => {
      try {
        const res = await buyTicketMutation({ quantity: 1, retryAttempt }).unwrap();
        dispatch(updateUserPoints(res.data.newPointsBalance));
        return { status: 'SUCCESS', data: res.data };
      } catch (err: any) {
        const outcome = classifyTicketError(
          err,
          'Vous avez déjà votre ticket pour ce grand tirage.',
        );
        if (outcome.status === 'FAILED' && !outcome.canRetry) {
          sentryClient.captureException(err, 'Erreur Transaction Ticket');
        }
        return outcome;
      }
    },
    [buyTicketMutation, dispatch],
  );

  const retryPurchaseFromQueue = useCallback(
    async (retryAttempt: number) => {
      const outcome = await purchaseTickets(retryAttempt);
      if (outcome.status === 'SUCCESS') {
        dispatch(
          showPointsPopup({
            amount: outcome.data.pointsAwarded,
            reason: 'Votre ticket est validé pour le grand tirage.',
          }),
        );
        return;
      }
      if (outcome.status === 'FAILED' && outcome.queued) {
        dispatch(showQueueModal(245));
        return;
      }
      if (outcome.status === 'FAILED' && outcome.canRetry) {
        dispatch(showRetryModal({ message: outcome.message, retryAttempt: retryAttempt + 1 }));
        return;
      }
      dispatch(
        showSentryModal({
          title: outcome.status === 'FAILED' ? outcome.title : 'Achat impossible',
          message: outcome.message,
        }),
      );
    },
    [dispatch, purchaseTickets],
  );

  const sendGiftTicket = useCallback(
    async (
      recipientEmail: string,
      personalMessage?: string,
    ): Promise<TicketOperationOutcome<GiftTicketResponse>> => {
      try {
        const res = await giftTicketMutation({
          recipientEmail,
          personalMessage: personalMessage || undefined,
        }).unwrap();
        dispatch(updateUserPoints(res.data.senderNewBalance));
        return { status: 'SUCCESS', data: res.data };
      } catch (err: any) {
        const outcome = classifyTicketError(
          err,
          'Cette personne a déjà son ticket pour ce grand tirage.',
        );
        if (outcome.status === 'FAILED' && !outcome.canRetry) {
          sentryClient.captureException(err, 'Erreur Cadeau Ticket');
        }
        return outcome;
      }
    },
    [dispatch, giftTicketMutation],
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
            message: err?.data?.message || 'Ce portefeuille n est pas le gagnant de ce tour.',
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
    [claimPrizeMutation],
  );

  return {
    isBuying,
    isGifting,
    isClaiming,
    generateDeterministicWallet,
    purchaseTickets,
    retryPurchaseFromQueue,
    sendGiftTicket,
    claimPrize,
  };
};

export default useCitizenWallet;
