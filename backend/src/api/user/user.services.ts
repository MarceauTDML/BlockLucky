import userRepository from './user.repo';
import ledgerService from '../../services/ledger.service';
import redis from '../../config/redis.config';
import { enqueueEmail } from '../../queues/emails.queue';
import { env } from '../../config/env.config';
import { generateRandomToken, anonymizeWallet } from '../../utils/crypto.util';
import sessionService from '../../services/session.service';
import { AppError } from '../../utils/response.util';

const QUESTS_CATALOG = [
  {
    id: 'FOLLOW_TWITTER_ETHERBAY',
    title: "Suivre la Mairie d'EtherBay sur X (Twitter)",
    rewardPoints: 30,
  },
  {
    id: 'JOIN_DISCORD_ETHERBAY',
    title: 'Rejoindre la communauté citoyenne EtherBay sur Discord',
    rewardPoints: 40,
  },
  {
    id: 'SHARE_LOTTERY_LINK',
    title: 'Partager la Grande Loterie sur WhatsApp ou SMS',
    rewardPoints: 25,
  },
  {
    id: 'READ_TRANSPARENCY_CHARTER',
    title: 'Lire la Charte de Transparence du Smart Contract',
    rewardPoints: 20,
  },
];

export class UserService {
  public async getProfile(userId: string) {
    const user = await userRepository.getUserFullProfile(userId);
    if (!user || user.deletedAt) {
      throw new AppError('Profil utilisateur introuvable ou supprimé', 404);
    }

    const prefsStr = await redis.get(`user:prefs:${userId}`);
    const preferences = prefsStr
      ? JSON.parse(prefsStr)
      : { theme: 'DARK', language: 'FR', pushNotificationsEnabled: true };

    const limitStr = await redis.get(`user:ticket_limit:${userId}`);
    const maxTicketsPerRound = limitStr ? Number(limitStr) : 50;

    return {
      id: user.id,
      walletAddress: user.walletAddress,
      email: user.email,
      role: user.role,
      pointsBalance: user.pointsBalance,
      referralCode: user.referralCode,
      referralLink: `${env.FRONTEND_URL}/invite/${user.referralCode}`,
      isTwoFactorEnabled: user.isTwoFactorEnabled,
      twoFactorMethod: user.twoFactorMethod,
      stats: {
        ticketsCount: user._count.tickets,
        claimedRewardsCount: user._count.claimedRewards,
        referralsCount: user._count.referrals,
      },
      responsibleGaming: {
        maxTicketsPerRound,
      },
      preferences,
      createdAt: user.createdAt,
    };
  }

  public async getReferralInfo(userId: string) {
    const user = await userRepository.getUserFullProfile(userId);
    if (!user) throw new AppError('Utilisateur introuvable', 404);

    const shareUrl = `${env.FRONTEND_URL}/invite/${user.referralCode}`;
    const shareText = encodeURIComponent(
      `Rejoins-moi sur BlockLucky, la Grande Loterie citoyenne d'EtherBay ! Gagne +50 EtherPoints offerts avec mon lien : ${shareUrl}`
    );

    return {
      referralCode: user.referralCode,
      referralLink: shareUrl,
      referralsCount: user._count.referrals,
      referrals: user.referrals.map((r) => ({
        id: r.id,
        anonymizedWallet: anonymizeWallet(r.walletAddress),
        joinedAt: r.createdAt,
      })),
      quickShareLinks: {
        whatsapp: `https://wa.me/?text=${shareText}`,
        twitter: `https://twitter.com/intent/tweet?text=${shareText}`,
        sms: `sms:?&body=${shareText}`,
      },
    };
  }

  public async getSocialQuests(userId: string) {
    const completedStr = await redis.get(`user:quests:${userId}`);
    const completedIds: string[] = completedStr ? JSON.parse(completedStr) : [];

    return QUESTS_CATALOG.map((q) => ({
      ...q,
      completed: completedIds.includes(q.id),
    }));
  }

  public async completeSocialQuest(userId: string, questId: string) {
    const quest = QUESTS_CATALOG.find((q) => q.id === questId);
    if (!quest) {
      throw new AppError('Quête sociale introuvable', 404);
    }

    const completedStr = await redis.get(`user:quests:${userId}`);
    const completedIds: string[] = completedStr ? JSON.parse(completedStr) : [];

    if (completedIds.includes(questId)) {
      throw new AppError('Vous avez déjà complété cette quête sociale', 400);
    }

    completedIds.push(questId);
    await redis.set(`user:quests:${userId}`, JSON.stringify(completedIds));

    const ledgerResult = await ledgerService.creditPoints(
      userId,
      quest.rewardPoints,
      'SOCIAL_QUEST',
      `Quête sociale accomplie : ${quest.title}`
    );

    return {
      quest: { ...quest, completed: true },
      pointsAwarded: quest.rewardPoints,
      newPointsBalance: ledgerResult.balance,
    };
  }

