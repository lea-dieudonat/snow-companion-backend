import request from 'supertest';
import app from '@/app';

export async function createTestUser(email = 'test@snow.com', password = 'password123') {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password, name: 'Test User' });

  return { token: res.body.token as string, user: res.body.user };
}
