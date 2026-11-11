import request from 'supertest';
import { Worker } from 'bullmq';
import app from '../../src/app';
import prisma from '../../src/config/prisma.config';
import redis from '../../src/config/redis.config';
import chainClient from '../../src/blockchain/chain.client';
import lotteryIndexer from '../../src/blockchain/lottery.indexer';
import { runKeeperOnce } from '../../src/blockchain/lottery.keeper';
import { closeChainActionsQueue, startChainActionsWorker } from '../../src/blockchain/chain-actions';
import sessionService from '../../src/services/session.service';

const RUN = Date.now().toString(36);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const login = async (label: string) => {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({
      walletAddress: '0x1234567890123456789012345678901234567890',
      email: `${label}.${RUN}@etherbay.fr`,
      isAdultConfirmed: true,
    });
  expect(res.status).toBe(200);
  return res.body.data as { token: string; user: { id: string; walletAddress: string } };
};

const waitFor = async <T>(probe: () => Promise<T | null>, timeoutMs = 60000): Promise<T> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await probe();
    if (value) return value;
    await wait(500);
  }
  throw new Error('Condition non atteinte dans le délai imparti');
};

describe('Loterie sur une vraie blockchain (nœud Hardhat local, Chainlink VRF simulé)', () => {
  let worker: Worker | null = null;

  beforeAll(async () => {
    await redis.ping();
    worker = startChainActionsWorker();
    await lotteryIndexer.syncOnce();
  });

  afterAll(async () => {
    await worker?.close();
    await closeChainActionsQueue();
    await redis.close();
    await prisma.$disconnect();
    chainClient.destroy();
  });

  it('achète, offre, tire au sort et verse la cagnotte entièrement sur la chaîne', async () => {
    const alice = await login('alice');
    const bob = await login('bob');
    expect(alice.user.walletAddress).not.toBe('0x1234567890123456789012345678901234567890');

    const wallet = await request(app).get('/api/v1/lottery/wallet').set('Authorization', `Bearer ${alice.token}`);
    expect(wallet.status).toBe(200);
    expect(wallet.body.data.mode).toBe('onchain');
    expect(wallet.body.data.balanceEth).toBeGreaterThan(0);

    const statusBefore = await request(app).get('/api/v1/lottery/status');
    const roundId = statusBefore.body.data.round.contractRoundId as number;
    expect(statusBefore.body.data.guarantees.vrfCertified).toBe(true);

    const buyAlice = await request(app)
      .post('/api/v1/lottery/buy')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ quantity: 2 });
    expect(buyAlice.status).toBe(201);
    expect(buyAlice.body.data.transactionHash).toMatch(/^0x[0-9a-f]{64}$/);
    const receipt = await chainClient.provider.getTransactionReceipt(buyAlice.body.data.transactionHash);
    expect(receipt?.status).toBe(1);
    expect(receipt?.from.toLowerCase()).toBe(alice.user.walletAddress);

    const buyBob = await request(app)
      .post('/api/v1/lottery/buy')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ quantity: 1 });
    expect(buyBob.status).toBe(201);

    const gift = await request(app)
      .post('/api/v1/lottery/gift')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ recipientEmail: `alice.${RUN}@etherbay.fr` });
    expect(gift.status).toBe(201);
    expect(gift.body.data.ticket.recipientWallet).toBe(alice.user.walletAddress);

    const lottery = chainClient.lottery();
    expect(Number(await lottery.getFunction('ticketsOf')(roundId, alice.user.walletAddress))).toBe(3);

    const round = await lottery.getFunction('getRound')(roundId);
    await chainClient.provider.send('evm_increaseTime', [Number(round.endTime) - Math.floor(Date.now() / 1000) + 60]);
    await chainClient.provider.send('evm_mine', []);

    expect(await runKeeperOnce()).toBe('draw-requested');

    const completed = await waitFor(async () => {
      await lotteryIndexer.syncOnce();
      const stored = await prisma.lotteryRound.findUnique({ where: { contractRoundId: roundId } });
      return stored?.status === 'COMPLETED' ? stored : null;
    });
    expect([alice.user.walletAddress, bob.user.walletAddress]).toContain(completed.winnerWallet);
    expect(BigInt(completed.prizeWei!)).toBe((BigInt(round.ticketPrice) * 4n * 9n) / 10n);

    const claimed = await waitFor(async () => {
      await lotteryIndexer.syncOnce();
      const stored = await prisma.lotteryRound.findUnique({ where: { contractRoundId: roundId } });
      return stored?.prizeClaimedAt ? stored : null;
    });
    expect(claimed.prizeClaimedAt).toBeInstanceOf(Date);
    expect(Boolean((await lottery.getFunction('getRound')(roundId)).prizeClaimed)).toBe(true);

    const history = await waitFor(async () => {
      const res = await request(app).get('/api/v1/lottery/my-tickets').set('Authorization', `Bearer ${alice.token}`);
      return res.body.data.poapBadges.length > 0 ? res.body.data : null;
    });
    expect(history.poapBadges[0].tokenId).toBeGreaterThan(0);
  });

  it('met réellement le contrat en pause via le disjoncteur de la Mairie', async () => {
    const admin = await prisma.user.create({
      data: { walletAddress: `0xmairie${RUN}`, email: `maire.${RUN}@etherbay.fr`, role: 'ADMIN' },
    });
    const token = sessionService.sign({ userId: admin.id, walletAddress: admin.walletAddress, role: 'ADMIN' });

    const pause = await request(app)
      .post('/api/v1/admin/circuit-breaker')
      .set('Authorization', `Bearer ${token}`)
      .send({ paused: true, reason: 'Test de non-régression' });
    expect(pause.status).toBe(200);
    expect(await chainClient.lottery().getFunction('paused')()).toBe(true);

    const citizen = await login('carol');
    const blocked = await request(app)
      .post('/api/v1/lottery/buy')
      .set('Authorization', `Bearer ${citizen.token}`)
      .send({ quantity: 1 });
    expect(blocked.status).toBe(503);
    expect(blocked.body.errors.circuitBreaker).toBe(true);

    const resume = await request(app)
      .post('/api/v1/admin/circuit-breaker')
      .set('Authorization', `Bearer ${token}`)
      .send({ paused: false, reason: 'Fin du test' });
    expect(resume.status).toBe(200);
    expect(await chainClient.lottery().getFunction('paused')()).toBe(false);
  });
});
