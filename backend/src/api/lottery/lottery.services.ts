import crypto from 'crypto';
import lotteryRepository from './lottery.repo';
import authRepository from '../auth/auth.repo';
import blockchainService from '../../services/blockchain.service';
import ledgerService from '../../services/ledger.service';
import redis from '../../config/redis.config';
import { getSocketIo } from '../../socket/socket.handler';
import { broadcastWinnerEvent } from '../../socket/events/live-draw.events';
import { anonymizeWallet } from '../../utils/crypto.util';
import { AppError } from '../../utils/response.util';
import { businessEventsTotal } from '../../observability/metrics';
import { Milestone } from '../../types/api.types';
import chainClient from '../../blockchain/chain.client';
import lotteryGateway, {
  GIFT_PLAYER_LIMIT_MESSAGE,
  OnchainRound,
  PLAYER_LIMIT_MESSAGE,
} from '../../blockchain/lottery.gateway';
import { markDrawReady, readDrawReadyAt, readyCandidate, revealAtFrom } from '../../blockchain/draw-reveal';
import walletService from '../../blockchain/wallet.service';
import { POINTS_PER_TICKET as ONCHAIN_POINTS_PER_TICKET } from '../../blockchain/lottery.indexer';
import { formatEther } from 'ethers';

const TARGET_PARTICIPANTS = 10000;
const TICKET_PRICE_ETH = 0.01;
const POINTS_PER_TICKET = 50;
const POINTS_PER_GIFT = 75;
const SIMULATED_ROUND_DURATION_MS = 48 * 60 * 60 * 1000;

export type RoundPhase = 'OPEN' | 'WAITING_ROOM' | 'DRAWING' | 'COMPLETED' | 'CANCELLED';

export const formatTicketNumber = (ticketIndex: number | null | undefined): string | null =>
  ticketIndex === null || ticketIndex === undefined ? null : String(ticketIndex + 1).padStart(5, '0');

const withTicketNumber = <T extends { ticketIndex?: number | null }>(ticket: T) => ({
  ...ticket,
  ticketNumber: formatTicketNumber(ticket.ticketIndex),
});

const phaseOf = (status: string, purchasesClosed: boolean): RoundPhase => {
  if (status === 'LOCKED') return 'DRAWING';
  if (status === 'COMPLETED') return 'COMPLETED';
  if (status === 'CANCELLED') return 'CANCELLED';
  return purchasesClosed ? 'WAITING_ROOM' : 'OPEN';
};

const playerLimitError = (message = PLAYER_LIMIT_MESSAGE) =>
  new AppError(message, 409, { contractError: 'PlayerLimitReached' });

const isPlayerLimitError = (error: unknown): boolean =>
  error instanceof AppError &&
  (error.details as { contractError?: string } | undefined)?.contractError === 'PlayerLimitReached';

const toIso = (ms: number | null): string | null => (ms === null ? null : new Date(ms).toISOString());

export class LotteryService {
  private buildMilestones(currentCount: number): Milestone[] {
    const steps = [
      {
        target: 5000,
        title: 'Coulisses dévoilées',
        rewardDescription: 'Les coulisses du grand tirage et des lots des commerçants sont dévoilées.',
      },
      {
        target: 7500,
        title: 'Offre spéciale ouverte',
        rewardDescription: 'Une offre spéciale des commerçants partenaires est ouverte à tous les participants.',
      },
      {
        target: 9000,
        title: 'Jeu bonus débloqué',
        rewardDescription: 'Un jeu bonus est débloqué pour tous les participants du tirage.',
      },
      {
        target: 10000,
        title: 'Ouverture de la salle',
        rewardDescription: "Les achats sont clos et la salle d'attente du tirage ouvre.",
      },
    ];
    return steps.map((step) => ({ ...step, unlocked: currentCount >= step.target }));
  }

  private txUrl(transactionHash: string | null | undefined): string | null {
    return chainClient.isOnchain ? chainClient.explorerTxUrl(transactionHash) : null;
  }

