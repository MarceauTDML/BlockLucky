import redisMock, { resetRedisMockStore } from '../__mocks__/redis.mock';

const mockContract = {
  paused: jest.fn(async () => false),
  isDrawReady: jest.fn(async () => true),
  isExpiredWithoutDraw: jest.fn(async () => false),
  currentRoundId: jest.fn(async () => 7n),
  getRound: jest.fn(async () => ({ endTime: BigInt(Math.floor(Date.now() / 1000) - 5) })),
  requestDraw: jest.fn(async () => ({ hash: '0xdraw', wait: async () => null })),
  closeExpiredRound: jest.fn(async () => ({ hash: '0xclose', wait: async () => null })),
};

const mockProvider = {
  getBlock: jest.fn(async () => ({ timestamp: Math.floor(Date.now() / 1000) })),
  send: jest.fn(async () => null),
};

jest.mock('../../src/config/redis.config', () => ({
  __esModule: true,
  redis: redisMock,
  default: redisMock,
}));

jest.mock('../../src/blockchain/chain.client', () => ({
  __esModule: true,
  default: {
    isOnchain: true,
    isUsingFallback: false,
    operator: {},
    provider: mockProvider,
    lottery: () => ({ getFunction: (name: keyof typeof mockContract) => mockContract[name] }),
  },
}));

jest.mock('../../src/blockchain/lottery.indexer', () => ({
  __esModule: true,
  default: { processReceipt: jest.fn(), syncOnce: jest.fn() },
}));

import { env } from '../../src/config/env.config';
import { runKeeperOnce, syncLocalChainClock } from '../../src/blockchain/lottery.keeper';

describe('Keeper du tirage : salle d’attente', () => {
  const initialDelay = env.DRAW_REVEAL_DELAY_SECONDS;

  beforeEach(() => {
    resetRedisMockStore();
    jest.clearAllMocks();
  });

  afterAll(() => {
    env.DRAW_REVEAL_DELAY_SECONDS = initialDelay;
  });

  it('attend DRAW_REVEAL_DELAY_SECONDS après le passage à l’état prêt avant de demander le tirage', async () => {
    env.DRAW_REVEAL_DELAY_SECONDS = 600;
    expect(await runKeeperOnce()).toBe('waiting-room');
    expect(mockContract.requestDraw).not.toHaveBeenCalled();

    const readyAt = Number(await redisMock.get('chain:draw-ready-at:7'));
    expect(readyAt).toBeLessThanOrEqual(Date.now());

    expect(await runKeeperOnce()).toBe('waiting-room');
    expect(Number(await redisMock.get('chain:draw-ready-at:7'))).toBe(readyAt);

    await redisMock.set('chain:draw-ready-at:7', String(Date.now() - 601 * 1000));
    expect(await runKeeperOnce()).toBe('draw-requested');
    expect(mockContract.requestDraw).toHaveBeenCalledTimes(1);
  });

  it('demande le tirage immédiatement quand le délai vaut 0', async () => {
    env.DRAW_REVEAL_DELAY_SECONDS = 0;
    expect(await runKeeperOnce()).toBe('draw-requested');
  });

  it('clôt un tour expiré sans assez de participants sans attendre', async () => {
    mockContract.isDrawReady.mockResolvedValueOnce(false);
    mockContract.isExpiredWithoutDraw.mockResolvedValueOnce(true);
    expect(await runKeeperOnce()).toBe('round-closed');
  });

  it('mine un bloc quand l’horloge de la blockchain locale est en retard', async () => {
    mockProvider.getBlock.mockResolvedValueOnce({ timestamp: Math.floor(Date.now() / 1000) - 600 });
    expect(await syncLocalChainClock()).toBe(true);
    expect(mockProvider.send).toHaveBeenCalledWith('evm_mine', []);
  });

  it('avance aussi l’horloge de la blockchain locale quand le serveur tourne en production', async () => {
    const initialNodeEnv = env.NODE_ENV;
    env.NODE_ENV = 'production';
    try {
      mockProvider.getBlock.mockResolvedValueOnce({ timestamp: Math.floor(Date.now() / 1000) - 600 });
      expect(await syncLocalChainClock()).toBe(true);
      expect(mockProvider.send).toHaveBeenCalledWith('evm_mine', []);
    } finally {
      env.NODE_ENV = initialNodeEnv;
    }
  });

  it('ne mine rien quand l’horloge de la blockchain locale est à jour', async () => {
    expect(await syncLocalChainClock()).toBe(false);
    expect(mockProvider.send).not.toHaveBeenCalled();
  });
});
