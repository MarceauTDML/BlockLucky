import adminRepository from './admin.repo';
import analyticsService from '../analytics/analytics.services';
import blockchainService from '../../services/blockchain.service';
import s3Service from '../../services/s3.service';
import chainClient from '../../blockchain/chain.client';
import lotteryGateway from '../../blockchain/lottery.gateway';
import { AgeVerificationStatus, Role } from '@prisma/client';
import walletService from '../../blockchain/wallet.service';
import sessionService from '../../services/session.service';
import logger from '../../utils/logger.util';
import { enqueueEmail } from '../../queues/emails.queue';
import { decryptBuffer, neutralizeSpreadsheetCell } from '../../utils/crypto.util';
import { toDataUrl } from '../../utils/identity-image.util';
import { AppError } from '../../utils/response.util';

type StaffRole = 'ADMIN' | 'PARTNER';
type StaffAccount = NonNullable<Awaited<ReturnType<typeof adminRepository.findStaffAccountById>>>;

const ROLE_LABELS: Record<Role, string> = {
  USER: 'Citoyen',
  PARTNER: 'Partenaire',
  ADMIN: 'Mairie',
};

const toStaffAccount = (account: Omit<StaffAccount, 'deletedAt'>) => ({
  id: account.id,
  email: account.email,
  role: account.role,
  firstName: account.firstName,
  lastName: account.lastName,
  isTwoFactorEnabled: account.isTwoFactorEnabled,
  createdAt: account.createdAt,
  partners: account.role === 'PARTNER' ? account.ownedPartners : [],
});

export class AdminService {
  public async getCentralDashboard() {
    const [overview, analytics, network] = await Promise.all([
      adminRepository.getGlobalOverview(),
      analyticsService.getDashboardAnalytics(),
      blockchainService.getNetworkStatus(),
    ]);

    const totalPrizePoolEth = overview.rounds.reduce((sum, r) => sum + r.prizePool, 0);
    const municipalityCutEth = Number((totalPrizePoolEth * 0.1).toFixed(4));

    return {
      kpis: {
        totalPrizePoolEth: Number(totalPrizePoolEth.toFixed(4)),
        ticketsSold: overview.ticketsCount,
        municipalityRevenueEth: municipalityCutEth,
        registeredCitizens: overview.usersCount,
        activePartners: overview.partnersCount,
        claimedRewards: overview.claimedRewardsCount,
      },
      demographics: analytics.demographics,
      utmAcquisition: analytics.utmAcquisition,
      network,
      rounds: overview.rounds,
    };
  }

  public async toggleCircuitBreaker(
    adminId: string,
    paused: boolean,
    reason = 'Action manuelle de sécurité Mairie / DSI'
  ) {
    const result = await blockchainService.setCircuitBreaker(paused);

    await adminRepository.recordAdminAuditLog({
      adminId,
      action: paused ? 'CIRCUIT_BREAKER_PAUSE' : 'CIRCUIT_BREAKER_RESUME',
      metadata: {
        paused,
        reason,
        txHash: result.txHash,
      },
    });

    return {
      ...result,
      reason,
    };
  }

  public async withdrawMunicipalityTreasury(
    adminId: string,
    input: { multisigWallet: string; amountEth: number; note?: string }
  ) {
    const txResult = chainClient.isOnchain
      ? await lotteryGateway.withdrawFees(input.multisigWallet)
      : await blockchainService.withdrawTreasuryToMultisig(input.multisigWallet, input.amountEth);

    await adminRepository.recordAdminAuditLog({
      adminId,
      action: 'TREASURY_WITHDRAWAL_MULTISIG',
      metadata: {
        multisigWallet: input.multisigWallet,
        amountEth: txResult.amountEth,
        requestedAmountEth: input.amountEth,
        note: input.note ?? 'Retrait comptabilité Mairie EtherBay',
        transactionHash: txResult.transactionHash,
      },
    });

    return txResult;
  }