  public async getCurrentLotteryStatus() {
    if (chainClient.isOnchain) return this.getOnchainLotteryStatus();
    const round = await lotteryRepository.getCurrentOrCreateRound();
    const ticketsSold = round._count.tickets;
    const distinctParticipants = await lotteryRepository.countDistinctParticipants(round.id);
    const networkStatus = await blockchainService.getNetworkStatus();

    const drawTargetTime = new Date(round.startedAt.getTime() + SIMULATED_ROUND_DURATION_MS);
    const remainingSeconds = Math.max(0, Math.floor((drawTargetTime.getTime() - Date.now()) / 1000));
    const inWaitingRoom = remainingSeconds <= 600 && round.status === 'OPEN';
    const phase = phaseOf(round.status, remainingSeconds === 0);

    const fomoPercentage = Math.min(100, Number(((ticketsSold / TARGET_PARTICIPANTS) * 100).toFixed(2)));

    return {
      round: {
        id: round.id,
        contractRoundId: round.contractRoundId,
        status: round.status,
        prizePool: Number(round.prizePool.toFixed(4)),
        ticketPriceEth: TICKET_PRICE_ETH,
        winnerWallet: round.winnerWallet,
        chainlinkRequestId: round.chainlinkRequestId,
        startedAt: round.startedAt,
        drawnAt: round.drawnAt,
        drawTargetTime: drawTargetTime.toISOString(),
        remainingSeconds,
        inWaitingRoom,
        phase,
        waitingRoomOpensAt: drawTargetTime.toISOString(),
        revealAt:
          phase === 'WAITING_ROOM' || phase === 'DRAWING'
            ? toIso(revealAtFrom(drawTargetTime.getTime()))
            : null,
        participants: distinctParticipants,
        maxParticipants: TARGET_PARTICIPANTS,
      },
      progression: {
        ticketsSold,
        distinctParticipants,
        targetParticipants: TARGET_PARTICIPANTS,
        percentage: fomoPercentage,
        milestones: this.buildMilestones(ticketsSold),
      },
      guarantees: {
        autoRefundEnabled: true,
        autoRefundPolicy:
          'Remboursement automatique garanti par le Smart Contract si la loterie est annulée.',
        gaslessSponsored: false,
        vrfCertified: false,
        simulated: true,
      },
      network: networkStatus,
      blockchain: lotteryGateway.describe(),
    };
  }

