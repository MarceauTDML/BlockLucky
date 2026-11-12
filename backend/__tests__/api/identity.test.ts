import crypto from 'crypto';
import request from 'supertest';
import prismaMock, { prismaMockStore, resetPrismaMockStore } from '../__mocks__/prisma.mock';
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
import sessionService from '../../src/services/session.service';
import logger from '../../src/utils/logger.util';

const fakeJpeg = (size = 4096) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), crypto.randomBytes(size)]);
const fakePng = (size = 4096) =>
  Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), crypto.randomBytes(size)]);

const FRONT = fakeJpeg();
const BACK = fakePng();
const identityBody = () => ({
  front: `data:image/jpeg;base64,${FRONT.toString('base64')}`,
  back: BACK.toString('base64'),
});

describe("Vérification d'identité (âge)", () => {
  let citizenToken: string;
  let citizenId: string;
  let adminToken: string;
  let adminId: string;
  const sentTemplates: Array<{ to: string; template: string; variables: Record<string, string> }> = [];

  beforeAll(() => {
    jest.spyOn(emailService, 'sendTemplateEmail').mockImplementation(async (to, _subject, template, variables) => {
      sentTemplates.push({ to, template, variables });
      return true;
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    resetPrismaMockStore();
    resetRedisMockStore();
    sentTemplates.length = 0;

    const citizen = await prismaMock.user.create({
      data: { walletAddress: '0xcitizen000000000000000000000000000000001', email: 'citoyen@etherbay.fr' },
    });
    citizenId = citizen.id;
    citizenToken = sessionService.sign({ userId: citizen.id, walletAddress: citizen.walletAddress, role: 'USER' });

    const admin = await prismaMock.user.create({
      data: { walletAddress: '0xadmin00000000000000000000000000000000001', email: 'maire@etherbay.fr', role: 'ADMIN' },
    });
    adminId = admin.id;
    adminToken = sessionService.sign({ userId: admin.id, walletAddress: admin.walletAddress, role: 'ADMIN' });
  });

  const submit = (body: Record<string, unknown> = identityBody(), token = citizenToken) =>
    request(app).post('/api/v1/user/identity').set('Authorization', `Bearer ${token}`).send(body);

  const pendingId = async () => {
    const list = await request(app)
      .get('/api/v1/admin/identity-verifications?status=PENDING')
      .set('Authorization', `Bearer ${adminToken}`);
    return list.body.data.verifications[0].id as string;
  };

  it('accepte le recto et le verso, les chiffre au repos et passe le statut à PENDING', async () => {
    const logSpy = jest.spyOn(logger, 'log');
    const res = await submit();
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.submittedAt).toEqual(expect.any(String));

    const [stored] = Array.from(prismaMockStore.identityDocuments.values());
    expect(stored.mimeType).toBe('image/jpeg');
    expect(Buffer.from(stored.frontEncrypted).includes(FRONT.subarray(0, 64))).toBe(false);
    expect(Buffer.from(stored.backEncrypted).equals(BACK)).toBe(false);
    const logged = JSON.stringify(logSpy.mock.calls);
    expect(logged).not.toContain(FRONT.toString('base64').slice(0, 40));
    logSpy.mockRestore();

    const status = await request(app).get('/api/v1/user/identity').set('Authorization', `Bearer ${citizenToken}`);
    expect(status.status).toBe(200);
    expect(status.body.data).toMatchObject({ status: 'PENDING', reviewedAt: null, note: null });
    expect(status.body.data.front).toBeUndefined();
  });

  it('accepte un corps de plus de 1 Mo sur cette route seulement', async () => {
    const big = fakeJpeg(3 * 1024 * 1024);
    const res = await submit({ front: big.toString('base64'), back: BACK.toString('base64') });
    expect(res.status).toBe(201);

    const elsewhere = await request(app)
      .put('/api/v1/user/preferences')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ theme: 'DARK', padding: 'x'.repeat(1100 * 1024) });
    expect(elsewhere.status).toBe(413);
  });

  it('refuse une image trop lourde, un format inconnu ou une face manquante', async () => {
    const tooBig = fakeJpeg(4 * 1024 * 1024 + 10);
    expect((await submit({ front: tooBig.toString('base64'), back: BACK.toString('base64') })).status).toBe(413);
    const gif = Buffer.concat([Buffer.from('GIF89a'), crypto.randomBytes(4096)]);
    expect((await submit({ front: gif.toString('base64'), back: BACK.toString('base64') })).status).toBe(400);
    expect((await submit({ front: FRONT.toString('base64') })).status).toBe(400);
    expect((await submit({ front: 'pas-du-base64 !!', back: BACK.toString('base64') })).status).toBe(400);
  });

  it('exige une session pour envoyer une pièce', async () => {
    const res = await request(app).post('/api/v1/user/identity').send(identityBody());
    expect(res.status).toBe(401);
  });

  it('permet à la Mairie de consulter puis d’approuver, efface les images et prévient le citoyen', async () => {
    await submit();
    const list = await request(app)
      .get('/api/v1/admin/identity-verifications')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.verifications).toHaveLength(1);
    expect(list.body.data.verifications[0]).toEqual({
      id: expect.any(String),
      userId: citizenId,
      email: 'citoyen@etherbay.fr',
      submittedAt: expect.any(String),
      status: 'PENDING',
    });
    expect(list.body.meta.total).toBe(1);
    const id = list.body.data.verifications[0].id;

    const detail = await request(app)
      .get(`/api/v1/admin/identity-verifications/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(detail.status).toBe(200);
    expect(detail.headers['cache-control']).toBe('no-store');
    expect(detail.body.data.verification.front).toBe(`data:image/jpeg;base64,${FRONT.toString('base64')}`);
    expect(detail.body.data.verification.back).toBe(`data:image/png;base64,${BACK.toString('base64')}`);

    const decision = await request(app)
      .post(`/api/v1/admin/identity-verifications/${id}/decision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ approved: true });
    expect(decision.status).toBe(200);
    expect(decision.body.data.decision.status).toBe('VERIFIED');

    const stored = prismaMockStore.identityDocuments.get(id);
    expect(stored.frontEncrypted).toBeNull();
    expect(stored.backEncrypted).toBeNull();
    expect(stored.reviewerId).toBe(adminId);
    const citizen = prismaMockStore.users.get(citizenId);
    expect(citizen.ageVerificationStatus).toBe('VERIFIED');
    expect(citizen.ageVerifiedAt).toBeInstanceOf(Date);

    expect(sentTemplates.find((m) => m.template === 'identity-decision')?.to).toBe('citoyen@etherbay.fr');

    const after = await request(app)
      .get(`/api/v1/admin/identity-verifications/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(after.body.data.verification.front).toBeNull();
    expect(after.body.data.verification.back).toBeNull();

    const again = await request(app)
      .post(`/api/v1/admin/identity-verifications/${id}/decision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ approved: false, note: 'Photo illisible' });
    expect(again.status).toBe(409);

    const logs = await request(app).get('/api/v1/admin/audit-logs').set('Authorization', `Bearer ${adminToken}`);
    const actions = logs.body.data.logs.map((l: { action: string }) => l.action);
    expect(actions).toEqual(expect.arrayContaining(['IDENTITY_DOCUMENT_VIEWED', 'IDENTITY_VERIFICATION_DECISION']));

    const resubmit = await submit();
    expect(resubmit.status).toBe(409);

    const profile = await request(app).get('/api/v1/user/profile').set('Authorization', `Bearer ${citizenToken}`);
    expect(profile.body.data.profile.ageVerificationStatus).toBe('VERIFIED');
  });

  it('exige un motif pour refuser, puis permet un nouvel envoi', async () => {
    await submit();
    const id = await pendingId();

    const noNote = await request(app)
      .post(`/api/v1/admin/identity-verifications/${id}/decision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ approved: false });
    expect(noNote.status).toBe(400);

    const refused = await request(app)
      .post(`/api/v1/admin/identity-verifications/${id}/decision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ approved: false, note: 'Pièce expirée' });
    expect(refused.status).toBe(200);
    expect(refused.body.data.decision.status).toBe('REJECTED');

    const status = await request(app).get('/api/v1/user/identity').set('Authorization', `Bearer ${citizenToken}`);
    expect(status.body.data).toMatchObject({ status: 'REJECTED', note: 'Pièce expirée' });
    expect(status.body.data.reviewedAt).toEqual(expect.any(String));

    const resubmit = await submit();
    expect(resubmit.status).toBe(201);
    expect(prismaMockStore.users.get(citizenId).ageVerificationNote).toBeNull();
  });

  it('réserve les routes de décision aux administrateurs et interdit de statuer sur sa propre pièce', async () => {
    await submit();
    const id = await pendingId();
    const asCitizen = await request(app)
      .get(`/api/v1/admin/identity-verifications/${id}`)
      .set('Authorization', `Bearer ${citizenToken}`);
    expect(asCitizen.status).toBe(403);

    await submit(identityBody(), adminToken);
    const list = await request(app)
      .get('/api/v1/admin/identity-verifications')
      .set('Authorization', `Bearer ${adminToken}`);
    const own = list.body.data.verifications.find((v: { userId: string }) => v.userId === adminId);
    const selfReview = await request(app)
      .post(`/api/v1/admin/identity-verifications/${own.id}/decision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ approved: true });
    expect(selfReview.status).toBe(403);
  });
});
