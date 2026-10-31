type Source = Record<string, string | undefined>;

const MIN_JWT_SECRET_LENGTH = 32;

/**
 * Valide les variables d'environnement et retourne la configuration typée.
 * Toutes les erreurs sont collectées puis levées en une seule fois.
 */
export function parseEnv(source: Source) {
  const errors: string[] = [];

  const read = (name: string): string | undefined => {
    const value = source[name]?.trim();
    return value ? value : undefined;
  };

  const required = (name: string): string => {
    const value = read(name);
    if (value === undefined) {
      errors.push(`${name} : variable requise manquante`);
      return '';
    }
    return value;
  };

  const optional = (name: string, defaultValue: string): string => read(name) ?? defaultValue;

  const integer = (
    name: string,
    defaultValue: number,
    min = 1,
    max = Number.MAX_SAFE_INTEGER,
  ): number => {
    const raw = read(name);
    if (raw === undefined) return defaultValue;
    const value = Number(raw);
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(value) || value < min || value > max) {
      errors.push(`${name} : entier compris entre ${min} et ${max} attendu (reçu "${raw}")`);
      return defaultValue;
    }
    return value;
  };

  const boolean = (name: string, defaultValue: boolean): boolean => {
    const raw = read(name);
    if (raw === undefined) return defaultValue;
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    errors.push(`${name} : "true" ou "false" attendu (reçu "${raw}")`);
    return defaultValue;
  };

  const nodeEnv = optional('NODE_ENV', 'development');

  const jwtSecret = required('JWT_SECRET');
  if (jwtSecret && nodeEnv === 'production' && jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    errors.push(
      `JWT_SECRET : au moins ${MIN_JWT_SECRET_LENGTH} caractères requis en production (reçu ${jwtSecret.length})`,
    );
  }

  const corsRaw = read('CORS_ORIGIN');
  const corsOrigins = corsRaw
    ? corsRaw
        .split(',')
        .map((o) => o.trim().replace(/\/+$/, ''))
        .filter(Boolean)
    : [];
  if (nodeEnv === 'production' && corsOrigins.length === 0) {
    errors.push('CORS_ORIGIN : au moins une origine explicite requise en production');
  }
  if (corsOrigins.includes('*')) {
    errors.push('CORS_ORIGIN : le joker "*" est interdit, lister les origines explicitement');
  }

  const config = {
    nodeEnv,
    corsOrigins: corsOrigins.length > 0 ? corsOrigins : ['http://localhost:3000'],
    trustProxy: integer('TRUST_PROXY', 0, 0, 10),
    port: integer('PORT', 3001, 1, 65535),
    // false sur les instances web quand un worker dédié (npm run start:worker) exécute les crons
    runCrons: boolean('RUN_CRONS', true),

    jwtSecret,
    jwtExpiresIn: optional('JWT_EXPIRES_IN', '7d'),

    anthropicApiKey: required('ANTHROPIC_API_KEY'),
    agentModelTools: optional('AGENT_MODEL_TOOLS', 'claude-haiku-4-5-20251001'),
    agentModelSynthesis: optional('AGENT_MODEL_SYNTHESIS', 'claude-sonnet-4-6'),
    agentMaxTokens: integer('AGENT_MAX_TOKENS', 1024),
    agentMaxIterations: integer('AGENT_MAX_ITERATIONS', 5),
    agentTimeoutMs: integer('AGENT_TIMEOUT_MS', 30000),
    agentRateLimitWindowMs: integer('AGENT_RATE_LIMIT_WINDOW_MS', 60000),
    agentRateLimitMax: integer('AGENT_RATE_LIMIT_MAX', 10),
    authRateLimitWindowMs: integer('AUTH_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
    authRateLimitMax: integer('AUTH_RATE_LIMIT_MAX', 20),
    stationsRateLimitWindowMs: integer('STATIONS_RATE_LIMIT_WINDOW_MS', 60 * 1000),
    stationsRateLimitMax: integer('STATIONS_RATE_LIMIT_MAX', 120),
  };

  if (errors.length > 0) {
    throw new Error(`Configuration d'environnement invalide :\n- ${errors.join('\n- ')}`);
  }

  return config;
}

export const env = parseEnv(process.env);