  public async buyTickets(
    userId: string,
    input: { roundId?: string; quantity?: number; retryAttempt?: number }
  ) {
    if (chainClient.isOnchain) return this.buyOnchain(userId, input.quantity ?? 1);
    const round = await lotteryRepository.getCurrentOrCreateRound();
    if (round.status !== 'OPEN') {
      throw new AppError("Cette session de loterie n'est plus ouverte aux achats de tickets.", 400);
    }

    const user = await authRepository.findById(userId);
    if (!user) {
      throw new AppError('Utilisateur introuvable', 404);
    }

    const quantity = input.quantity ?? 1;
    if (round.startedAt.getTime() + SIMULATED_ROUND_DURATION_MS <= Date.now()) {
      throw new AppError('Ce tour est terminé, le tirage va être lancé.', 409);
    }

    const limitStr = await redis.get(`user:ticket_limit:${userId}`);
    const maxTicketsAllowed = limitStr ? Number(limitStr) : 50;
    const currentTicketsCount = await lotteryRepository.countUserTicketsInRound(userId, round.id);
    if (currentTicketsCount > 0) throw playerLimitError();

    if (currentTicketsCount + quantity > maxTicketsAllowed) {
      throw new AppError(
        `Jeu Responsable : Limite d'achat atteinte (${currentTicketsCount}/${maxTicketsAllowed} tickets autorisés sur ce tirage).`,
        400
      );
    }

    const createdTickets = [];
    let totalPointsEarned = 0;

    for (let i = 0; i < quantity; i++) {
      let relayed;
      try {
        relayed = await blockchainService.relayTicketPurchase(
          user.walletAddress,
          round.contractRoundId
        );
      } catch (err: any) {
        if (err.message?.includes('CIRCUIT_BREAKER_ACTIVE')) {
          throw new AppError(err.message, 503, { canRetry: false, circuitBreaker: true });
        }
        throw new AppError(
          'Réseau blockchain momentanément congestionné. Veuillez relancer votre achat.',
          503,
          { canRetry: true, retryAttempt: (input.retryAttempt ?? 0) + 1 }
        );
      }

      const { ticket } = await lotteryRepository.createTicketWithPrizeIncrement({
        userId: user.id,
        lotteryId: round.id,
        transactionHash: relayed.transactionHash,
        blockNumber: relayed.blockNumber,
        ticketPriceEth: TICKET_PRICE_ETH,
        ticketIndex: await lotteryRepository.countTicketsInRound(round.id),
      });

      createdTickets.push({
        ...withTicketNumber(ticket),
        etherscanUrl: this.txUrl(ticket.transactionHash),
      });
      totalPointsEarned += POINTS_PER_TICKET;
    }

    const ledgerUpdate = await ledgerService.creditPoints(
      user.id,
      totalPointsEarned,
      'TICKET_PURCHASE',
      `Achat de ${quantity} ticket(s) (Round #${round.contractRoundId})`
    );

    const poapBadge = await blockchainService.mintPoapBadge(user.walletAddress, round.contractRoundId);
    businessEventsTotal.inc({ event: 'ticket_purchased' }, quantity);

    const io = getSocketIo();
    if (io) {
      io.emit('points:awarded', {
        userId: user.id,
        amount: totalPointsEarned,
        reason: 'TICKET_PURCHASE',
      });
    }

    return {
      tickets: createdTickets,
      pointsAwarded: totalPointsEarned,
      newPointsBalance: ledgerUpdate.balance,
      poapBadge,
      gaslessSponsored: true,
    };
  }

  public async giftTicketToFriend(
    senderId: string,
    input: { recipientEmail: string; recipientWallet?: string; personalMessage?: string }
  ) {
    if (chainClient.isOnchain) return this.giftOnchain(senderId, input.recipientEmail);
    const sender = await authRepository.findById(senderId);
    if (!sender) {
      throw new AppError('Expéditeur introuvable', 404);
    }

    const round = await lotteryRepository.getCurrentOrCreateRound();
    if (round.status !== 'OPEN') {
      throw new AppError('La loterie est actuellement fermée.', 400);
    }

    const emailLower = input.recipientEmail.toLowerCase();
    if (sender.email === emailLower) throw new AppError('Vous ne pouvez pas vous offrir un ticket à vous-même.', 400);
    let recipient = await authRepository.findByEmail(emailLower);
    if (recipient && (await lotteryRepository.countUserTicketsInRound(recipient.id, round.id)) > 0) {
      throw playerLimitError(GIFT_PLAYER_LIMIT_MESSAGE);
    }

    if (!recipient) {
      const generatedWallet =
        input.recipientWallet?.toLowerCase() ||
        `0x${crypto.randomBytes(20).toString('hex')}`;
      recipient = await authRepository.createUser({
        walletAddress: generatedWallet,
        email: emailLower,
        referredById: sender.id,
      });
    }

    const relayed = await blockchainService.relayTicketPurchase(
      recipient.walletAddress,
      round.contractRoundId
    );

    const { ticket } = await lotteryRepository.createTicketWithPrizeIncrement({
      userId: recipient.id,
      lotteryId: round.id,
      transactionHash: relayed.transactionHash,
      blockNumber: relayed.blockNumber,
      ticketPriceEth: TICKET_PRICE_ETH,
      ticketIndex: await lotteryRepository.countTicketsInRound(round.id),
    });

    const senderLedger = await ledgerService.creditPoints(
      sender.id,
      POINTS_PER_GIFT,
      'GIFT_TICKET',
      `Cadeau d'un ticket offert à ${emailLower}`
    );

    return {
      ticket: {
        ...withTicketNumber(ticket),
        recipientEmail: emailLower,
        recipientWallet: recipient.walletAddress,
        etherscanUrl: this.txUrl(ticket.transactionHash),
      },
      senderPointsAwarded: POINTS_PER_GIFT,
      senderNewBalance: senderLedger.balance,
    };
  }

