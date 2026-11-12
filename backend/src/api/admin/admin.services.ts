import adminRepository from './admin.repo';
import analyticsService from '../analytics/analytics.services';
import blockchainService from '../../services/blockchain.service';
import s3Service from '../../services/s3.service';
import chainClient from '../../blockchain/chain.client';
import lotteryGateway from '../../blockchain/lottery.gateway';
import { AgeVerificationStatus } from '@prisma/client';
import { enqueueEmail } from '../../queues/emails.queue';
import { decryptBuffer, neutralizeSpreadsheetCell } from '../../utils/crypto.util';
import { toDataUrl } from '../../utils/identity-image.util';
import { AppError } from '../../utils/response.util';

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
