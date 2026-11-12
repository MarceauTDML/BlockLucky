import crypto from 'crypto';
import QRCode from 'qrcode';
import { env } from '../../config/env.config';
import marketplaceRepository from './marketplace.repo';
import authRepository from '../auth/auth.repo';
import ledgerService from '../../services/ledger.service';
import redis from '../../config/redis.config';
import { enqueueEmail } from '../../queues/emails.queue';
import { generatePromoCode } from '../../utils/crypto.util';
import { AppError } from '../../utils/response.util';
import { businessEventsTotal } from '../../observability/metrics';
import { assertPartnerAccess, PartnerActor } from '../partners/partners.services';

export type ScratchOffer = 'violet' | 'lucky';

export const scratchCostOf = (offer: ScratchOffer): number =>
  offer === 'lucky' ? env.SCRATCH_COST_LUCKY : env.SCRATCH_COST_VIOLET;

export class MarketplaceService {
  private async nextPromoCode(rewardId: string, partnerName: string): Promise<string> {
    let uniqueCode = generatePromoCode(partnerName.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, 'EBAY'));
    const poolStr = await redis.get(`partner:codes:${rewardId}`);
    if (poolStr) {
      try {
        const pool: string[] = JSON.parse(poolStr);
        if (pool.length > 0) {
          uniqueCode = pool.shift()!;
          await redis.set(`partner:codes:${rewardId}`, JSON.stringify(pool));
        }
      } catch {}
    }
    return uniqueCode;
  }

  public async buyScratchTicket(userId: string, offer: ScratchOffer) {
    const cost = scratchCostOf(offer);
    const user = await authRepository.findById(userId);
    if (!user || user.deletedAt) throw new AppError('Utilisateur introuvable', 404);

    const available = await marketplaceRepository.listScratchableRewards();
    if (available.length === 0) {
      throw new AppError("Aucune récompense n'est disponible pour le moment dans les tickets à gratter.", 404);
    }
    if (user.pointsBalance < cost) {
      throw new AppError(
        `EtherPoints insuffisants pour ce ticket à gratter (${user.pointsBalance} disponibles, ${cost} requis).`,
        402,
        { code: 'INSUFFICIENT_POINTS', balance: user.pointsBalance, cost }
      );
    }

    const worthy = available.filter((reward) => reward.costInPoints >= cost);
    const pool = worthy.length > 0 ? worthy : available;
    const picked = pool[crypto.randomInt(pool.length)]!;
    const reward = await marketplaceRepository.findRewardById(picked.id);
    if (!reward) throw new AppError("Aucune récompense n'est disponible pour le moment dans les tickets à gratter.", 404);

    const uniqueCode = await this.nextPromoCode(reward.id, reward.partner.name);
    const result = await marketplaceRepository.drawScratchReward({
      userId,
      rewardId: reward.id,
      cost,
      uniqueCode,
      description: `Ticket à gratter ${offer} : ${reward.title} (${reward.partner.name})`,
    });
    if (result.outcome === 'INSUFFICIENT_POINTS') {
      throw new AppError(`EtherPoints insuffisants pour ce ticket à gratter (${cost} requis).`, 402, {
        code: 'INSUFFICIENT_POINTS',
        cost,
      });
    }

    const { claimed } = result;
    const qrCodeDataUrl = await QRCode.toDataURL(
      JSON.stringify({ claimId: claimed.id, uniqueCode: claimed.uniqueCode, partner: reward.partner.name })
    );

    if (user.email) {
      await enqueueEmail({
        to: user.email,
        subject: `Votre code promo ${reward.partner.name} - BlockLucky`,
        templateName: 'reward-claim',
        variables: { REWARD_TITLE: reward.title, PARTNER_NAME: reward.partner.name, PROMO_CODE: claimed.uniqueCode },
      });
    }
    businessEventsTotal.inc({ event: 'scratch_ticket_bought' });

    return {
      offer,
      claim: {
        id: claimed.id,
        uniqueCode: claimed.uniqueCode,
        isUsed: claimed.isUsed,
        claimedAt: claimed.claimedAt,
        rewardTitle: reward.title,
        costInPoints: reward.costInPoints,
        partnerName: reward.partner.name,
        partnerLogo: reward.partner.logoUrl,
        partner: { id: reward.partner.id, name: reward.partner.name, logoUrl: reward.partner.logoUrl },
        qrCodeDataUrl,
        scratchCardReady: true,
      },
      remainingStock: result.remainingStock,
      pointsSpent: cost,
      newBalance: result.balance,
      newPointsBalance: result.balance,
    };
  }

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

    const uniqueCode = await this.nextPromoCode(reward.id, reward.partner.name);

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

  public async validateAndRedeemStoreCode(uniqueCode: string, actor: PartnerActor) {
    const claim = await marketplaceRepository.findClaimByCode(uniqueCode);
    if (!claim) {
      throw new AppError('Code promo introuvable', 404);
    }
    try {
      assertPartnerAccess(claim.rewardCatalog.partner, actor);
    } catch {
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
