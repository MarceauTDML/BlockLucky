import request from 'supertest';
import prismaMock, { resetPrismaMockStore } from '../__mocks__/prisma.mock';
import redisMock, { resetRedisMockStore } from '../__mocks__/redis.mock';

jest.mock('../../src/config/prisma.config', () => ({
  __esModule: true,
  prisma: prismaMock,
  default: prismaMock,
}));

jest.mock('../../src/config/redis.config', () => ({
  __esModule: true,
  redis: redisMock,
  default: redisMock,
}));

import app from '../../src/app';

describe('Blockchain Indexer Integration (/api/webhooks/blockchain)', () => {
  beforeEach(() => {
    resetPrismaMockStore();
    resetRedisMockStore();
  });

  it('should index a TICKET_PURCHASED webhook idempotently and award +50 EtherPoints', async () => {
    const payload = {
      eventType: 'TICKET_PURCHASED',
      payload: {
        transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        blockNumber: 19510000,
        walletAddress: '0x7777888899990000111122223333444455556666',
        contractRoundId: 1,
        ticketPriceEth: 0.01,
      },
    };

    const firstRes = await request(app).post('/api/webhooks/blockchain').send(payload);
    expect(firstRes.status).toBe(200);
    expect(firstRes.body.data.alreadyIndexed).toBe(false);

    const secondRes = await request(app).post('/api/webhooks/blockchain').send(payload);
    expect(secondRes.status).toBe(200);
    expect(secondRes.body.data.alreadyIndexed).toBe(true);
  });
});
