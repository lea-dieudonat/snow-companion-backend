import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '@/app';
import { createTestUser } from './helpers';

const STATION_A = 'val-thorens';
const STATION_B = 'les-2-alpes';

describe('GET /api/users/favorites', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/users/favorites');
    expect(res.status).toBe(401);
  });

  it('returns an empty list for a new user', async () => {
    const { token } = await createTestUser();
    const res = await request(app)
      .get('/api/users/favorites')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('POST /api/users/favorites/:stationId', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).post(`/api/users/favorites/${STATION_A}`);
    expect(res.status).toBe(401);
  });

  it('adds a station to favorites', async () => {
    const { token } = await createTestUser();
    const res = await request(app)
      .post(`/api/users/favorites/${STATION_A}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.favoriteStations).toContain(STATION_A);
  });

  it('returns 404 for an unknown station', async () => {
    const { token } = await createTestUser();
    const res = await request(app)
      .post('/api/users/favorites/station-inconnue')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('GET favorites returns full station objects after adding', async () => {
    const { token } = await createTestUser();

    await request(app)
      .post(`/api/users/favorites/${STATION_A}`)
      .set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .get('/api/users/favorites')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(STATION_A);
    expect(res.body[0].name).toBeDefined();
  });

  it('can add multiple stations', async () => {
    const { token } = await createTestUser();

    await request(app)
      .post(`/api/users/favorites/${STATION_A}`)
      .set('Authorization', `Bearer ${token}`);
    await request(app)
      .post(`/api/users/favorites/${STATION_B}`)
      .set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .get('/api/users/favorites')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body).toHaveLength(2);
  });
});

describe('DELETE /api/users/favorites/:stationId', () => {
  it('removes a station from favorites', async () => {
    const { token } = await createTestUser();

    await request(app)
      .post(`/api/users/favorites/${STATION_A}`)
      .set('Authorization', `Bearer ${token}`);
    await request(app)
      .post(`/api/users/favorites/${STATION_B}`)
      .set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .delete(`/api/users/favorites/${STATION_A}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.favoriteStations).not.toContain(STATION_A);
    expect(res.body.favoriteStations).toContain(STATION_B);
  });

  it('removing a non-favorite is a no-op (no error)', async () => {
    const { token } = await createTestUser();
    const res = await request(app)
      .delete(`/api/users/favorites/${STATION_A}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.favoriteStations).toEqual([]);
  });

  it('two users have independent favorites', async () => {
    const { token: token1 } = await createTestUser('fav1@snow.com');
    const { token: token2 } = await createTestUser('fav2@snow.com');

    await request(app)
      .post(`/api/users/favorites/${STATION_A}`)
      .set('Authorization', `Bearer ${token1}`);

    const res2 = await request(app)
      .get('/api/users/favorites')
      .set('Authorization', `Bearer ${token2}`);

    expect(res2.body).toEqual([]);
  });
});