  public async executeChainlinkDraw(roundId?: string) {
    if (chainClient.isOnchain) return this.drawOnchain();
    const targetRound = roundId
      ? await lotteryRepository.findRoundById(roundId)
      : await lotteryRepository.getCurrentOrCreateRound();

    if (!targetRound) {
      throw new AppError('Session de loterie introuvable', 404);
    }

    const fullRound = await lotteryRepository.findRoundById(targetRound.id);
    if (!fullRound) {
      throw new AppError('Session de loterie introuvable', 404);
    }

    if (fullRound.status === 'COMPLETED') {
      throw new AppError('Le tirage de cette session a déjà été effectué', 400);
    }

    const participants = fullRound.tickets.map((t) => t.user.walletAddress);
    if (participants.length === 0) {
      throw new AppError('Aucun ticket vendu sur cette session pour effectuer un tirage', 400);
    }

    await lotteryRepository.updateRoundStatus(fullRound.id, { status: 'LOCKED' });

    const vrfResult = await blockchainService.requestChainlinkVrfDraw(
      fullRound.contractRoundId,
      participants
    );

    const winningTicket =
      fullRound.tickets.find((t) => t.user.walletAddress === vrfResult.winnerWallet)?.ticketIndex ?? null;
    const completedRound = await lotteryRepository.updateRoundStatus(fullRound.id, {
      status: 'COMPLETED',
      winningTicket,
      winnerWallet: vrfResult.winnerWallet,
      chainlinkRequestId: vrfResult.chainlinkRequestId,
      drawnAt: new Date(),
    });

    broadcastWinnerEvent(getSocketIo(), {
      roundId: completedRound.id,
      contractRoundId: completedRound.contractRoundId,
      winnerWallet: vrfResult.winnerWallet,
      prizePool: completedRound.prizePool,
      vrfProofHash: vrfResult.vrfProofHash,
      timestamp: new Date().toISOString(),
    });

    return {
      round: completedRound,
      vrfProof: {
        chainlinkRequestId: vrfResult.chainlinkRequestId,
        vrfProofHash: vrfResult.vrfProofHash,
        transactionHash: vrfResult.transactionHash,
        verifiedFair: false,
        simulated: true,
      },
    };
  }

  public async CancelAndAutoRefundRound(roundId?: string) {
    if (chainClient.isOnchain) return this.cancelOnchain();
    const round = roundId
      ? await lotteryRepository.findRoundById(roundId)
      : await lotteryRepository.getCurrentOrCreateRound();

    if (!round) {
      throw new AppError('Session de loterie introuvable', 404);
    }

    const cancelledRound = await lotteryRepository.updateRoundStatus(round.id, {
      status: 'CANCELLED',
    });

    return {
      round: cancelledRound,
      autoRefundExecuted: true,
      refundedAmountEth: round.prizePool,
      message:
        'La session a été annulée. Tous les participants ont été remboursés automatiquement via le Smart Contract.',
    };
  }

  public async getLeaderboard(limit = 20) {
    const users = await lotteryRepository.getLeaderboardData(limit);
    return users.map((u, index) => ({
      rank: index + 1,
      anonymizedWallet: anonymizeWallet(u.walletAddress),
      pointsBalance: u.pointsBalance,
      referralsCount: u._count.referrals,
      ticketsBought: u._count.tickets,
    }));
  }

