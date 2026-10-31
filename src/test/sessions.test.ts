import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '@/app';
import { createTestUser } from './helpers';

describe('GET /api/sessions', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/sessions');
    expect(res.status).toBe(401);
  });

  it('returns an empty list for a new user', async () => {
    const { token } = await createTestUser();
    const res = await request(app).get('/api/sessions').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('POST /api/sessions', () => {
  it('creates a session and returns it', async () => {
    const { token } = await createTestUser();
    const res = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-01-15T10:00:00Z', station: 'Val Thorens', rating: 5 });

    expect(res.status).toBe(201);
    expect(res.body.session.station).toBe('Val Thorens');
    expect(res.body.session.rating).toBe(5);
  });

  it('returns 400 for missing required fields', async () => {
    const { token } = await createTestUser();
    const res = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 5 }); // missing date and station

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/sessions/:id', () => {
  it('deletes own session', async () => {
    const { token } = await createTestUser();

    const created = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-01-15T10:00:00Z', station: 'Tignes' });

    const id = created.body.session.id;

    const res = await request(app)
      .delete(`/api/sessions/${id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it("cannot delete another user's session", async () => {
    const { token: token1 } = await createTestUser('user1@snow.com');
    const { token: token2 } = await createTestUser('user2@snow.com');

    const created = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${token1}`)
      .send({ date: '2026-01-15T10:00:00Z', station: 'Tignes' });

    const id = created.body.session.id;

    const res = await request(app)
      .delete(`/api/sessions/${id}`)
      .set('Authorization', `Bearer ${token2}`);

    expect(res.status).toBe(404);
  });
});

describe('Lien session ↔ station (stationId)', () => {
  const post = (token: string, body: object) =>
    request(app).post('/api/sessions').set('Authorization', `Bearer ${token}`).send(body);

  it('remplit le nom depuis la fiche quand seul stationId est fourni', async () => {
    const { token } = await createTestUser();
    const res = await post(token, { date: '2026-01-15T10:00:00Z', stationId: 'val-thorens' });

    expect(res.status).toBe(201);
    expect(res.body.session.stationId).toBe('val-thorens');
    expect(res.body.session.station).toBe('Val Thorens');
  });

  it('conserve le nom saisi tout en reliant la fiche', async () => {
    const { token } = await createTestUser();
    const res = await post(token, {
      date: '2026-01-15T10:00:00Z',
      station: 'VT avec les potes',
      stationId: 'val-thorens',
    });

    expect(res.status).toBe(201);
    expect(res.body.session.station).toBe('VT avec les potes');
    expect(res.body.session.stationId).toBe('val-thorens');
  });

  it('accepte un nom libre sans fiche (stationId null)', async () => {
    const { token } = await createTestUser();
    const res = await post(token, { date: '2026-01-15T10:00:00Z', station: 'Petite station' });

    expect(res.status).toBe(201);
    expect(res.body.session.stationId).toBeNull();
  });

  it('renvoie 404 pour un stationId inconnu', async () => {
    const { token } = await createTestUser();
    const res = await post(token, { date: '2026-01-15T10:00:00Z', stationId: 'nexiste-pas' });

    expect(res.status).toBe(404);
  });

  it('renvoie 400 sans station ni stationId', async () => {
    const { token } = await createTestUser();
    const res = await post(token, { date: '2026-01-15T10:00:00Z' });

    expect(res.status).toBe(400);
  });

  it('relie puis détache une session à la mise à jour', async () => {
    const { token } = await createTestUser();
    const created = await post(token, { date: '2026-01-15T10:00:00Z', station: 'Tignes' });
    const id = created.body.session.id;
    const put = (body: object) =>
      request(app).put(`/api/sessions/${id}`).set('Authorization', `Bearer ${token}`).send(body);

    const linked = await put({ stationId: 'tignes' });
    expect(linked.status).toBe(200);
    expect(linked.body.session.stationId).toBe('tignes');

    const unlinked = await put({ stationId: null });
    expect(unlinked.status).toBe(200);
    expect(unlinked.body.session.stationId).toBeNull();
    expect(unlinked.body.session.station).toBe('Tignes');
  });
});
