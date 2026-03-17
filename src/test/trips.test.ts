import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '@/app';
import { createTestUser } from './helpers';

const STATION_ID = 'val-thorens';
const VALID_TRIP = {
  name: 'Weekend Val Thorens',
  startDate: '2026-02-14T08:00:00Z',
  endDate: '2026-02-16T18:00:00Z',
  stationId: STATION_ID,
};

describe('GET /api/trips', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/trips');
    expect(res.status).toBe(401);
  });

  it('returns an empty list for a new user', async () => {
    const { token } = await createTestUser();
    const res = await request(app)
      .get('/api/trips')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('POST /api/trips', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).post('/api/trips').send(VALID_TRIP);
    expect(res.status).toBe(401);
  });

  it('creates a trip and returns it with station info', async () => {
    const { token } = await createTestUser();
    const res = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${token}`)
      .send(VALID_TRIP);

    expect(res.status).toBe(201);
    expect(res.body.trip.name).toBe('Weekend Val Thorens');
    expect(res.body.trip.status).toBe('planned');
    expect(res.body.trip.station.id).toBe(STATION_ID);
  });

  it('returns 404 for an unknown station', async () => {
    const { token } = await createTestUser();
    const res = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...VALID_TRIP, stationId: 'station-qui-nexiste-pas' });

    expect(res.status).toBe(404);
  });

  it('returns 400 when name is missing', async () => {
    const { token } = await createTestUser();
    const res = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${token}`)
      .send({ startDate: '2026-02-14T08:00:00Z', stationId: STATION_ID });

    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid date format', async () => {
    const { token } = await createTestUser();
    const res = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...VALID_TRIP, startDate: '2026-02-14' }); // date-only, not datetime

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/trips/:id', () => {
  it('updates own trip', async () => {
    const { token } = await createTestUser();

    const created = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${token}`)
      .send(VALID_TRIP);

    const id = created.body.trip.id;

    const res = await request(app)
      .put(`/api/trips/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Trip modifié', notes: 'Avec les copains' });

    expect(res.status).toBe(200);
    expect(res.body.trip.name).toBe('Trip modifié');
    expect(res.body.trip.notes).toBe('Avec les copains');
  });

  it("returns 404 when updating another user's trip", async () => {
    const { token: token1 } = await createTestUser('trip1@snow.com');
    const { token: token2 } = await createTestUser('trip2@snow.com');

    const created = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${token1}`)
      .send(VALID_TRIP);

    const id = created.body.trip.id;

    const res = await request(app)
      .put(`/api/trips/${id}`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ name: 'Tentative de vol' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/trips/:id', () => {
  it('deletes own trip', async () => {
    const { token } = await createTestUser();

    const created = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${token}`)
      .send(VALID_TRIP);

    const id = created.body.trip.id;

    const res = await request(app)
      .delete(`/api/trips/${id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    const list = await request(app)
      .get('/api/trips')
      .set('Authorization', `Bearer ${token}`);
    expect(list.body).toEqual([]);
  });

  it("returns 404 when deleting another user's trip", async () => {
    const { token: token1 } = await createTestUser('del1@snow.com');
    const { token: token2 } = await createTestUser('del2@snow.com');

    const created = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${token1}`)
      .send(VALID_TRIP);

    const id = created.body.trip.id;

    const res = await request(app)
      .delete(`/api/trips/${id}`)
      .set('Authorization', `Bearer ${token2}`);

    expect(res.status).toBe(404);
  });
});
