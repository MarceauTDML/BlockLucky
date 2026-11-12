import { BackendNetworkStatus } from './api.types';
import { Role } from './user.types';

export type AgeBucket = '18-25' | '26-35' | '36-50' | '50+';

export interface AdminLotteryRound {
  id: string;
  contractRoundId: number;
  status: 'OPEN' | 'LOCKED' | 'COMPLETED' | 'CANCELLED';
  prizePool: number;
  winnerWallet: string | null;
  chainlinkRequestId: string | null;
  startedAt: string;
  drawnAt: string | null;
}

export interface UtmAcquisitionRow {
  source: string;
  conversions: number;
}

export interface AdminDashboardResponse {
  kpis: {
    totalPrizePoolEth: number;
    ticketsSold: number;
    municipalityRevenueEth: number;
    registeredCitizens: number;
    activePartners: number;
    claimedRewards: number;
  };
  demographics: {
    target18_35Validated: boolean;
    ageBreakdown: Record<AgeBucket, number>;
  };
  utmAcquisition: UtmAcquisitionRow[];
  network: BackendNetworkStatus;
  rounds: AdminLotteryRound[];
}

export interface AnalyticsDashboardResponse {
  kpis: {
    totalUsers: number;
    targetParticipants: number;
    completionRatePercent: number;
    totalTicketsSold: number;
    totalPrizePoolEth: number;
    municipalityRevenueShareEth: number;
    totalClaimedRewards: number;
  };
  demographics: AdminDashboardResponse['demographics'];
  utmAcquisition: UtmAcquisitionRow[];
}

export interface CircuitBreakerResponse {
  paused: boolean;
  txHash: string;
  timestamp: string;
  reason: string;
}

export interface TreasuryWithdrawResponse {
  transactionHash: string;
  multisigWallet: string;
  amountEth: number;
  timestamp: string;
}

export type AuditAction =
  | 'CIRCUIT_BREAKER_PAUSE'
  | 'CIRCUIT_BREAKER_RESUME'
  | 'TREASURY_WITHDRAWAL_MULTISIG'
  | 'PARTNER_APPROVED'
  | 'PARTNER_SUSPENDED'
  | 'EXPORT_REPORT_CSV'
  | 'EXPORT_REPORT_PDF'
  | string;

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  adminId: string | null;
  adminWallet: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export interface ReportExportResponse {
  format: 'CSV' | 'PDF';
  generatedAt: string;
  downloadUrl: string;
  content?: string;
  summary?: AdminDashboardResponse['kpis'];
}

export interface DrawResponse {
  round: AdminLotteryRound;
  vrfProof: {
    chainlinkRequestId: string | null;
    transactionHash: string | null;
    etherscanUrl: string | null;
    status: 'PENDING';
    verifiedFair: boolean;
    simulated: boolean;
  };
  message?: string;
}

export interface RefundResponse {
  round: AdminLotteryRound;
  autoRefundExecuted: boolean;
  refundedAmountEth: number;
  message: string;
}

export type IdentityVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface IdentityVerificationSummary {
  id: string;
  userId: string;
  email: string | null;
  submittedAt: string;
  status: IdentityVerificationStatus;
}

export interface IdentityVerificationDetail extends IdentityVerificationSummary {
  walletAddress: string;
  accountCreatedAt: string;
  reviewedAt: string | null;
  reviewerId: string | null;
  note: string | null;
  front: string | null;
  back: string | null;
}

export interface IdentityDecisionResponse {
  id: string;
  userId: string;
  status: IdentityVerificationStatus;
  reviewedAt: string;
  note: string | null;
}

export type StaffRole = 'ADMIN' | 'PARTNER';

export interface StaffAccountPartner {
  id: string;
  name: string;
  isActive: boolean;
}

export interface StaffAccount {
  id: string;
  email: string | null;
  role: Role;
  firstName: string | null;
  lastName: string | null;
  isTwoFactorEnabled: boolean;
  createdAt: string;
  partners: StaffAccountPartner[];
}

export interface CreateStaffAccountPayload {
  email: string;
  role: StaffRole;
  firstName?: string;
  lastName?: string;
  partnerId?: string;
}

export interface CreateStaffAccountResponse {
  account: StaffAccount;
  created: boolean;
}
