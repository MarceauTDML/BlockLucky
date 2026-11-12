import crypto from 'crypto';

interface InMemoryStore {
  users: Map<string, any>;
  tokens: Map<string, any>;
  lotteryRounds: Map<string, any>;
  tickets: Map<string, any>;
  pointTransactions: Map<string, any>;
  partners: Map<string, any>;
  rewardCatalogs: Map<string, any>;
  claimedRewards: Map<string, any>;
  analytics: Map<string, any>;
  identityDocuments: Map<string, any>;
}

const store: InMemoryStore = {
  users: new Map(),
  tokens: new Map(),
  lotteryRounds: new Map(),
  tickets: new Map(),
  pointTransactions: new Map(),
  partners: new Map(),
  rewardCatalogs: new Map(),
  claimedRewards: new Map(),
  analytics: new Map(),
  identityDocuments: new Map(),
};

export const resetPrismaMockStore = () => {
  store.users.clear();
  store.tokens.clear();
  store.lotteryRounds.clear();
  store.tickets.clear();
  store.pointTransactions.clear();
  store.partners.clear();
  store.rewardCatalogs.clear();
  store.claimedRewards.clear();
  store.analytics.clear();
  store.identityDocuments.clear();
};

export const prismaMockStore = store;

const identityOf = (userId: string) => {
  for (const doc of store.identityDocuments.values()) {
    if (doc.userId === userId) return { ...doc };
  }
  return null;
};

const withIdentityUser = (doc: any) => {
  const user = store.users.get(doc.userId);
  return { ...doc, user: user ? { ...user } : null };
};

