import QRCode from 'qrcode';
import marketplaceRepository from './marketplace.repo';
import authRepository from '../auth/auth.repo';
import ledgerService from '../../services/ledger.service';
import redis from '../../config/redis.config';
import { enqueueEmail } from '../../queues/emails.queue';
import { generatePromoCode } from '../../utils/crypto.util';
import { AppError } from '../../utils/response.util';
import { businessEventsTotal } from '../../observability/metrics';

export class MarketplaceService {
  public async getCatalog() {
    const rewards = await marketplaceRepository.getCatalogWithPartners();
    return rewards.map((r) => ({
      id: r.id,
      title: r.title,
      costInPoints: r.costInPoints,
      totalStock: r.totalStock,
      remainingStock: r.remainingStock,
      stockPercentage:
        r.totalStock > 0 ? Math.round((r.remainingStock / r.totalStock) * 100) : 0,
      isActive: r.isActive,
      partner: {
        id: r.partner.id,
        name: r.partner.name,
        logoUrl: r.partner.logoUrl,
      },
    }));
  }

  public async getRewardDetails(rewardId: string) {
    const reward = await marketplaceRepository.findRewardById(rewardId);
    if (!reward) {
      throw new AppError('Récompense introuvable dans le catalogue', 404);
    }

    return {
      ...reward,
      stockPercentage:
        reward.totalStock > 0
          ? Math.round((reward.remainingStock / reward.totalStock) * 100)
          : 0,
      claimedCount: reward._count.claimedRewards,
    };
  }

  public async claimRewardScratchCard(userId: string, rewardId: string) {
    const reward = await marketplaceRepository.findRewardById(rewardId);
    if (!reward || !reward.isActive) {
      throw new AppError("Cette offre n'est plus disponible", 404);
    }

    if (reward.remainingStock <= 0) {
      throw new AppError('Stock épuisé pour cette récompense partenaire', 400);
    }

    const user = await authRepository.findById(userId);
    if (!user) {
      throw new AppError('Utilisateur introuvable', 404);
    }

    if (user.pointsBalance < reward.costInPoints) {
      throw new AppError(
        `EtherPoints insuffisants (${user.pointsBalance} disponibles, ${reward.costInPoints} requis)`,
        400
      );
    }

    const ledgerResult = await ledgerService.debitPoints(
      userId,
      reward.costInPoints,
      'REWARD_CLAIM',
      `Échange récompense : ${reward.title} (${reward.partner.name})`
    );

    let uniqueCode = generatePromoCode(reward.partner.name.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, 'EBAY'));
    const poolStr = await redis.get(`partner:codes:${reward.id}`);
    if (poolStr) {
      try {
        const pool: string[] = JSON.parse(poolStr);
        if (pool.length > 0) {
          uniqueCode = pool.shift()!;
          await redis.set(`partner:codes:${reward.id}`, JSON.stringify(pool));
        }
      } catch {}
    }

    const { claimed, updatedReward } = await marketplaceRepository.decrementStockAndCreateClaim({
      userId,
      rewardId: reward.id,
      uniqueCode,
    });

    const qrCodeDataUrl = await QRCode.toDataURL(
      JSON.stringify({
        claimId: claimed.id,
        uniqueCode: claimed.uniqueCode,
        partner: reward.partner.name,
      })
    );

    if (user.email) {
      await enqueueEmail({
        to: user.email,
        subject: `Votre code promo ${reward.partner.name} - BlockLucky`,
        templateName: 'reward-claim',
        variables: {
          REWARD_TITLE: reward.title,
          PARTNER_NAME: reward.partner.name,
          PROMO_CODE: claimed.uniqueCode,
        },
      });
    }

    businessEventsTotal.inc({ event: 'reward_claimed' });

    return {
      claim: {
        id: claimed.id,
        uniqueCode: claimed.uniqueCode,
        isUsed: claimed.isUsed,
        claimedAt: claimed.claimedAt,
        rewardTitle: reward.title,
        partnerName: reward.partner.name,
        partnerLogo: reward.partner.logoUrl,
        qrCodeDataUrl,
        scratchCardReady: true,
      },
      remainingStock: updatedReward.remainingStock,
      newPointsBalance: ledgerResult.balance,
    };
  }

  public async getMyWalletCodes(userId: string) {
    const claims = await marketplaceRepository.getUserClaimedRewards(userId);
    const enriched = await Promise.all(
      claims.map(async (c) => {
        const qrCodeDataUrl = await QRCode.toDataURL(c.uniqueCode);
        return {
          id: c.id,
          uniqueCode: c.uniqueCode,
          isUsed: c.isUsed,
          claimedAt: c.claimedAt,
          rewardTitle: c.rewardCatalog.title,
          costInPoints: c.rewardCatalog.costInPoints,
          partner: {
            id: c.rewardCatalog.partner.id,
            name: c.rewardCatalog.partner.name,
            logoUrl: c.rewardCatalog.partner.logoUrl,
          },
          qrCodeDataUrl,
        };
      })
    );
    return enriched;
  }

  public async validateAndRedeemStoreCode(uniqueCode: string) {
    const claim = await marketplaceRepository.findClaimByCode(uniqueCode);
    if (!claim) {
      throw new AppError('Code promo introuvable', 404);
    }

    if (claim.isUsed) {
      throw new AppError('Ce code promo a déjà été utilisé en magasin', 400);
    }

    const updated = await marketplaceRepository.markCodeAsUsed(claim.id);
    return {
      redeemed: true,
      uniqueCode: updated.uniqueCode,
      rewardTitle: claim.rewardCatalog.title,
      partnerName: claim.rewardCatalog.partner.name,
      usedAt: new Date().toISOString(),
    };
  }
}

export const marketplaceService = new MarketplaceService();
export default marketplaceService;
