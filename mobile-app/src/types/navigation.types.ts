import { ClaimedRewardCode } from './api.types';

export type AuthStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Verify2FA: {
    userId: string;
    method: 'APP' | 'EMAIL';
    email?: string | null;
  };
  Setup2FA: undefined;
};

export type SettingsStackParamList = {
  ProfileMain: undefined;
  Security: undefined;
  Setup2FA: undefined;
  GDPR: undefined;
  HelpSupport: undefined;
};

export type MainTabsParamList = {
  HomeTab: undefined;
  BuyTicketTab: undefined;
  LiveDrawTab: undefined;
  MarketplaceTab: undefined;
  SettingsTab: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  BuyTicket: { giftMode?: boolean } | undefined;
  LiveDraw: undefined;
  TransactionHistory: undefined;
  RewardsCatalog: undefined;
  RewardDetail: { rewardId: string };
  ScratchCard: { claim: ClaimedRewardCode };
  MyCodes: undefined;
  Setup2FA: undefined;
};
