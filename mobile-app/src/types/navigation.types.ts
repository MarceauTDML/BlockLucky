import { NavigatorScreenParams } from '@react-navigation/native';

import { ClaimedRewardCode } from './api.types';

export type AuthStackParamList = {
  Onboarding: undefined;
  SignIn: undefined;
  SignUp: { referralCode?: string } | undefined;
  Verify2FA: {
    userId: string;
    method: 'APP' | 'EMAIL';
    loginTicket?: string;
    email?: string | null;
    purpose?: 'signin' | 'signup';
    devOtpPreview?: string;
  };
  ForgotPassword: { email?: string } | undefined;
  ResetPassword: { email: string; devOtpPreview?: string };
  Setup2FA: undefined;
};

export type MainTabsParamList = {
  HomeTab: undefined;
  TicketsTab: undefined;
  SponsorsTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList> | undefined;
  Main: NavigatorScreenParams<MainTabsParamList> | undefined;
  BuyTicket: undefined;
  GiftTicket: { ticketId?: string } | undefined;
  WaitingRoom: undefined;
  LiveDraw:
    | {
        contractRoundId?: number;
        participants?: number | null;
        maxParticipants?: number | null;
        prizePool?: number | null;
      }
    | undefined;
  TransactionHistory: undefined;
  Notifications: undefined;
  HowItWorks: undefined;
  RewardsCatalog: undefined;
  RewardDetail: { rewardId: string };
  ScratchCard: { claim?: ClaimedRewardCode; offer?: 'violet' | 'lucky' };
  MyCodes: undefined;
  VerifyAge: undefined;
  Settings: undefined;
  DisplaySettings: undefined;
  NotificationSettings: undefined;
  PersonalData: undefined;
  Security: undefined;
  ChangeEmail: undefined;
  ChangePassword: undefined;
  Setup2FA: undefined;
  HelpSupport: undefined;
  Legal: {
    doc: 'cgu' | 'reglement' | 'confidentialite' | 'traceurs' | 'mentions' | 'transparence';
  };
};
