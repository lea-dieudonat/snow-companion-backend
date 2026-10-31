import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '@/app';
import prisma from '@/config/prisma';

const STATION_ID = 'val-thorens';
let lat = 0;
let lng = 0;

beforeAll(async () => {
  const station = await prisma.station.findUniqueOrThrow({ where: { id: STATION_ID } });
  lat = station.latitude;
  lng = station.longitude;
  await prisma.stationLiveData.upsert({
    where: { stationId: STATION_ID },
    create: { stationId: STATION_ID, liftsOpen: 10, liftsTotal: 20 },
    update: { liftsOpen: 10, liftsTotal: 20 },
  });
});

afterAll(async () => {
  await prisma.stationLiveData.deleteMany({ where: { stationId: STATION_ID } });
});

describe('GET /api/stations', () => {
  it('liste les stations avec données live', async () => {
    const res = await request(app).get('/api/stations');
    expect(res.status).toBe(200);
    expect(res.body.map((s: { id: string }) => s.id)).toContain(STATION_ID);
  });

  it('filtre par recherche', async () => {
    const res = await request(app).get('/api/stations').query({ search: 'thorens' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(STATION_ID);
  });

  it('filtre par altitude minimale trop haute : liste vide', async () => {
    const res = await request(app).get('/api/stations').query({ minAltitude: 99999 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('rejette un paramètre invalide', async () => {
    const res = await request(app).get('/api/stations').query({ maxPrice: -5 });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/stations/:id', () => {
  it('renvoie le détail', async () => {
    const res = await request(app).get(`/api/stations/${STATION_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(STATION_ID);
  });

  it('renvoie 404 pour une station inconnue', async () => {
    const res = await request(app).get('/api/stations/inconnue');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

describe('GET /api/stations/nearby', () => {
  it('renvoie les stations proches triées par distance', async () => {
    const res = await request(app)
      .get('/api/stations/nearby')
      .query({ latitude: lat, longitude: lng, maxDistance: 20 });
    expect(res.status).toBe(200);
    expect(res.body[0].id).toBe(STATION_ID);
    expect(res.body[0].distance).toBe(0);
  });

  it('exclut les stations hors rayon', async () => {
    const res = await request(app)
      .get('/api/stations/nearby')
      .query({ latitude: lat + 5, longitude: lng, maxDistance: 10 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('applique limit', async () => {
    const res = await request(app)
      .get('/api/stations/nearby')
      .query({ latitude: lat, longitude: lng, maxDistance: 500, limit: 1 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('rejette un rayon trop grand ou une limite trop grande', async () => {
    const big = await request(app)
      .get('/api/stations/nearby')
      .query({ latitude: lat, longitude: lng, maxDistance: 5000 });
    expect(big.status).toBe(400);
    const lim = await request(app)
      .get('/api/stations/nearby')
      .query({ latitude: lat, longitude: lng, limit: 1000 });
    expect(lim.status).toBe(400);
  });
});
