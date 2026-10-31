import { describe, it, expect } from 'vitest';
import { parseEnv } from '@/config/env';

const valid = {
  JWT_SECRET: 'a'.repeat(32),
  ANTHROPIC_API_KEY: 'sk-ant-test',
};

describe('parseEnv', () => {
  it('accepte une configuration valide et applique les valeurs par défaut', () => {
    const env = parseEnv(valid);
    expect(env.port).toBe(3001);
    expect(env.agentMaxIterations).toBe(5);
    expect(env.agentRateLimitMax).toBe(10);
    expect(env.jwtExpiresIn).toBe('7d');
    expect(env.nodeEnv).toBe('development');
  });

  it('parse les entiers fournis', () => {
    const env = parseEnv({ ...valid, PORT: '4000', AGENT_TIMEOUT_MS: '15000' });
    expect(env.port).toBe(4000);
    expect(env.agentTimeoutMs).toBe(15000);
  });

  it('signale une variable requise manquante', () => {
    expect(() => parseEnv({ JWT_SECRET: valid.JWT_SECRET })).toThrow(/ANTHROPIC_API_KEY/);
  });

  it('refuse un entier invalide et liste toutes les variables en erreur', () => {
    expect(() =>
      parseEnv({ ...valid, PORT: 'abc', AGENT_MAX_TOKENS: '12.5', AGENT_MAX_ITERATIONS: '0' }),
    ).toThrow(/PORT[\s\S]*AGENT_MAX_TOKENS[\s\S]*AGENT_MAX_ITERATIONS/);
  });

  it('refuse un JWT_SECRET trop court en production', () => {
    expect(() => parseEnv({ ...valid, NODE_ENV: 'production', JWT_SECRET: 'short' })).toThrow(
      /JWT_SECRET/,
    );
  });

  it('applique les valeurs par défaut CORS, proxy et rate-limit', () => {
    const env = parseEnv(valid);
    expect(env.corsOrigins).toEqual(['http://localhost:3000']);
    expect(env.trustProxy).toBe(0);
    expect(env.authRateLimitMax).toBe(20);
    expect(env.stationsRateLimitMax).toBe(120);
  });

  it('parse CORS_ORIGIN (liste), TRUST_PROXY et les limites', () => {
    const env = parseEnv({
      ...valid,
      CORS_ORIGIN: 'https://a.fr, https://b.fr/',
      TRUST_PROXY: '1',
      AUTH_RATE_LIMIT_MAX: '5',
      STATIONS_RATE_LIMIT_WINDOW_MS: '1000',
    });
    expect(env.corsOrigins).toEqual(['https://a.fr', 'https://b.fr']);
    expect(env.trustProxy).toBe(1);
    expect(env.authRateLimitMax).toBe(5);
    expect(env.stationsRateLimitWindowMs).toBe(1000);
  });

  it('exige CORS_ORIGIN en production et refuse le joker', () => {
    const prod = { ...valid, NODE_ENV: 'production' };
    expect(() => parseEnv(prod)).toThrow(/CORS_ORIGIN/);
    expect(() => parseEnv({ ...prod, CORS_ORIGIN: '*' })).toThrow(/CORS_ORIGIN/);
    expect(parseEnv({ ...prod, CORS_ORIGIN: 'https://sillon.app' }).corsOrigins).toEqual([
      'https://sillon.app',
    ]);
  });

  it('accepte un JWT_SECRET court hors production', () => {
    expect(parseEnv({ ...valid, NODE_ENV: 'test', JWT_SECRET: 'short' }).jwtSecret).toBe('short');
  });
});
