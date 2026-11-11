import adminRepository from './admin.repo';
import analyticsService from '../analytics/analytics.services';
import blockchainService from '../../services/blockchain.service';
import s3Service from '../../services/s3.service';
import chainClient from '../../blockchain/chain.client';
import lotteryGateway from '../../blockchain/lottery.gateway';
import { neutralizeSpreadsheetCell } from '../../utils/crypto.util';

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
