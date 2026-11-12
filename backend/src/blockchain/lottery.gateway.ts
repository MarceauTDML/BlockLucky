import { TransactionReceipt, formatEther } from 'ethers';
import { env } from '../config/env.config';
import { AppError } from '../utils/response.util';
import chainClient from './chain.client';
import { decodeContractError } from './chain-actions';
import lotteryIndexer, { IndexedPurchase } from './lottery.indexer';
import walletService from './wallet.service';
import logger from '../utils/logger.util';

const roundStatuses = ['OPEN', 'LOCKED', 'COMPLETED', 'CANCELLED'] as const;

export const PLAYER_LIMIT_MESSAGE = 'Vous avez déjà votre ticket pour ce grand tirage.';
export const GIFT_PLAYER_LIMIT_MESSAGE = 'Cette personne a déjà son ticket pour ce grand tirage.';

export interface OnchainRound {
  contractRoundId: number;
  status: (typeof roundStatuses)[number];
  ticketPriceWei: bigint;
  ticketCount: number;
  maxTickets: number;
  minTicketsToDraw: number;
  maxTicketsPerPlayer: number;
  totalCollectedWei: bigint;
  prizeWei: bigint;
  winner: string | null;
  winningTicket: number | null;
  startTime: Date;
  endTime: Date;
  vrfRequestId: string | null;
  prizeClaimed: boolean;
}

interface Purchaser {
  id: string;
  walletAddress: string;
  walletEncryptedKey: string | null;
  welcomeGrantTxHash?: string | null;
}

const CONTRACT_ERRORS: Record<string, { status: number; message: string; details?: Record<string, unknown> }> = {
  EnforcedPause: {
    status: 503,
    message: 'Le Smart Contract est temporairement en pause de sécurité par la Mairie.',
    details: { canRetry: false, circuitBreaker: true },
  },
  RoundNotOpen: { status: 409, message: 'Le tirage de ce tour est en cours, les achats reprendront au tour suivant.' },
  RoundExpired: { status: 409, message: 'Ce tour est terminé, le tirage va être lancé.' },
  RoundSoldOut: { status: 409, message: 'Tous les tickets de ce tour ont été vendus.' },
  PlayerLimitReached: { status: 409, message: PLAYER_LIMIT_MESSAGE },
  InvalidQuantity: { status: 400, message: 'Quantité de tickets invalide.' },
  IncorrectPayment: { status: 400, message: 'Montant incorrect pour cet achat.' },
  DrawNotReady: { status: 409, message: 'Le tirage ne peut pas encore être lancé (participants ou durée insuffisants).' },
  RoundNotCancellable: { status: 409, message: 'Ce tour ne peut pas être annulé.' },
  NotWinner: { status: 403, message: "Ce compte n'est pas le gagnant de ce tour." },
  PrizeAlreadyClaimed: { status: 409, message: 'La cagnotte de ce tour a déjà été versée.' },
  RoundNotCompleted: { status: 409, message: "Le tirage de ce tour n'est pas terminé." },
  NothingToWithdraw: { status: 409, message: 'Aucune commission à reverser à la trésorerie.' },
  AccessControlUnauthorizedAccount: {
    status: 403,
    message: "Le compte opérateur du backend n'a pas le rôle requis sur le Smart Contract.",
  },
};

export const toAppError = (error: unknown, fallback: string): AppError => {
  if (error instanceof AppError) return error;
  const reason = decodeContractError(error);
  if (reason && CONTRACT_ERRORS[reason]) {
    const mapped = CONTRACT_ERRORS[reason];
    return new AppError(mapped.message, mapped.status, { contractError: reason, ...mapped.details });
  }
  const code = (error as { code?: string }).code;
  if (code === 'INSUFFICIENT_FUNDS') {
    return new AppError("Solde d'ethers fictifs insuffisant sur votre portefeuille BlockLucky.", 402, {
      contractError: 'InsufficientFunds',
    });
  }
  if (code === 'NETWORK_ERROR' || code === 'TIMEOUT' || code === 'SERVER_ERROR') {
    return new AppError('Réseau blockchain injoignable. Veuillez réessayer dans un instant.', 503, { canRetry: true });
  }
  logger.error(`${fallback} Cause : ${(error as Error).message}`, { code, contractError: reason });
  return new AppError(fallback, 502, { canRetry: true });
};

export class LotteryGateway {
  public async readCurrentRound(): Promise<OnchainRound> {
    const lottery = chainClient.lottery();
    const roundId = Number(await lottery.getFunction('currentRoundId')());
    return this.readRound(roundId);
  }

  public async readRound(contractRoundId: number): Promise<OnchainRound> {
    const round = await chainClient.lottery().getFunction('getRound')(contractRoundId);
    const winner = (round.winner as string).toLowerCase();
    const isZero = /^0x0{40}$/.test(winner);
    return {
      contractRoundId,
      status: roundStatuses[Number(round.status)] ?? 'OPEN',
      ticketPriceWei: round.ticketPrice,
      ticketCount: Number(round.ticketCount),
      maxTickets: Number(round.maxTickets),
      minTicketsToDraw: Number(round.minTicketsToDraw),
      maxTicketsPerPlayer: Number(round.maxTicketsPerPlayer),
      totalCollectedWei: round.totalCollected,
      prizeWei: round.prize,
      winner: isZero ? null : winner,
      winningTicket: isZero ? null : Number(round.winningTicket),
      startTime: new Date(Number(round.startTime) * 1000),
      endTime: new Date(Number(round.endTime) * 1000),
      vrfRequestId: round.vrfRequestId === 0n ? null : round.vrfRequestId.toString(),
      prizeClaimed: Boolean(round.prizeClaimed),
    };
  }

