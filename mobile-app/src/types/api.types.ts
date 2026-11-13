import { UserProfile, ReferralInfo, SocialQuest, PushNotificationItem } from './user.types';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface OnboardingSlide {
  step: number;
  title: string;
  description: string;
}

export interface Setup2FAResponse {
  method: 'APP' | 'EMAIL';
  secret?: string;
  otpAuthUrl?: string;
  qrCodeDataUrl?: string;
  backupCodes?: string[];
  message?: string;
  devOtpPreview?: string;
}

export interface Verify2FAResponse {
  verified: boolean;
  token?: string;
  user?: UserProfile;
  isNewUser?: boolean;
  requiresTwoFactor?: boolean;
  twoFactorMethod?: 'APP' | 'EMAIL';
  userId?: string;
  loginTicket?: string;
}

export interface AuthSessionResponse {
  requiresTwoFactor: boolean;
  twoFactorMethod?: 'APP' | 'EMAIL' | null;
  userId?: string;
  loginTicket?: string;
  token?: string;
  isNewUser?: boolean;
  user?: UserProfile;
  devOtpPreview?: string;
}

export interface SignInPayload {
  email: string;
  password: string;
}

export interface SignUpPayload {
  email: string;
  password: string;
  acceptTerms: true;
  isAdultConfirmed: true;
  referralCode?: string;
  utmSource?: string;
  ageGroup?: '18-25' | '26-35' | '36-50' | '50+';
}

export interface ResetPasswordPayload {
  email: string;
  code: string;
  newPassword: string;
}

export interface IdentitySubmitPayload {
  front: string;
  back: string;
}

export interface Milestone {
  target: number;
  title: string;
  rewardDescription: string;
  unlocked: boolean;
}

export interface NetworkStatus {
  primaryRpcConnected: boolean;
  fallbackActive: boolean;
  activeNodeUrl: string;
  circuitBreakerTripped: boolean;
  latencyMs: number;
}

export interface LotteryRoundInfo {
  id: string;
  contractRoundId: number;
  status: 'OPEN' | 'LOCKED' | 'COMPLETED' | 'CANCELLED';
  prizePool: number;
  ticketPriceEth: number;
  winnerWallet?: string | null;
  chainlinkRequestId?: string | null;
  startedAt: string;
  drawnAt?: string | null;
  drawTargetTime: string;
  remainingSeconds: number;
  inWaitingRoom: boolean;
  maxTicketsPerPlayer?: number;
  phase?: LotteryPhase;
  waitingRoomOpensAt?: string | null;
  revealAt?: string | null;
  participants?: number;
  maxParticipants?: number;
}

export type LotteryPhase = 'OPEN' | 'WAITING_ROOM' | 'DRAWING' | 'COMPLETED' | 'CANCELLED';

export interface LotteryGuarantees {
  autoRefundEnabled: boolean;
  autoRefundPolicy: string;
  gaslessSponsored: boolean;
  vrfCertified: boolean;
  simulated: boolean;
  paused?: boolean;
}

export interface BlockchainInfo {
  mode: string;
  chainId: number;
  lotteryContract: string;
  poapContract: string;
  lotteryExplorerUrl: string | null;
}

export interface PreviousRoundSummary {
  contractRoundId: number;
  status: 'OPEN' | 'LOCKED' | 'COMPLETED' | 'CANCELLED';
  participants: number;
  winnerWallet: string | null;
  endedAt: string;
}

export interface LotteryStatusResponse {
  round: LotteryRoundInfo;
  previousRound?: PreviousRoundSummary | null;
  progression: {
    ticketsSold: number;
    distinctParticipants: number;
    targetParticipants: number;
    percentage: number;
    milestones: Milestone[];
  };
  guarantees: LotteryGuarantees;
  network?: NetworkStatus;
  blockchain?: BlockchainInfo;
}

export interface TicketItem {
  id: string;
  transactionHash: string;
  blockNumber: number;
  purchasedAt: string;
  roundId?: string;
  contractRoundId?: number;
  roundStatus?: string;
  etherscanUrl: string | null;
  ticketNumber?: string;
  isWinner?: boolean;
  winningTicketNumber?: string | null;
  prizeEth?: number | null;
}

export interface PoapBadge {
  id: string;
  title: string;
  edition: string;
  tokenId: number;
  roundId?: number | string;
  contractAddress?: string;
  metadataUrl?: string | null;
  imageUrl?: string | null;
  image3dUrl: string;
  explorerUrl?: string | null;
  mintedAt: string | null;
}

export interface BuyTicketResponse {
  tickets: TicketItem[];
  pointsAwarded: number;
  newPointsBalance: number;
  poapBadge: {
    status: 'MINT_PENDING';
    contractAddress: string;
    roundId: number;
  };
  gaslessSponsored: boolean;
  transactionHash: string;
  etherscanUrl: string | null;
  walletAddress: string;
  walletBalanceEth: number | null;
}

export interface GiftTicketResponse {
  ticket: TicketItem & {
    recipientEmail: string;
    recipientWallet: string;
  };
  senderPointsAwarded: number;
  senderNewBalance: number;
}

export interface WalletInfo {
  mode: string;
  walletAddress: string;
  custodial: boolean;
  balanceEth: number | null;
  welcomeGrantTxHash: string | null;
  explorerUrl: string | null;
}

export interface ClaimPrizeResponse {
  contractRoundId: number;
  transactionHash: string;
  etherscanUrl: string | null;
  walletBalanceEth: number | null;
}

export interface ApiErrorDetails {
  contractError?: string;
  circuitBreaker?: boolean;
  canRetry?: boolean;
  code?: string;
  status?: string;
}

export interface LeaderboardEntry {
  rank: number;
  anonymizedWallet: string;
  pointsBalance: number;
  referralsCount: number;
  ticketsBought: number;
}

export interface TransparencyCharter {
  title: string;
  version: string;
  sections: {
    heading: string;
    body: string;
  }[];
}

export interface RewardItem {
  id: string;
  title: string;
  costInPoints: number;
  totalStock: number;
  remainingStock: number;
  stockPercentage: number;
  isActive: boolean;
  partner: {
    id: string;
    name: string;
    logoUrl: string;
  };
}

export interface ClaimedRewardCode {
  id: string;
  uniqueCode: string;
  isUsed: boolean;
  claimedAt: string;
  rewardTitle: string;
  costInPoints?: number;
  partnerName?: string;
  partnerLogo?: string;
  partner?: {
    id: string;
    name: string;
    logoUrl: string;
  };
  qrCodeDataUrl: string;
  scratchCardReady?: boolean;
}

export type ScratchOffer = 'violet' | 'lucky';

export type ScratchTicketResponse = Partial<ClaimedRewardCode> & {
  claim?: ClaimedRewardCode;
  offer?: ScratchOffer;
  pointsSpent: number;
  newBalance: number;
};

export interface PointLedgerEntry {
  id: string;
  amount: number;
  actionType: string;
  description?: string | null;
  createdAt: string;
  integrityHash: string;
}

export interface PointsBalanceResponse {
  pointsBalance: number;
  ledgerIntegrityValid: boolean;
  history: PointLedgerEntry[];
}

export interface GdprExportResponse {
  exportedAt: string;
  gdprCompliant: boolean;
  controller: string;
  personalData: Record<string, unknown>;
  ticketsHistory: unknown[];
  pointsLedger: unknown[];
  claimedRewards: unknown[];
  analyticsEvents: unknown[];
}

export type { UserProfile, ReferralInfo, SocialQuest, PushNotificationItem };
