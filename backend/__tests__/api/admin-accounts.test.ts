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
import sessionService from '../../src/services/session.service';

const matchesUserWhere = (user: any, where: any = {}) => {
  if (where.deletedAt === null && user.deletedAt) return false;
  if (typeof where.role === 'string' && user.role !== where.role) return false;
  if (where.role?.in && !where.role.in.includes(user.role)) return false;
  if (where.OR) {
    return where.OR.some((clause: any) => {
      const [field, condition] = Object.entries(clause)[0] as [string, any];
      const value = String(user[field] ?? '').toLowerCase();
      return value.includes(String(condition.contains).toLowerCase());
    });
  }
  return true;
};

const ownedPartnersOf = (userId: string) =>
  Array.from(prismaMockStore.partners.values())
    .filter((partner) => partner.ownerId === userId)
    .map((partner) => ({ id: partner.id, name: partner.name, isActive: partner.isActive }));

const originalFindUnique = prismaMock.user.findUnique.getMockImplementation();
const originalFindMany = prismaMock.user.findMany.getMockImplementation();
const originalCount = prismaMock.user.count.getMockImplementation();

describe('Comptes Mairie et partenaires (/api/admin/accounts)', () => {
  let adminId: string;
  let adminToken: string;

  beforeAll(() => {
    prismaMock.user.findUnique.mockImplementation(async (args: any) => {
      const found = await originalFindUnique(args);
      if (!found || !args.select?.ownedPartners) return found;
      return { ...found, ownedPartners: ownedPartnersOf(found.id) };
    });
    prismaMock.user.findMany.mockImplementation(async (args: any = {}) => {
      if (!args.select?.ownedPartners) return originalFindMany(args);
      const skip = args.skip ?? 0;
      return Array.from(prismaMockStore.users.values())
        .filter((user) => matchesUserWhere(user, args.where))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(skip, args.take === undefined ? undefined : skip + args.take)
        .map((user) => ({ ...user, ownedPartners: ownedPartnersOf(user.id) }));
    });
    prismaMock.user.count.mockImplementation(async (args: any = {}) => {
      if (!args.where?.role) return originalCount(args);
      return Array.from(prismaMockStore.users.values()).filter((user) => matchesUserWhere(user, args.where)).length;
    });
    prismaMock.partner.updateMany = jest.fn(async ({ where, data }: any) => {
      let count = 0;
      for (const partner of prismaMockStore.partners.values()) {
        if (partner.ownerId === where.ownerId) {
          prismaMockStore.partners.set(partner.id, { ...partner, ...data });
          count++;
        }
      }
      return { count };
    });
  });

  afterAll(() => {
    prismaMock.user.findUnique.mockImplementation(originalFindUnique);
    prismaMock.user.findMany.mockImplementation(originalFindMany);
    prismaMock.user.count.mockImplementation(originalCount);
  });

  beforeEach(async () => {
    resetPrismaMockStore();
    resetRedisMockStore();

    const admin = await prismaMock.user.create({
      data: {
        walletAddress: '0xadmin9999999999999999999999999999999999',
        email: 'maire@etherbay.fr',
        firstName: 'Claire',
        lastName: 'Martin',
        role: 'ADMIN',
        isTwoFactorEnabled: true,
      },
    });
    adminId = admin.id;
    adminToken = sessionService.sign({ userId: admin.id, walletAddress: admin.walletAddress, role: 'ADMIN' });
  });

  const auth = () => ({ Authorization: `Bearer ${adminToken}` });

  const auditActions = () =>
    Array.from(prismaMockStore.analytics.values())
      .map((entry) => entry.eventType)
      .filter((eventType) => eventType.startsWith('ADMIN_AUDIT:'));

  it('liste les comptes Mairie et partenaires avec filtre de rôle et recherche', async () => {
    const partnerUser = await prismaMock.user.create({
      data: { walletAddress: '0xpartner', email: 'boulangerie@etherbay.fr', firstName: 'Paul', role: 'PARTNER' },
    });
    await prismaMock.user.create({ data: { walletAddress: '0xcitizen', email: 'habitant@etherbay.fr', role: 'USER' } });
    await prismaMock.partner.create({ data: { name: 'Boulangerie du Port', logoUrl: 'https://x.fr/l.png', ownerId: partnerUser.id } });

    const all = await request(app).get('/api/admin/accounts').set(auth());
    expect(all.status).toBe(200);
    expect(all.body.data.accounts).toHaveLength(2);
    expect(all.body.meta.total).toBe(2);

    const partners = await request(app).get('/api/admin/accounts?role=PARTNER').set(auth());
    expect(partners.status).toBe(200);
    expect(partners.body.data.accounts).toHaveLength(1);
    expect(partners.body.data.accounts[0]).toMatchObject({
      email: 'boulangerie@etherbay.fr',
      role: 'PARTNER',
      isTwoFactorEnabled: false,
      partners: [{ name: 'Boulangerie du Port', isActive: true }],
    });

    const search = await request(app).get('/api/admin/accounts?search=claire').set(auth());
    expect(search.body.data.accounts).toHaveLength(1);
    expect(search.body.data.accounts[0].email).toBe('maire@etherbay.fr');

    const invalid = await request(app).get('/api/admin/accounts?role=USER').set(auth());
    expect(invalid.status).toBe(400);
  });

  it('refuse la liste à un compte non Mairie', async () => {
    const citizen = await prismaMock.user.create({ data: { walletAddress: '0xcitizen', email: 'habitant@etherbay.fr' } });
    const token = sessionService.sign({ userId: citizen.id, walletAddress: citizen.walletAddress, role: 'USER' });
    const res = await request(app).get('/api/admin/accounts').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("crée un nouveau compte partenaire rattaché à un établissement et trace l'action", async () => {
    const partner = await prismaMock.partner.create({ data: { name: 'Café de la Mairie', logoUrl: 'https://x.fr/c.png' } });

    const res = await request(app).post('/api/admin/accounts').set(auth()).send({
      email: '  Gerant@Cafe.FR ',
      role: 'PARTNER',
      firstName: 'Lina',
      lastName: 'Durand',
      partnerId: partner.id,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.created).toBe(true);
    expect(res.body.data.account).toMatchObject({
      email: 'gerant@cafe.fr',
      role: 'PARTNER',
      firstName: 'Lina',
      lastName: 'Durand',
      partners: [{ id: partner.id, name: 'Café de la Mairie' }],
    });

    const stored = Array.from(prismaMockStore.users.values()).find((user) => user.email === 'gerant@cafe.fr');
    expect(stored.walletEncryptedKey).toBeTruthy();
    expect(stored.isEmailVerified).toBe(false);
    expect(prismaMockStore.partners.get(partner.id).ownerId).toBe(stored.id);
    expect(auditActions()).toContain('ADMIN_AUDIT:STAFF_ACCOUNT_CREATED');
  });

  it('promeut un compte existant et refuse un rôle déjà attribué', async () => {
    const citizen = await prismaMock.user.create({
      data: { walletAddress: '0xcitizen', email: 'agent@etherbay.fr', firstName: 'Hugo', isEmailVerified: true },
    });

    const res = await request(app)
      .post('/api/admin/accounts')
      .set(auth())
      .send({ email: 'agent@etherbay.fr', role: 'ADMIN', firstName: 'Autre', lastName: 'Bernard' });
    expect(res.status).toBe(200);
    expect(res.body.data.created).toBe(false);
    expect(res.body.data.account).toMatchObject({ id: citizen.id, role: 'ADMIN', firstName: 'Hugo', lastName: 'Bernard' });
    expect(prismaMockStore.users.size).toBe(2);
    expect(auditActions()).toContain('ADMIN_AUDIT:STAFF_ROLE_CHANGED');

    const again = await request(app).post('/api/admin/accounts').set(auth()).send({ email: 'agent@etherbay.fr', role: 'ADMIN' });
    expect(again.status).toBe(409);
  });

  it('refuse de modifier son propre rôle', async () => {
    const viaCreate = await request(app).post('/api/admin/accounts').set(auth()).send({ email: 'maire@etherbay.fr', role: 'PARTNER' });
    expect(viaCreate.status).toBe(403);

    const viaPatch = await request(app).patch(`/api/admin/accounts/${adminId}/role`).set(auth()).send({ role: 'USER' });
    expect(viaPatch.status).toBe(403);
    expect(prismaMockStore.users.get(adminId).role).toBe('ADMIN');
  });

  it('retire le rôle partenaire, détache les établissements et protège le dernier compte Mairie', async () => {
    const partnerUser = await prismaMock.user.create({ data: { walletAddress: '0xpartner', email: 'shop@etherbay.fr', role: 'PARTNER' } });
    const partner = await prismaMock.partner.create({ data: { name: 'Librairie', logoUrl: 'https://x.fr/b.png', ownerId: partnerUser.id } });

    const revoke = await request(app).patch(`/api/admin/accounts/${partnerUser.id}/role`).set(auth()).send({ role: 'USER' });
    expect(revoke.status).toBe(200);
    expect(revoke.body.data.account).toMatchObject({ role: 'USER', partners: [] });
    expect(prismaMockStore.partners.get(partner.id).ownerId).toBeNull();
    expect(auditActions()).toContain('ADMIN_AUDIT:STAFF_ROLE_REVOKED');

    const otherAdmin = await prismaMock.user.create({ data: { walletAddress: '0xadmin2', email: 'adjoint@etherbay.fr', role: 'ADMIN' } });
    prismaMock.user.count.mockResolvedValueOnce(1);
    const lastAdmin = await request(app).patch(`/api/admin/accounts/${otherAdmin.id}/role`).set(auth()).send({ role: 'USER' });
    expect(lastAdmin.status).toBe(409);
    expect(prismaMockStore.users.get(otherAdmin.id).role).toBe('ADMIN');

    const demote = await request(app).patch(`/api/admin/accounts/${otherAdmin.id}/role`).set(auth()).send({ role: 'PARTNER' });
    expect(demote.status).toBe(200);
    expect(demote.body.data.account.role).toBe('PARTNER');
  });

  it('valide les données envoyées', async () => {
    const badEmail = await request(app).post('/api/admin/accounts').set(auth()).send({ email: 'pas-un-email', role: 'ADMIN' });
    expect(badEmail.status).toBe(400);

    const badRole = await request(app).post('/api/admin/accounts').set(auth()).send({ email: 'x@etherbay.fr', role: 'USER' });
    expect(badRole.status).toBe(400);

    const adminWithPartner = await request(app)
      .post('/api/admin/accounts')
      .set(auth())
      .send({ email: 'x@etherbay.fr', role: 'ADMIN', partnerId: '0f8fad5b-d9cb-469f-a165-70867728950e' });
    expect(adminWithPartner.status).toBe(400);

    const missingPartner = await request(app)
      .post('/api/admin/accounts')
      .set(auth())
      .send({ email: 'x@etherbay.fr', role: 'PARTNER', partnerId: '0f8fad5b-d9cb-469f-a165-70867728950e' });
    expect(missingPartner.status).toBe(404);

    const badId = await request(app).patch('/api/admin/accounts/abc/role').set(auth()).send({ role: 'USER' });
    expect(badId.status).toBe(400);

    const badPatchRole = await request(app)
      .patch('/api/admin/accounts/0f8fad5b-d9cb-469f-a165-70867728950e/role')
      .set(auth())
      .send({ role: 'ROOT' });
    expect(badPatchRole.status).toBe(400);

    const unknown = await request(app)
      .patch('/api/admin/accounts/0f8fad5b-d9cb-469f-a165-70867728950e/role')
      .set(auth())
      .send({ role: 'USER' });
    expect(unknown.status).toBe(404);
  });
});
