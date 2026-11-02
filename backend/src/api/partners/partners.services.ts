import partnersRepository from './partners.repo';
import redis from '../../config/redis.config';
import { AppError } from '../../utils/response.util';

export class PartnersService {
  public async listPartners() {
    return partnersRepository.findAllPartners();
  }

  public async createPartner(data: { name: string; logoUrl: string }) {
    return partnersRepository.createPartner(data);
  }

  public async createOffer(input: {
    partnerId: string;
    title: string;
    costInPoints: number;
    totalStock: number;
    expiresAt?: string;
  }) {
    const partner = await partnersRepository.findPartnerById(input.partnerId);
    if (!partner) {
      throw new AppError('Entreprise partenaire introuvable', 404);
    }

    const offer = await partnersRepository.createRewardOffer({
      partnerId: input.partnerId,
      title: input.title,
      costInPoints: input.costInPoints,
      totalStock: input.totalStock,
    });

    if (input.expiresAt) {
      await redis.set(`partner:offer_expiry:${offer.id}`, input.expiresAt);
    }

    return {
      ...offer,
      expiresAt: input.expiresAt ?? null,
    };
  }

  public async uploadPromoCodesBatch(input: {
    rewardId: string;
    codes?: string[];
    csvContent?: string;
  }) {
    const reward = await partnersRepository.findRewardById(input.rewardId);
    if (!reward) {
      throw new AppError('Offre partenaire introuvable', 404);
    }

    let extractedCodes: string[] = [];
    if (Array.isArray(input.codes) && input.codes.length > 0) {
      extractedCodes = input.codes.map((c) => c.trim()).filter(Boolean);
    } else if (input.csvContent) {
      extractedCodes = input.csvContent
        .split(/[\r\n,;]+/)
        .map((c) => c.trim())
        .filter((c) => c.length >= 3 && c.toLowerCase() !== 'code');
    }

    if (extractedCodes.length === 0) {
      throw new AppError('Aucun code promo valide fourni dans le lot (CSV ou liste)', 400);
    }

    const uniqueCodes = Array.from(new Set(extractedCodes));

    const existingPoolStr = await redis.get(`partner:codes:${reward.id}`);
    const existingPool: string[] = existingPoolStr ? JSON.parse(existingPoolStr) : [];
    const mergedPool = Array.from(new Set([...existingPool, ...uniqueCodes]));

    await redis.set(`partner:codes:${reward.id}`, JSON.stringify(mergedPool));

    const updatedReward = await partnersRepository.incrementRewardStock(
      reward.id,
      uniqueCodes.length
    );

    return {
      rewardId: reward.id,
      injectedCount: uniqueCodes.length,
      totalPoolAvailable: mergedPool.length,
      totalStock: updatedReward.totalStock,
      remainingStock: updatedReward.remainingStock,
    };
  }

  public async getPartnerConsumptionStats(partnerId: string) {
    const partner = await partnersRepository.findPartnerById(partnerId);
    if (!partner) {
      throw new AppError('Partenaire introuvable', 404);
    }

    let totalStock = 0;
    let remainingStock = 0;
    let claimedCount = 0;
    let redeemedInStoreCount = 0;

    const breakdown = partner.rewards.map((r) => {
      const claimed = r.claimedRewards.length;
      const used = r.claimedRewards.filter((c) => c.isUsed).length;

      totalStock += r.totalStock;
      remainingStock += r.remainingStock;
      claimedCount += claimed;
      redeemedInStoreCount += used;

      return {
        rewardId: r.id,
        title: r.title,
        costInPoints: r.costInPoints,
        totalStock: r.totalStock,
        remainingStock: r.remainingStock,
        claimedCount: claimed,
        redeemedInStoreCount: used,
        consumptionRatePercent:
          r.totalStock > 0 ? Math.round((claimed / r.totalStock) * 100) : 0,
      };
    });

    return {
      partner: {
        id: partner.id,
        name: partner.name,
        logoUrl: partner.logoUrl,
        isActive: partner.isActive,
      },
      summary: {
        totalStock,
        remainingStock,
        claimedCount,
        redeemedInStoreCount,
        consumptionPercentage:
          totalStock > 0 ? Math.round((claimedCount / totalStock) * 100) : 0,
      },
      offersBreakdown: breakdown,
    };
  }
}

export const partnersService = new PartnersService();
export default partnersService;
