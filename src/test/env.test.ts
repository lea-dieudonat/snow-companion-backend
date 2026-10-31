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

  it('accepte un JWT_SECRET court hors production', () => {
    expect(parseEnv({ ...valid, NODE_ENV: 'test', JWT_SECRET: 'short' }).jwtSecret).toBe('short');
  });
});
