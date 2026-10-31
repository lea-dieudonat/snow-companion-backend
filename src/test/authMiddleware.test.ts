import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '@/app';
import { env } from '@/config/env';

const get = (token?: string) => {
  const r = request(app).get('/api/auth/me');
  return token ? r.set('Authorization', `Bearer ${token}`) : r;
};

describe('middleware authenticate', () => {
  it('refuse un token manquant', async () => {
    const res = await get();
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('refuse un token mal formé', async () => {
    expect((await get('pas-un-jwt')).status).toBe(401);
  });

  it('refuse un token expiré', async () => {
    const token = jwt.sign({ userId: 'u1' }, env.jwtSecret, { algorithm: 'HS256', expiresIn: -10 });
    expect((await get(token)).status).toBe(401);
  });

  it('refuse une mauvaise signature', async () => {
    const token = jwt.sign({ userId: 'u1' }, 'autre-secret-de-test', { algorithm: 'HS256' });
    expect((await get(token)).status).toBe(401);
  });

  it('refuse un autre algorithme que HS256', async () => {
    const token = jwt.sign({ userId: 'u1' }, env.jwtSecret, { algorithm: 'HS512' });
    expect((await get(token)).status).toBe(401);
  });

  it.each([{}, { userId: 123 }, { userId: '' }])('refuse un payload invalide %j', async (p) => {
    const token = jwt.sign(p, env.jwtSecret, { algorithm: 'HS256' });
    const res = await get(token);
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });
});
