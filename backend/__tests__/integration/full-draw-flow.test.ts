import request from 'supertest';
import jwt from 'jsonwebtoken';
import prismaMock, { resetPrismaMockStore } from '../__mocks__/prisma.mock';
import redisMock, { resetRedisMockStore } from '../__mocks__/redis.mock';
import { env } from '../../src/config/env.config';

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

describe('Full Lottery Draw Flow Integration', () => {
  beforeEach(() => {
    resetPrismaMockStore();
    resetRedisMockStore();
  });

  it('should execute a complete flow: citizen signup -> gasless ticket purchase -> Chainlink VRF draw -> winner picked', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      walletAddress: '0x8888999900001111222233334444555566667777',
      email: 'gagnant@etherbay.fr',
      isAdultConfirmed: true,
    });
    const userToken = loginRes.body.data.token;

    const buyRes = await request(app)
      .post('/api/lottery/buy')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ quantity: 1 });
    expect(buyRes.status).toBe(201);

    const adminUser = await prismaMock.user.create({
      data: {
        walletAddress: '0xadmin0000000000000000000000000000000000',
        role: 'ADMIN',
      },
    });
    const adminToken = jwt.sign(
      { userId: adminUser.id, walletAddress: adminUser.walletAddress, role: 'ADMIN' },
      env.JWT_SECRET
    );

    const drawRes = await request(app)
      .post('/api/lottery/draw')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(drawRes.status).toBe(200);
    expect(drawRes.body.data.round.status).toBe('COMPLETED');
    expect(drawRes.body.data.round.winnerWallet).toBe(
      '0x8888999900001111222233334444555566667777'
    );
    expect(drawRes.body.data.vrfProof.verifiedFair).toBe(true);
  });
});
