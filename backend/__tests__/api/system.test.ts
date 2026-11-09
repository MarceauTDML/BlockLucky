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

describe('System endpoints', () => {
  beforeEach(() => {
    resetPrismaMockStore();
    resetRedisMockStore();
    prismaMock.$queryRaw = jest.fn(async () => [{ ok: 1 }]);
  });

  it('should answer the liveness probe without touching dependencies', async () => {
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
  });

  it('should report readiness from the database state', async () => {
    const ready = await request(app).get('/health/ready');
    expect(ready.status).toBe(200);
    expect(ready.body.database.status).toBe('up');

    prismaMock.$queryRaw = jest.fn(async () => {
      throw new Error('connection refused');
    });
    const notReady = await request(app).get('/health/ready');
    expect(notReady.status).toBe(503);
    expect(notReady.body.database.status).toBe('down');
  });

  it('should propagate a valid incoming request id and generate one otherwise', async () => {
    const propagated = await request(app).get('/health/live').set('X-Request-Id', 'test-request-0001');
    expect(propagated.headers['x-request-id']).toBe('test-request-0001');

    const generated = await request(app).get('/health/live').set('X-Request-Id', 'bad id');
    expect(generated.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('should expose the runtime client configuration', async () => {
    const res = await request(app).get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(
      expect.objectContaining({ apiVersion: 'v1', maintenance: false })
    );
  });

  it('should serve the API under the versioned prefix', async () => {
    const legacy = await request(app).get('/api/lottery/status');
    const versioned = await request(app).get('/api/v1/lottery/status');
    expect(versioned.status).toBe(legacy.status);
    expect(versioned.status).toBe(200);
  });

  it('should expose Prometheus metrics', async () => {
    await request(app).get('/api/lottery/status');
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('http_request_duration_seconds');
  });

  it('should reject malformed JSON with a 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"walletAddress":');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should refuse CORS for unknown origins and allow the web frontend', async () => {
    const allowed = await request(app).get('/health/live').set('Origin', 'http://localhost:3000');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:3000');

    const refused = await request(app).get('/health/live').set('Origin', 'https://evil.example');
    expect(refused.headers['access-control-allow-origin']).toBeUndefined();
  });
});