  public async getUserTransactionsAndPoaps(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const { tickets, total } = await lotteryRepository.getUserTickets(userId, skip, limit);
    const user = await authRepository.findById(userId);
    const wallet = user?.walletAddress.toLowerCase() ?? null;

    const enrichedTickets = tickets.map((t) => {
      const round = t.lottery;
      const completed = round.status === 'COMPLETED';
      const winningTicket = round.winningTicket ?? null;
      const ticketIndex = t.ticketIndex ?? null;
      const isWinner =
        completed &&
        (winningTicket !== null && ticketIndex !== null
          ? winningTicket === ticketIndex
          : Boolean(wallet && round.winnerWallet?.toLowerCase() === wallet));
      return {
        id: t.id,
        ticketIndex,
        ticketNumber: formatTicketNumber(ticketIndex),
        transactionHash: t.transactionHash,
        blockNumber: t.blockNumber,
        purchasedAt: t.purchasedAt,
        roundId: round.id,
        contractRoundId: round.contractRoundId,
        roundStatus: round.status,
        isWinner,
        winningTicketNumber: completed ? formatTicketNumber(winningTicket) : null,
        prizeEth: round.prizeWei ? Number(formatEther(round.prizeWei)) : Number(round.prizePool.toFixed(4)),
        drawnAt: round.drawnAt,
        etherscanUrl: this.txUrl(t.transactionHash),
      };
    });

    if (chainClient.isOnchain) {
      return {
        walletAddress: user?.walletAddress,
        tickets: enrichedTickets,
        poapBadges: user
          ? await this.onchainBadges(user.walletAddress, tickets.map((t) => t.lottery.contractRoundId))
          : [],
        total,
      };
    }

    const poapBadges = tickets.map((t, idx) => ({
      id: `poap-${t.id}`,
      title: `Trophée Citoyen EtherBay #${t.lottery.contractRoundId}`,
      edition: idx === 0 ? "Pionnier Fin d'Année 2026" : 'Participant Officiel EtherBay',
      tokenId: t.blockNumber + idx,
      transactionHash: t.transactionHash,
      image3dUrl: 'https://assets.etherbay.fr/poap/badge-3d-2026.glb',
      mintedAt: t.purchasedAt,
    }));

    return {
      walletAddress: user?.walletAddress,
      tickets: enrichedTickets,
      poapBadges,
      total,
    };
  }

  private async syncRound(round: OnchainRound) {
    return lotteryRepository.upsertRoundFromChain({
      contractRoundId: round.contractRoundId,
      status: round.status,
      prizePool: Number(formatEther(round.totalCollectedWei)),
      ticketPriceWei: round.ticketPriceWei.toString(),
      startedAt: round.startTime,
      endsAt: round.endTime,
      winnerWallet: round.winner,
    });
  }

