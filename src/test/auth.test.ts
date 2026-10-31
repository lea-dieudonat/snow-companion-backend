import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '@/app';

describe('POST /api/auth/register', () => {
  it('creates a user and returns a token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'user@snow.com', password: 'password123', name: 'Alice' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('user@snow.com');
    expect(res.body.user.password).toBeUndefined(); // never expose password
  });

  it('returns 409 if email already exists', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'dupe@snow.com', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'dupe@snow.com', password: 'password123' });

    expect(res.status).toBe(409);
  });

  it('returns 400 for invalid input', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: '123' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('returns a token for valid credentials', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'login@snow.com', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@snow.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('returns 401 for wrong password', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'wrong@snow.com', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'wrong@snow.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  it('returns 401 for unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@snow.com', password: 'password123' });

    expect(res.status).toBe(401);
  });
});

describe('validation auth (email, name, password)', () => {
  it('normalise l’email à l’inscription et au login', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email: '  Mixed.Case@Snow.COM ', password: 'password123' });
    expect(reg.status).toBe(201);
    expect(reg.body.user.email).toBe('mixed.case@snow.com');

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'MIXED.case@snow.com', password: 'password123' });
    expect(login.status).toBe(200);
  });

  it('refuse un mot de passe de plus de 72 octets', async () => {
    const tooLongChars = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@snow.com', password: 'a'.repeat(73) });
    expect(tooLongChars.status).toBe(400);

    // 40 caractères mais 80 octets
    const tooManyBytes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'b@snow.com', password: 'é'.repeat(40) });
    expect(tooManyBytes.status).toBe(400);
  });

  it('refuse un nom trop long', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'c@snow.com', password: 'password123', name: 'n'.repeat(61) });
    expect(res.status).toBe(400);
  });
});