  public async updatePartnerApproval(adminId: string, partnerId: string, isActive: boolean) {
    const partner = await adminRepository.setPartnerStatus(partnerId, isActive);

    await adminRepository.recordAdminAuditLog({
      adminId,
      action: isActive ? 'PARTNER_APPROVED' : 'PARTNER_SUSPENDED',
      metadata: {
        partnerId: partner.id,
        partnerName: partner.name,
        isActive,
      },
    });

    return partner;
  }

  public async listIdentityVerifications(status: AgeVerificationStatus, page: number, limit: number) {
    const { items, total } = await adminRepository.listIdentityVerifications(status, (page - 1) * limit, limit);
    return {
      verifications: items.map((item) => ({
        id: item.id,
        userId: item.userId,
        email: item.user.email,
        submittedAt: item.submittedAt,
        status: item.status,
      })),
      total,
    };
  }

  public async getIdentityVerification(adminId: string, id: string) {
    const document = await adminRepository.findIdentityVerification(id);
    if (!document) throw new AppError("Demande de vérification d'identité introuvable", 404);

    const pending = document.status === 'PENDING';
    const front = pending && document.frontEncrypted ? toDataUrl(decryptBuffer(document.frontEncrypted)) : null;
    const back = pending && document.backEncrypted ? toDataUrl(decryptBuffer(document.backEncrypted)) : null;

    await adminRepository.recordAdminAuditLog({
      adminId,
      action: 'IDENTITY_DOCUMENT_VIEWED',
      metadata: { verificationId: document.id, userId: document.userId, imagesShown: Boolean(front && back) },
    });

    return {
      id: document.id,
      userId: document.userId,
      email: document.user.email,
      walletAddress: document.user.walletAddress,
      accountCreatedAt: document.user.createdAt,
      status: document.status,
      submittedAt: document.submittedAt,
      reviewedAt: document.reviewedAt,
      reviewerId: document.reviewerId,
      note: document.user.ageVerificationNote ?? null,
      front,
      back,
    };
  }

  public async decideIdentityVerification(
    adminId: string,
    id: string,
    input: { approved: boolean; note?: string | undefined }
  ) {
    const document = await adminRepository.findIdentityVerification(id);
    if (!document) throw new AppError("Demande de vérification d'identité introuvable", 404);
    if (document.userId === adminId) {
      throw new AppError("Vous ne pouvez pas statuer sur votre propre pièce d'identité.", 403);
    }
    if (document.status !== 'PENDING') throw new AppError('Cette demande a déjà été traitée.', 409);

    const note = input.note?.trim() || null;
    const decision = await adminRepository.decideIdentityVerification({
      id: document.id,
      userId: document.userId,
      reviewerId: adminId,
      approved: input.approved,
      note,
    });
    if (!decision) throw new AppError('Cette demande a déjà été traitée.', 409);

    await adminRepository.recordAdminAuditLog({
      adminId,
      action: 'IDENTITY_VERIFICATION_DECISION',
      metadata: {
        verificationId: document.id,
        userId: document.userId,
        approved: input.approved,
        status: decision.status,
        ...(note ? { note } : {}),
      },
    });

    if (document.user.email) {
      await enqueueEmail({
        to: document.user.email,
        subject: input.approved
          ? 'Votre âge est vérifié - BlockLucky'
          : "Votre vérification d'âge a été refusée - BlockLucky",
        templateName: 'identity-decision',
        variables: {
          DECISION: input.approved
            ? 'Votre âge est vérifié : vous pouvez participer au grand tirage.'
            : "Votre pièce d'identité n'a pas pu être validée.",
          DETAILS: input.approved
            ? "Bonne chance pour la Grande Loterie citoyenne d'EtherBay !"
            : `Motif : ${note ?? 'non précisé'}. Vous pouvez envoyer une nouvelle photo depuis l'application.`,
        },
      });
    }

    return {
      id: decision.id,
      userId: decision.userId,
      status: decision.status,
      reviewedAt: decision.reviewedAt,
      note: input.approved ? null : note,
    };
  }

  public async listStaffAccounts(
    filters: { role?: StaffRole | undefined; search?: string | undefined },
    page: number,
    limit: number
  ) {
    const { items, total } = await adminRepository.listStaffAccounts(filters, (page - 1) * limit, limit);
    return { accounts: items.map(toStaffAccount), total };
  }

