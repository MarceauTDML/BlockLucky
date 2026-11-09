export type Role = 'USER' | 'PARTNER' | 'ADMIN';

export type TwoFactorMethod = 'APP' | 'EMAIL';

export type ThemeMode = 'DARK' | 'LIGHT';

export type LanguageCode = 'FR' | 'EN';

export interface UserPreferences {
  theme: ThemeMode;
  language: LanguageCode;
  pushNotificationsEnabled: boolean;
}

export interface UserStats {
  ticketsCount: number;
  claimedRewardsCount: number;
  referralsCount: number;
}

export interface UserProfile {
  id: string;
  walletAddress: string;
  email?: string | null;
  role: Role;
  pointsBalance: number;
  referralCode: string;
  referralLink?: string;
  isTwoFactorEnabled: boolean;
  twoFactorMethod?: TwoFactorMethod | null;
  stats?: UserStats;
  responsibleGaming?: {
    maxTicketsPerRound: number;
  };
  preferences?: UserPreferences;
  createdAt?: string;
}

export interface ReferralEntry {
  id: string;
  anonymizedWallet: string;
  joinedAt: string;
}

export interface ReferralInfo {
  referralCode: string;
  referralLink: string;
  referralsCount: number;
  referrals: ReferralEntry[];
  quickShareLinks: {
    whatsapp: string;
    twitter: string;
    sms: string;
  };
}

export interface SocialQuest {
  id: string;
  title: string;
  rewardPoints: number;
  completed: boolean;
}

export interface PushNotificationItem {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}
