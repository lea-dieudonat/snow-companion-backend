import { execSync } from 'child_process';
import { config } from 'dotenv';

config();

export default function setup() {
  const testDbUrl = process.env['DATABASE_URL_TEST'];
  if (!testDbUrl) throw new Error('DATABASE_URL_TEST is not set in .env');

  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: testDbUrl },
    stdio: 'inherit',
  });

  execSync('npx prisma db seed', {
    env: { ...process.env, DATABASE_URL: testDbUrl },
    stdio: 'inherit',
  });
}