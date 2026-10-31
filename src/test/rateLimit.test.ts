import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createRateLimiter } from '@/middlewares/rateLimit';

describe('createRateLimiter', () => {
  it('répond 429 { error } au-delà de la limite', async () => {
    const app = express();
    app.use(createRateLimiter({ windowMs: 60_000, limit: 2, message: 'Trop de requêtes' }));
    app.get('/ping', (_req, res) => {
      res.json({ ok: true });
    });

    expect((await request(app).get('/ping')).status).toBe(200);
    expect((await request(app).get('/ping')).status).toBe(200);
    const res = await request(app).get('/ping');
    expect(res.status).toBe(429);
    expect(res.body).toEqual({ error: 'Trop de requêtes' });
    expect(res.headers['retry-after']).toBeDefined();
  });
});
