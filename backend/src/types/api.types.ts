export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: PaginationMeta;
  errors?: unknown;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface JwtPayload {
  userId: string;
  walletAddress: string;
  role: 'USER' | 'PARTNER' | 'ADMIN';
  twoFactorVerified?: boolean;
}

export interface Milestone {
  target: number;
  title: string;
  rewardDescription: string;
  unlocked: boolean;
}
