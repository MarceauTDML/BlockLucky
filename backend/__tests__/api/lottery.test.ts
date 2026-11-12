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
import { env } from '../../src/config/env.config';

const login = async (email: string, walletAddress: string) => {
  const res = await request(app).post('/api/auth/login').send({ walletAddress, email, isAdultConfirmed: true });
  return res.body.data as { token: string; user: { id: string; walletAddress: string } };
};

describe('Lottery API (/api/lottery)', () => {
  let userToken: string;

  beforeEach(async () => {
    resetPrismaMockStore();
    resetRedisMockStore();
    userToken = (await login('joueur@etherbay.fr', '0x2222333344445555666677778888999900001111')).token;
  });

  it('GET /api/lottery/status should return countdown, FOMO progression towards 10k, and milestones', async () => {
    const res = await request(app).get('/api/lottery/status');
    expect(res.status).toBe(200);
    expect(res.body.data.progression.targetParticipants).toBe(10000);
    expect(res.body.data.progression.milestones.map((m: { target: number }) => m.target)).toEqual([5000, 7500, 9000, 10000]);
    expect(res.body.data.guarantees.autoRefundEnabled).toBe(true);
  });

  it('GET /api/lottery/status expose la phase, la salle d’attente et le nombre de participants', async () => {
    const res = await request(app).get('/api/lottery/status');
    const round = res.body.data.round;
    expect(round.phase).toBe('OPEN');
    expect(new Date(round.waitingRoomOpensAt).getTime()).toBeGreaterThan(Date.now());
    expect(round.revealAt).toBeNull();
    expect(round.participants).toBe(0);
    expect(round.maxParticipants).toBe(10000);
  });

  it('passe en salle d’attente à la fin des achats et refuse alors tout achat', async () => {
    const startedAt = new Date(Date.now() - 49 * 3600 * 1000);
    await prismaMock.lotteryRound.create({ data: { contractRoundId: 1, status: 'OPEN', startedAt } });

    const status = await request(app).get('/api/lottery/status');
    const round = status.body.data.round;
    expect(round.phase).toBe('WAITING_ROOM');
    const expectedReveal = startedAt.getTime() + 48 * 3600 * 1000 + env.DRAW_REVEAL_DELAY_SECONDS * 1000;
    expect(new Date(round.revealAt).getTime()).toBe(expectedReveal);

    const buy = await request(app).post('/api/lottery/buy').set('Authorization', `Bearer ${userToken}`).send({});
    expect(buy.status).toBe(409);
  });

  it('POST /api/lottery/buy achète le ticket unique, crédite 50 EtherPoints et affiche son numéro', async () => {
    const buyRes = await request(app)
      .post('/api/lottery/buy')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});

    expect(buyRes.status).toBe(201);
    expect(buyRes.body.data.tickets).toHaveLength(1);
    expect(buyRes.body.data.tickets[0].ticketNumber).toBe('00001');
    expect(buyRes.body.data.pointsAwarded).toBe(50);
    expect(buyRes.body.data.poapBadge).toBeDefined();
    expect(buyRes.body.data.gaslessSponsored).toBe(true);

    const status = await request(app).get('/api/lottery/status');
    expect(status.body.data.round.participants).toBe(1);
  });

  it('refuse plus d’un ticket par participant et par grand tirage', async () => {
    const severalAtOnce = await request(app)
      .post('/api/lottery/buy')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ quantity: 2 });
    expect(severalAtOnce.status).toBe(400);

    await request(app).post('/api/lottery/buy').set('Authorization', `Bearer ${userToken}`).send({ quantity: 1 });
    const second = await request(app).post('/api/lottery/buy').set('Authorization', `Bearer ${userToken}`).send({});
    expect(second.status).toBe(409);
    expect(second.body.message).toBe('Vous avez déjà votre ticket pour ce grand tirage.');
    expect(second.body.errors).toEqual({ contractError: 'PlayerLimitReached' });
  });

  it('POST /api/lottery/gift should allow gifting a ticket to a friend by email', async () => {
    const giftRes = await request(app)
      .post('/api/lottery/gift')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        recipientEmail: 'ami@etherbay.fr',
        personalMessage: "Bonne chance pour la loterie d'EtherBay !",
      });

    expect(giftRes.status).toBe(201);
    expect(giftRes.body.data.ticket.recipientEmail).toBe('ami@etherbay.fr');
    expect(giftRes.body.data.ticket.ticketNumber).toBe('00001');
    expect(giftRes.body.data.senderPointsAwarded).toBe(75);
  });

  it('refuse d’offrir un ticket à une personne qui a déjà le sien', async () => {
    const friend = await login('amie@etherbay.fr', '0x9999333344445555666677778888999900001111');
    await request(app).post('/api/lottery/buy').set('Authorization', `Bearer ${friend.token}`).send({});

    const gift = await request(app)
      .post('/api/lottery/gift')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ recipientEmail: 'amie@etherbay.fr' });
    expect(gift.status).toBe(409);
    expect(gift.body.message).toBe('Cette personne a déjà son ticket pour ce grand tirage.');
  });

  it('GET /api/lottery/my-tickets expose le numéro du ticket et le résultat du tirage', async () => {
    await request(app).post('/api/lottery/buy').set('Authorization', `Bearer ${userToken}`).send({});
    const before = await request(app).get('/api/lottery/my-tickets').set('Authorization', `Bearer ${userToken}`);
    expect(before.body.data.tickets[0]).toMatchObject({
      ticketNumber: '00001',
      contractRoundId: 1,
      roundStatus: 'OPEN',
      isWinner: false,
      winningTicketNumber: null,
    });
    expect(typeof before.body.data.tickets[0].prizeEth).toBe('number');

    const admin = await prismaMock.user.create({
      data: { walletAddress: '0xadmin00000000000000000000000000000000001', email: 'maire@etherbay.fr', role: 'ADMIN' },
    });
    const sessionService = (await import('../../src/services/session.service')).default;
    const adminToken = sessionService.sign({ userId: admin.id, walletAddress: admin.walletAddress, role: 'ADMIN' });
    const draw = await request(app).post('/api/lottery/draw').set('Authorization', `Bearer ${adminToken}`).send({});
    expect(draw.status).toBe(200);

    const after = await request(app).get('/api/lottery/my-tickets').set('Authorization', `Bearer ${userToken}`);
    expect(after.body.data.tickets[0]).toMatchObject({
      roundStatus: 'COMPLETED',
      isWinner: true,
      winningTicketNumber: '00001',
    });
  });

  describe('contrôle de l’âge', () => {
    beforeEach(() => {
      env.AGE_VERIFICATION_REQUIRED = true;
    });

    afterEach(() => {
      env.AGE_VERIFICATION_REQUIRED = false;
    });

    it('refuse l’achat, le cadeau et l’échange de récompense tant que l’âge n’est pas vérifié', async () => {
      for (const [path, body] of [
        ['/api/lottery/buy', {}],
        ['/api/lottery/gift', { recipientEmail: 'ami@etherbay.fr' }],
        ['/api/marketplace/claim', { rewardId: '00000000-0000-4000-8000-000000000000' }],
      ] as const) {
        const res = await request(app).post(path).set('Authorization', `Bearer ${userToken}`).send(body);
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Vérifiez votre âge pour jouer.');
        expect(res.body.errors).toEqual({ code: 'AGE_VERIFICATION_REQUIRED', status: 'NONE' });
      }
    });

    it('autorise l’achat une fois l’âge vérifié', async () => {
      const user = await prismaMock.user.findUnique({ where: { email: 'joueur@etherbay.fr' } });
      await prismaMock.user.update({ where: { id: user.id }, data: { ageVerificationStatus: 'VERIFIED' } });
      const res = await request(app).post('/api/lottery/buy').set('Authorization', `Bearer ${userToken}`).send({});
      expect(res.status).toBe(201);
    });
  });

  it('GET /api/lottery/poap/:roundId.json should expose ERC-721 metadata pointing to the badge image', async () => {
    const res = await request(app).get('/api/v1/lottery/poap/3.json');
    expect(res.status).toBe(200);
    expect(res.body.name).toContain('3');
    expect(res.body.image).toMatch(/\/api\/v1\/lottery\/poap\/3\.svg$/);
    const image = await request(app).get('/api/v1/lottery/poap/3.svg');
    expect(image.status).toBe(200);
    expect(image.headers['content-type']).toContain('image/svg+xml');
    expect((await request(app).get('/api/v1/lottery/poap/0.json')).status).toBe(404);
    expect((await request(app).get('/api/v1/lottery/poap/abc')).status).toBe(404);
  });
});
