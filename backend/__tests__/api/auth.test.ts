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
import totpService from '../../src/services/totp.service';

describe('Auth API (/api/auth)', () => {
  beforeEach(() => {
    resetPrismaMockStore();
    resetRedisMockStore();
  });

  it('GET /api/auth/onboarding should return onboarding slides', async () => {
    const res = await request(app).get('/api/auth/onboarding');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.slides.length).toBeGreaterThanOrEqual(3);
  });

  it('POST /api/auth/login should reject users under 18 (isAdultConfirmed=false)', async () => {
    const res = await request(app).post('/api/auth/login').send({
      walletAddress: '0x1111222233334444555566667777888899990000',
      email: 'mineur@etherbay.fr',
      isAdultConfirmed: false,
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/login should register a new 18+ user, award +25 welcome points, and setup/verify 2FA', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      walletAddress: '0x1111222233334444555566667777888899990000',
      email: 'citoyen@etherbay.fr',
      provider: 'GOOGLE',
      isAdultConfirmed: true,
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.token).toBeDefined();
    expect(loginRes.body.data.user.pointsBalance).toBe(25);

    const token = loginRes.body.data.token;

    const setupRes = await request(app)
      .post('/api/auth/2fa/setup')
      .set('Authorization', `Bearer ${token}`)
      .send({ method: 'APP' });

    expect(setupRes.status).toBe(200);
    expect(setupRes.body.data.qrCodeDataUrl).toContain('data:image/png;base64,');

    const secret = setupRes.body.data.secret;
    const validOtp = totpService.generateToken(secret);

    const verifyRes = await request(app)
      .post('/api/auth/2fa/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: validOtp });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.verified).toBe(true);
  });
});