  private async assertPartnerAssignable(partnerId: string | undefined, userId: string | null) {
    if (!partnerId) return null;
    const partner = await adminRepository.findPartnerById(partnerId);
    if (!partner) throw new AppError('Établissement partenaire introuvable', 404);
    if (partner.ownerId && partner.ownerId !== userId) {
      throw new AppError('Cet établissement est déjà rattaché à un autre compte partenaire.', 409);
    }
    return partner;
  }

  private async sendStaffInvitation(email: string, role: StaffRole, isNewAccount: boolean, partnerName?: string) {
    const roleLabel = role === 'ADMIN' ? "agent de la Mairie d'EtherBay" : 'partenaire commerçant';
    await enqueueEmail({
      to: email,
      subject:
        role === 'ADMIN'
          ? 'Votre accès Mairie BlockLucky est prêt'
          : 'Votre accès partenaire BlockLucky est prêt',
      templateName: 'staff-invitation',
      variables: {
        EMAIL: email,
        INTRO: isNewAccount
          ? `La Mairie d'EtherBay vous a créé un compte BlockLucky en tant que ${roleLabel}.`
          : `Votre compte BlockLucky dispose désormais des droits ${roleLabel}.`,
        PARTNER: partnerName ? `Établissement rattaché : ${partnerName}.` : '',
      },
    }).catch((error: Error) => logger.warn(`Invitation non envoyée : ${error.message}`));
  }

  public async createStaffAccount(
    adminId: string,
    input: {
      email: string;
      role: StaffRole;
      firstName?: string | undefined;
      lastName?: string | undefined;
      partnerId?: string | undefined;
    }
  ) {
    const email = input.email.trim().toLowerCase();
    const existing = await adminRepository.findAccountByEmail(email);

    if (existing) {
      if (existing.deletedAt) {
        throw new AppError('Ce compte a été supprimé et ne peut pas recevoir de rôle.', 409);
      }
      if (existing.id === adminId) {
        throw new AppError('Vous ne pouvez pas modifier votre propre rôle.', 403);
      }
      if (existing.role === input.role) {
        throw new AppError(`Ce compte a déjà le rôle ${ROLE_LABELS[input.role]}.`, 409);
      }
      await this.assertLastAdminKept(existing.role, input.role);
      const partner = await this.assertPartnerAssignable(input.partnerId, existing.id);

      await adminRepository.changeAccountRole({
        userId: existing.id,
        role: input.role,
        firstName: existing.firstName ? undefined : input.firstName,
        lastName: existing.lastName ? undefined : input.lastName,
        partnerId: partner?.id,
      });
      await sessionService.revokeAllForUser(existing.id);

      await adminRepository.recordAdminAuditLog({
        adminId,
        action: 'STAFF_ROLE_CHANGED',
        metadata: {
          userId: existing.id,
          email,
          previousRole: existing.role,
          role: input.role,
          ...(partner ? { partnerId: partner.id, partnerName: partner.name } : {}),
        },
      });
      await this.sendStaffInvitation(email, input.role, false, partner?.name);

      const account = await this.getStaffAccount(existing.id);
      return { account, created: false };
    }

    const partner = await this.assertPartnerAssignable(input.partnerId, null);
    const wallet = walletService.createCustodialWallet();
    const created = await adminRepository.createStaffAccount({
      email,
      role: input.role,
      firstName: input.firstName,
      lastName: input.lastName,
      walletAddress: wallet.address,
      walletEncryptedKey: wallet.encryptedKey,
      partnerId: partner?.id,
    });

    await adminRepository.recordAdminAuditLog({
      adminId,
      action: 'STAFF_ACCOUNT_CREATED',
      metadata: {
        userId: created.id,
        email,
        role: input.role,
        ...(partner ? { partnerId: partner.id, partnerName: partner.name } : {}),
      },
    });
    await this.sendStaffInvitation(email, input.role, true, partner?.name);

    const account = await this.getStaffAccount(created.id);
    return { account, created: true };
  }

