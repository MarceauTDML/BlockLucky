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

describe('Marketplace API (/api/marketplace)', () => {
  let userToken: string;
  let rewardId: string;

  beforeEach(async () => {
    resetPrismaMockStore();
    resetRedisMockStore();

    const loginRes = await request(app).post('/api/auth/login').send({
      walletAddress: '0x3333444455556666777788889999000011112222',
      email: 'acheteur@etherbay.fr',
      isAdultConfirmed: true,
    });
    userToken = loginRes.body.data.token;

    await request(app)
      .post('/api/lottery/buy')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ quantity: 2 });

    const partner = await prismaMock.partner.create({
      data: {
        name: 'Boulangerie EtherBay',
        logoUrl: 'https://assets.etherbay.fr/boulangerie.png',
        isActive: true,
      },
    });

    const reward = await prismaMock.rewardCatalog.create({
      data: {
        partnerId: partner.id,
        title: '-15% chez le boulanger',
        costInPoints: 100,
        totalStock: 50,
        remainingStock: 50,
        isActive: true,
      },
    });
    rewardId = reward.id;
  });

  it('should list catalog, claim a reward via virtual scratch card, and generate a QR code in My Codes', async () => {
    const catalogRes = await request(app).get('/api/marketplace/catalog');
    expect(catalogRes.status).toBe(200);
    expect(catalogRes.body.data.catalog).toHaveLength(1);

    const claimRes = await request(app)
      .post('/api/marketplace/claim')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ rewardId });

    expect(claimRes.status).toBe(201);
    expect(claimRes.body.data.claim.uniqueCode).toBeDefined();
    expect(claimRes.body.data.claim.qrCodeDataUrl).toContain('data:image/png;base64,');
    expect(claimRes.body.data.newPointsBalance).toBe(25);
    expect(claimRes.body.data.remainingStock).toBe(49);

    const myCodesRes = await request(app)
      .get('/api/marketplace/my-codes')
      .set('Authorization', `Bearer ${userToken}`);

    expect(myCodesRes.status).toBe(200);
    expect(myCodesRes.body.data.codes).toHaveLength(1);
  });
});
