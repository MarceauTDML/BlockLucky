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
import sessionService from '../../src/services/session.service';

describe('Partners API (/api/partners)', () => {
  let partnerToken: string;

  beforeEach(async () => {
    resetPrismaMockStore();
    resetRedisMockStore();

    const partnerUser = await prismaMock.user.create({
      data: {
        walletAddress: '0x4444555566667777888899990000111122223333',
        email: 'commercant@etherbay.fr',
        role: 'PARTNER',
      },
    });

    partnerToken = sessionService.sign({
        userId: partnerUser.id,
        walletAddress: partnerUser.walletAddress,
        role: 'PARTNER',
      });
  });

  it('should create a partner, create an offer, upload promo codes CSV batch, and return consumption stats', async () => {
    const createPartnerRes = await request(app)
      .post('/api/partners')
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({
        name: 'Librairie d\'EtherBay',
        logoUrl: 'https://assets.etherbay.fr/librairie.png',
      });

    expect(createPartnerRes.status).toBe(201);
    const partnerId = createPartnerRes.body.data.partner.id;

    const offerRes = await request(app)
      .post('/api/partners/offers')
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({
        partnerId,
        title: '-20% sur tous les romans',
        costInPoints: 120,
        totalStock: 10,
      });

    expect(offerRes.status).toBe(201);
    const rewardId = offerRes.body.data.offer.id;

    const uploadRes = await request(app)
      .post('/api/partners/codes/upload')
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({
        rewardId,
        csvContent: 'LIB-0001\nLIB-0002\nLIB-0003',
      });

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.data.injectedCount).toBe(3);

    const statsRes = await request(app)
      .get(`/api/partners/${partnerId}/consumption`)
      .set('Authorization', `Bearer ${partnerToken}`);

    expect(statsRes.status).toBe(200);
    expect(statsRes.body.data.summary.totalStock).toBe(13);
  });
});
