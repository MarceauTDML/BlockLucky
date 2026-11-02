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

describe('Lottery API (/api/lottery)', () => {
  let userToken: string;

  beforeEach(async () => {
    resetPrismaMockStore();
    resetRedisMockStore();

    const loginRes = await request(app).post('/api/auth/login').send({
      walletAddress: '0x2222333344445555666677778888999900001111',
      email: 'joueur@etherbay.fr',
      isAdultConfirmed: true,
    });
    userToken = loginRes.body.data.token;
  });

  it('GET /api/lottery/status should return countdown, FOMO progression towards 10k, and milestones', async () => {
    const res = await request(app).get('/api/lottery/status');
    expect(res.status).toBe(200);
    expect(res.body.data.progression.targetParticipants).toBe(10000);
    expect(res.body.data.progression.milestones).toHaveLength(3);
    expect(res.body.data.guarantees.autoRefundEnabled).toBe(true);
  });

  it('POST /api/lottery/buy should buy a gasless ticket, award +50 EtherPoints, and mint a POAP badge', async () => {
    const buyRes = await request(app)
      .post('/api/lottery/buy')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ quantity: 2 });

    expect(buyRes.status).toBe(201);
    expect(buyRes.body.data.tickets).toHaveLength(2);
    expect(buyRes.body.data.pointsAwarded).toBe(100);
    expect(buyRes.body.data.poapBadge).toBeDefined();
    expect(buyRes.body.data.gaslessSponsored).toBe(true);
  });

  it('POST /api/lottery/gift should allow gifting a ticket to a friend by email', async () => {
    const giftRes = await request(app)
      .post('/api/lottery/gift')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        recipientEmail: 'ami@etherbay.fr',
        personalMessage: 'Bonne chance pour la loterie d\'EtherBay !',
      });

    expect(giftRes.status).toBe(201);
    expect(giftRes.body.data.ticket.recipientEmail).toBe('ami@etherbay.fr');
    expect(giftRes.body.data.senderPointsAwarded).toBe(75);
  });
});
