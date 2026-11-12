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

interface SentEmail {
  to: string;
  subject: string;
  template: string;
  variables: Record<string, string>;
  replyTo?: string | undefined;
}

const PASSWORD = 'EtherBay2026secret';
const sentEmails: SentEmail[] = [];
const codesFor = (to: string) =>
  sentEmails.filter((mail) => mail.to === to && mail.template === 'otp-code').map((mail) => mail.variables.CODE!);
const lastCodeFor = (to: string) => {
  const codes = codesFor(to);
  return codes[codes.length - 1]!;
};
const otherCode = (code: string) => (code === '000000' ? '111111' : '000000');

let walletCounter = 0;
const codeAccount = async (email: string) => {
  walletCounter += 1;
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({
      walletAddress: `0x${walletCounter.toString(16).padStart(40, '0')}`,
      email,
      isAdultConfirmed: true,
    });
  expect(res.status).toBe(200);
  return { token: res.body.data.token as string, userId: res.body.data.user.id as string };
};

const passwordAccount = async (email: string, password = PASSWORD) => {
  const signup = await request(app).post('/api/v1/auth/signup').send({ email, password, acceptTerms: true });
  expect(signup.status).toBe(201);
  const verify = await request(app)
    .post('/api/v1/auth/2fa/verify')
    .send({ userId: signup.body.data.userId, code: lastCodeFor(email) });
  expect(verify.status).toBe(200);
  return { token: verify.body.data.token as string, userId: verify.body.data.user.id as string };
};

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('Espace Paramètres', () => {
  beforeAll(() => {
    jest
      .spyOn(emailService, 'sendTemplateEmail')
      .mockImplementation(async (to, subject, template, variables, options) => {
        sentEmails.push({ to, subject, template, variables, replyTo: options?.replyTo });
        return true;
      });
  });

  beforeEach(() => {
    resetPrismaMockStore();
    resetRedisMockStore();
    sentEmails.length = 0;
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('Prénom et nom', () => {
    it('renvoie null tant que les noms ne sont pas renseignés puis les enregistre', async () => {
      const { token } = await codeAccount('noms@etherbay.fr');
      const initial = await request(app).get('/api/v1/user/profile').set(auth(token));
      expect(initial.status).toBe(200);
      expect(initial.body.data.profile).toMatchObject({ firstName: null, lastName: null });

      const update = await request(app)
        .patch('/api/v1/user/profile')
        .set(auth(token))
        .send({ firstName: '  Jean-Éloïse ', lastName: "D'Artagnan de la Tour" });
      expect(update.status).toBe(200);
      expect(update.body.data).toEqual({
        profile: { firstName: 'Jean-Éloïse', lastName: "D'Artagnan de la Tour" },
      });

      const profile = await request(app).get('/api/v1/user/profile').set(auth(token));
      expect(profile.body.data.profile).toMatchObject({
        firstName: 'Jean-Éloïse',
        lastName: "D'Artagnan de la Tour",
      });
    });

    it('efface un champ avec une chaîne vide sans toucher à l’autre', async () => {
      const { token } = await codeAccount('effacer@etherbay.fr');
      await request(app).patch('/api/v1/user/profile').set(auth(token)).send({ firstName: 'Lucie', lastName: 'Martin' });

      const cleared = await request(app).patch('/api/v1/user/profile').set(auth(token)).send({ firstName: '   ' });
      expect(cleared.status).toBe(200);
      expect(cleared.body.data.profile).toEqual({ firstName: null, lastName: 'Martin' });
    });

    it('refuse les noms invalides', async () => {
      const { token } = await codeAccount('invalide@etherbay.fr');
      for (const body of [
        { firstName: 'Jean3' },
        { lastName: 'Dupont<script>' },
        { firstName: '---' },
        { lastName: 'a'.repeat(51) },
        { firstName: 42 },
      ]) {
        const res = await request(app).patch('/api/v1/user/profile').set(auth(token)).send(body);
        expect(res.status).toBe(400);
      }
      const unauthenticated = await request(app).patch('/api/v1/user/profile').send({ firstName: 'Lucie' });
      expect(unauthenticated.status).toBe(401);
    });

    it('inclut les noms dans l’export RGPD', async () => {
      const { token } = await codeAccount('export@etherbay.fr');
      await request(app).patch('/api/v1/user/profile').set(auth(token)).send({ firstName: 'Anne', lastName: 'Leroy' });
      const res = await request(app).get('/api/v1/user/gdpr/export').set(auth(token));
      expect(res.status).toBe(200);
      expect(res.body.data.personalData).toMatchObject({ firstName: 'Anne', lastName: 'Leroy' });
    });
  });

  describe('Préférences de notification', () => {
    it('expose les catégories par défaut et fusionne les mises à jour partielles', async () => {
      const { token } = await codeAccount('prefs@etherbay.fr');
      const initial = await request(app).get('/api/v1/user/profile').set(auth(token));
      expect(initial.body.data.profile.preferences).toEqual({
        theme: 'DARK',
        language: 'FR',
        pushNotificationsEnabled: true,
        notifications: { drawReminders: true, results: true, rewards: true, referrals: true },
      });

      const first = await request(app)
        .put('/api/v1/user/preferences')
        .set(auth(token))
        .send({ notifications: { results: false } });
      expect(first.status).toBe(200);
      expect(first.body.data.preferences.notifications).toEqual({
        drawReminders: true,
        results: false,
        rewards: true,
        referrals: true,
      });

      const second = await request(app)
        .put('/api/v1/user/preferences')
        .set(auth(token))
        .send({ theme: 'LIGHT', notifications: { rewards: false } });
      expect(second.status).toBe(200);
      expect(second.body.data.preferences).toEqual({
        theme: 'LIGHT',
        language: 'FR',
        pushNotificationsEnabled: true,
        notifications: { drawReminders: true, results: false, rewards: false, referrals: true },
      });

      const profile = await request(app).get('/api/v1/user/profile').set(auth(token));
      expect(profile.body.data.profile.preferences.notifications).toEqual({
        drawReminders: true,
        results: false,
        rewards: false,
        referrals: true,
      });
    });

    it('complète des préférences enregistrées avant l’ajout des catégories', async () => {
      const { token, userId } = await codeAccount('anciennes@etherbay.fr');
      await redisMock.set(
        `user:prefs:${userId}`,
        JSON.stringify({ theme: 'SYSTEM', language: 'EN', pushNotificationsEnabled: false })
      );
      const profile = await request(app).get('/api/v1/user/profile').set(auth(token));
      expect(profile.body.data.profile.preferences).toEqual({
        theme: 'SYSTEM',
        language: 'EN',
        pushNotificationsEnabled: false,
        notifications: { drawReminders: true, results: true, rewards: true, referrals: true },
      });
    });

    it('refuse une catégorie qui n’est pas un booléen', async () => {
      const { token } = await codeAccount('prefs-invalides@etherbay.fr');
      const res = await request(app)
        .put('/api/v1/user/preferences')
        .set(auth(token))
        .send({ notifications: { results: 'non' } });
      expect(res.status).toBe(400);
    });

    it('masque les notifications des catégories désactivées', async () => {
      const { token } = await codeAccount('centre@etherbay.fr');
      const all = await request(app).get('/api/v1/user/notifications').set(auth(token));
      expect(all.body.data.notifications).toHaveLength(3);

      await request(app)
        .put('/api/v1/user/preferences')
        .set(auth(token))
        .send({ notifications: { rewards: false } });
      const filtered = await request(app).get('/api/v1/user/notifications').set(auth(token));
      expect(filtered.status).toBe(200);
      expect(filtered.body.data.notifications.map((n: { category: string }) => n.category)).toEqual([
        'drawReminders',
      ]);
    });
  });

  describe('Changement d’adresse email', () => {
    it('envoie un code à la nouvelle adresse puis met à jour l’email et prévient l’ancienne', async () => {
      const { token } = await passwordAccount('ancienne@etherbay.fr');
      const change = await request(app)
        .post('/api/v1/auth/email/change')
        .set(auth(token))
        .send({ newEmail: '  Nouvelle.Adresse@EtherBay.fr ', password: PASSWORD });
      expect(change.status).toBe(200);
      expect(change.body.data.message).toEqual(expect.any(String));
      expect(change.body.data.devOtpPreview).toBeUndefined();
      const code = lastCodeFor('nouvelle.adresse@etherbay.fr');
      expect(code).toMatch(/^\d{6}$/);

      const confirm = await request(app).post('/api/v1/auth/email/confirm').set(auth(token)).send({ code });
      expect(confirm.status).toBe(200);
      expect(confirm.body.data).toEqual({ profile: { email: 'nouvelle.adresse@etherbay.fr' } });

      const alert = sentEmails.find((mail) => mail.template === 'security-alert' && mail.to === 'ancienne@etherbay.fr');
      expect(alert).toBeDefined();

      const replay = await request(app).post('/api/v1/auth/email/confirm').set(auth(token)).send({ code });
      expect(replay.status).toBe(400);

      const signin = await request(app)
        .post('/api/v1/auth/signin')
        .send({ email: 'nouvelle.adresse@etherbay.fr', password: PASSWORD });
      expect(signin.status).toBe(200);
      const stored = await prismaMock.user.findUnique({ where: { email: 'nouvelle.adresse@etherbay.fr' } });
      expect(stored.isEmailVerified).toBe(true);
    });

    it('exige le bon mot de passe quand le compte en possède un', async () => {
      const { token } = await passwordAccount('motdepasse@etherbay.fr');
      for (const body of [
        { newEmail: 'cible@etherbay.fr', password: 'MauvaisSecret42' },
        { newEmail: 'cible@etherbay.fr' },
      ]) {
        const res = await request(app).post('/api/v1/auth/email/change').set(auth(token)).send(body);
        expect(res.status).toBe(401);
        expect(res.body.message).toBe('Mot de passe incorrect.');
      }
      expect(codesFor('cible@etherbay.fr')).toHaveLength(0);
    });

    it('refuse une adresse déjà utilisée par un autre compte', async () => {
      await codeAccount('occupee@etherbay.fr');
      const { token } = await codeAccount('demandeur@etherbay.fr');
      const res = await request(app)
        .post('/api/v1/auth/email/change')
        .set(auth(token))
        .send({ newEmail: 'OCCUPEE@etherbay.fr' });
      expect(res.status).toBe(409);
    });

    it('accepte un compte sans mot de passe et refuse un mauvais code', async () => {
      const { token } = await codeAccount('sansmdp@etherbay.fr');
      const change = await request(app)
        .post('/api/v1/auth/email/change')
        .set(auth(token))
        .send({ newEmail: 'autre@etherbay.fr' });
      expect(change.status).toBe(200);
      const code = lastCodeFor('autre@etherbay.fr');

      const wrong = await request(app)
        .post('/api/v1/auth/email/confirm')
        .set(auth(token))
        .send({ code: otherCode(code) });
      expect(wrong.status).toBe(400);
      expect(wrong.body.message).toBe('Code invalide ou expiré.');

      const malformed = await request(app).post('/api/v1/auth/email/confirm').set(auth(token)).send({ code: '12ab' });
      expect(malformed.status).toBe(400);

      const profile = await request(app).get('/api/v1/user/profile').set(auth(token));
      expect(profile.body.data.profile.email).toBe('sansmdp@etherbay.fr');

      const confirm = await request(app).post('/api/v1/auth/email/confirm').set(auth(token)).send({ code });
      expect(confirm.status).toBe(200);
      expect(confirm.body.data.profile.email).toBe('autre@etherbay.fr');
    });

    it('refuse une confirmation sans demande en cours', async () => {
      const { token } = await codeAccount('aucune@etherbay.fr');
      const res = await request(app).post('/api/v1/auth/email/confirm').set(auth(token)).send({ code: '123456' });
      expect(res.status).toBe(400);
    });
  });

  describe('Changement de mot de passe', () => {
    it('définit un premier mot de passe sur un compte créé par code', async () => {
      const { token } = await codeAccount('premier@etherbay.fr');
      const res = await request(app)
        .post('/api/v1/auth/password/change')
        .set(auth(token))
        .send({ newPassword: 'PremierSecret42' });
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ requiresTwoFactor: false, isNewUser: false });
      expect(res.body.data.token).toEqual(expect.any(String));
      expect(res.body.data.user).toMatchObject({ email: 'premier@etherbay.fr', hasPassword: true });

      const profile = await request(app).get('/api/v1/user/profile').set(auth(res.body.data.token));
      expect(profile.status).toBe(200);

      const signin = await request(app)
        .post('/api/v1/auth/signin')
        .send({ email: 'premier@etherbay.fr', password: 'PremierSecret42' });
      expect(signin.status).toBe(200);
      expect(sentEmails.some((mail) => mail.template === 'security-alert' && mail.to === 'premier@etherbay.fr')).toBe(
        true
      );
    });

    it('exige le mot de passe actuel, révoque les anciennes sessions et en ouvre une nouvelle', async () => {
      const { token: oldToken } = await passwordAccount('change@etherbay.fr');
      await new Promise((resolve) => setTimeout(resolve, 2100));

      for (const body of [
        { currentPassword: 'MauvaisSecret42', newPassword: 'NouveauSecret42' },
        { newPassword: 'NouveauSecret42' },
      ]) {
        const res = await request(app).post('/api/v1/auth/password/change').set(auth(oldToken)).send(body);
        expect(res.status).toBe(401);
        expect(res.body.message).toBe('Mot de passe actuel incorrect.');
      }

      const weak = await request(app)
        .post('/api/v1/auth/password/change')
        .set(auth(oldToken))
        .send({ currentPassword: PASSWORD, newPassword: 'court1' });
      expect(weak.status).toBe(400);

      const ok = await request(app)
        .post('/api/v1/auth/password/change')
        .set(auth(oldToken))
        .send({ currentPassword: PASSWORD, newPassword: 'NouveauSecret42' });
      expect(ok.status).toBe(200);
      const newToken = ok.body.data.token as string;
      expect(ok.body.data.user.hasPassword).toBe(true);

      const revoked = await request(app).get('/api/v1/user/profile').set(auth(oldToken));
      expect(revoked.status).toBe(401);
      const active = await request(app).get('/api/v1/user/profile').set(auth(newToken));
      expect(active.status).toBe(200);

      const oldPassword = await request(app).post('/api/v1/auth/signin').send({ email: 'change@etherbay.fr', password: PASSWORD });
      expect(oldPassword.status).toBe(401);
      const newPassword = await request(app)
        .post('/api/v1/auth/signin')
        .send({ email: 'change@etherbay.fr', password: 'NouveauSecret42' });
      expect(newPassword.status).toBe(200);
    }, 30000);
  });

  describe('Formulaire de support', () => {
    it('transmet le message au support avec l’adresse de réponse du citoyen', async () => {
      const { token, userId } = await codeAccount('aide@etherbay.fr');
      await request(app).patch('/api/v1/user/profile').set(auth(token)).send({ firstName: 'Paul', lastName: 'Durand' });

      const res = await request(app)
        .post('/api/v1/user/support')
        .set(auth(token))
        .send({ subject: 'Ticket introuvable', message: 'Mon ticket <b>acheté</b> hier n’apparaît pas.' });
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ sent: true });

      const mail = sentEmails.find((sent) => sent.template === 'support-request');
      expect(mail).toBeDefined();
      expect(mail!.to).toBe('support@etherbay.fr');
      expect(mail!.replyTo).toBe('aide@etherbay.fr');
      expect(mail!.subject).toContain('Ticket introuvable');
      expect(mail!.variables).toMatchObject({
        USER_ID: userId,
        EMAIL: 'aide@etherbay.fr',
        FIRST_NAME: 'Paul',
        LAST_NAME: 'Durand',
        SUBJECT: 'Ticket introuvable',
      });

      const html = (emailService as any).loadTemplate('support-request', mail!.variables) as string;
      expect(html).toContain('&lt;b&gt;acheté&lt;/b&gt;');
      expect(html).not.toContain('<b>acheté</b>');
    });

    it('valide l’objet et le message', async () => {
      const { token } = await codeAccount('aide-invalide@etherbay.fr');
      for (const body of [
        { subject: 'ab', message: 'Un message assez long.' },
        { subject: 'Objet correct', message: 'court' },
        { subject: 'x'.repeat(121), message: 'Un message assez long.' },
        { subject: 'Objet correct', message: 'y'.repeat(2001) },
        { message: 'Un message assez long.' },
      ]) {
        const res = await request(app).post('/api/v1/user/support').set(auth(token)).send(body);
        expect(res.status).toBe(400);
      }
      expect(sentEmails.some((mail) => mail.template === 'support-request')).toBe(false);

      const unauthenticated = await request(app)
        .post('/api/v1/user/support')
        .send({ subject: 'Objet correct', message: 'Un message assez long.' });
      expect(unauthenticated.status).toBe(401);
    });
  });
});
