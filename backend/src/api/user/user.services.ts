import userRepository from './user.repo';
import ledgerService from '../../services/ledger.service';
import redis from '../../config/redis.config';
import { enqueueEmail } from '../../queues/emails.queue';
import { env } from '../../config/env.config';
import { generateRandomToken, anonymizeWallet, encryptBuffer } from '../../utils/crypto.util';
import { decodeIdentityImage } from '../../utils/identity-image.util';
import sessionService from '../../services/session.service';
import { AppError } from '../../utils/response.util';

export type NotificationCategory = 'drawReminders' | 'results' | 'rewards' | 'referrals';

export type NotificationPreferences = Record<NotificationCategory, boolean>;

export interface UserPreferences {
  theme: string;
  language: string;
  pushNotificationsEnabled: boolean;
  notifications: NotificationPreferences;
  [key: string]: unknown;
}

export interface PreferencesUpdate {
  theme?: string | undefined;
  language?: string | undefined;
  pushNotificationsEnabled?: boolean | undefined;
  notifications?: Partial<Record<NotificationCategory, boolean | undefined>> | undefined;
}

const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  drawReminders: true,
  results: true,
  rewards: true,
  referrals: true,
};

const preferencesKey = (userId: string) => `user:prefs:${userId}`;

const definedEntries = <T extends object>(value: T | undefined) =>
  Object.fromEntries(Object.entries(value ?? {}).filter(([, v]) => v !== undefined)) as {
    [K in keyof T]?: Exclude<T[K], undefined>;
  };

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

    const preferences = await this.readPreferences(userId);

    return {
      id: user.id,
      walletAddress: user.walletAddress,
      email: user.email,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      role: user.role,
      pointsBalance: user.pointsBalance,
      referralCode: user.referralCode,
      referralLink: `${env.FRONTEND_URL}/invite/${user.referralCode}`,
      isTwoFactorEnabled: user.isTwoFactorEnabled,
      twoFactorMethod: user.twoFactorMethod,
      hasPassword: Boolean(user.passwordHash),
      ageVerificationStatus: user.ageVerificationStatus,
      stats: {
        ticketsCount: user._count.tickets,
        claimedRewardsCount: user._count.claimedRewards,
        referralsCount: user._count.referrals,
      },
      responsibleGaming: {
        maxTicketsPerRound: 1,
      },
      preferences,
      createdAt: user.createdAt,
    };
  }

  public async updateProfile(
    userId: string,
    input: { firstName?: string | undefined; lastName?: string | undefined }
  ) {
    const account = await userRepository.findAccount(userId);
    if (!account || account.deletedAt) {
      throw new AppError('Profil utilisateur introuvable ou supprimé', 404);
    }

    const data: { firstName?: string | null; lastName?: string | null } = {};
    if (input.firstName !== undefined) data.firstName = input.firstName === '' ? null : input.firstName;
    if (input.lastName !== undefined) data.lastName = input.lastName === '' ? null : input.lastName;

    if (Object.keys(data).length === 0) {
      return { firstName: account.firstName ?? null, lastName: account.lastName ?? null };
    }

    const updated = await userRepository.updateNames(userId, data);
    return { firstName: updated.firstName ?? null, lastName: updated.lastName ?? null };
  }

  public async readPreferences(userId: string): Promise<UserPreferences> {
    const stored = await redis.get(preferencesKey(userId));
    const parsed = stored ? (JSON.parse(stored) as Partial<UserPreferences>) : {};
    return {
      theme: 'DARK',
      language: 'FR',
      pushNotificationsEnabled: true,
      ...parsed,
      notifications: { ...DEFAULT_NOTIFICATIONS, ...definedEntries(parsed.notifications) },
    };
  }

  public async sendSupportRequest(userId: string, input: { subject: string; message: string }) {
    const account = await userRepository.findAccount(userId);
    if (!account || account.deletedAt) {
      throw new AppError('Utilisateur introuvable', 404);
    }

    await enqueueEmail({
      to: env.SUPPORT_EMAIL,
      subject: `[Support BlockLucky] ${input.subject.replace(/[\r\n]+/g, ' ')}`,
      templateName: 'support-request',
      variables: {
        USER_ID: account.id,
        EMAIL: account.email ?? 'non renseigné',
        FIRST_NAME: account.firstName ?? 'non renseigné',
        LAST_NAME: account.lastName ?? 'non renseigné',
        SUBJECT: input.subject,
        MESSAGE: input.message,
        DATE: new Date().toISOString().replace('T', ' ').slice(0, 16),
      },
      replyTo: account.email ?? undefined,
    });

    return { sent: true };
  }

  public async submitIdentity(userId: string, input: { front: string; back: string }) {
    const state = await userRepository.findIdentityState(userId);
    if (!state || state.deletedAt) throw new AppError('Utilisateur introuvable', 404);
    if (state.ageVerificationStatus === 'VERIFIED') {
      throw new AppError('Votre âge est déjà vérifié.', 409);
    }

    const front = decodeIdentityImage(input.front, 'recto');
    const back = decodeIdentityImage(input.back, 'verso');
    const document = await userRepository.submitIdentityDocument({
      userId,
      frontEncrypted: encryptBuffer(front.data),
      backEncrypted: encryptBuffer(back.data),
      mimeType: front.mimeType,
    });

    return { status: 'PENDING' as const, submittedAt: document.submittedAt };
  }

  public async getIdentityStatus(userId: string) {
    const state = await userRepository.findIdentityState(userId);
    if (!state || state.deletedAt) throw new AppError('Utilisateur introuvable', 404);
    return {
      status: state.ageVerificationStatus,
      submittedAt: state.identityDocument?.submittedAt ?? null,
      reviewedAt: state.identityDocument?.reviewedAt ?? null,
      note: state.ageVerificationNote ?? null,
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

  public async updatePreferences(userId: string, prefs: PreferencesUpdate) {
    const current = await this.readPreferences(userId);
    const { notifications, ...rest } = prefs;

    const updated: UserPreferences = {
      ...current,
      ...definedEntries(rest),
      notifications: { ...current.notifications, ...definedEntries(notifications) },
    };
    await redis.set(preferencesKey(userId), JSON.stringify(updated));
    return updated;
  }

  public async getPushNotificationsHistory(userId: string) {
    const { notifications } = await this.readPreferences(userId);
    const history: Array<{
      id: string;
      category: NotificationCategory;
      title: string;
      body: string;
      read: boolean;
      createdAt: string;
    }> = [
      {
        id: 'notif-1',
        category: 'rewards',
        title: "Nouveau commerçant partenaire à EtherBay !",
        body: 'La Boulangerie du Port offre -15% contre 100 EtherPoints.',
        read: false,
        createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      },
      {
        id: 'notif-2',
        category: 'drawReminders',
        title: 'Objectif 10 000 participants en approche',
        body: 'Le prochain palier communautaire débloque un bonus de cagnotte.',
        read: true,
        createdAt: new Date(Date.now() - 86400 * 1000).toISOString(),
      },
      {
        id: `notif-user-${userId.slice(0, 6)}`,
        category: 'rewards',
        title: 'Bienvenue sur BlockLucky EtherBay',
        body: 'Vos +25 EtherPoints de bienvenue ont été crédités sur votre compte.',
        read: true,
        createdAt: new Date(Date.now() - 172800 * 1000).toISOString(),
      },
    ];
    return history.filter((item) => notifications[item.category]);
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
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        pointsBalance: data.pointsBalance,
        referralCode: data.referralCode,
        isTwoFactorEnabled: data.isTwoFactorEnabled,
        ageVerificationStatus: data.ageVerificationStatus,
        ageVerifiedAt: data.ageVerifiedAt,
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