export const prismaMock: any = {
  $transaction: jest.fn(async (ops: any) => {
    if (typeof ops === 'function') return ops(prismaMock);
    return Promise.all(ops);
  }),
  user: {
    findUnique: jest.fn(async ({ where, include, select }: any) => {
      let found: any = null;
      if (where.id) found = store.users.get(where.id) ?? null;
      else if (where.walletAddress) {
        for (const u of store.users.values()) {
          if (u.walletAddress === where.walletAddress) {
            found = u;
            break;
          }
        }
      } else if (where.email) {
        for (const u of store.users.values()) {
          if (u.email === where.email) {
            found = u;
            break;
          }
        }
      } else if (where.referralCode) {
        for (const u of store.users.values()) {
          if (u.referralCode === where.referralCode) {
            found = u;
            break;
          }
        }
      }
      if (!found) return null;

      const copy = { ...found };
      if (include || select) {
        const referrals = Array.from(store.users.values()).filter((u) => u.referredById === copy.id);
        const tickets = Array.from(store.tickets.values())
          .filter((t) => t.userId === copy.id)
          .map((t) => ({
            ...t,
            lottery: store.lotteryRounds.get(t.lotteryId),
          }));
        const claimedRewards = Array.from(store.claimedRewards.values())
          .filter((c) => c.userId === copy.id)
          .map((c) => {
            const rc = store.rewardCatalogs.get(c.rewardId);
            return {
              ...c,
              rewardCatalog: rc ? { ...rc, partner: store.partners.get(rc.partnerId) } : null,
            };
          });
        const pointLedger = Array.from(store.pointTransactions.values()).filter(
          (p) => p.userId === copy.id
        );
        const analytics = Array.from(store.analytics.values()).filter((a) => a.userId === copy.id);

        copy.referrals = referrals;
        copy.tickets = tickets;
        copy.claimedRewards = claimedRewards;
        copy.pointLedger = pointLedger;
        copy.analytics = analytics;
        copy.identityDocument = identityOf(copy.id);
        copy._count = {
          tickets: tickets.length,
          claimedRewards: claimedRewards.length,
          referrals: referrals.length,
        };
      }
      return copy;
    }),
    create: jest.fn(async ({ data }: any) => {
      const id = data.id || crypto.randomUUID();
      const now = new Date();
      const record = {
        id,
        walletAddress: data.walletAddress,
        walletEncryptedKey: data.walletEncryptedKey ?? null,
        welcomeGrantTxHash: data.welcomeGrantTxHash ?? null,
        email: data.email ?? null,
        passwordHash: data.passwordHash ?? null,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        role: data.role ?? 'USER',
        isTwoFactorEnabled: data.isTwoFactorEnabled ?? false,
        twoFactorMethod: data.twoFactorMethod ?? null,
        twoFactorSecret: data.twoFactorSecret ?? null,
        isEmailVerified: data.isEmailVerified ?? false,
        ageVerificationStatus: data.ageVerificationStatus ?? 'NONE',
        ageVerifiedAt: data.ageVerifiedAt ?? null,
        ageVerificationNote: data.ageVerificationNote ?? null,
        twoFactorBackupCodes: data.twoFactorBackupCodes ?? [],
        pointsBalance: data.pointsBalance ?? 0,
        referralCode: data.referralCode ?? crypto.randomUUID(),
        referredById: data.referredById ?? null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      store.users.set(id, record);
      return { ...record };
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const existing = store.users.get(where.id);
      if (!existing) throw new Error('User not found');
      const updated = { ...existing, updatedAt: new Date() };
      for (const [k, v] of Object.entries(data)) {
        if (v && typeof v === 'object' && 'increment' in (v as any)) {
          updated[k] = (updated[k] || 0) + (v as any).increment;
        } else if (v && typeof v === 'object' && 'decrement' in (v as any)) {
          updated[k] = (updated[k] || 0) - (v as any).decrement;
        } else {
          updated[k] = v;
        }
      }
      store.users.set(where.id, updated);
      return { ...updated };
    }),
    findMany: jest.fn(async ({ take }: any = {}) => {
      const list = Array.from(store.users.values())
        .filter((u) => !u.deletedAt)
        .map((u) => ({
          ...u,
          _count: {
            referrals: Array.from(store.users.values()).filter((r) => r.referredById === u.id).length,
            tickets: Array.from(store.tickets.values()).filter((t) => t.userId === u.id).length,
          },
        }))
        .sort((a, b) => b.pointsBalance - a.pointsBalance);
      return take ? list.slice(0, take) : list;
    }),
    count: jest.fn(async () => {
      return Array.from(store.users.values()).filter((u) => !u.deletedAt).length;
    }),
    updateMany: jest.fn(async ({ where, data }: any) => {
      const existing = store.users.get(where.id);
      if (!existing) return { count: 0 };
      if (where.deletedAt === null && existing.deletedAt) return { count: 0 };
      if (where.pointsBalance?.gte !== undefined && existing.pointsBalance < where.pointsBalance.gte) return { count: 0 };
      await prismaMock.user.update({ where: { id: where.id }, data });
      return { count: 1 };
    }),
  },
  token: {
    create: jest.fn(async ({ data }: any) => {
      const id = crypto.randomUUID();
      const record = { id, ...data, createdAt: new Date() };
      store.tokens.set(id, record);
      return record;
    }),
    findFirst: jest.fn(async ({ where }: any) => {
      for (const t of store.tokens.values()) {
        if (t.token === where.token && t.type === where.type) {
          return { ...t, user: store.users.get(t.userId) };
        }
      }
      return null;
    }),
    delete: jest.fn(async ({ where }: any) => {
      const t = store.tokens.get(where.id);
      store.tokens.delete(where.id);
      return t;
    }),
  },
  lotteryRound: {
    findFirst: jest.fn(async () => {
      const rounds = Array.from(store.lotteryRounds.values());
      const open = rounds.find((r) => r.status === 'OPEN' || r.status === 'LOCKED') || rounds[0];
      if (!open) return null;
      const ticketsCount = Array.from(store.tickets.values()).filter(
        (t) => t.lotteryId === open.id
      ).length;
      return { ...open, _count: { tickets: ticketsCount } };
    }),
    findUnique: jest.fn(async ({ where }: any) => {
      let found: any = null;
      if (where.id) found = store.lotteryRounds.get(where.id) ?? null;
      else if (where.contractRoundId !== undefined) {
        for (const r of store.lotteryRounds.values()) {
          if (r.contractRoundId === where.contractRoundId) {
            found = r;
            break;
          }
        }
      }
      if (!found) return null;
      const tickets = Array.from(store.tickets.values())
        .filter((t) => t.lotteryId === found.id)
        .map((t) => ({ ...t, user: store.users.get(t.userId) }));
      return {
        ...found,
        tickets,
        _count: { tickets: tickets.length },
      };
    }),
    create: jest.fn(async ({ data }: any) => {
      const id = crypto.randomUUID();
      const record = {
        id,
        contractRoundId: data.contractRoundId ?? 1,
        status: data.status ?? 'OPEN',
        prizePool: data.prizePool ?? 0.0,
        winnerWallet: data.winnerWallet ?? null,
        chainlinkRequestId: data.chainlinkRequestId ?? null,
        winningTicket: data.winningTicket ?? null,
        prizeWei: data.prizeWei ?? null,
        startedAt: data.startedAt ?? new Date(),
        drawnAt: null,
      };
      store.lotteryRounds.set(id, record);
      return { ...record, _count: { tickets: 0 } };
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const existing = store.lotteryRounds.get(where.id);
      if (!existing) throw new Error('Round not found');
      const updated = { ...existing };
      for (const [k, v] of Object.entries(data)) {
        if (v && typeof v === 'object' && 'increment' in (v as any)) {
          updated[k] = Number(((updated[k] || 0) + (v as any).increment).toFixed(6));
        } else {
          updated[k] = v;
        }
      }
      store.lotteryRounds.set(where.id, updated);
      return updated;
    }),
    findMany: jest.fn(async () => Array.from(store.lotteryRounds.values())),
  },
  ticket: {
    findUnique: jest.fn(async ({ where }: any) => {
      for (const t of store.tickets.values()) {
        if (t.id === where.id || t.transactionHash === where.transactionHash) return t;
      }
      return null;
    }),
    findFirst: jest.fn(async ({ where }: any) => {
      for (const t of store.tickets.values()) {
        if (t.transactionHash === where.transactionHash) return t;
      }
      return null;
    }),
    create: jest.fn(async ({ data }: any) => {
      const id = crypto.randomUUID();
      const record = {
        id,
        transactionHash: data.transactionHash,
        blockNumber: data.blockNumber,
        ticketIndex: data.ticketIndex ?? null,
        payerWallet: data.payerWallet ?? null,
        userId: data.userId,
        lotteryId: data.lotteryId,
        purchasedAt: new Date(),
      };
      store.tickets.set(id, record);
      return record;
    }),
    findMany: jest.fn(async ({ where }: any = {}) => {
      let list = Array.from(store.tickets.values());
      if (where?.userId) list = list.filter((t) => t.userId === where.userId);
      return list.map((t) => ({
        ...t,
        lottery: store.lotteryRounds.get(t.lotteryId),
      }));
    }),
    count: jest.fn(async ({ where }: any = {}) => {
      let list = Array.from(store.tickets.values());
      if (where?.userId) list = list.filter((t) => t.userId === where.userId);
      if (where?.lotteryId) list = list.filter((t) => t.lotteryId === where.lotteryId);
      return list.length;
    }),
    groupBy: jest.fn(async ({ where }: any = {}) => {
      const list = Array.from(store.tickets.values()).filter(
        (t) => !where?.lotteryId || t.lotteryId === where.lotteryId
      );
      const uniqueUsers = new Set(list.map((t) => t.userId));
      return Array.from(uniqueUsers).map((userId) => ({ userId }));
    }),
  },
  pointTransaction: {
    create: jest.fn(async ({ data }: any) => {
      const id = crypto.randomUUID();
      const record = {
        id,
        userId: data.userId,
        amount: data.amount,
        actionType: data.actionType,
        description: data.description ?? null,
        createdAt: new Date(),
      };
      store.pointTransactions.set(id, record);
      return record;
    }),
    findMany: jest.fn(async ({ where }: any = {}) => {
      return Array.from(store.pointTransactions.values())
        .filter((p) => !where?.userId || p.userId === where.userId)
        .reverse();
    }),
  },
  partner: {
    create: jest.fn(async ({ data }: any) => {
      const id = crypto.randomUUID();
      const record = {
        id,
        name: data.name,
        logoUrl: data.logoUrl,
        isActive: data.isActive ?? true,
        ownerId: data.ownerId ?? null,
        createdAt: new Date(),
      };
      store.partners.set(id, record);
      return record;
    }),
    findUnique: jest.fn(async ({ where }: any) => {
      const p = store.partners.get(where.id);
      if (!p) return null;
      const rewards = Array.from(store.rewardCatalogs.values())
        .filter((r) => r.partnerId === p.id)
        .map((r) => ({
          ...r,
          claimedRewards: Array.from(store.claimedRewards.values()).filter(
            (c) => c.rewardId === r.id
          ),
        }));
      return { ...p, rewards };
    }),
    findMany: jest.fn(async () => {
      return Array.from(store.partners.values()).map((p) => ({
        ...p,
        rewards: Array.from(store.rewardCatalogs.values())
          .filter((r) => r.partnerId === p.id)
          .map((r) => ({
            ...r,
            _count: {
              claimedRewards: Array.from(store.claimedRewards.values()).filter(
                (c) => c.rewardId === r.id
              ).length,
            },
          })),
      }));
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const existing = store.partners.get(where.id);
      if (!existing) throw new Error('Partner not found');
      const updated = { ...existing, ...data };
      store.partners.set(where.id, updated);
      return updated;
    }),
    count: jest.fn(async () => store.partners.size),
  },
  rewardCatalog: {
    create: jest.fn(async ({ data }: any) => {
      const id = crypto.randomUUID();
      const record = {
        id,
        partnerId: data.partnerId,
        title: data.title,
        costInPoints: data.costInPoints,
        totalStock: data.totalStock,
        remainingStock: data.remainingStock,
        isActive: data.isActive ?? true,
        createdAt: new Date(),
      };
      store.rewardCatalogs.set(id, record);
      return record;
    }),
    findMany: jest.fn(async ({ where }: any = {}) => {
      return Array.from(store.rewardCatalogs.values())
        .filter((r) => where?.isActive === undefined || r.isActive === where.isActive)
        .filter((r) => where?.remainingStock?.gt === undefined || r.remainingStock > where.remainingStock.gt)
        .filter((r) => where?.partner?.isActive === undefined || store.partners.get(r.partnerId)?.isActive === where.partner.isActive)
        .map((r) => ({
          ...r,
          partner: store.partners.get(r.partnerId),
        }));
    }),
    updateMany: jest.fn(async ({ where, data }: any) => {
      const existing = store.rewardCatalogs.get(where.id);
      if (!existing) return { count: 0 };
      if (where.isActive !== undefined && existing.isActive !== where.isActive) return { count: 0 };
      if (where.remainingStock?.gt !== undefined && !(existing.remainingStock > where.remainingStock.gt)) return { count: 0 };
      await prismaMock.rewardCatalog.update({ where: { id: where.id }, data });
      return { count: 1 };
    }),
    findUnique: jest.fn(async ({ where }: any) => {
      const r = store.rewardCatalogs.get(where.id);
      if (!r) return null;
      const claimedCount = Array.from(store.claimedRewards.values()).filter(
        (c) => c.rewardId === r.id
      ).length;
      return {
        ...r,
        partner: store.partners.get(r.partnerId),
        _count: { claimedRewards: claimedCount },
      };
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const existing = store.rewardCatalogs.get(where.id);
      if (!existing) throw new Error('RewardCatalog not found');
      const updated = { ...existing };
      for (const [k, v] of Object.entries(data)) {
        if (v && typeof v === 'object' && 'increment' in (v as any)) {
          updated[k] += (v as any).increment;
        } else if (v && typeof v === 'object' && 'decrement' in (v as any)) {
          updated[k] -= (v as any).decrement;
        } else {
          updated[k] = v;
        }
      }
      store.rewardCatalogs.set(where.id, updated);
      return updated;
    }),
  },
  claimedReward: {
    create: jest.fn(async ({ data }: any) => {
      const id = crypto.randomUUID();
      const record = {
        id,
        userId: data.userId,
        rewardId: data.rewardId,
        uniqueCode: data.uniqueCode,
        isUsed: data.isUsed ?? false,
        claimedAt: new Date(),
      };
      store.claimedRewards.set(id, record);
      const rc = store.rewardCatalogs.get(data.rewardId);
      return {
        ...record,
        rewardCatalog: rc ? { ...rc, partner: store.partners.get(rc.partnerId) } : null,
      };
    }),
    findMany: jest.fn(async ({ where }: any = {}) => {
      return Array.from(store.claimedRewards.values())
        .filter((c) => !where?.userId || c.userId === where.userId)
        .map((c) => {
          const rc = store.rewardCatalogs.get(c.rewardId);
          return {
            ...c,
            rewardCatalog: rc ? { ...rc, partner: store.partners.get(rc.partnerId) } : null,
          };
        });
    }),
    findUnique: jest.fn(async ({ where }: any) => {
      for (const c of store.claimedRewards.values()) {
        if (c.uniqueCode === where.uniqueCode || c.id === where.id) {
          const rc = store.rewardCatalogs.get(c.rewardId);
          return {
            ...c,
            user: store.users.get(c.userId),
            rewardCatalog: rc ? { ...rc, partner: store.partners.get(rc.partnerId) } : null,
          };
        }
      }
      return null;
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const existing = store.claimedRewards.get(where.id);
      const updated = { ...existing, ...data };
      store.claimedRewards.set(where.id, updated);
      return updated;
    }),
    count: jest.fn(async () => store.claimedRewards.size),
  },
  identityDocument: {
    upsert: jest.fn(async ({ where, create, update }: any) => {
      const existing = identityOf(where.userId);
      const record = existing
        ? { ...existing, ...update }
        : { id: crypto.randomUUID(), submittedAt: new Date(), reviewedAt: null, reviewerId: null, ...create };
      store.identityDocuments.set(record.id, record);
      return { ...record };
    }),
    findUnique: jest.fn(async ({ where }: any) => {
      const doc = where.id ? store.identityDocuments.get(where.id) : identityOf(where.userId);
      return doc ? withIdentityUser(doc) : null;
    }),
    findMany: jest.fn(async ({ where, skip = 0, take }: any = {}) => {
      const list = Array.from(store.identityDocuments.values())
        .filter((d) => !where?.status || d.status === where.status)
        .sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime())
        .map(withIdentityUser);
      return list.slice(skip, take === undefined ? undefined : skip + take);
    }),
    count: jest.fn(async ({ where }: any = {}) => {
      return Array.from(store.identityDocuments.values()).filter((d) => !where?.status || d.status === where.status)
        .length;
    }),
    updateMany: jest.fn(async ({ where, data }: any) => {
      let count = 0;
      for (const doc of store.identityDocuments.values()) {
        if (doc.id === where.id && (!where.status || doc.status === where.status)) {
          store.identityDocuments.set(doc.id, { ...doc, ...data });
          count++;
        }
      }
      return { count };
    }),
    deleteMany: jest.fn(async ({ where }: any) => {
      let count = 0;
      for (const doc of Array.from(store.identityDocuments.values())) {
        if (doc.userId === where.userId) {
          store.identityDocuments.delete(doc.id);
          count++;
        }
      }
      return { count };
    }),
  },
  analytics: {
    create: jest.fn(async ({ data }: any) => {
      const id = crypto.randomUUID();
      const record = {
        id,
        userId: data.userId ?? null,
        eventType: data.eventType,
        utmSource: data.utmSource ?? 'direct',
        metadata: data.metadata ?? {},
        timestamp: new Date(),
      };
      store.analytics.set(id, record);
      return record;
    }),
    groupBy: jest.fn(async () => {
      const counts: Record<string, number> = {};
      for (const a of store.analytics.values()) {
        const src = a.utmSource || 'direct';
        counts[src] = (counts[src] || 0) + 1;
      }
      return Object.entries(counts).map(([utmSource, count]) => ({
        utmSource,
        _count: { id: count },
      }));
    }),
    findMany: jest.fn(async ({ where }: any = {}) => {
      let list = Array.from(store.analytics.values());
      if (where?.eventType?.startsWith) {
        list = list.filter((a) => a.eventType.startsWith(where.eventType.startsWith));
      }
      return list
        .map((a) => ({
          ...a,
          user: a.userId ? store.users.get(a.userId) : null,
        }))
        .reverse();
    }),
  },
};

export default prismaMock;
