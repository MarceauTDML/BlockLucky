import prismaMock, { resetPrismaMockStore } from '../__mocks__/prisma.mock';

jest.mock('../../src/config/prisma.config', () => ({
  __esModule: true,
  prisma: prismaMock,
  default: prismaMock,
}));

import ledgerService from '../../src/services/ledger.service';

describe('LedgerService (EtherPoints Loyalty Ledger)', () => {
  beforeEach(() => {
    resetPrismaMockStore();
  });

  it('should credit and debit EtherPoints atomically and record PointTransaction history', async () => {
    const user = await prismaMock.user.create({
      data: {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        pointsBalance: 0,
      },
    });

    const creditRes = await ledgerService.creditPoints(
      user.id,
      150,
      'TICKET_PURCHASE',
      'Achat de 3 tickets'
    );
    expect(creditRes.balance).toBe(150);
    expect(creditRes.transaction.amount).toBe(150);

    const debitRes = await ledgerService.debitPoints(
      user.id,
      100,
      'REWARD_CLAIM',
      'Récompense Boulangerie'
    );
    expect(debitRes.balance).toBe(50);
    expect(debitRes.transaction.amount).toBe(-100);

    const historyRes = await ledgerService.getUserLedgerHistory(user.id);
    expect(historyRes.balance).toBe(50);
    expect(historyRes.history).toHaveLength(2);
  });

  it('should reject debit when pointsBalance is insufficient', async () => {
    const user = await prismaMock.user.create({
      data: {
        walletAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        pointsBalance: 20,
      },
    });

    await expect(
      ledgerService.debitPoints(user.id, 100, 'REWARD_CLAIM')
    ).rejects.toThrow(/Solde d'EtherPoints insuffisant/);
  });
});
