import prisma from '../../config/prisma.config';
import { AgeVerificationStatus, TokenType } from '@prisma/client';
import { sha256 } from '../../utils/crypto.util';

export class UserRepository {
  public async getUserFullProfile(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        referrals: {
          select: {
            id: true,
            walletAddress: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            tickets: true,
            claimedRewards: true,
            referrals: true,
          },
        },
      },
    });
  }

  public async findAccount(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, deletedAt: true },
    });
  }

  public async updateNames(userId: string, data: { firstName?: string | null; lastName?: string | null }) {
    return prisma.user.update({
      where: { id: userId },
      data,
      select: { firstName: true, lastName: true },
    });
  }

  public async getUserGdprExportData(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        tickets: { include: { lottery: true } },
        pointLedger: true,
        claimedRewards: { include: { rewardCatalog: { include: { partner: true } } } },
        analytics: true,
      },
    });
  }

  public async createDeletionToken(userId: string, token: string) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return prisma.token.create({
      data: {
        userId,
        token: sha256(token),
        type: TokenType.ACCOUNT_DELETION,
        expiresAt,
      },
    });
  }

  public async findValidDeletionToken(token: string) {
    return prisma.token.findFirst({
      where: {
        token: sha256(token),
        type: TokenType.ACCOUNT_DELETION,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
  }

  public async findIdentityState(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        deletedAt: true,
        ageVerificationStatus: true,
        ageVerificationNote: true,
        identityDocument: { select: { id: true, submittedAt: true, reviewedAt: true } },
      },
    });
  }

  public async submitIdentityDocument(data: {
    userId: string;
    frontEncrypted: Buffer;
    backEncrypted: Buffer;
    mimeType: string;
  }) {
    const submittedAt = new Date();
    const fields = {
      status: AgeVerificationStatus.PENDING,
      frontEncrypted: new Uint8Array(data.frontEncrypted),
      backEncrypted: new Uint8Array(data.backEncrypted),
      mimeType: data.mimeType,
      submittedAt,
      reviewedAt: null,
      reviewerId: null,
    };
    const [document] = await prisma.$transaction([
      prisma.identityDocument.upsert({
        where: { userId: data.userId },
        create: { userId: data.userId, ...fields },
        update: fields,
        select: { id: true, submittedAt: true },
      }),
      prisma.user.update({
        where: { id: data.userId },
        data: {
          ageVerificationStatus: AgeVerificationStatus.PENDING,
          ageVerificationNote: null,
          ageVerifiedAt: null,
        },
        select: { id: true },
      }),
    ]);
    return document;
  }

  public async anonymizeUserAccount(userId: string, tokenId?: string) {
    const anonymizedSuffix = userId.slice(0, 8);
    const operations: any[] = [
      prisma.user.update({
        where: { id: userId },
        data: {
          walletAddress: `0xdeleted_gdpr_${anonymizedSuffix}`,
          walletEncryptedKey: null,
          welcomeGrantTxHash: null,
          email: null,
          passwordHash: null,
          firstName: null,
          lastName: null,
          ageVerificationNote: null,
          twoFactorSecret: null,
          twoFactorMethod: null,
          twoFactorBackupCodes: [],
          isTwoFactorEnabled: false,
          deletedAt: new Date(),
        },
      }),
      prisma.identityDocument.deleteMany({ where: { userId } }),
    ];

    if (tokenId) {
      operations.push(prisma.token.delete({ where: { id: tokenId } }));
    }

    return prisma.$transaction(operations);
  }
}

export const userRepository = new UserRepository();
export default userRepository;
