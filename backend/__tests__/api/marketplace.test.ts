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
import { env } from '../../src/config/env.config';

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
      .send({ quantity: 1 });

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
        costInPoints: 50,
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

  describe('ticket à gratter en EtherPoints', () => {
    const setBalance = async (pointsBalance: number) => {
      const user = await prismaMock.user.findUnique({ where: { email: 'acheteur@etherbay.fr' } });
      await prismaMock.user.update({ where: { id: user.id }, data: { pointsBalance } });
      return user.id as string;
    };

    it('débite le prix de l’offre, attribue une récompense en stock et crée la réclamation', async () => {
      const userId = await setBalance(120);
      const res = await request(app)
        .post('/api/v1/marketplace/scratch')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ offer: 'violet' });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ offer: 'violet', pointsSpent: 50, newBalance: 70, remainingStock: 49 });
      expect(res.body.data.claim).toMatchObject({
        rewardTitle: '-15% chez le boulanger',
        partnerName: 'Boulangerie EtherBay',
        isUsed: false,
        scratchCardReady: true,
      });
      expect(res.body.data.claim.uniqueCode).toEqual(expect.any(String));
      expect(res.body.data.claim.qrCodeDataUrl).toContain('data:image/png;base64,');

      const ledger = await prismaMock.pointTransaction.findMany({ where: { userId } });
      expect(ledger.some((entry: { amount: number }) => entry.amount === -50)).toBe(true);

      const codes = await request(app).get('/api/v1/marketplace/my-codes').set('Authorization', `Bearer ${userToken}`);
      expect(codes.body.data.codes).toHaveLength(1);
    });

    it('refuse sans assez de points et sans débiter', async () => {
      await setBalance(60);
      const res = await request(app)
        .post('/api/v1/marketplace/scratch')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ offer: 'lucky' });
      expect(res.status).toBe(402);
      expect(res.body.message).toContain('EtherPoints insuffisants');
      const user = await prismaMock.user.findUnique({ where: { email: 'acheteur@etherbay.fr' } });
      expect(user.pointsBalance).toBe(60);
    });

    it('répond 404 quand aucune récompense n’est disponible', async () => {
      await setBalance(500);
      await prismaMock.rewardCatalog.update({ where: { id: rewardId }, data: { remainingStock: 0 } });
      const res = await request(app)
        .post('/api/v1/marketplace/scratch')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ offer: 'violet' });
      expect(res.status).toBe(404);
      const user = await prismaMock.user.findUnique({ where: { email: 'acheteur@etherbay.fr' } });
      expect(user.pointsBalance).toBe(500);
    });

    it('refuse une offre inconnue et exige l’âge vérifié', async () => {
      const unknown = await request(app)
        .post('/api/v1/marketplace/scratch')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ offer: 'gold' });
      expect(unknown.status).toBe(400);

      env.AGE_VERIFICATION_REQUIRED = true;
      try {
        const gated = await request(app)
          .post('/api/v1/marketplace/scratch')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ offer: 'violet' });
        expect(gated.status).toBe(403);
        expect(gated.body.errors.code).toBe('AGE_VERIFICATION_REQUIRED');
      } finally {
        env.AGE_VERIFICATION_REQUIRED = false;
      }
    });
  });
});
