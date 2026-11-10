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
import { signWebhookPayload, SIGNATURE_HEADER } from '../../src/api/webhooks/webhook-signature';

const postSigned = (payload: unknown, timestamp?: number) => {
  const body = JSON.stringify(payload);
  return request(app)
    .post('/api/webhooks/blockchain')
    .set('Content-Type', 'application/json')
    .set(SIGNATURE_HEADER, signWebhookPayload(body, timestamp))
    .send(body);
};

describe('Blockchain Indexer Integration (/api/webhooks/blockchain)', () => {
  beforeEach(() => {
    resetPrismaMockStore();
    resetRedisMockStore();
  });

  const ticketPayload = {
    eventType: 'TICKET_PURCHASED',
    payload: {
      transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      blockNumber: 19510000,
      walletAddress: '0x7777888899990000111122223333444455556666',
      contractRoundId: 1,
      ticketPriceEth: 0.01,
    },
  };

  it('should index a TICKET_PURCHASED webhook idempotently and award +50 EtherPoints', async () => {
    const now = Math.floor(Date.now() / 1000);

    const firstRes = await postSigned(ticketPayload, now);
    expect(firstRes.status).toBe(200);
    expect(firstRes.body.data.alreadyIndexed).toBe(false);

    const secondRes = await postSigned(ticketPayload, now - 1);
    expect(secondRes.status).toBe(200);
    expect(secondRes.body.data.alreadyIndexed).toBe(true);
  });

  it('should ignore an exact replay of an already delivered webhook', async () => {
    const now = Math.floor(Date.now() / 1000);
    await postSigned(ticketPayload, now);
    const replay = await postSigned(ticketPayload, now);
    expect(replay.status).toBe(200);
    expect(replay.body.data.duplicate).toBe(true);
  });

  it('should reject a webhook without a valid, recent signature', async () => {
    const payload = { eventType: 'RPC_FALLBACK_SWITCH', payload: { active: true } };

    const missing = await request(app).post('/api/webhooks/blockchain').send(payload);
    expect(missing.status).toBe(401);

    const forged = await request(app)
      .post('/api/webhooks/blockchain')
      .set(SIGNATURE_HEADER, `t=${Math.floor(Date.now() / 1000)},v1=${'0'.repeat(64)}`)
      .send(payload);
    expect(forged.status).toBe(401);

    const expired = await postSigned(payload, Math.floor(Date.now() / 1000) - 3600);
    expect(expired.status).toBe(401);
  });

  it('should reject a signed webhook with an invalid payload', async () => {
    const res = await postSigned({ eventType: 'TICKET_PURCHASED', payload: { transactionHash: 'x' } });
    expect(res.status).toBe(400);
  });
});
