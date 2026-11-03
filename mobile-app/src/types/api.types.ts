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

export interface SocialLoginPayload {
  walletAddress: string;
  email?: string;
  provider?: 'GOOGLE' | 'APPLE' | 'EMAIL';
  isAdultConfirmed: boolean;
  ageGroup?: '18-25' | '26-35' | '36-50' | '50+';
  referralCode?: string;
  utmSource?: string;
}

export interface SocialLoginResponse {
  requiresTwoFactor: boolean;
  twoFactorMethod?: 'APP' | 'EMAIL' | null;
  userId?: string;
  token?: string;
  isNewUser?: boolean;
  user: UserProfile;
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
  token: string;
  user: UserProfile;
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
}

export interface LotteryStatusResponse {
  round: LotteryRoundInfo;
  progression: {
    ticketsSold: number;
    distinctParticipants: number;
    targetParticipants: number;
    percentage: number;
    milestones: Milestone[];
  };
  guarantees: {
    autoRefundEnabled: boolean;
    autoRefundPolicy: string;
    gaslessSponsored: boolean;
    vrfCertified: boolean;
  };
  network: NetworkStatus;
}

export interface TicketItem {
  id: string;
  transactionHash: string;
  blockNumber: number;
  purchasedAt: string;
  roundId?: string;
  contractRoundId?: number;
  roundStatus?: string;
  etherscanUrl: string;
}

export interface PoapBadge {
  id: string;
  title: string;
  edition: string;
  tokenId: number;
  transactionHash: string;
  image3dUrl: string;
  mintedAt: string;
}

export interface BuyTicketResponse {
  tickets: TicketItem[];
  pointsAwarded: number;
  newPointsBalance: number;
  poapBadge: {
    tokenId: number;
    transactionHash: string;
    metadataUri: string;
  };
  gaslessSponsored: boolean;
}

export interface GiftTicketResponse {
  ticket: TicketItem & {
    recipientEmail: string;
    recipientWallet: string;
  };
  senderPointsAwarded: number;
  senderNewBalance: number;
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