  private async getOnchainLotteryStatus() {
    const [onchain, paused] = await Promise.all([lotteryGateway.readCurrentRound(), lotteryGateway.isPaused()]);
    const round = await this.syncRound(onchain);
    const distinctParticipants = await lotteryRepository.countDistinctParticipants(round.id);
    const networkStatus = await blockchainService.getNetworkStatus();
    const now = Date.now();
    const remainingSeconds = Math.max(0, Math.floor((onchain.endTime.getTime() - now) / 1000));
    const ticketsSold = onchain.ticketCount;
    const purchasesClosed = ticketsSold >= onchain.maxTickets || now >= onchain.endTime.getTime();
    const drawReady = onchain.status === 'OPEN' && purchasesClosed && ticketsSold >= onchain.minTicketsToDraw;
    const readyAt = drawReady
      ? await markDrawReady(onchain.contractRoundId, readyCandidate(onchain.endTime, now))
      : await readDrawReadyAt(onchain.contractRoundId);
    const phase = phaseOf(onchain.status, purchasesClosed);
    const onePerPlayer = onchain.maxTicketsPerPlayer === 1;

    return {
      round: {
        id: round.id,
        contractRoundId: onchain.contractRoundId,
        status: onchain.status,
        prizePool: Number(Number(formatEther(onchain.totalCollectedWei)).toFixed(4)),
        ticketPriceEth: Number(formatEther(onchain.ticketPriceWei)),
        winnerWallet: onchain.winner,
        chainlinkRequestId: onchain.vrfRequestId,
        startedAt: onchain.startTime,
        drawnAt: round.drawnAt,
        drawTargetTime: onchain.endTime.toISOString(),
        remainingSeconds,
        inWaitingRoom: remainingSeconds <= 600 && onchain.status === 'OPEN',
        maxTicketsPerPlayer: onchain.maxTicketsPerPlayer,
        phase,
        waitingRoomOpensAt: toIso(readyAt ?? onchain.endTime.getTime()),
        revealAt:
          readyAt !== null && (phase === 'WAITING_ROOM' || phase === 'DRAWING') ? toIso(revealAtFrom(readyAt)) : null,
        participants: onePerPlayer ? ticketsSold : distinctParticipants,
        maxParticipants: onchain.maxTickets,
      },
      progression: {
        ticketsSold,
        distinctParticipants,
        targetParticipants: onchain.maxTickets,
        percentage: Math.min(100, Number(((ticketsSold / onchain.maxTickets) * 100).toFixed(2))),
        milestones: this.buildMilestones(ticketsSold),
      },
      guarantees: {
        autoRefundEnabled: true,
        autoRefundPolicy:
          "Si le tour est annulé, chaque mise est remboursable dans le Smart Contract ; la plateforme réclame automatiquement le remboursement pour vous.",
        gaslessSponsored: false,
        vrfCertified: true,
        simulated: false,
        paused,
      },
      network: { ...networkStatus, isPaused: paused },
      blockchain: lotteryGateway.describe(),
    };
  }

  private async buyOnchain(userId: string, quantity: number) {
    const user = await authRepository.findById(userId);
    if (!user) throw new AppError('Utilisateur introuvable', 404);

    const onchain = await lotteryGateway.readCurrentRound();
    const round = await this.syncRound(onchain);
    const limitStr = await redis.get(`user:ticket_limit:${userId}`);
    const maxTicketsAllowed = limitStr ? Number(limitStr) : 50;
    const currentTicketsCount = await lotteryRepository.countUserTicketsInRound(userId, round.id);
    if (currentTicketsCount + quantity > maxTicketsAllowed) {
      throw new AppError(
        `Jeu Responsable : Limite d'achat atteinte (${currentTicketsCount}/${maxTicketsAllowed} tickets autorisés sur ce tirage).`,
        400
      );
    }

    if (currentTicketsCount > 0) throw playerLimitError();

    const buyer = await lotteryGateway.prepareWallet(user);
    if ((await lotteryGateway.ticketsOf(onchain.contractRoundId, buyer.walletAddress)) > 0) {
      throw playerLimitError();
    }
    const { receipt, purchase } = await lotteryGateway.buyTickets(buyer, quantity);
    const tickets = await lotteryRepository.findTicketsByIds(purchase.ticketIds);
    const refreshed = await authRepository.findById(userId);
    const balance = await walletService.balanceOf(buyer.walletAddress);
    businessEventsTotal.inc({ event: 'ticket_purchased' }, quantity);

    return {
      tickets: tickets.map((ticket) => ({ ...withTicketNumber(ticket), etherscanUrl: this.txUrl(ticket.transactionHash) })),
      pointsAwarded: ONCHAIN_POINTS_PER_TICKET * quantity,
      newPointsBalance: refreshed?.pointsBalance ?? user.pointsBalance,
      poapBadge: {
        status: 'MINT_PENDING',
        contractAddress: lotteryGateway.describe().poapContract,
        roundId: onchain.contractRoundId,
      },
      gaslessSponsored: false,
      transactionHash: receipt.hash,
      etherscanUrl: this.txUrl(receipt.hash),
      walletAddress: buyer.walletAddress,
      walletBalanceEth: balance === null ? null : Number(formatEther(balance)),
    };
  }

