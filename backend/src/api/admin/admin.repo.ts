import { AgeVerificationStatus, Prisma, Role } from '@prisma/client';
import prisma from '../../config/prisma.config';

const staffAccountSelect = {
  id: true,
  email: true,
  role: true,
  firstName: true,
  lastName: true,
  isTwoFactorEnabled: true,
  createdAt: true,
  ownedPartners: {
    select: { id: true, name: true, isActive: true },
    orderBy: { name: 'asc' },
  },
} satisfies Prisma.UserSelect;

export class AdminRepository {
  public async getGlobalOverview() {
    const [
      usersCount,
      partnersCount,
      ticketsCount,
      claimedRewardsCount,
      rounds,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.partner.count(),
      prisma.ticket.count(),
      prisma.claimedReward.count(),
      prisma.lotteryRound.findMany({ orderBy: { contractRoundId: 'desc' } }),
    ]);

    return {
      usersCount,
      partnersCount,
      ticketsCount,
      claimedRewardsCount,
      rounds,
    };
  }

  public async recordAdminAuditLog(data: {
    adminId: string;
    action: string;
    metadata?: Record<string, unknown>;
  }) {
    return prisma.analytics.create({
      data: {
        userId: data.adminId,
        eventType: `ADMIN_AUDIT:${data.action}`,
        utmSource: 'admin-dashboard',
        metadata: (data.metadata ?? {}) as any,
      },
    });
  }

  public async getAdminAuditLogs(limit = 100) {
    return prisma.analytics.findMany({
      where: {
        eventType: { startsWith: 'ADMIN_AUDIT:' },
      },
      include: {
        user: {
          select: {
            id: true,
            walletAddress: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  public async listIdentityVerifications(status: AgeVerificationStatus, skip: number, take: number) {
    const where = { status };
    const [items, total] = await Promise.all([
      prisma.identityDocument.findMany({
        where,
        select: {
          id: true,
          userId: true,
          status: true,
          submittedAt: true,
          user: { select: { email: true } },
        },
        orderBy: { submittedAt: 'asc' },
        skip,
        take,
      }),
      prisma.identityDocument.count({ where }),
    ]);
    return { items, total };
  }

  public async findIdentityVerification(id: string) {
    return prisma.identityDocument.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            walletAddress: true,
            ageVerificationStatus: true,
            ageVerificationNote: true,
            createdAt: true,
          },
        },
      },
    });
  }

  public async decideIdentityVerification(data: {
    id: string;
    userId: string;
    reviewerId: string;
    approved: boolean;
    note: string | null;
  }) {
    const reviewedAt = new Date();
    const status = data.approved ? AgeVerificationStatus.VERIFIED : AgeVerificationStatus.REJECTED;
    return prisma.$transaction(async (tx) => {
      const claimed = await tx.identityDocument.updateMany({
        where: { id: data.id, status: AgeVerificationStatus.PENDING },
        data: {
          status,
          reviewedAt,
          reviewerId: data.reviewerId,
          frontEncrypted: null,
          backEncrypted: null,
        },
      });
      if (claimed.count === 0) return null;
      await tx.user.update({
        where: { id: data.userId },
        data: {
          ageVerificationStatus: status,
          ageVerifiedAt: data.approved ? reviewedAt : null,
          ageVerificationNote: data.approved ? null : data.note,
        },
        select: { id: true },
      });
      return { id: data.id, userId: data.userId, status, reviewedAt };
    });
  }

  public async listStaffAccounts(filters: { role?: 'ADMIN' | 'PARTNER' | undefined; search?: string | undefined }, skip: number, take: number) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      role: filters.role ?? { in: ['ADMIN', 'PARTNER'] },
      ...(filters.search
        ? {
            OR: [
              { email: { contains: filters.search, mode: 'insensitive' } },
              { firstName: { contains: filters.search, mode: 'insensitive' } },
              { lastName: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: staffAccountSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.user.count({ where }),
    ]);
    return { items, total };
  }

  public async findStaffAccountById(id: string) {
    return prisma.user.findUnique({ where: { id }, select: { ...staffAccountSelect, deletedAt: true } });
  }

  public async findAccountByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      select: { ...staffAccountSelect, deletedAt: true },
    });
  }

  public async countActiveAdmins() {
    return prisma.user.count({ where: { role: 'ADMIN', deletedAt: null } });
  }

  public async findPartnerById(id: string) {
    return prisma.partner.findUnique({ where: { id } });
  }

  public async createStaffAccount(data: {
    email: string;
    role: Role;
    firstName?: string | undefined;
    lastName?: string | undefined;
    walletAddress: string;
    walletEncryptedKey: string;
    partnerId?: string | undefined;
  }) {
    return prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: data.email,
          role: data.role,
          walletAddress: data.walletAddress,
          walletEncryptedKey: data.walletEncryptedKey,
          isEmailVerified: false,
          ...(data.firstName ? { firstName: data.firstName } : {}),
          ...(data.lastName ? { lastName: data.lastName } : {}),
        },
        select: { id: true },
      });
      if (data.partnerId) {
        await tx.partner.update({ where: { id: data.partnerId }, data: { ownerId: created.id } });
      }
      return created;
    });
  }

  public async changeAccountRole(data: {
    userId: string;
    role: Role;
    firstName?: string | undefined;
    lastName?: string | undefined;
    partnerId?: string | undefined;
  }) {
    return prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: data.userId },
        data: {
          role: data.role,
          ...(data.firstName ? { firstName: data.firstName } : {}),
          ...(data.lastName ? { lastName: data.lastName } : {}),
        },
        select: { id: true },
      });
      if (data.role !== 'PARTNER') {
        await tx.partner.updateMany({ where: { ownerId: data.userId }, data: { ownerId: null } });
      }
      if (data.partnerId) {
        await tx.partner.update({ where: { id: data.partnerId }, data: { ownerId: data.userId } });
      }
      return { id: data.userId };
    });
  }

  public async setPartnerStatus(partnerId: string, isActive: boolean) {
    return prisma.partner.update({
      where: { id: partnerId },
      data: { isActive },
    });
  }
}

export const adminRepository = new AdminRepository();
export default adminRepository;
