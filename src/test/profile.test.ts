import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '@/app';
import { createTestUser } from './helpers';

const VALID_PROFILE = {
  disciplines: ['snowboard'],
  primaryDiscipline: 'snowboard',
  rideStyles: ['freestyle', 'freeride'],
  freestyleLevel: 'intermediate',
  snowPreference: 'powder',
  offPiste: true,
  level: 'advanced',
  withChildren: false,
  regions: ['alpes_nord'],
  budgetRange: 'mid',
};

describe('GET /api/users/profile', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/users/profile');
    expect(res.status).toBe(401);
  });

  it('returns null profile for a new user', async () => {
    const { token } = await createTestUser();
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.profile).toBeNull();
  });

  it('returns existing profile after creation', async () => {
    const { token } = await createTestUser();

    await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send(VALID_PROFILE);

    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.profile.disciplines).toEqual(['snowboard']);
    expect(res.body.profile.level).toBe('advanced');
  });
});

describe('PUT /api/users/profile', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).put('/api/users/profile').send(VALID_PROFILE);
    expect(res.status).toBe(401);
  });

  it('creates a profile and returns it', async () => {
    const { token } = await createTestUser();
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send(VALID_PROFILE);

    expect(res.status).toBe(200);
    expect(res.body.profile.disciplines).toEqual(['snowboard']);
    expect(res.body.profile.primaryDiscipline).toBe('snowboard');
    expect(res.body.profile.offPiste).toBe(true);
    expect(res.body.profile.level).toBe('advanced');
    expect(res.body.profile.budgetRange).toBe('mid');
  });

  it('updates an existing profile', async () => {
    const { token } = await createTestUser();

    await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send(VALID_PROFILE);

    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...VALID_PROFILE, level: 'expert', budgetRange: 'premium' });

    expect(res.status).toBe(200);
    expect(res.body.profile.level).toBe('expert');
    expect(res.body.profile.budgetRange).toBe('premium');
  });

  it('returns 400 when disciplines is missing', async () => {
    const { token } = await createTestUser();
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ level: 'advanced' }); // missing disciplines

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid enum value', async () => {
    const { token } = await createTestUser();
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...VALID_PROFILE, level: 'god_mode' });

    expect(res.status).toBe(400);
  });

  it('two users have independent profiles', async () => {
    const { token: token1 } = await createTestUser('rider1@snow.com');
    const { token: token2 } = await createTestUser('rider2@snow.com');

    await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${token1}`)
      .send(VALID_PROFILE);

    await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${token2}`)
      .send({ ...VALID_PROFILE, level: 'beginner', disciplines: ['ski'] });

    const res1 = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${token1}`);
    const res2 = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${token2}`);

    expect(res1.body.profile.level).toBe('advanced');
    expect(res2.body.profile.level).toBe('beginner');
    expect(res2.body.profile.disciplines).toEqual(['ski']);
  });
});