  private async giftOnchain(senderId: string, recipientEmail: string) {
    const sender = await authRepository.findById(senderId);
    if (!sender) throw new AppError('Expéditeur introuvable', 404);
    const emailLower = recipientEmail.toLowerCase();
    if (sender.email === emailLower) throw new AppError('Vous ne pouvez pas vous offrir un ticket à vous-même.', 400);

    let recipient = await authRepository.findByEmail(emailLower);
    if (!recipient) {
      const wallet = walletService.createCustodialWallet();
      recipient = await authRepository.createUser({
        walletAddress: wallet.address,
        walletEncryptedKey: wallet.encryptedKey,
        email: emailLower,
        referredById: sender.id,
      });
    } else {
      recipient = await walletService.ensureWallet(recipient);
    }

    const onchain = await lotteryGateway.readCurrentRound();
    if ((await lotteryGateway.ticketsOf(onchain.contractRoundId, recipient.walletAddress)) > 0) {
      throw playerLimitError(GIFT_PLAYER_LIMIT_MESSAGE);
    }

    const payer = await lotteryGateway.prepareWallet(sender);
    const { receipt, purchase } = await lotteryGateway
      .buyTickets(payer, 1, recipient.walletAddress)
      .catch((error: unknown) => {
        throw isPlayerLimitError(error) ? playerLimitError(GIFT_PLAYER_LIMIT_MESSAGE) : error;
      });
    const [ticket] = await lotteryRepository.findTicketsByIds(purchase.ticketIds);
    const refreshedSender = await authRepository.findById(senderId);

    return {
      ticket: {
        ...(ticket ? withTicketNumber(ticket) : {}),
        recipientEmail: emailLower,
        recipientWallet: recipient.walletAddress,
        etherscanUrl: this.txUrl(receipt.hash),
      },
      senderPointsAwarded: POINTS_PER_GIFT,
      senderNewBalance: refreshedSender?.pointsBalance ?? sender.pointsBalance,
    };
  }

  private async drawOnchain() {
    const { receipt } = await lotteryGateway.requestDraw();
    const onchain = await lotteryGateway.readCurrentRound();
    const round = await this.syncRound(onchain);
    return {
      round,
      vrfProof: {
        chainlinkRequestId: onchain.vrfRequestId,
        transactionHash: receipt.hash,
        etherscanUrl: this.txUrl(receipt.hash),
        status: 'PENDING',
        verifiedFair: true,
        simulated: false,
      },
      message:
        "Tirage demandé à Chainlink VRF. Le gagnant sera désigné par l'oracle dans les prochains blocs et annoncé en direct.",
    };
  }

  private async cancelOnchain() {
    const before = await lotteryGateway.readCurrentRound();
    const { receipt } = await lotteryGateway.cancelRound();
    const round = await lotteryRepository.findRoundByContractId(before.contractRoundId);
    return {
      round,
      autoRefundExecuted: true,
      refundedAmountEth: Number(formatEther(before.totalCollectedWei)),
      transactionHash: receipt.hash,
      etherscanUrl: this.txUrl(receipt.hash),
      message:
        "Le tour a été annulé dans le Smart Contract. Les remboursements sont réclamés automatiquement pour chaque participant ; aucun fonds ne peut être conservé par la Mairie.",
    };
  }

