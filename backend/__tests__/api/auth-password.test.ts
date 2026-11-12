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
import emailService from '../../src/services/email.service';

const PASSWORD = 'EtherBay2026secret';
const sentCodes: string[] = [];
const lastCode = () => sentCodes[sentCodes.length - 1]!;

const signupAndVerify = async (email: string, password = PASSWORD) => {
  const signup = await request(app).post('/api/v1/auth/signup').send({ email, password, acceptTerms: true });
  expect(signup.status).toBe(201);
  const verify = await request(app)
    .post('/api/v1/auth/2fa/verify')
    .send({ userId: signup.body.data.userId, code: lastCode() });
  return { signup, verify };
};

describe('Comptes avec mot de passe', () => {
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
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('inscrit un citoyen après vérification du code reçu par email', async () => {
    const { signup, verify } = await signupAndVerify('Nouvelle@EtherBay.fr');
    expect(signup.body.data).toMatchObject({ requiresTwoFactor: true, twoFactorMethod: 'EMAIL' });
    expect(signup.body.data.userId).toEqual(expect.any(String));
    expect(signup.body.data.devOtpPreview).toBeUndefined();

    expect(verify.status).toBe(200);
    expect(verify.body.data.isNewUser).toBe(true);
    expect(verify.body.data.token).toBeDefined();
    expect(verify.body.data.user).toMatchObject({
      email: 'nouvelle@etherbay.fr',
      hasPassword: true,
      ageVerificationStatus: 'NONE',
      pointsBalance: 25,
    });
    expect(verify.body.data.user.passwordHash).toBeUndefined();

    const stored = await prismaMock.user.findUnique({ where: { email: 'nouvelle@etherbay.fr' } });
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$12\$/);
  });

  it('refuse une seconde inscription avec la même adresse vérifiée', async () => {
    await signupAndVerify('doublon@etherbay.fr');
    const again = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email: 'doublon@etherbay.fr', password: PASSWORD, acceptTerms: true });
    expect(again.status).toBe(409);
    expect(again.body.message).toBe('Un compte existe déjà avec cette adresse email.');
  });

  it('applique la politique de mot de passe et l’acceptation des conditions', async () => {
    const weak = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email: 'faible@etherbay.fr', password: 'sanschiffre', acceptTerms: true });
    expect(weak.status).toBe(400);
    const short = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email: 'court@etherbay.fr', password: 'abc123', acceptTerms: true });
    expect(short.status).toBe(400);
    const noTerms = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email: 'cgu@etherbay.fr', password: PASSWORD, acceptTerms: false });
    expect(noTerms.status).toBe(400);
  });

  it('active un compte créé par un cadeau sans le dupliquer', async () => {
    const giftRecipient = await prismaMock.user.create({
      data: { walletAddress: '0x7777000000000000000000000000000000000001', email: 'cadeau@etherbay.fr' },
    });
    const { verify } = await signupAndVerify('cadeau@etherbay.fr');
    expect(verify.status).toBe(200);
    expect(verify.body.data.user.id).toBe(giftRecipient.id);
    expect(verify.body.data.user.hasPassword).toBe(true);
    expect(verify.body.data.isNewUser).toBe(true);
  });

  it('connecte avec le bon mot de passe et répond le même message pour toute erreur', async () => {
    await signupAndVerify('connexion@etherbay.fr');
    await request(app).post('/api/v1/auth/login').send({
      walletAddress: '0x1111222233334444555566667777888899990000',
      email: 'sansmotdepasse@etherbay.fr',
      isAdultConfirmed: true,
    });

    const ok = await request(app)
      .post('/api/v1/auth/signin')
      .send({ email: 'CONNEXION@etherbay.fr', password: PASSWORD });
    expect(ok.status).toBe(200);
    expect(ok.body.data).toMatchObject({ requiresTwoFactor: false, isNewUser: false });
    expect(ok.body.data.token).toBeDefined();
    expect(ok.body.data.user.hasPassword).toBe(true);

    for (const body of [
      { email: 'connexion@etherbay.fr', password: 'MauvaisMotDePasse1' },
      { email: 'inconnu@etherbay.fr', password: PASSWORD },
      { email: 'sansmotdepasse@etherbay.fr', password: PASSWORD },
    ]) {
      const res = await request(app).post('/api/v1/auth/signin').send(body);
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Email ou mot de passe incorrect.');
    }
  });

  it('bloque le compte après 10 échecs, y compris pour une adresse inconnue', async () => {
    await signupAndVerify('bloque@etherbay.fr');
    for (const email of ['bloque@etherbay.fr', 'fantome@etherbay.fr']) {
      for (let attempt = 0; attempt < 10; attempt++) {
        const res = await request(app).post('/api/v1/auth/signin').send({ email, password: 'Mauvais12345' });
        expect(res.status).toBe(401);
      }
      const locked = await request(app).post('/api/v1/auth/signin').send({ email, password: PASSWORD });
      expect(locked.status).toBe(429);
    }
  }, 60000);

  it('demande le code TOTP quand la 2FA par application est active', async () => {
    const { verify } = await signupAndVerify('totp@etherbay.fr');
    await prismaMock.user.update({
      where: { id: verify.body.data.user.id },
      data: { isTwoFactorEnabled: true, twoFactorMethod: 'APP' },
    });
    const res = await request(app).post('/api/v1/auth/signin').send({ email: 'totp@etherbay.fr', password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      requiresTwoFactor: true,
      twoFactorMethod: 'APP',
      userId: verify.body.data.user.id,
    });
  });

  it('réinitialise le mot de passe avec le code reçu et révoque les sessions', async () => {
    const { verify } = await signupAndVerify('oubli@etherbay.fr');
    const oldToken = verify.body.data.token as string;
    await new Promise((resolve) => setTimeout(resolve, 2100));

    const unknown = await request(app).post('/api/v1/auth/password/forgot').send({ email: 'personne@etherbay.fr' });
    expect(unknown.status).toBe(200);
    expect(unknown.body.data).toEqual({ sent: true });

    const codesBefore = sentCodes.length;
    const forgot = await request(app).post('/api/v1/auth/password/forgot').send({ email: 'oubli@etherbay.fr' });
    expect(forgot.status).toBe(200);
    expect(forgot.body.data).toEqual({ sent: true });
    expect(sentCodes.length).toBe(codesBefore + 1);
    const code = lastCode();

    const wrong = await request(app)
      .post('/api/v1/auth/password/reset')
      .send({ email: 'oubli@etherbay.fr', code: code === '000000' ? '111111' : '000000', newPassword: 'NouveauSecret42' });
    expect(wrong.status).toBe(400);
    expect(wrong.body.message).toBe('Code invalide ou expiré.');

    const reset = await request(app)
      .post('/api/v1/auth/password/reset')
      .send({ email: 'oubli@etherbay.fr', code, newPassword: 'NouveauSecret42' });
    expect(reset.status).toBe(200);
    expect(reset.body.data).toEqual({ reset: true });

    const replay = await request(app)
      .post('/api/v1/auth/password/reset')
      .send({ email: 'oubli@etherbay.fr', code, newPassword: 'EncoreUnAutre42' });
    expect(replay.status).toBe(400);

    const profile = await request(app).get('/api/v1/user/profile').set('Authorization', `Bearer ${oldToken}`);
    expect(profile.status).toBe(401);

    const oldPassword = await request(app)
      .post('/api/v1/auth/signin')
      .send({ email: 'oubli@etherbay.fr', password: PASSWORD });
    expect(oldPassword.status).toBe(401);
    const newPassword = await request(app)
      .post('/api/v1/auth/signin')
      .send({ email: 'oubli@etherbay.fr', password: 'NouveauSecret42' });
    expect(newPassword.status).toBe(200);
  }, 30000);

  it('permet à un compte créé par code de définir un mot de passe', async () => {
    await request(app).post('/api/v1/auth/login').send({
      walletAddress: '0x1111222233334444555566667777888899990000',
      email: 'parcode@etherbay.fr',
      isAdultConfirmed: true,
    });
    await request(app).post('/api/v1/auth/password/forgot').send({ email: 'parcode@etherbay.fr' });
    const reset = await request(app)
      .post('/api/v1/auth/password/reset')
      .send({ email: 'parcode@etherbay.fr', code: lastCode(), newPassword: 'PremierSecret42' });
    expect(reset.status).toBe(200);

    const signin = await request(app)
      .post('/api/v1/auth/signin')
      .send({ email: 'parcode@etherbay.fr', password: 'PremierSecret42' });
    expect(signin.status).toBe(200);
    expect(signin.body.data.user.hasPassword).toBe(true);
  });

  it('expose hasPassword et ageVerificationStatus dans le profil', async () => {
    const { verify } = await signupAndVerify('profil@etherbay.fr');
    const res = await request(app)
      .get('/api/v1/user/profile')
      .set('Authorization', `Bearer ${verify.body.data.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.profile).toMatchObject({ hasPassword: true, ageVerificationStatus: 'NONE' });
    expect(res.body.data.profile.passwordHash).toBeUndefined();
  });
});
