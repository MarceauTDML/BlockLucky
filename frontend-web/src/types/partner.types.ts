export interface PartnerRecord {
  id: string;
  name: string;
  logoUrl: string;
  isActive: boolean;
  createdAt: string;
}

export interface PartnerOffer {
  id: string;
  partnerId: string;
  title: string;
  costInPoints: number;
  totalStock: number;
  remainingStock: number;
  isActive: boolean;
  createdAt: string;
  expiresAt?: string | null;
  _count?: { claimedRewards: number };
}

export interface PartnerWithRewards extends PartnerRecord {
  rewards: PartnerOffer[];
}

export interface PartnerConsumptionResponse {
  partner: Pick<PartnerRecord, 'id' | 'name' | 'logoUrl' | 'isActive'>;
  summary: {
    totalStock: number;
    remainingStock: number;
    claimedCount: number;
    redeemedInStoreCount: number;
    consumptionPercentage: number;
  };
  offersBreakdown: {
    rewardId: string;
    title: string;
    costInPoints: number;
    totalStock: number;
    remainingStock: number;
    claimedCount: number;
    redeemedInStoreCount: number;
    consumptionRatePercent: number;
  }[];
}

export interface CreateOfferPayload {
  partnerId: string;
  title: string;
  costInPoints: number;
  totalStock: number;
  expiresAt?: string;
}

export interface UploadCodesResponse {
  rewardId: string;
  injectedCount: number;
  totalPoolAvailable: number;
  totalStock: number;
  remainingStock: number;
}

export interface RedeemCodeResponse {
  redeemed: boolean;
  uniqueCode: string;
  rewardTitle: string;
  partnerName: string;
  usedAt: string;
}