  public async isPaused(): Promise<boolean> {
    return Boolean(await chainClient.lottery().getFunction('paused')());
  }

  public async ticketsOf(contractRoundId: number, walletAddress: string): Promise<number> {
    return Number(await chainClient.lottery().getFunction('ticketsOf')(contractRoundId, walletAddress));
  }

  public async prepareWallet<T extends Purchaser>(user: T): Promise<T> {
    const withWallet = await walletService.ensureWallet(user);
    if (!withWallet.welcomeGrantTxHash) {
      const grantTx = await walletService.grantWelcomeEthers(withWallet);
      return { ...withWallet, welcomeGrantTxHash: grantTx };
    }
    return withWallet;
  }

  private async sendAndIndex(
    send: () => Promise<{ hash: string; wait: () => Promise<TransactionReceipt | null> }>,
    fallback: string
  ) {
    try {
      const tx = await send().catch((error: { code?: string }) => {
        if (error?.code !== 'NONCE_EXPIRED') throw error;
        chainClient.resetOperatorNonce();
        return send();
      });
      const receipt = await tx.wait();
      if (!receipt) throw new AppError(fallback, 502, { canRetry: true });
      const purchases = await lotteryIndexer.processReceipt(receipt);
      return { receipt, purchases };
    } catch (error) {
      throw toAppError(error, fallback);
    }
  }

  public async buyTickets(buyer: Purchaser, quantity: number, beneficiary?: string): Promise<{
    receipt: TransactionReceipt;
    purchase: IndexedPurchase;
  }> {
    const round = await this.readCurrentRound();
    if (round.status !== 'OPEN') {
      throw new AppError('Le tirage de ce tour est en cours, les achats reprendront au tour suivant.', 409);
    }
    const signer = walletService.signerFor(buyer);
    const lottery = chainClient.lottery(signer);
    const value = round.ticketPriceWei * BigInt(quantity);

    const { receipt, purchases } = await this.sendAndIndex(
      () =>
        beneficiary
          ? lottery.getFunction('buyTicketsFor')(beneficiary, quantity, { value })
          : lottery.getFunction('buyTickets')(quantity, { value }),
      "L'achat n'a pas pu être enregistré sur la blockchain."
    );
    const purchase = purchases[0];
    if (!purchase) throw new AppError("L'achat a été envoyé mais aucun ticket n'a été émis par le contrat.", 502);
    return { receipt, purchase };
  }

  public async requestDraw() {
    return this.sendAndIndex(
      () => chainClient.lottery(chainClient.operator).getFunction('requestDraw')(),
      'La demande de tirage Chainlink VRF a échoué.'
    );
  }

  public async cancelRound() {
    return this.sendAndIndex(
      () => chainClient.lottery(chainClient.operator).getFunction('cancelRound')(),
      "L'annulation du tour a échoué."
    );
  }

  public async claimPrize(winner: Purchaser, contractRoundId: number) {
    return this.sendAndIndex(
      () => chainClient.lottery(walletService.signerFor(winner)).getFunction('claimPrize')(contractRoundId),
      'Le versement de la cagnotte a échoué.'
    );
  }

  public async setPaused(paused: boolean) {
    return this.sendAndIndex(
      () => chainClient.lottery(chainClient.operator).getFunction(paused ? 'pause' : 'unpause')(),
      'Le changement d’état du disjoncteur a échoué.'
    );
  }

  public async withdrawFees(treasury: string) {
    const lottery = chainClient.lottery(chainClient.operator);
    try {
      const current = ((await lottery.getFunction('treasury')()) as string).toLowerCase();
      if (current !== treasury.toLowerCase()) {
        await (await lottery.getFunction('setTreasury')(treasury)).wait();
      }
      const amount = (await lottery.getFunction('accruedFees')()) as bigint;
      const tx = await lottery.getFunction('withdrawFees')();
      await tx.wait();
      return { transactionHash: tx.hash as string, amountEth: Number(formatEther(amount)), treasury };
    } catch (error) {
      throw toAppError(error, 'Le reversement de la commission à la trésorerie a échoué.');
    }
  }

  public async accruedFeesEth(): Promise<number> {
    return Number(formatEther((await chainClient.lottery().getFunction('accruedFees')()) as bigint));
  }

  public async badgeOf(contractRoundId: number, walletAddress: string): Promise<number | null> {
    const tokenId = (await chainClient.poap().getFunction('badgeOf')(contractRoundId, walletAddress)) as bigint;
    return tokenId === 0n ? null : Number(tokenId);
  }

  public async badgeTokenUri(tokenId: number): Promise<string | null> {
    try {
      return (await chainClient.poap().getFunction('tokenURI')(tokenId)) as string;
    } catch {
      return null;
    }
  }

  public describe() {
    return {
      mode: env.BLOCKCHAIN_MODE,
      chainId: env.CHAIN_ID,
      lotteryContract: env.LOTTERY_CONTRACT_ADDRESS,
      poapContract: env.POAP_CONTRACT_ADDRESS,
      lotteryExplorerUrl: chainClient.explorerAddressUrl(env.LOTTERY_CONTRACT_ADDRESS),
    };
  }
}

export const lotteryGateway = new LotteryGateway();
export default lotteryGateway;
