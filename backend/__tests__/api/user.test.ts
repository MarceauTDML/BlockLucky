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

describe('User & GDPR API (/api/user)', () => {
  let userToken: string;

  beforeEach(async () => {
    resetPrismaMockStore();
    resetRedisMockStore();

    const loginRes = await request(app).post('/api/auth/login').send({
      walletAddress: '0x5555666677778888999900001111222233334444',
      email: 'rgpd@etherbay.fr',
      isAdultConfirmed: true,
    });
    userToken = loginRes.body.data.token;
  });

  it('should complete social quests, set responsible gaming limit, export GDPR JSON, and confirm GDPR deletion', async () => {
    const questRes = await request(app)
      .post('/api/user/quests/complete')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ questId: 'FOLLOW_TWITTER_ETHERBAY' });

    expect(questRes.status).toBe(200);
    expect(questRes.body.data.pointsAwarded).toBe(30);

    const limitRes = await request(app)
      .put('/api/user/responsible-limit')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ maxTicketsPerRound: 5 });

    expect(limitRes.status).toBe(200);
    expect(limitRes.body.data.maxTicketsPerRound).toBe(5);

    const exportRes = await request(app)
      .get('/api/user/gdpr/export')
      .set('Authorization', `Bearer ${userToken}`);

    expect(exportRes.status).toBe(200);
    expect(exportRes.body.data.gdprCompliant).toBe(true);

    const delReqRes = await request(app)
      .post('/api/user/gdpr/delete-request')
      .set('Authorization', `Bearer ${userToken}`);

    expect(delReqRes.status).toBe(200);
    const confirmationToken = delReqRes.body.data.confirmationToken;

    const confirmRes = await request(app)
      .post('/api/user/gdpr/confirm-delete')
      .send({ token: confirmationToken });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.anonymized).toBe(true);
  });
});
