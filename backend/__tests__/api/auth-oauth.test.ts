import request from 'supertest';
import prismaMock, { resetPrismaMockStore } from '../__mocks__/prisma.mock';
import redisMock, { resetRedisMockStore } from '../__mocks__/redis.mock';

const mockVerifyIdToken = jest.fn();
const mockJwtVerify = jest.fn();
const mockCreateRemoteJWKSet = jest.fn((_url: URL) => 'apple-jwks');

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

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken: mockVerifyIdToken })),
}));

jest.mock('jose', () => ({
  createRemoteJWKSet: (url: URL) => mockCreateRemoteJWKSet(url),
  jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
}));

import app from '../../src/app';
import { env } from '../../src/config/env.config';
import oauthVerifierService from '../../src/services/oauth-verifier.service';

const GOOGLE_TOKEN = 'google.id.token.simule.pour.les.tests';
const APPLE_TOKEN = 'apple.identity.token.simule.pour.les.tests';

const googleTicket = (payload: Record<string, unknown>) => ({ getPayload: () => payload });

describe('Connexion Google et Apple', () => {
  beforeEach(() => {
    resetPrismaMockStore();
    resetRedisMockStore();
    mockVerifyIdToken.mockReset();
    mockJwtVerify.mockReset();
    env.GOOGLE_CLIENT_IDS = ['web.apps.googleusercontent.com', 'ios.apps.googleusercontent.com'];
    env.APPLE_CLIENT_IDS = ['fr.etherbay.blocklucky'];
  });

  afterAll(() => {
    env.GOOGLE_CLIENT_IDS = [];
    env.APPLE_CLIENT_IDS = [];
  });

  describe('vérification des jetons (unitaire)', () => {
    it('vérifie le jeton Google contre les identifiants client configurés', async () => {
      mockVerifyIdToken.mockResolvedValue(
        googleTicket({ sub: 'g-1', email: 'Citoyen@Gmail.com', email_verified: true })
      );
      const identity = await oauthVerifierService.verifyGoogle(GOOGLE_TOKEN);
      expect(identity).toEqual({ provider: 'GOOGLE', subject: 'g-1', email: 'citoyen@gmail.com' });
      expect(mockVerifyIdToken).toHaveBeenCalledWith({ idToken: GOOGLE_TOKEN, audience: env.GOOGLE_CLIENT_IDS });
    });

    it('refuse un email Google non vérifié ou un jeton rejeté', async () => {
      mockVerifyIdToken.mockResolvedValueOnce(googleTicket({ sub: 'g-2', email: 'x@gmail.com', email_verified: false }));
      await expect(oauthVerifierService.verifyGoogle(GOOGLE_TOKEN)).rejects.toMatchObject({ statusCode: 401 });
      mockVerifyIdToken.mockRejectedValueOnce(new Error('Wrong recipient, payload audience != requiredAudience'));
      await expect(oauthVerifierService.verifyGoogle(GOOGLE_TOKEN)).rejects.toMatchObject({
        statusCode: 401,
        message: 'Jeton Google invalide ou expiré.',
      });
    });

    it('vérifie le jeton Apple avec l’émetteur, l’audience et les clés publiques d’Apple', async () => {
      mockJwtVerify.mockResolvedValue({ payload: { sub: 'a-1', email: 'relay@privaterelay.appleid.com', email_verified: 'true' } });
      const identity = await oauthVerifierService.verifyApple(APPLE_TOKEN);
      expect(identity).toEqual({ provider: 'APPLE', subject: 'a-1', email: 'relay@privaterelay.appleid.com' });
      expect(mockJwtVerify).toHaveBeenCalledWith(APPLE_TOKEN, 'apple-jwks', {
        issuer: 'https://appleid.apple.com',
        audience: ['fr.etherbay.blocklucky'],
        algorithms: ['RS256'],
      });
      expect(String(mockCreateRemoteJWKSet.mock.calls[0]?.[0])).toBe('https://appleid.apple.com/auth/keys');
    });

    it('refuse un jeton Apple invalide ou sans email', async () => {
      mockJwtVerify.mockRejectedValueOnce(new Error('signature verification failed'));
      await expect(oauthVerifierService.verifyApple(APPLE_TOKEN)).rejects.toMatchObject({ statusCode: 401 });
      mockJwtVerify.mockResolvedValueOnce({ payload: { sub: 'a-2' } });
      await expect(oauthVerifierService.verifyApple(APPLE_TOKEN)).rejects.toMatchObject({ statusCode: 401 });
    });
  });

  describe('routes', () => {
    it('répond 503 quand Google ou Apple ne sont pas configurés', async () => {
      env.GOOGLE_CLIENT_IDS = [];
      env.APPLE_CLIENT_IDS = [];
      const google = await request(app).post('/api/v1/auth/oauth/google').send({ idToken: GOOGLE_TOKEN });
      expect(google.status).toBe(503);
      expect(google.body.message).toBe('Connexion Google non configurée.');
      const apple = await request(app).post('/api/v1/auth/oauth/apple').send({ identityToken: APPLE_TOKEN });
      expect(apple.status).toBe(503);
      expect(apple.body.message).toBe('Connexion Apple non configurée.');
      expect(mockVerifyIdToken).not.toHaveBeenCalled();
    });

    it('crée le compte à la première connexion Google puis le retrouve par email', async () => {
      mockVerifyIdToken.mockResolvedValue(googleTicket({ sub: 'g-3', email: 'google@etherbay.fr', email_verified: true }));

      const first = await request(app).post('/api/v1/auth/oauth/google').send({ idToken: GOOGLE_TOKEN });
      expect(first.status).toBe(200);
      expect(first.body.data).toMatchObject({ requiresTwoFactor: false, isNewUser: true });
      expect(first.body.data.user).toMatchObject({
        email: 'google@etherbay.fr',
        hasPassword: false,
        ageVerificationStatus: 'NONE',
        pointsBalance: 25,
      });
      const stored = await prismaMock.user.findUnique({ where: { email: 'google@etherbay.fr' } });
      expect(stored.isEmailVerified).toBe(true);
      expect(stored.walletEncryptedKey).toEqual(expect.any(String));

      const second = await request(app).post('/api/v1/auth/oauth/google').send({ idToken: GOOGLE_TOKEN });
      expect(second.status).toBe(200);
      expect(second.body.data.isNewUser).toBe(false);
      expect(second.body.data.user.id).toBe(first.body.data.user.id);
    });

    it('demande la 2FA par application avant de délivrer la session', async () => {
      const user = await prismaMock.user.create({
        data: {
          walletAddress: '0xapple000000000000000000000000000000000001',
          email: 'apple@etherbay.fr',
          isEmailVerified: true,
          isTwoFactorEnabled: true,
          twoFactorMethod: 'APP',
        },
      });
      mockJwtVerify.mockResolvedValue({ payload: { sub: 'a-3', email: 'apple@etherbay.fr', email_verified: true } });
      const res = await request(app)
        .post('/api/v1/auth/oauth/apple')
        .send({ identityToken: APPLE_TOKEN, fullName: 'Jeanne Citoyenne' });
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ requiresTwoFactor: true, twoFactorMethod: 'APP', userId: user.id });
    });

    it('refuse un jeton Apple rejeté', async () => {
      mockJwtVerify.mockRejectedValue(new Error('unexpected "aud" claim value'));
      const res = await request(app).post('/api/v1/auth/oauth/apple').send({ identityToken: APPLE_TOKEN });
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Jeton Apple invalide ou expiré.');
    });
  });
});
