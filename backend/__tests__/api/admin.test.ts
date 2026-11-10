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

describe('Admin Mairie API & RBAC (/api/admin)', () => {
  let adminToken: string;
  let playerToken: string;

  beforeEach(async () => {
    resetPrismaMockStore();
    resetRedisMockStore();

    const adminUser = await prismaMock.user.create({
      data: {
        walletAddress: '0xadmin9999999999999999999999999999999999',
        email: 'maire@etherbay.fr',
        role: 'ADMIN',
      },
    });

    adminToken = sessionService.sign({
        userId: adminUser.id,
        walletAddress: adminUser.walletAddress,
        role: 'ADMIN',
      });

    const playerUser = await prismaMock.user.create({
      data: {
        walletAddress: '0xplayer1111111111111111111111111111111111',
        email: 'joueur@etherbay.fr',
        role: 'USER',
      },
    });

    playerToken = sessionService.sign({
        userId: playerUser.id,
        walletAddress: playerUser.walletAddress,
        role: 'USER',
      });
  });

  it('should enforce strict RBAC (403 Forbidden) if a USER tries to access Mairie Admin dashboard', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${playerToken}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Accès refusé (RBAC)');
  });

  it('should allow ADMIN to view KPIs, toggle Circuit Breaker, withdraw to Multi-Sig, export CSV, and inspect Audit Logs', async () => {
    const dashRes = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(dashRes.status).toBe(200);
    expect(dashRes.body.data.kpis).toBeDefined();

    const cbRes = await request(app)
      .post('/api/admin/circuit-breaker')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ paused: true, reason: 'Simulation audit sécurité DSI' });
    expect(cbRes.status).toBe(200);
    expect(cbRes.body.data.paused).toBe(true);

    await request(app)
      .post('/api/admin/circuit-breaker')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ paused: false, reason: 'Fin de simulation' });

    const withdrawRes = await request(app)
      .post('/api/admin/treasury/withdraw')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        multisigWallet: '0xMultiSigMairieEtherBay000000000000000001',
        amountEth: 1.5,
      });
    expect(withdrawRes.status).toBe(200);
    expect(withdrawRes.body.data.transactionHash).toBeDefined();

    const reportRes = await request(app)
      .get('/api/admin/reports/export?format=CSV')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(reportRes.status).toBe(200);
    expect(reportRes.body.data.format).toBe('CSV');

    const logsRes = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(logsRes.status).toBe(200);
    expect(logsRes.body.data.logs.length).toBeGreaterThanOrEqual(3);
  });
});
