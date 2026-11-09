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

describe('Idempotency-Key on sensitive POST endpoints', () => {
  let token: string;

  beforeEach(async () => {
    resetPrismaMockStore();
    resetRedisMockStore();
    const login = await request(app).post('/api/auth/login').send({
      walletAddress: '0x1212343456567878909012123434565678789090',
      email: 'idempotence@etherbay.fr',
      isAdultConfirmed: true,
    });
    token = login.body.data.token;
  });

  const countTickets = async () => {
    const tickets = await request(app)
      .get('/api/lottery/my-tickets')
      .set('Authorization', `Bearer ${token}`);
    return JSON.stringify(tickets.body).length;
  };

  it('should replay the first response instead of buying twice', async () => {
    const first = await request(app)
      .post('/api/lottery/buy')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'achat-unique-0001')
      .send({ quantity: 1 });
    const afterFirst = await countTickets();

    const second = await request(app)
      .post('/api/lottery/buy')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'achat-unique-0001')
      .send({ quantity: 1 });

    expect(second.status).toBe(first.status);
    expect(second.body).toEqual(first.body);
    expect(second.headers['idempotent-replayed']).toBe('true');

    expect(await countTickets()).toBe(afterFirst);

    await request(app)
      .post('/api/lottery/buy')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'achat-unique-0002')
      .send({ quantity: 1 });
    expect(await countTickets()).toBeGreaterThan(afterFirst);
  });

  it('should reject an invalid key format', async () => {
    const res = await request(app)
      .post('/api/lottery/buy')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'x')
      .send({ quantity: 1 });
    expect(res.status).toBe(400);
  });
});
