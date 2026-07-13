import request from 'supertest';
import { createApp } from '../src/app';

describe('GET /healthz', () => {
  it('returns 200 and a status payload without touching the database', async () => {
    const app = createApp();
    const res = await request(app).get('/healthz');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('security headers', () => {
  it('applies helmet security headers to responses', async () => {
    const app = createApp();
    const res = await request(app).get('/healthz');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('unknown routes', () => {
  it('returns a JSON 404 with a request id', async () => {
    const app = createApp();
    const res = await request(app).get('/this-route-does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.requestId).toEqual(expect.any(String));
  });
});