  public async updateStaffRole(adminId: string, userId: string, role: Role) {
    if (userId === adminId) {
      throw new AppError('Vous ne pouvez pas modifier votre propre rôle.', 403);
    }
    const account = await adminRepository.findStaffAccountById(userId);
    if (!account || account.deletedAt) throw new AppError('Compte introuvable', 404);
    if (account.role === role) {
      throw new AppError(`Ce compte a déjà le rôle ${ROLE_LABELS[role]}.`, 409);
    }
    await this.assertLastAdminKept(account.role, role);

    await adminRepository.changeAccountRole({ userId, role });
    await sessionService.revokeAllForUser(userId);

    await adminRepository.recordAdminAuditLog({
      adminId,
      action: role === 'USER' ? 'STAFF_ROLE_REVOKED' : 'STAFF_ROLE_CHANGED',
      metadata: {
        userId,
        email: account.email,
        previousRole: account.role,
        role,
        ...(account.role === 'PARTNER' && role !== 'PARTNER' && account.ownedPartners.length
          ? { detachedPartnerIds: account.ownedPartners.map((partner) => partner.id) }
          : {}),
      },
    });

    return this.getStaffAccount(userId);
  }

  private async assertLastAdminKept(currentRole: Role, nextRole: Role) {
    if (currentRole !== 'ADMIN' || nextRole === 'ADMIN') return;
    const admins = await adminRepository.countActiveAdmins();
    if (admins <= 1) {
      throw new AppError('Impossible de retirer le dernier compte Mairie.', 409);
    }
  }

  private async getStaffAccount(userId: string) {
    const account = await adminRepository.findStaffAccountById(userId);
    if (!account) throw new AppError('Compte introuvable', 404);
    return toStaffAccount(account);
  }

  public async getAuditLogs(limit = 100) {
    const logs = await adminRepository.getAdminAuditLogs(limit);
    return logs.map((l) => ({
      id: l.id,
      action: l.eventType.replace('ADMIN_AUDIT:', ''),
      adminId: l.userId,
      adminWallet: l.user?.walletAddress ?? 'Système',
      metadata: l.metadata,
      timestamp: l.timestamp,
    }));
  }

  public async generateAccountingReport(adminId: string, format: 'CSV' | 'PDF') {
    const dashboard = await this.getCentralDashboard();
    const timestamp = new Date().toISOString();

    await adminRepository.recordAdminAuditLog({
      adminId,
      action: `EXPORT_REPORT_${format}`,
      metadata: { format, timestamp },
    });

    if (format === 'CSV') {
      const csvRows = [
        ['Metric', 'Value'],
        ['Date', timestamp],
        ['Total_Prize_Pool_ETH', dashboard.kpis.totalPrizePoolEth],
        ['Municipality_Revenue_ETH', dashboard.kpis.municipalityRevenueEth],
        ['Tickets_Sold', dashboard.kpis.ticketsSold],
        ['Registered_Citizens', dashboard.kpis.registeredCitizens],
        ['Active_Partners', dashboard.kpis.activePartners],
        ['Claimed_Rewards', dashboard.kpis.claimedRewards],
      ].map((cells) => cells.map(neutralizeSpreadsheetCell).join(','));
      const csvContent = csvRows.join('\n');
      const upload = await s3Service.uploadFile(
        `reports/etherbay-report-${Date.now()}.csv`,
        csvContent,
        'text/csv'
      );

      return {
        format: 'CSV',
        generatedAt: timestamp,
        downloadUrl: upload.url,
        content: csvContent,
      };
    }

    const reportSummary = JSON.stringify(
      {
        title: "Rapport Financier & Analytique — Mairie d'EtherBay",
        generatedAt: timestamp,
        kpis: dashboard.kpis,
        demographics: dashboard.demographics,
      },
      null,
      2
    );

    const upload = await s3Service.uploadFile(
      `reports/etherbay-report-${Date.now()}.pdf`,
      reportSummary,
      'application/pdf'
    );

    return {
      format: 'PDF',
      generatedAt: timestamp,
      downloadUrl: upload.url,
      summary: dashboard.kpis,
    };
  }
}

export const adminService = new AdminService();
export default adminService;