  private async onchainBadges(walletAddress: string, contractRoundIds: number[]) {
    const rounds = Array.from(new Set(contractRoundIds)).slice(0, 20);
    const badges = await Promise.all(
      rounds.map(async (roundId) => {
        const tokenId = await lotteryGateway.badgeOf(roundId, walletAddress);
        const metadataUrl = tokenId === null ? null : await lotteryGateway.badgeTokenUri(tokenId);
        return { roundId, tokenId, metadataUrl };
      })
    );
    const minted = badges.filter((badge): badge is typeof badge & { tokenId: number } => badge.tokenId !== null);
    const poapContract = lotteryGateway.describe().poapContract;
    return minted.map((badge, idx) => {
      const imageUrl = badge.metadataUrl ? badge.metadataUrl.replace(/\.json$/, '.svg') : null;
      return {
        id: `poap-${badge.tokenId}`,
        title: `Trophée Citoyen EtherBay #${badge.roundId}`,
        edition: idx === minted.length - 1 ? "Pionnier Fin d'Année 2026" : 'Participant Officiel EtherBay',
        tokenId: badge.tokenId,
        roundId: badge.roundId,
        contractAddress: poapContract,
        metadataUrl: badge.metadataUrl,
        imageUrl,
        image3dUrl: imageUrl,
        explorerUrl: chainClient.explorerAddressUrl(poapContract),
        mintedAt: null,
      };
    });
  }

  public async claimPrize(userId: string, contractRoundId: number) {
    if (!chainClient.isOnchain) {
      throw new AppError('Le retrait de la cagnotte nécessite le mode blockchain réel (BLOCKCHAIN_MODE=onchain).', 409);
    }
    const user = await authRepository.findById(userId);
    if (!user) throw new AppError('Utilisateur introuvable', 404);
    const { receipt } = await lotteryGateway.claimPrize(user, contractRoundId);
    const balance = await walletService.balanceOf(user.walletAddress);
    return {
      contractRoundId,
      transactionHash: receipt.hash,
      etherscanUrl: this.txUrl(receipt.hash),
      walletBalanceEth: balance === null ? null : Number(formatEther(balance)),
    };
  }

  public async getWallet(userId: string) {
    const user = await authRepository.findById(userId);
    if (!user) throw new AppError('Utilisateur introuvable', 404);
    if (chainClient.isOnchain) await lotteryGateway.prepareWallet(user);
    const prepared = (await authRepository.findById(userId)) ?? user;
    const balance = await walletService.balanceOf(prepared.walletAddress);
    return {
      mode: chainClient.isOnchain ? 'onchain' : 'simulated',
      walletAddress: prepared.walletAddress,
      custodial: Boolean(prepared.walletEncryptedKey),
      balanceEth: balance === null ? null : Number(formatEther(balance)),
      welcomeGrantTxHash: prepared.welcomeGrantTxHash ?? null,
      explorerUrl: chainClient.isOnchain ? chainClient.explorerAddressUrl(prepared.walletAddress) : null,
    };
  }

  public getTransparencyCharter() {
    return {
      title: "Charte de Transparence Blockchain — Ville d'EtherBay",
      version: '2026.1',
      sections: [
        {
          heading: '1. Pourquoi la Blockchain à EtherBay ?',
          body: "Chaque achat de ticket et chaque tirage au sort est inscrit de façon immuable sur un registre public décentralisé. Aucune intervention humaine ne peut modifier l'issue du tirage.",
        },
        {
          heading: '2. Tirage Aléatoire Certifié (Chainlink VRF)',
          body: "Le gagnant est désigné par un oracle cryptographique vérifiable (Chainlink VRF) qui génère une preuve mathématique d'équité consultable publiquement.",
        },
        {
          heading: '3. Garantie de Remboursement Automatique (Auto-Refund)',
          body: "Le Smart Contract intègre une clause de remboursement automatique : si l'événement est annulé ou interrompu, 100% des fonds engagés retournent automatiquement aux participants.",
        },
        {
          heading: '4. Portefeuille intégré et ethers fictifs',
          body: "À l'inscription, la Mairie crée pour vous un portefeuille Ethereum dont la clé est chiffrée sur ses serveurs, et vous offre une dotation d'ethers fictifs. Ces ethers circulent sur un réseau de test : ils n'ont aucune valeur, ne s'achètent pas et ne se convertissent pas en euros. La commission de la Mairie est fixée dans le Smart Contract et ne peut pas dépasser 20 % de la cagnotte.",
        },
      ],
    };
  }
}

export const lotteryService = new LotteryService();
export default lotteryService;
