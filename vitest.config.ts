import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { config } from 'dotenv';

config();

const testDbUrl = process.env['DATABASE_URL_TEST'];
if (!testDbUrl) throw new Error('DATABASE_URL_TEST is not set in .env');

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globalSetup: 'src/test/global-setup.ts',
    setupFiles: ['src/test/setup.ts'],
    fileParallelism: false,
    env: {
      DATABASE_URL: testDbUrl,
      JWT_SECRET: process.env['JWT_SECRET'] ?? 'test-jwt-secret',
      JWT_EXPIRES_IN: '1h',
    },
  },
});