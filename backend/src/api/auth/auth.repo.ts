import prisma from '../../config/prisma.config';
import { Role, TwoFactorMethod, TokenType } from '@prisma/client';
import { sha256 } from '../../utils/crypto.util';

export class AuthRepository {
  public async findByWallet(walletAddress: string) {
    return prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
    });
  }

  public async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  public async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  public async findByReferralCode(referralCode: string) {
    return prisma.user.findUnique({
      where: { referralCode },
    });
  }

  public async createUser(data: {
    walletAddress: string;
    email?: string;
    role?: Role;
    referredById?: string;
    isEmailVerified?: boolean;
    walletEncryptedKey?: string;
    passwordHash?: string;
  }) {
    return prisma.user.create({
      data: {
        walletAddress: data.walletAddress.toLowerCase(),
        ...(data.email ? { email: data.email.toLowerCase() } : {}),
        role: data.role ?? 'USER',
        isEmailVerified: data.isEmailVerified ?? false,
        ...(data.walletEncryptedKey ? { walletEncryptedKey: data.walletEncryptedKey } : {}),
        ...(data.passwordHash ? { passwordHash: data.passwordHash } : {}),
        ...(data.referredById ? { referredById: data.referredById } : {}),
      },
    });
  }

  public async updateTwoFactor(
    userId: string,
    data: {
      isTwoFactorEnabled: boolean;
      twoFactorMethod: TwoFactorMethod | null;
      twoFactorSecret: string | null;
      twoFactorBackupCodes?: string[];
    }
  ) {
    return prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  public async updateBackupCodes(userId: string, twoFactorBackupCodes: string[]) {
    return prisma.user.update({
      where: { id: userId },
      data: { twoFactorBackupCodes },
    });
  }

  public async markEmailVerified(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { isEmailVerified: true },
    });
  }

  public async setPassword(userId: string, passwordHash: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash, isEmailVerified: true },
    });
  }

  public async createToken(userId: string, token: string, type: TokenType, expiresInMinutes = 15) {
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    return prisma.token.create({
      data: {
        userId,
        token: sha256(token),
        type,
        expiresAt,
      },
    });
  }

  public async findValidToken(token: string, type: TokenType) {
    return prisma.token.findFirst({
      where: {
        token: sha256(token),
        type,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
  }

  public async deleteToken(id: string) {
    return prisma.token.delete({ where: { id } });
  }

  public async recordAuthAnalytics(
    userId: string,
    eventType: string,
    utmSource?: string,
    metadata?: Record<string, unknown>
  ) {
    return prisma.analytics.create({
      data: {
        userId,
        eventType,
        utmSource: utmSource ?? 'direct',
        metadata: (metadata ?? {}) as any,
      },
    });
  }
}

export const authRepository = new AuthRepository();
export default authRepository;
