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

const appCodeStepFor = async (email: string, wallet?: string) => {
  const start = sentCodes.length;
  const login = await request(app).post('/api/auth/login').send(loginBody(email, wallet));
  expect(login.body.data.twoFactorMethod).toBe('EMAIL');
  expect(login.body.data.token).toBeUndefined();
  const emailStep = await request(app)
    .post('/api/auth/2fa/verify')
    .send({ userId: login.body.data.userId, code: sentCodes[start] });
  expect(emailStep.status).toBe(200);
  return emailStep.body.data;
};

const appCodeStep = (email: string) => appCodeStepFor(email);

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

  it('accepte le code de l’application après une demande de code par email abandonnée', async () => {
    env.LOGIN_EMAIL_CODE_REQUIRED = false;
    const login = await request(app).post('/api/auth/login').send(loginBody('bascule@etherbay.fr'));
    const token = login.body.data.token;

    const emailSetup = await request(app)
      .post('/api/auth/2fa/setup')
      .set('Authorization', `Bearer ${token}`)
      .send({ method: 'EMAIL' });
    expect(emailSetup.status).toBe(200);

    const appSetup = await request(app)
      .post('/api/auth/2fa/setup')
      .set('Authorization', `Bearer ${token}`)
      .send({ method: 'APP' });
    expect(appSetup.status).toBe(200);

    const enable = await request(app)
      .post('/api/auth/2fa/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: totpService.generateToken(appSetup.body.data.secret) });
    expect(enable.status).toBe(200);
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

    const relogin = await appCodeStep('totp@etherbay.fr');
    expect(relogin.twoFactorMethod).toBe('APP');
    expect(relogin.token).toBeUndefined();
    const replay = await request(app)
      .post('/api/auth/2fa/verify')
      .send({ userId: relogin.userId, loginTicket: relogin.loginTicket, code });
    expect(replay.status).toBe(401);

    const backup = await request(app)
      .post('/api/auth/2fa/verify')
      .send({ userId: relogin.userId, loginTicket: relogin.loginTicket, code: setup.body.data.backupCodes[0] });
    expect(backup.status).toBe(200);
    expect(backup.body.data.token).toBeDefined();

    const ticketReuse = await request(app)
      .post('/api/auth/2fa/verify')
      .send({ userId: relogin.userId, loginTicket: relogin.loginTicket, code: setup.body.data.backupCodes[1] });
    expect(ticketReuse.status).toBe(401);

    const again = await appCodeStep('totp@etherbay.fr');
    const reuse = await request(app)
      .post('/api/auth/2fa/verify')
      .send({ userId: again.userId, loginTicket: again.loginTicket, code: setup.body.data.backupCodes[0] });
    expect(reuse.status).toBe(401);
  });

  it('refuse un code de l’application présenté avec le seul identifiant du compte', async () => {
    const secret = totpService.generateSecret();
    const victim = await prismaMock.user.create({
      data: {
        walletAddress: '0x7070000000000000000000000000000000007070',
        email: 'victime@etherbay.fr',
        isEmailVerified: true,
        isTwoFactorEnabled: true,
        twoFactorMethod: 'APP',
        twoFactorSecret: secret,
      },
    });

    const bypass = await request(app)
      .post('/api/auth/2fa/verify')
      .send({ userId: victim.id, code: totpService.generateToken(secret) });
    expect(bypass.status).toBe(401);
    expect(bypass.body.data?.token).toBeUndefined();

    const forged = await request(app)
      .post('/api/auth/2fa/verify')
      .send({ userId: victim.id, loginTicket: 'a'.repeat(43), code: totpService.generateToken(secret) });
    expect(forged.status).toBe(401);

    await prismaMock.user.create({
      data: {
        walletAddress: '0x8080000000000000000000000000000000008080',
        email: 'intrus@etherbay.fr',
        isEmailVerified: true,
        isTwoFactorEnabled: true,
        twoFactorMethod: 'APP',
        twoFactorSecret: totpService.generateSecret(),
      },
    });
    const other = await appCodeStepFor('intrus@etherbay.fr', '0x8080000000000000000000000000000000008080');
    expect(other.loginTicket).toEqual(expect.any(String));
    const crossed = await request(app)
      .post('/api/auth/2fa/verify')
      .send({ userId: victim.id, loginTicket: other.loginTicket, code: totpService.generateToken(secret) });
    expect(crossed.status).toBe(401);
  });

  it('refuse d’activer la 2FA par application sans session authentifiée', async () => {
    env.LOGIN_EMAIL_CODE_REQUIRED = false;
    const login = await request(app).post('/api/auth/login').send(loginBody('activation@etherbay.fr'));
    const setup = await request(app)
      .post('/api/auth/2fa/setup')
      .set('Authorization', `Bearer ${login.body.data.token}`)
      .send({ method: 'APP' });

    const anonymous = await request(app)
      .post('/api/auth/2fa/verify')
      .send({ userId: login.body.data.user.id, code: totpService.generateToken(setup.body.data.secret) });
    expect(anonymous.status).toBe(401);
    const stored = await prismaMock.user.findUnique({ where: { email: 'activation@etherbay.fr' } });
    expect(stored.isTwoFactorEnabled).toBe(false);
  });

  it('demande le code de l’application après le mot de passe, avec un ticket de connexion', async () => {
    env.LOGIN_EMAIL_CODE_REQUIRED = false;
    const secret = totpService.generateSecret();
    const signup = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'motdepasse@etherbay.fr', password: 'Citoyen2026!', acceptTerms: true, isAdultConfirmed: true });
    const created = await request(app)
      .post('/api/auth/2fa/verify')
      .send({ userId: signup.body.data.userId, code: sentCodes[0] });
    expect(created.status).toBe(200);
    await prismaMock.user.update({
      where: { id: created.body.data.user.id },
      data: { isTwoFactorEnabled: true, twoFactorMethod: 'APP', twoFactorSecret: secret },
    });

    const signin = await request(app)
      .post('/api/auth/signin')
      .send({ email: 'motdepasse@etherbay.fr', password: 'Citoyen2026!' });
    expect(signin.status).toBe(200);
    expect(signin.body.data).toMatchObject({ requiresTwoFactor: true, twoFactorMethod: 'APP' });
    expect(signin.body.data.loginTicket).toEqual(expect.any(String));

    const verified = await request(app)
      .post('/api/auth/2fa/verify')
      .send({ loginTicket: signin.body.data.loginTicket, code: totpService.generateToken(secret) });
    expect(verified.status).toBe(200);
    expect(verified.body.data.token).toBeDefined();
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
