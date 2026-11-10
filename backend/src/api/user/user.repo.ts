import prisma from '../../config/prisma.config';
import { TokenType } from '@prisma/client';
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

  public async anonymizeUserAccount(userId: string, tokenId?: string) {
    const anonymizedSuffix = userId.slice(0, 8);
    const operations: any[] = [
      prisma.user.update({
        where: { id: userId },
        data: {
          walletAddress: `0xdeleted_gdpr_${anonymizedSuffix}`,
          email: null,
          twoFactorSecret: null,
          twoFactorMethod: null,
          twoFactorBackupCodes: [],
          isTwoFactorEnabled: false,
          deletedAt: new Date(),
        },
      }),
    ];

    if (tokenId) {
      operations.push(prisma.token.delete({ where: { id: tokenId } }));
    }

    return prisma.$transaction(operations);
  }
}

export const userRepository = new UserRepository();
export default userRepository;
