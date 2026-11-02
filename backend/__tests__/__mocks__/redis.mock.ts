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
  del: jest.fn(async (key: string) => {
    memoryCache.delete(key);
  }),
};

export default redisMock;