  public async setResponsibleGamingLimit(userId: string, maxTicketsPerRound: number) {
    await redis.set(`user:ticket_limit:${userId}`, String(maxTicketsPerRound));
    return {
      userId,
      maxTicketsPerRound,
      updatedAt: new Date().toISOString(),
    };
  }

  public async updatePreferences(
    userId: string,
    prefs: { theme?: string; language?: string; pushNotificationsEnabled?: boolean }
  ) {
    const currentStr = await redis.get(`user:prefs:${userId}`);
    const current = currentStr
      ? JSON.parse(currentStr)
      : { theme: 'DARK', language: 'FR', pushNotificationsEnabled: true };

    const updated = { ...current, ...prefs };
    await redis.set(`user:prefs:${userId}`, JSON.stringify(updated));
    return updated;
  }

  public async getPushNotificationsHistory(userId: string) {
    return [
      {
        id: 'notif-1',
        title: "Nouveau commerçant partenaire à EtherBay !",
        body: 'La Boulangerie du Port offre -15% contre 100 EtherPoints.',
        read: false,
        createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      },
      {
        id: 'notif-2',
        title: 'Objectif 10 000 participants en approche',
        body: 'Le prochain palier communautaire débloque un bonus de cagnotte.',
        read: true,
        createdAt: new Date(Date.now() - 86400 * 1000).toISOString(),
      },
      {
        id: `notif-user-${userId.slice(0, 6)}`,
        title: 'Bienvenue sur BlockLucky EtherBay',
        body: 'Vos +25 EtherPoints de bienvenue ont été crédités sur votre compte.',
        read: true,
        createdAt: new Date(Date.now() - 172800 * 1000).toISOString(),
      },
    ];
  }

  public async exportGdprData(userId: string) {
    const data = await userRepository.getUserGdprExportData(userId);
    if (!data) {
      throw new AppError('Utilisateur introuvable', 404);
    }

    return {
      exportedAt: new Date().toISOString(),
      gdprCompliant: true,
      controller: "Mairie d'EtherBay — Direction des Systèmes d'Information (DSI)",
      personalData: {
        id: data.id,
        walletAddress: data.walletAddress,
        email: data.email,
        role: data.role,
        pointsBalance: data.pointsBalance,
        referralCode: data.referralCode,
        isTwoFactorEnabled: data.isTwoFactorEnabled,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
      ticketsHistory: data.tickets,
      pointsLedger: data.pointLedger,
      claimedRewards: data.claimedRewards,
      analyticsEvents: data.analytics,
    };
  }

  public async requestGdprAccountDeletion(userId: string) {
    const user = await userRepository.getUserFullProfile(userId);
    if (!user) {
      throw new AppError('Utilisateur introuvable', 404);
    }

    const tokenStr = generateRandomToken(32);
    await userRepository.createDeletionToken(user.id, tokenStr);

    if (user.email) {
      await enqueueEmail({
        to: user.email,
        subject: 'Confirmation de suppression de compte (RGPD) - BlockLucky',
        templateName: 'gdpr-deletion',
        variables: {
          CONFIRM_URL: `${env.FRONTEND_URL}/gdpr/confirm-delete?token=${tokenStr}`,
          TOKEN: tokenStr,
        },
      });
    }

    return {
      confirmationRequired: true,
      emailSent: Boolean(user.email),
      message:
        'Une demande de suppression RGPD a été initiée. Veuillez confirmer avec le jeton envoyé par email.',
      ...(env.NODE_ENV !== 'production' && { confirmationToken: tokenStr }),
    };
  }

  public async confirmGdprAccountDeletion(token: string) {
    const validToken = await userRepository.findValidDeletionToken(token);
    if (!validToken) {
      throw new AppError('Jeton de suppression RGPD invalide ou expiré', 400);
    }

    await userRepository.anonymizeUserAccount(validToken.userId, validToken.id);
    await sessionService.revokeAllForUser(validToken.userId);

    return {
      deleted: true,
      anonymized: true,
      userId: validToken.userId,
      deletedAt: new Date().toISOString(),
    };
  }
}

export const userService = new UserService();
export default userService;
