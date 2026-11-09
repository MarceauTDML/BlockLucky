const memoryCache = new Map<string, string>();

export const resetRedisMockStore = () => {
  memoryCache.clear();
};

export const redisMock = {
  getRawClient: jest.fn(() => null),
  get: jest.fn(async (key: string) => memoryCache.get(key) ?? null),
  set: jest.fn(async (key: string, value: string) => {
    memoryCache.set(key, value);
  }),
  setIfAbsent: jest.fn(async (key: string, value: string) => {
    if (memoryCache.has(key)) return false;
    memoryCache.set(key, value);
    return true;
  }),
  del: jest.fn(async (key: string) => {
    memoryCache.delete(key);
  }),
  ping: jest.fn(async () => 'disabled' as const),
  close: jest.fn(async () => undefined),
};

export default redisMock;
