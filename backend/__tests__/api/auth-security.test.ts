import request from 'supertest';
import jwt from 'jsonwebtoken';
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
import emailService from '../../src/services/email.service';
import sessionService from '../../src/services/session.service';
import totpService from '../../src/services/totp.service';

const sentCodes: string[] = [];
const loginBody = (email: string, wallet = '0xaaaabbbbccccddddeeeeffff0000111122223333') => ({
  walletAddress: wallet,
  email,
  provider: 'EMAIL',
  isAdultConfirmed: true,
});

describe('Sécurité de l’authentification', () => {
  beforeAll(() => {
    jest.spyOn(emailService, 'sendTemplateEmail').mockImplementation(async (_to, _subject, template, variables) => {
      if (template === 'otp-code' && variables.CODE) sentCodes.push(variables.CODE);
      return true;
    });
  });

  beforeEach(() => {
    resetPrismaMockStore();
    resetRedisMockStore();
    sentCodes.length = 0;
    env.LOGIN_EMAIL_CODE_REQUIRED = true;
    env.ADMIN_MFA_REQUIRED = false;
  });

  afterAll(() => {
    env.LOGIN_EMAIL_CODE_REQUIRED = false;
    jest.restoreAllMocks();
  });

  it('exige le code envoyé par email avant de créer le compte et de délivrer un jeton', async () => {
    const login = await request(app).post('/api/auth/login').send(loginBody('nouveau@etherbay.fr'));
    expect(login.status).toBe(200);
    expect(login.body.data.requiresTwoFactor).toBe(true);
    expect(login.body.data.twoFactorMethod).toBe('EMAIL');
    expect(login.body.data.token).toBeUndefined();
    expect(await prismaMock.user.findUnique({ where: { email: 'nouveau@etherbay.fr' } })).toBeNull();

    const verify = await request(app)
      .post('/api/auth/2fa/verify')
      .send({ userId: login.body.data.userId, code: sentCodes[0] });
    expect(verify.status).toBe(200);
    expect(verify.body.data.token).toBeDefined();
    expect(verify.body.data.isNewUser).toBe(true);
    expect(verify.body.data.user.pointsBalance).toBe(25);
  });

  it('invalide le code après 5 essais erronés', async () => {
    const login = await request(app).post('/api/auth/login').send(loginBody('essais@etherbay.fr'));
    const userId = login.body.data.userId;
    const goodCode = sentCodes[0]!;
    const wrongCode = goodCode === '000000' ? '111111' : '000000';

    for (let attempt = 0; attempt < 5; attempt++) {
      const res = await request(app).post('/api/auth/2fa/verify').send({ userId, code: wrongCode });
      expect(res.status).toBe(401);
    }
    const late = await request(app).post('/api/auth/2fa/verify').send({ userId, code: goodCode });
    expect(late.status).toBe(401);
  });

  it('révoque le jeton à la déconnexion', async () => {
    const user = await prismaMock.user.create({
      data: { walletAddress: '0x1234123412341234123412341234123412341234', email: 'sortie@etherbay.fr' },
    });
    const token = sessionService.sign({ userId: user.id, walletAddress: user.walletAddress, role: 'USER' });

    const before = await request(app).get('/api/user/profile').set('Authorization', `Bearer ${token}`);
    expect(before.status).toBe(200);

    const logout = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`).send({});
    expect(logout.status).toBe(200);

    const after = await request(app).get('/api/user/profile').set('Authorization', `Bearer ${token}`);
    expect(after.status).toBe(401);
  });

  it('refuse un jeton signé avec un autre algorithme ou sans émetteur', async () => {
    const forged = jwt.sign({ userId: 'x', walletAddress: '0x0', role: 'ADMIN' }, env.JWT_SECRET);
    const res = await request(app).get('/api/user/profile').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  it('impose la double authentification aux administrateurs', async () => {
    env.ADMIN_MFA_REQUIRED = true;
    const admin = await prismaMock.user.create({
      data: { walletAddress: '0xadad00000000000000000000000000000000adad', email: 'maire@etherbay.fr', role: 'ADMIN' },
    });
    const token = sessionService.sign({ userId: admin.id, walletAddress: admin.walletAddress, role: 'ADMIN' });
    const res = await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('refuse un jeton dont le rôle ne correspond plus au compte', async () => {
    const user = await prismaMock.user.create({
      data: { walletAddress: '0xdede00000000000000000000000000000000dede', email: 'ex-admin@etherbay.fr', role: 'USER' },
    });
    const token = sessionService.sign({ userId: user.id, walletAddress: user.walletAddress, role: 'ADMIN' });
    const res = await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('refuse le rejeu d’un code TOTP déjà utilisé', async () => {
    env.LOGIN_EMAIL_CODE_REQUIRED = false;
    const login = await request(app).post('/api/auth/login').send(loginBody('totp@etherbay.fr'));
    const token = login.body.data.token;

    const setup = await request(app)
      .post('/api/auth/2fa/setup')
      .set('Authorization', `Bearer ${token}`)
      .send({ method: 'APP' });
    expect(setup.body.data.backupCodes).toHaveLength(10);

    const code = totpService.generateToken(setup.body.data.secret);
    const enable = await request(app)
      .post('/api/auth/2fa/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ code });
    expect(enable.status).toBe(200);

    const stored = await prismaMock.user.findUnique({ where: { email: 'totp@etherbay.fr' } });
    expect(stored.twoFactorSecret).not.toBe(setup.body.data.secret);
    expect(stored.twoFactorBackupCodes).not.toContain(setup.body.data.backupCodes[0]);

    const relogin = await request(app).post('/api/auth/login').send(loginBody('totp@etherbay.fr'));
    expect(relogin.body.data.twoFactorMethod).toBe('APP');
    const replay = await request(app)
      .post('/api/auth/2fa/verify')
      .send({ userId: relogin.body.data.userId, code });
    expect(replay.status).toBe(401);

    const backup = await request(app)
      .post('/api/auth/2fa/verify')
      .send({ userId: relogin.body.data.userId, code: setup.body.data.backupCodes[0] });
    expect(backup.status).toBe(200);

    const reuse = await request(app)
      .post('/api/auth/2fa/verify')
      .send({ userId: relogin.body.data.userId, code: setup.body.data.backupCodes[0] });
    expect(reuse.status).toBe(401);
  });

  it('exige une authentification récente pour désactiver la 2FA', async () => {
    const user = await prismaMock.user.create({
      data: { walletAddress: '0xfefe00000000000000000000000000000000fefe', email: 'ancien@etherbay.fr' },
    });
    await prismaMock.user.update({
      where: { id: user.id },
      data: { isTwoFactorEnabled: true, twoFactorMethod: 'EMAIL' },
    });
    const oldToken = jwt.sign(
      { userId: user.id, walletAddress: user.walletAddress, role: 'USER', iat: Math.floor(Date.now() / 1000) - 3600 },
      env.JWT_SECRET,
      { algorithm: 'HS256', issuer: 'blocklucky-api', audience: 'blocklucky-clients', jwtid: 'ancien', expiresIn: '12h' }
    );
    const refused = await request(app)
      .post('/api/auth/2fa/disable')
      .set('Authorization', `Bearer ${oldToken}`)
      .send({});
    expect(refused.status).toBe(401);

    const freshToken = sessionService.sign({ userId: user.id, walletAddress: user.walletAddress, role: 'USER' });
    const accepted = await request(app)
      .post('/api/auth/2fa/disable')
      .set('Authorization', `Bearer ${freshToken}`)
      .send({});
    expect(accepted.status).toBe(200);
  });

  it('refuse les événements analytiques qui imitent le journal d’administration', async () => {
    const forged = await request(app)
      .post('/api/analytics/track')
      .send({ eventType: 'ADMIN_AUDIT:TREASURY_WITHDRAW', metadata: { amount: 1000 } });
    expect(forged.status).toBe(400);

    const legit = await request(app)
      .post('/api/analytics/track')
      .send({ eventType: 'landing_view', metadata: { platform: 'WEB', path: '/' } });
    expect(legit.status).toBeLessThan(300);
  });

  it('empêche un partenaire d’agir sur l’entreprise d’un autre partenaire', async () => {
    const owner = await prismaMock.user.create({
      data: { walletAddress: '0xb0b0000000000000000000000000000000000b0b', email: 'a@etherbay.fr', role: 'PARTNER' },
    });
    const intruder = await prismaMock.user.create({
      data: { walletAddress: '0xc0c0000000000000000000000000000000000c0c', email: 'b@etherbay.fr', role: 'PARTNER' },
    });
    const ownerToken = sessionService.sign({ userId: owner.id, walletAddress: owner.walletAddress, role: 'PARTNER' });
    const intruderToken = sessionService.sign({
      userId: intruder.id,
      walletAddress: intruder.walletAddress,
      role: 'PARTNER',
    });

    const created = await request(app)
      .post('/api/partners')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Fromagerie du Quai', logoUrl: 'https://assets.etherbay.fr/fromagerie.png' });
    const partnerId = created.body.data.partner.id;

    const offer = await request(app)
      .post('/api/partners/offers')
      .set('Authorization', `Bearer ${intruderToken}`)
      .send({ partnerId, title: 'Offre pirate', costInPoints: 10, totalStock: 1 });
    expect(offer.status).toBe(403);

    const stats = await request(app)
      .get(`/api/partners/${partnerId}/consumption`)
      .set('Authorization', `Bearer ${intruderToken}`);
    expect(stats.status).toBe(403);
  });
});
