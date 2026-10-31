import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '@/app';

describe('errorHandler et 404', () => {
  it('renvoie 400 JSON pour un JSON invalide', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Corps de requête JSON invalide' });
  });

  it('renvoie 413 pour un corps trop volumineux', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.fr', password: 'x'.repeat(200_000) });
    expect(res.status).toBe(413);
    expect(res.body).toHaveProperty('error');
  });

  it('renvoie 404 JSON pour une route inconnue', async () => {
    const res = await request(app).get('/api/inconnue');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Route introuvable' });
  });

  it('ne fuit pas de détails sur les erreurs inattendues et pose les en-têtes helmet', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('CORS', () => {
  it('autorise l’origine configurée et refuse les autres', async () => {
    const ok = await request(app).get('/api/health').set('Origin', 'http://localhost:3000');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    const ko = await request(app).get('/api/health').set('Origin', 'https://evil.example');
    expect(ko.headers['access-control-allow-origin']).toBeUndefined();
  });
});
